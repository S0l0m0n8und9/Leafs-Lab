import io
import unittest
from urllib.error import HTTPError
from scripts.probe_sources import select_fields, probe

class ProbeTests(unittest.TestCase):
    def test_selected_rows_exclude_names_and_unrequested_fields(self):
        actual = select_fields({'gameId':'2025020001','playerId':'12','name':'A Person','team':'TOR','situation':'all','I_F_xGoals':'0.5','salary':'private'})
        self.assertEqual(actual, {'gameId':'2025020001','playerId':'12','team':'TOR','situation':'all','I_F_xGoals':'0.5'})

    def test_csv_probe_retains_headers_and_no_more_than_three_tor_rows(self):
        csv = b'season,gameId,team,situation,name,iceTime,xGoalsFor\n2025,2025020001,BOS,all,Exclude,3600,2\n2025,2025020002,TOR,5on4,Exclude,400,1\n2025,2025020003,TOR,all,Secret,3600,3\n2025,2025020004,TOR,5on5,Secret,2800,2\n2025,2025020005,TOR,all,Secret,3600,4\n2025,2025020006,TOR,all,Secret,3600,5\n2025,2025020006,TOR,all,Another,3600,5\n2024,2024020082,TOR,all,Old,3600,5\n'
        receipt = probe('teams', 'https://moneypuck.com/example.csv', opener=lambda request,timeout:io.BytesIO(csv))
        self.assertEqual(receipt['status'], 'available')
        self.assertIn('name', receipt['headers'])
        self.assertEqual([r['gameId'] for r in receipt['rows']], ['2025020006','2025020005','2025020003'])
        self.assertNotIn('name', receipt['rows'][0])
        self.assertFalse(receipt['semantic_mapping_verified'])

    def test_http_failure_is_a_useful_receipt_not_an_exception(self):
        def blocked(request, timeout):
            raise HTTPError(request.full_url, 403, 'Forbidden', {}, None)
        receipt = probe('teams', 'https://moneypuck.com/example.csv', opener=blocked)
        self.assertEqual(receipt['status'], 'unavailable')
        self.assertEqual(receipt['http_status'], 403)
        self.assertIn('Forbidden', receipt['error'])
        self.assertEqual(receipt['rows'], [])

if __name__ == '__main__':
    unittest.main()
