"""python3 -m pipeline {sample,import,download}."""
import argparse
from pathlib import Path
import sys
from .export import download, refresh


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description='Validate CSV inputs and atomically export Leafs Lab schema v1')
    parser.add_argument('mode', choices=('sample','import','download'))
    parser.add_argument('--config', type=Path, help='Explicit source mapping JSON; required for import/download')
    parser.add_argument('--output', type=Path, default=Path('public/data/leafs-lab.json'))
    parser.add_argument('--raw-dir', type=Path, default=Path.home()/'.cache'/'leafs-lab'/'raw')
    args = parser.parse_args(argv)
    config = args.config
    if args.mode == 'sample':
        config = config or Path(__file__).resolve().parent.parent/'fixtures'/'config.json'
    elif config is None:
        parser.error('--config required for import/download; no automatic sample fallback')
    try:
        if args.mode == 'download':
            bundle = download(config,args.raw_dir,args.output)
        else:
            bundle = refresh(config,args.output,expected_mode='sample' if args.mode == 'sample' else 'real')
    except (ValueError, OSError) as error:
        print(f'Refresh failed; previous snapshot preserved: {error}', file=sys.stderr)
        return 1
    games = sum(len(season['games']) for season in bundle['seasons'])
    print(f"Published {bundle['data_mode']} snapshot: {len(bundle['seasons'])} seasons, {games} games; covered through {bundle['coverage']['max_game_date']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
