"""Provider-shaped adapter checks, independent of network availability."""
import csv
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from pipeline.importer import ImportValidationError, build_bundle


class RealCandidateTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.config = json.loads(Path('config/moneypuck-real.json').read_text())
        # These adapter fixtures intentionally exercise a historical season;
        # changing the portable refresh target must not change their joins.
        self.config['include_seasons'] = ['20252026']
        self.config['requested_seasons'] = ['20232024', '20242025', '20252026', '20262027']
        for kind in ('skaters', 'goalies'):
            self.config['sources'][kind]['season_constant'] = '20252026'
        self.rows = {
            'teams': [dict(team='TOR', season='2025', gameId='2025021304',
                gameDate='20260415', opposingTeam='OTT', home_or_away='AWAY',
                situation='all', iceTime='3600.0', xGoalsFor='1.642',
                xGoalsAgainst='4.995', goalsFor='1.0', goalsAgainst='3.0',
                shotsOnGoalFor='20.0', shotsOnGoalAgainst='38.0')],
            'skaters': [dict(playerId='8477503', name='Provider skater',
                gameId='2025021304', playerTeam='TOR', position='C',
                situation='all', icetime='785.0', I_F_xGoals='0.114',
                I_F_goals='0.0', I_F_shotsOnGoal='2.0',
                OnIce_F_xGoals='0.473', OnIce_A_xGoals='1.072')],
            'goalies': [dict(playerId='8483710', name='Provider goalie',
                gameId='2025021304', playerTeam='TOR', situation='all',
                icetime='3488.0', xGoals='3.544', goals='2.0', ongoal='37.0')],
        }

    def bundle(self):
        for kind, rows in self.rows.items():
            path = self.root / (kind + '.csv')
            with path.open('w', newline='') as handle:
                writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            self.config['sources'][kind]['path'] = str(path)
        return build_bundle(self.config)

    def test_provider_headers_constant_season_and_derived_saves(self):
        bundle = self.bundle()
        self.assertEqual(bundle['data_mode'], 'real')
        self.assertEqual(bundle['seasons'][0]['id'], '20252026')
        game = bundle['seasons'][0]['games'][0]
        self.assertEqual(game['date'], '2026-04-15')
        self.assertEqual(game['stats']['all']['toi_seconds'], 3600)
        self.assertEqual(bundle['seasons'][0]['skaters'][0]['stats']['all']['ixg'], 0.114)
        goalie = bundle['seasons'][0]['goalies'][0]['stats']['all']
        self.assertEqual(goalie['saves'], 35)
        self.assertEqual(goalie['xga'], 3.544)
        self.assertEqual(goalie['toi_seconds'], 3488)
        self.assertTrue(all(source['mapping_status'] == 'verified' for source in bundle['sources']))

    def test_unchecked_mappings_remain_unverified(self):
        for source in self.config['sources'].values():
            source['mapping_verified'] = False
        bundle = self.bundle()
        self.assertTrue(all(source['mapping_status'] == 'unverified' for source in bundle['sources']))

    def test_source_constant_rejects_game_id_year_mismatch(self):
        for kind in ('skaters', 'goalies'):
            with self.subTest(kind=kind):
                original = self.rows[kind][0]['gameId']
                self.rows[kind][0]['gameId'] = '2024021304'
                with self.assertRaisesRegex(ImportValidationError, 'Invalid game ID'):
                    self.bundle()
                self.rows[kind][0]['gameId'] = original

    def test_constant_requires_explicit_unambiguous_season(self):
        spec = self.config['sources']['skaters']
        spec['season_constant'] = '20252027'
        with self.assertRaisesRegex(ImportValidationError, 'Invalid season'):
            self.bundle()
        spec['season_constant'] = '20252026'
        spec['mapping']['season'] = 'position'
        with self.assertRaisesRegex(ImportValidationError, 'season_constant.*season mapping'):
            self.bundle()

    def test_missing_goalie_inputs_produce_null_saves(self):
        for field in ('ongoal', 'goals'):
            with self.subTest(field=field):
                original = self.rows['goalies'][0][field]
                self.rows['goalies'][0][field] = ''
                stats = self.bundle()['seasons'][0]['goalies'][0]['stats']['all']
                self.assertIsNone(stats['saves'])
                self.assertIsNone(stats['shots_against' if field == 'ongoal' else 'ga'])
                self.rows['goalies'][0][field] = original

    def test_negative_derived_saves_rejected(self):
        self.rows['goalies'][0]['ongoal'] = '1.0'
        with self.assertRaisesRegex(ImportValidationError, 'saves.*non-negative'):
            self.bundle()

    def test_derivation_cannot_override_explicit_saves_mapping(self):
        self.config['sources']['goalies']['mapping']['saves'] = 'ongoal'
        with self.assertRaisesRegex(ImportValidationError, 'derive_saves.*saves mapping'):
            self.bundle()

    def test_included_season_filters_career_rows_before_join_and_keeps_raw_hash(self):
        prior = dict(self.rows['teams'][0], season='2024',
                     gameId='2024021304', gameDate='20250415')
        self.rows['teams'].append(prior)
        bundle = self.bundle()
        self.assertEqual([s['id'] for s in bundle['seasons']], ['20252026'])
        self.assertEqual(len(bundle['seasons'][0]['games']), 1)
        self.assertEqual(bundle['coverage']['unavailable_seasons'],
                         ['20232024', '20242025', '20262027'])
        team_source = next(s for s in bundle['sources'] if s['kind'] == 'teams')
        self.assertEqual(team_source['hash'], 'sha256:' + hashlib.sha256(
            Path(self.config['sources']['teams']['path']).read_bytes()).hexdigest())
        self.config.pop('include_seasons')
        self.assertEqual(len(self.bundle()['seasons']), 2)

    def test_season_filter_applies_to_all_sources(self):
        # A player source can contain a season column instead of a constant.
        spec = self.config['sources']['skaters']
        spec.pop('season_constant')
        spec['mapping']['season'] = 'season'
        self.rows['skaters'][0]['season'] = '2025'
        self.rows['skaters'].append(dict(self.rows['skaters'][0],
            season='2024', gameId='2024021304'))
        self.assertEqual(len(self.bundle()['seasons'][0]['skaters']), 1)

    def test_invalid_empty_or_no_matching_filter_fails(self):
        for value in ([], '20252026', ['20252027'], ['20242025']):
            with self.subTest(value=value):
                self.config['include_seasons'] = value
                with self.assertRaises(ImportValidationError):
                    self.bundle()


class CurrentRefreshConfigTests(unittest.TestCase):
    def test_portable_refresh_targets_only_current_season(self):
        config = json.loads(Path('config/moneypuck-real.json').read_text())
        self.assertEqual(config['include_seasons'], ['20262027'])
        self.assertEqual(config['requested_seasons'], ['20262027'])
        for kind, spec in config['sources'].items():
            self.assertNotIn('path', spec)
            self.assertNotIn('retrieved_at', spec)
            if kind != 'teams':
                self.assertIn('/2026/regular/', spec['url'])
                self.assertEqual(spec['season_constant'], '20262027')
