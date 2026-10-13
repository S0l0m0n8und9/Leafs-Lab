import csv
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from pipeline.importer import ImportValidationError, normalize_game_id, build_bundle
from pipeline.export import refresh, atomic_write, download

TEAM_FIELDS = ['season','game_id','date','team','opponent','home_away','game_type','strength','xgf','xga','gf','ga','shots_for','shots_against','toi_seconds','score_basis']
SKATER_FIELDS = ['season','game_id','player_id','name','position','team','game_type','strength','goals','ixg','shots','toi_seconds','onice_xgf','onice_xga']
GOALIE_FIELDS = ['season','game_id','player_id','name','team','game_type','strength','xga','ga','shots_against','saves','toi_seconds']

class ImporterTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)
        self.team = dict(season='20232024',game_id='2023020001',date='2023-10-10',team='TOR',opponent='MTL',home_away='HOME',game_type='2',strength='all',xgf='3.5',xga='1.9',gf='2',ga='2',shots_for='32',shots_against='28',toi_seconds='3600',score_basis='before_shootout')
        self.skater = dict(season='20232024',game_id='20001',player_id='17.0',name='Finn Frost',position='C',team='TOR',game_type='2',strength='all',goals='2',ixg='3.5',shots='5',toi_seconds='1200',onice_xgf='2',onice_xga='1')
        self.goalie = dict(season='20232024',game_id='2023020001.0',player_id='99',name='Lake North',team='TOR',game_type='2',strength='all',xga='1.9',ga='2',shots_against='28',saves='26',toi_seconds='3600')

    def write(self, kind, fields, rows):
        path = self.root / (kind + '.csv')
        with path.open('w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fields); writer.writeheader(); writer.writerows(rows)
        return path

    def config(self, teams=None, skaters=None, goalies=None):
        specs = {}
        for kind, fields, rows in [('teams', TEAM_FIELDS, teams if teams is not None else [self.team]), ('skaters', SKATER_FIELDS, skaters if skaters is not None else [self.skater]), ('goalies', GOALIE_FIELDS, goalies if goalies is not None else [self.goalie])]:
            specs[kind] = {'path': str(self.write(kind, fields, rows)), 'mapping': {field: field for field in fields}, 'toi_unit':'seconds', 'game_type_values':['2'], 'strength_values':{'all':'all','5on5':'5on5'}, 'home_away_values':{'HOME':'home','AWAY':'away'}, 'score_basis':'before_shootout'}
        return {'data_mode':'sample','sources':specs}

    def test_normalized_ids_match_across_sources(self):
        self.assertEqual(normalize_game_id('20001', '20232024'), '2023020001')
        self.assertEqual(normalize_game_id('2023020001.0', '20232024'), '2023020001')
        bundle = build_bundle(self.config())
        self.assertEqual(bundle['seasons'][0]['skaters'][0]['player_id'], '17')
        self.assertEqual(bundle['seasons'][0]['skaters'][0]['game_id'], bundle['seasons'][0]['games'][0]['id'])

    def test_tied_preshootout_scores_do_not_infer_win(self):
        game = build_bundle(self.config())['seasons'][0]['games'][0]
        self.assertIsNone(game['result'])
        self.assertEqual(game['score_basis'], 'before_shootout')

    def test_strengths_are_not_added(self):
        five = dict(self.team, strength='5on5',xgf='1.2',xga='1.1',gf='1',ga='0')
        stats = build_bundle(self.config(teams=[self.team, five]))['seasons'][0]['games'][0]['stats']
        self.assertEqual(stats['all']['xgf'], 3.5)
        self.assertEqual(stats['5on5']['xgf'], 1.2)

    def test_duplicates_deduplicate_and_conflicts_fail(self):
        self.assertEqual(len(build_bundle(self.config(teams=[self.team, self.team]))['seasons'][0]['games']), 1)
        with self.assertRaisesRegex(ImportValidationError, 'conflicting'):
            build_bundle(self.config(teams=[self.team, dict(self.team,xgf='4')]))

    def test_missing_stays_null_and_minutes_convert(self):
        config = self.config(skaters=[dict(self.skater,ixg='',toi_seconds='20')])
        config['sources']['skaters']['toi_unit'] = 'minutes'
        stats = build_bundle(config)['seasons'][0]['skaters'][0]['stats']['all']
        self.assertIsNone(stats['ixg']); self.assertEqual(stats['toi_seconds'], 1200)

    def test_bad_schema_and_invalid_numbers_fail(self):
        config = self.config(); config['sources']['teams']['mapping']['xgf'] = 'unavailable_column'
        with self.assertRaisesRegex(ImportValidationError, 'column'):
            build_bundle(config)
        for value in ['NaN','-1','Infinity']:
            with self.assertRaises(ImportValidationError):
                build_bundle(self.config(teams=[dict(self.team,xgf=value)]))

    def test_regular_season_tor_only_and_orphans_rejected(self):
        bundle = build_bundle(self.config(teams=[self.team,dict(self.team,game_id='2023030001',game_type='3'),dict(self.team,game_id='2023020002',team='MTL',opponent='TOR')]))
        self.assertEqual(len(bundle['seasons'][0]['games']),1)
        with self.assertRaisesRegex(ImportValidationError, 'team game'):
            build_bundle(self.config(skaters=[dict(self.skater,game_id='20005')]))

    def test_invalid_refresh_preserves_existing_and_no_silent_sample_fallback(self):
        target = self.root / 'bundle.json'; target.write_text('{"last":"good"}')
        config = self.config(teams=[dict(self.team,xgf='bad')]); config_path = self.root / 'config.json'; config_path.write_text(json.dumps(config))
        with self.assertRaises(ImportValidationError): refresh(config_path, target)
        self.assertEqual(target.read_text(), '{"last":"good"}')
        with self.assertRaises(ValueError): atomic_write({'bad':float('nan')}, target)
        self.assertEqual(target.read_text(), '{"last":"good"}')

    def test_explicit_compact_date_and_game_type_from_id(self):
        config = self.config(teams=[dict(self.team,season='2023',date='20231010')])
        for spec in config['sources'].values():
            del spec['mapping']['game_type']
            del spec['game_type_values']
            spec['game_type_from_id'] = True
        config['sources']['teams']['date_format'] = 'YYYYMMDD'
        game = build_bundle(config)['seasons'][0]['games'][0]
        self.assertEqual(game['date'], '2023-10-10')
        self.assertEqual(game['id'], '2023020001')

    def test_date_year_and_game_id_type_must_match_season(self):
        for changes in [{'date':'2025-10-10'}, {'game_id':'2023030001'}, {'opponent':'XXX'}]:
            with self.assertRaises(ImportValidationError):
                build_bundle(self.config(teams=[dict(self.team, **changes)]))

    def test_full_ids_stay_full_and_wrong_year_fails(self):
        self.assertEqual(normalize_game_id('2023020001', '2023'), '2023020001')
        with self.assertRaises(ImportValidationError):
            normalize_game_id('2024020001', '2023')

    def test_final_score_requires_separate_score_columns(self):
        with self.assertRaisesRegex(ImportValidationError, 'separate'):
            build_bundle(self.config(teams=[dict(self.team,score_basis='final')]))

    def test_final_score_rejects_analytical_column_aliases(self):
        for score_for, score_against in [('gf','ga'), ('ga','gf'), ('gf','score_against'), ('score_for','ga'), ('score_for','score_for')]:
            with self.subTest(score_for=score_for, score_against=score_against):
                config = self.config(teams=[dict(self.team,score_basis='final')])
                team_spec = config['sources']['teams']
                team_spec['path'] = str(self.write('teams', TEAM_FIELDS + ['score_for','score_against'], [dict(self.team,score_basis='final',score_for='3',score_against='2')]))
                team_spec['mapping'].update(score_for=score_for,score_against=score_against)
                with self.assertRaisesRegex(ImportValidationError, 'distinct'):
                    build_bundle(config)

    def test_distinct_final_score_columns_preserve_analytical_goals(self):
        config = self.config(teams=[dict(self.team,score_basis='final')])
        spec = config['sources']['teams']
        spec['path'] = str(self.write('teams', TEAM_FIELDS + ['score_for','score_against'], [dict(self.team,score_basis='final',score_for='3',score_against='2')]))
        spec['mapping'].update(score_for='score_for',score_against='score_against')
        game = build_bundle(config)['seasons'][0]['games'][0]
        self.assertEqual(game['score_for'],3)
        self.assertEqual(game['score_against'],2)
        self.assertEqual(game['result'],'win')
        self.assertEqual(game['stats']['all']['gf'],2)
        self.assertEqual(game['stats']['all']['ga'],2)

    def test_source_timestamp_basis_is_recorded_per_source(self):
        config = self.config()
        config['sources']['teams']['retrieved_at'] = '2023-10-10T00:00:00Z'
        sources = {source['kind']:source for source in build_bundle(config)['sources']}
        self.assertEqual(sources['teams']['retrieved_at_basis'],'declared_retrieval')
        self.assertEqual(sources['teams']['retrieved_at'],'2023-10-10T00:00:00Z')
        self.assertEqual(sources['skaters']['retrieved_at_basis'],'local_mtime')
        self.assertEqual(sources['goalies']['retrieved_at_basis'],'local_mtime')

    def test_rebuild_preserves_source_time_and_basis(self):
        config = self.config()
        config['sources']['teams']['retrieved_at'] = '2023-10-10T00:00:00Z'
        earlier = build_bundle(config, generated_at='2023-10-11T00:00:00Z')
        later = build_bundle(config, generated_at='2023-10-12T00:00:00Z')
        self.assertNotEqual(earlier['generated_at'], later['generated_at'])
        self.assertEqual(earlier['sources'], later['sources'])

    def test_download_records_timestamp_origin(self):
        config = self.config(); config['data_mode'] = 'real'
        payloads = []
        for kind,spec in config['sources'].items():
            payloads.append(io.BytesIO(Path(spec['path']).read_bytes()))
            spec.update(url=f'https://moneypuck.com/moneypuck/{kind}.csv',retrieved_at='2023-10-10T00:00:00Z',retrieved_at_basis='declared_retrieval')
        path = self.root/'download-config.json'; path.write_text(json.dumps(config))
        with patch('pipeline.export.urlopen',side_effect=payloads):
            bundle = download(path,self.root/'raw',self.root/'downloaded.json')
        self.assertEqual({source['retrieved_at_basis'] for source in bundle['sources']},{'downloaded'})
        self.assertTrue(all(source['retrieved_at']!='2023-10-10T00:00:00Z' for source in bundle['sources']))

    def test_sample_export_has_two_seasons_and_24_games_each(self):
        bundle = build_bundle(Path('fixtures/config.json'))
        self.assertEqual(bundle['data_mode'],'sample'); self.assertEqual(len(bundle['seasons']),2)
        self.assertTrue(all(len(s['games']) >= 24 for s in bundle['seasons']))
        self.assertTrue(all(set(g['stats']) == {'all','5on5'} for s in bundle['seasons'] for g in s['games']))
