"""Read-only provider availability/header evidence, never real-data acceptance.

Prints original headers and at most one representative row from each of the
latest three distinct 2025-season TOR all-strength games. No names or raw CSVs
are written. This probe does not import, publish, or change mapping verification.
"""
import argparse
import csv
from datetime import datetime, timezone
import io
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SOURCES = {
    'teams': 'https://moneypuck.com/moneypuck/playerData/careers/gameByGame/regular/teams/TOR.csv',
    'skaters': 'https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/2025/regular/skaters/TOR.csv',
    'goalies': 'https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/2025/regular/goalies/TOR.csv',
}
FIELDS = {
    'season', 'gameid', 'gamedate', 'playerid', 'team', 'opposingteam',
    'home_or_away', 'situation', 'icetime', 'xgoalsfor', 'xgoalsagainst',
    'goalsfor', 'goalsagainst', 'shotsongoalfor', 'shotsongoalagainst',
    'i_f_xgoals', 'i_f_goals', 'i_f_shotsongoal', 'onice_f_xgoals',
    'onice_a_xgoals', 'xgoals', 'goals', 'ongoal',
}


def select_fields(row):
    return {key: value for key, value in row.items()
            if isinstance(key, str) and key.casefold() in FIELDS}


def probe(kind, url, opener=None):
    opener = opener or urlopen
    receipt = {'kind': kind, 'url': url, 'status': 'unavailable',
               'http_status': None, 'headers': [], 'rows': [],
               'semantic_mapping_verified': False,
               'selection': 'Latest 3 distinct 2025-season TOR all-strength games; one representative row each'}
    try:
        request = Request(url, headers={'User-Agent': 'Leafs-Lab non-commercial source-validation/1.0'})
        with opener(request, timeout=25) as response:
            receipt['http_status'] = getattr(response, 'status', 200)
            reader = csv.DictReader(io.TextIOWrapper(response, encoding='utf-8-sig', newline=''))
            receipt['headers'] = reader.fieldnames or []
            if not receipt['headers']:
                raise ValueError('CSV has no headers')
            candidates = {}
            for index, row in enumerate(reader):
                if index >= 2_000_000:
                    raise ValueError('CSV safety limit exceeded; no acceptance claimed')
                normalized = {str(key).casefold(): (value or '').strip()
                              for key, value in row.items() if key is not None and isinstance(value, str)}
                if normalized.get('team', 'TOR') != 'TOR' or normalized.get('situation', 'all') != 'all':
                    continue
                game_id = normalized.get('gameid', '')
                if not game_id:
                    continue
                season = normalized.get('season')
                if season and season not in ('2025', '2025.0', '20252026'):
                    continue
                if not season and len(game_id) >= 10 and not game_id.startswith('2025'):
                    continue
                if game_id not in candidates:
                    candidates[game_id] = (normalized.get('gamedate', ''), select_fields(row))
                if len(candidates) > 3:
                    oldest = min(candidates, key=lambda key: (candidates[key][0], key))
                    del candidates[oldest]
            receipt['rows'] = [candidates[key][1] for key in
                               sorted(candidates, key=lambda key: (candidates[key][0], key), reverse=True)]
            receipt['status'] = 'available'
            if not receipt['rows']:
                receipt['note'] = 'Headers available, but no identifiable matching game rows; inspect mappings manually.'
    except HTTPError as error:
        receipt['http_status'] = error.code
        receipt['error'] = f'HTTP {error.code}: {error.reason}'
    except (URLError, OSError, UnicodeError, csv.Error, ValueError) as error:
        receipt['error'] = str(error)
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('.source-probe/receipt.json'))
    args = parser.parse_args()
    receipts = [probe(kind, url) for kind, url in SOURCES.items()]
    for receipt in receipts:
        print(f"{receipt['kind']}: {receipt['status']} HTTP={receipt['http_status']}")
        print('Headers:', json.dumps(receipt['headers']))
        for row in receipt['rows']:
            print('Representative row:', json.dumps(row, sort_keys=True))
        if 'error' in receipt:
            print('Failure:', receipt['error'])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'checked_at': datetime.now(timezone.utc).isoformat(),
                                     'purpose': 'Availability/header evidence only; semantic mappings and real acceptance remain unverified',
                                     'sources': receipts}, indent=2) + '\n')
    return 0  # Availability failure is evidence, not a core CI failure.


if __name__ == '__main__':
    raise SystemExit(main())
