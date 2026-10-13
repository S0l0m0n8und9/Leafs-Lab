import unittest
from pipeline.metrics import xg_share, rate_per60, gsax, aggregate, finishing_label, game_verdict, select_window

class MetricsTests(unittest.TestCase):
    def test_hand_calculations(self):
        self.assertAlmostEqual(xg_share(3.5, 1.9), 64.8148148148)
        self.assertEqual(aggregate([{'goals': 2, 'ixg': 3.5}])['finishing_difference'], -1.5)
        self.assertEqual(rate_per60(2, 7200), 1)
        self.assertAlmostEqual(gsax(1.9, 4), -2.1)

    def test_missing_and_zero(self):
        for a, b in [(None, 2), (2, None), (0, 0)]:
            self.assertIsNone(xg_share(a, b))
        self.assertIsNone(rate_per60(1, 0))
        self.assertIsNone(rate_per60(None, 20))
        self.assertIsNone(gsax(None, 2))
        self.assertIsNone(aggregate([{'goals': 1, 'ixg': None}])['finishing_difference'])

    def test_ratio_of_sums_and_strict_missing(self):
        rows = [{'xgf': 9, 'xga': 1}, {'xgf': 0, 'xga': 1}]
        self.assertAlmostEqual(aggregate(rows)['xg_share'], 100 * 9 / 11)
        self.assertIsNone(aggregate(rows + [{'xgf': None, 'xga': 1}])['xg_share'])

    def test_finishing_and_verdict_thresholds(self):
        self.assertEqual(finishing_label(2, 5, 3600), 'Finishing above expectation')
        self.assertEqual(finishing_label(-2, 5, 3600), 'Finishing below expectation')
        self.assertEqual(finishing_label(0, 5, 3600), 'Finishing near expectation')
        self.assertEqual(finishing_label(2, 4, 3600), 'Small sample')
        self.assertEqual(finishing_label(2, 5, 3599), 'Small sample')
        self.assertEqual(game_verdict(55, 'win'), 'Strong process, positive result')
        self.assertEqual(game_verdict(45, 'win'), 'Won despite trailing chance quality')
        self.assertEqual(game_verdict(55, None), 'led chance quality')
        self.assertEqual(game_verdict(None, None), 'Analysis unavailable')

    def test_windows_use_team_games_and_nonoverlapping_baseline(self):
        games = [{'id': str(i), 'date': f'2024-01-{i:02d}'} for i in range(1, 25)]
        current, baseline = select_window(games, 5)
        self.assertEqual([g['id'] for g in current], ['20', '21', '22', '23', '24'])
        self.assertEqual(len(baseline), 19)
        self.assertFalse(set(g['id'] for g in current) & set(g['id'] for g in baseline))
