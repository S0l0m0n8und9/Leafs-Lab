"""Explicit CSV adapter. Provider-specific mappings are configuration, not guesses."""
import csv
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
import math
from pathlib import Path
import re

STRENGTHS = ('all', '5on5')
STAT_FIELDS = {
    'teams': ('xgf', 'xga', 'gf', 'ga', 'shots_for', 'shots_against', 'toi_seconds'),
    'skaters': ('goals', 'ixg', 'shots', 'toi_seconds', 'onice_xgf', 'onice_xga'),
    'goalies': ('xga', 'ga', 'shots_against', 'saves', 'toi_seconds'),
}
COMMON = ('season', 'game_id', 'team', 'game_type', 'strength')
REQUIRED = {
    'teams': COMMON + ('date', 'opponent', 'home_away') + STAT_FIELDS['teams'],
    'skaters': COMMON + ('player_id', 'name') + STAT_FIELDS['skaters'],
    'goalies': COMMON + ('player_id', 'name') + STAT_FIELDS['goalies'],
}
COUNTS = {'gf', 'ga', 'goals', 'shots_for', 'shots_against', 'shots', 'saves'}
TEAM_CODES = {'ANA','ARI','BOS','BUF','CAR','CBJ','CGY','CHI','COL','DAL','DET','EDM','FLA','LAK','MIN','MTL','NJD','NSH','NYI','NYR','OTT','PHI','PIT','SEA','SJS','STL','TBL','TOR','UTA','VAN','VGK','WPG','WSH'}
MISSING = {'', 'na', 'n/a', 'null', 'none'}


class ImportValidationError(ValueError):
    """The input cannot safely become a published snapshot."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def normalize_id(value: str) -> str:
    value = str(value).strip()
    if not value:
        raise ImportValidationError('Missing required identifier')
    if re.fullmatch(r'\d+(?:\.0+)?', value):
        return str(int(Decimal(value)))
    if not re.fullmatch(r'[A-Za-z0-9_-]+', value):
        raise ImportValidationError(f'Invalid identifier: {value!r}')
    return value


def normalize_season(value: str) -> str:
    value = normalize_id(value)
    if len(value) == 4 and value.isdigit():
        value += str(int(value) + 1)
    if not re.fullmatch(r'\d{8}', value) or int(value[4:]) != int(value[:4]) + 1:
        raise ImportValidationError(f'Invalid season: {value!r}; expected starting year or YYYYyyyy')
    return value


def normalize_game_id(value: str, season: str) -> str:
    value = normalize_id(value)
    season = normalize_season(season)
    if value.isdigit() and len(value) <= 6:
        value = season[:4] + value.zfill(6)
    if not re.fullmatch(r'\d{10}', value) or value[:4] != season[:4]:
        raise ImportValidationError(f'Invalid game ID {value!r} for season {season}')
    return value


def number(value: str | None, field: str) -> float | None:
    if value is None or str(value).strip().lower() in MISSING:
        return None
    try:
        parsed = float(value)
    except (ValueError, TypeError) as error:
        raise ImportValidationError(f'{field}: invalid numeric value {value!r}') from error
    if not math.isfinite(parsed) or parsed < 0 or (field in COUNTS and not parsed.is_integer()):
        raise ImportValidationError(f'{field}: expected finite non-negative ' + ('integer' if field in COUNTS else 'number'))
    return parsed


def _read_rows(kind: str, spec: dict, base: Path, include_seasons: set[str] | None = None) -> tuple[list[dict], dict]:
    mapping = spec.get('mapping', {})
    required = set(REQUIRED[kind]) - ({'game_type'} if spec.get('game_type_from_id') is True else set())
    season_constant = None
    if 'season_constant' in spec:
        if 'season' in mapping:
            raise ImportValidationError(f'{kind}: season_constant cannot coexist with a season mapping')
        season_constant = normalize_season(spec['season_constant'])
        required.discard('season')
    derive_saves = spec.get('derive_saves_from_shots_against_and_ga') is True
    if derive_saves:
        if kind != 'goalies' or 'saves' in mapping:
            raise ImportValidationError(f'{kind}: derive_saves requires a goalie source without a saves mapping')
        required.discard('saves')
    missing = required - set(mapping)
    if missing:
        raise ImportValidationError(f'{kind}: missing required column mappings: {sorted(missing)}')
    if spec.get('toi_unit') not in ('seconds', 'minutes'):
        raise ImportValidationError(f'{kind}: toi_unit must explicitly be seconds or minutes')
    if (not spec.get('game_type_values') and spec.get('game_type_from_id') is not True) or not spec.get('strength_values'):
        raise ImportValidationError(f'{kind}: explicit regular-season game_type_values and strength_values required')
    path = Path(spec.get('path', ''))
    if not path.is_absolute():
        path = base / path
    raw = path.read_bytes()
    rows = []
    with path.open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or len(set(reader.fieldnames)) != len(reader.fieldnames):
            raise ImportValidationError(f'{kind}: missing or duplicate CSV headers')
        absent = set(mapping.values()) - set(reader.fieldnames)
        if absent:
            raise ImportValidationError(f'{kind}: mapped columns absent from CSV: {sorted(absent)}')
        for line, raw_row in enumerate(reader, 2):
            if None in raw_row or any(value is None for value in raw_row.values()):
                raise ImportValidationError(f'{kind} line {line}: malformed CSV width')
            row = {field: raw_row[column].strip() for field, column in mapping.items()}
            if row['team'].upper() != 'TOR':
                continue
            try:
                season = season_constant or normalize_season(row['season'])
                # Career team files cover more years than season-specific player
                # files. Exclude explicitly unrequested years before joining.
                if include_seasons is not None and season not in include_seasons:
                    continue
                game_id = normalize_game_id(row['game_id'], season)
            except ImportValidationError as error:
                raise ImportValidationError(f'{kind} line {line}: {error}') from error
            if spec.get('game_type_from_id') is True:
                if game_id[4:6] != '02':
                    continue
            elif row['game_type'] not in spec['game_type_values']:
                continue
            source_strength = row['strength']
            if source_strength not in spec['strength_values']:
                raise ImportValidationError(f'{kind} line {line}: unmapped situation {source_strength!r}; configure explicit exclusion with null')
            strength = spec['strength_values'][source_strength]
            if strength is None:
                continue
            if strength not in STRENGTHS:
                raise ImportValidationError(f'{kind}: invalid canonical strength {strength!r}')
            try:
                if game_id[4:6] != '02':
                    raise ImportValidationError('Regular-season game ID must have type 02')
                item = {'season': season, 'game_id': game_id, 'team': 'TOR', 'strength': strength}
                stats = {field: number(row[field], field) for field in STAT_FIELDS[kind] if not (derive_saves and field == 'saves')}
                if derive_saves:
                    shots, ga = stats['shots_against'], stats['ga']
                    stats['saves'] = None if shots is None or ga is None else number(shots - ga, 'saves')
                if stats['toi_seconds'] is not None and spec['toi_unit'] == 'minutes':
                    stats['toi_seconds'] *= 60
                item['stats'] = stats
                if kind == 'teams':
                    date_format = spec.get('date_format', 'YYYY-MM-DD')
                    if date_format == 'YYYYMMDD':
                        if not re.fullmatch(r'\d{8}', row['date']):
                            raise ImportValidationError('Date must be YYYYMMDD')
                        parsed_date = datetime.strptime(row['date'], '%Y%m%d').date()
                    elif date_format == 'YYYY-MM-DD':
                        parsed_date = date.fromisoformat(row['date'])
                    else:
                        raise ImportValidationError('date_format must be YYYY-MM-DD or YYYYMMDD')
                    if not date(int(season[:4]), 7, 1) <= parsed_date <= date(int(season[4:]), 6, 30):
                        raise ImportValidationError('Game date does not match season year')
                    if date_format == 'YYYY-MM-DD' and parsed_date.isoformat() != row['date']:
                        raise ImportValidationError('Date must be YYYY-MM-DD')
                    opponent = row['opponent'].upper()
                    if opponent not in TEAM_CODES or opponent == 'TOR':
                        raise ImportValidationError('TOR/opponent pairing invalid')
                    home_away = spec.get('home_away_values', {}).get(row['home_away'])
                    if home_away not in ('home', 'away'):
                        raise ImportValidationError('Unmapped home/away value')
                    basis = row.get('score_basis') or spec.get('score_basis')
                    if basis not in ('before_shootout', 'final', 'unknown'):
                        raise ImportValidationError('Explicit score_basis required: before_shootout, final, unknown')
                    if basis == 'final' and not {'score_for','score_against'} <= set(mapping):
                        raise ImportValidationError('Final score requires separate score_for/score_against columns; analytical goals exclude shootouts')
                    if basis == 'final' and len({mapping['score_for'], mapping['score_against'], mapping['gf'], mapping['ga']}) != 4:
                        raise ImportValidationError('Final score columns must be distinct from each other and analytical gf/ga columns')
                    sf = number(row.get('score_for'), 'gf') if 'score_for' in mapping else stats['gf']
                    sa = number(row.get('score_against'), 'ga') if 'score_against' in mapping else stats['ga']
                    item.update(date=parsed_date.isoformat(), opponent=opponent, home_away=home_away, score_basis=basis, score_for=sf, score_against=sa)
                else:
                    if not row['name']:
                        raise ImportValidationError('Player name required')
                    item.update(player_id=normalize_id(row['player_id']), name=row['name'], position=row.get('position') or None)
                    if kind == 'goalies' and all(stats[field] is not None for field in ('ga','saves','shots_against')) and stats['ga'] + stats['saves'] != stats['shots_against']:
                        raise ImportValidationError('Goalie saves + GA must equal shots against')
                rows.append(item)
            except (ImportValidationError, ValueError) as error:
                raise ImportValidationError(f'{kind} line {line}: {error}') from error
    declared_retrieved = spec.get('retrieved_at')
    retrieved = declared_retrieved or datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
    retrieved_basis = spec.get('retrieved_at_basis', 'declared_retrieval' if declared_retrieved else 'local_mtime')
    if retrieved_basis not in ('declared_retrieval', 'downloaded', 'local_mtime') or (not declared_retrieved and retrieved_basis != 'local_mtime'):
        raise ImportValidationError(f'{kind}: retrieved_at_basis does not match timestamp origin')
    try:
        parsed_retrieved = datetime.fromisoformat(retrieved.replace('Z','+00:00'))
        if parsed_retrieved.tzinfo is None:
            raise ValueError('timezone missing')
    except ValueError as error:
        raise ImportValidationError(f'{kind}: retrieved_at must be a timezone-aware ISO timestamp') from error
    source = {'kind':kind, 'url':spec.get('url'), 'retrieved_at':parsed_retrieved.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z'), 'retrieved_at_basis':retrieved_basis, 'hash':'sha256:' + hashlib.sha256(raw).hexdigest(), 'validation_status':'schema_validated', 'mapping_status':'verified' if spec.get('mapping_verified') is True else 'unverified'}
    return rows, source


def _deduplicate(rows: list[dict], kind: str) -> list[dict]:
    keyed = {}
    for row in rows:
        key = (row['season'], row['game_id'], row['team'], row['strength'])
        if kind != 'teams':
            key += (row['player_id'],)
        if key in keyed and keyed[key] != row:
            raise ImportValidationError(f'{kind}: conflicting duplicate key {key}')
        keyed[key] = row
    return list(keyed.values())


def build_bundle(config: dict | str | Path, generated_at: str | None = None) -> dict:
    base = Path.cwd()
    if not isinstance(config, dict):
        config_path = Path(config).resolve()
        base = config_path.parent
        config = json.loads(config_path.read_text())
    mode = config.get('data_mode')
    if mode not in ('sample','real'):
        raise ImportValidationError('data_mode must be explicit: sample or real')
    source_specs = config.get('sources', {})
    if set(source_specs) != set(STAT_FIELDS):
        raise ImportValidationError('Exactly teams, skaters and goalies sources required')
    include_seasons = None
    if 'include_seasons' in config:
        configured_seasons = config['include_seasons']
        if not isinstance(configured_seasons, list) or not configured_seasons:
            raise ImportValidationError('include_seasons must be a non-empty list of explicit seasons')
        include_seasons = {normalize_season(season) for season in configured_seasons}
    data, sources = {}, []
    for kind, spec in source_specs.items():
        rows, source = _read_rows(kind, spec, base, include_seasons)
        data[kind] = _deduplicate(rows, kind)
        if mode == 'sample':
            source['validation_status'] = 'sample_validated'
        sources.append(source)
    seasons = {}
    games = {}
    for row in data['teams']:
        season_id, game_id = row['season'], row['game_id']
        if season_id not in seasons:
            seasons[season_id] = {'id':season_id, 'label':f"{season_id[:4]}–{season_id[6:]}" + (' · Sample' if mode == 'sample' else ''), 'games':[], 'skaters':[], 'goalies':[]}
        key = (season_id, game_id)
        metadata = {field:row[field] for field in ('date','opponent','home_away','score_basis')}
        if key not in games:
            games[key] = dict(id=game_id, **metadata, result=None, score_for=None, score_against=None, stats={})
            seasons[season_id]['games'].append(games[key])
        elif any(games[key][field] != value for field, value in metadata.items()):
            raise ImportValidationError(f'Inconsistent metadata across team game strengths: {game_id}')
        games[key]['stats'][row['strength']] = row['stats']
    if not games:
        raise ImportValidationError('No regular-season TOR team games; snapshot not published')
    for game in games.values():
        if 'all' not in game['stats']:
            raise ImportValidationError(f"Team game {game['id']} requires an all-strength row for the score")
        all_row = next(row for row in data['teams'] if row['game_id'] == game['id'] and row['strength'] == 'all')
        game['score_for'], game['score_against'] = all_row['score_for'], all_row['score_against']
        sf, sa = game['score_for'], game['score_against']
        # Missing or explicitly unknown score bases never imply an outcome.
        if sf is not None and sa is not None and sf != sa and game['score_basis'] != 'unknown':
            game['result'] = 'win' if sf > sa else 'loss'
    for kind in ('skaters', 'goalies'):
        appearances = {}
        for row in data[kind]:
            game_key = (row['season'], row['game_id'])
            if game_key not in games:
                raise ImportValidationError(f'{kind}: player row has no matching TOR team game: {game_key}')
            if row['strength'] not in games[game_key]['stats']:
                raise ImportValidationError(f'{kind}: strength absent in matching team game: {game_key}')
            key = game_key + (row['player_id'],)
            if key not in appearances:
                appearance = {field:row[field] for field in ('game_id','player_id','name')}
                if kind == 'skaters':
                    appearance['position'] = row['position']
                appearance['stats'] = {}
                appearances[key] = appearance
                seasons[row['season']][kind].append(appearance)
            elif appearances[key]['name'] != row['name'] or (kind == 'skaters' and appearances[key]['position'] != row['position']):
                raise ImportValidationError(f'{kind}: inconsistent player metadata across strengths: {key}')
            appearances[key]['stats'][row['strength']] = row['stats']
    for season in seasons.values():
        season['games'].sort(key=lambda game: (game['date'],game['id']))
        for kind in ('skaters','goalies'):
            season[kind].sort(key=lambda player: (player['game_id'],player['player_id']))
    available = set(seasons)
    requested = [normalize_season(season) for season in config.get('requested_seasons', [])]
    return {'schema_version':1, 'data_mode':mode, 'generated_at':generated_at or utc_now(), 'sources':sorted(sources,key=lambda source:source['kind']), 'coverage':{'max_game_date':max(game['date'] for game in games.values()), 'unavailable_seasons':sorted(set(requested) - available)}, 'seasons':[seasons[key] for key in sorted(seasons)]}
