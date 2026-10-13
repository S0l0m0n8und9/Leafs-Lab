# Leafs Lab data contract — schema 1

This is the frozen interface for frontend Task 2. `public/data/leafs-lab.json` is a UTF-8 JSON object. Numeric analytical values use full precision; all missing metrics are JSON `null`. Neither missing values nor zero denominators become zero-valued calculated metrics. Arrays may be empty. Every field below is emitted; strength keys are emitted only when present in the inputs. The shipped fixture contains both strengths for every game/appearance.

```ts
type Strength = 'all' | '5on5';
type NullableNumber = number | null;
type Stats<T> = Partial<Record<Strength, T>>;
interface TeamStats {
  xgf: NullableNumber; xga: NullableNumber;
  gf: NullableNumber; ga: NullableNumber;
  shots_for: NullableNumber; shots_against: NullableNumber;
  toi_seconds: NullableNumber;
}
interface SkaterStats {
  goals: NullableNumber; ixg: NullableNumber; shots: NullableNumber;
  toi_seconds: NullableNumber;
  onice_xgf: NullableNumber; onice_xga: NullableNumber;
}
interface GoalieStats {
  xga: NullableNumber; ga: NullableNumber;
  shots_against: NullableNumber; saves: NullableNumber;
  toi_seconds: NullableNumber;
}
interface Game {
  id: string; date: string; opponent: string; home_away: 'home' | 'away';
  result: 'win' | 'loss' | null;
  score_for: NullableNumber; score_against: NullableNumber;
  score_basis: 'before_shootout' | 'final' | 'unknown';
  stats: Stats<TeamStats>;
}
interface SkaterAppearance {
  game_id: string; player_id: string; name: string; position: string | null;
  stats: Stats<SkaterStats>;
}
interface GoalieAppearance {
  game_id: string; player_id: string; name: string;
  stats: Stats<GoalieStats>;
}
interface Season {
  id: string; label: string;
  games: Game[]; skaters: SkaterAppearance[]; goalies: GoalieAppearance[];
}
interface Source {
  kind: 'teams' | 'skaters' | 'goalies';
  url: string | null;
  retrieved_at: string;
  retrieved_at_basis: 'declared_retrieval' | 'downloaded' | 'local_mtime';
  hash: string; // sha256:<hex> of original CSV bytes
  validation_status: 'schema_validated' | 'sample_validated';
  mapping_status: 'verified' | 'unverified';
}
interface Bundle {
  schema_version: 1; data_mode: 'real' | 'sample'; generated_at: string;
  sources: Source[];
  coverage: { max_game_date: string; unavailable_seasons: string[] };
  seasons: Season[];
}
```

Season IDs are starting/ending years, e.g. `20242025`. Labels in sample mode explicitly end in ` · Sample`. These are illustrative coverage labels, not historical coverage claims. Games are regular-season TOR rows sorted by `(date, id)`; seasons sort ascending by ID; appearance arrays sort by `(game_id, player_id)`. Calendar dates are `YYYY-MM-DD` and must not undergo timezone conversion. `retrieved_at` and `generated_at` are timezone-aware UTC timestamps. A rebuild changes `generated_at` but does not change source retrieval time when the same inputs/config are reused.

`score_for`/`score_against` come from the all-strength input, regardless of the selected analytical strength. `before_shootout` allows a win/loss only when both scores exist and differ. Ties remain null. `unknown` always yields a null result. `final` requires explicit score columns whose mapped CSV headers are each distinct from the other score column and both analytical `gf`/`ga` headers: analytical goals must exclude the deciding shootout goal while the separate score may include it. No source outcome is inferred from selected-strength goals. `all` must exist for each game; `5on5` is optional. Missing strengths are unavailable, never substituted from another strength.

Player rows represent one appearance per `(season, TOR game, player_id)`, with separate stats by strength. Count appearances with the selected strength inside the last N completed team games; do not take each player's last N rows. Numeric zero-time rows count as recorded appearances but fail skater sample eligibility. Players on other teams are excluded even when their display name/ID also appears for TOR. No names are join keys. Goalies have their own xGA/GA and never use team xGA minus team GA for GSAx.

## Calculations

`pipeline.metrics` exports `xg_share`, `rate_per60`, `gsax`, `aggregate`, `finishing_label`, `game_verdict` and `select_window`. `aggregate` accepts a list of already selected-strength stats objects. It returns totals plus `xg_share`, `onice_xg_share`, `finishing_difference`, `gsax`, `goals_per60`, `ixg_per60`, `xgf_per60`, `xga_per60`. Complete-sample totals require every included component to be present; one null makes that total null. An empty sample yields null totals. xG share is the ratio of summed xGF to summed xGF+xGA; rolling/season shares must use that same rule, never mean percentages. Rates use seconds. Skater finishing difference is goals minus individual xG; goalie GSAx is goalie xGA minus goalie GA. No sums combine `all` and `5on5`.

`select_window(games, size, baseline_size=20)` returns `(current, baseline)` in chronological order. The preceding baseline is non-overlapping and may be shorter than 20. The frontend calculates per-game/rolling/season/window summaries from these raw fields. Display xG/rates to two decimals and percentages to one; retain raw precision for calculations.

## CLI and local imports

Python 3.11+ with the standard library is sufficient. Execute commands from the repository root:

```sh
python3 -m unittest discover -s tests -v
python3 -m pipeline sample
python3 -m pipeline sample --output /tmp/sample.json
python3 -m pipeline import --config /absolute/path/real-config.json --output public/data/leafs-lab.json
python3 -m pipeline download --config /absolute/path/real-config.json --raw-dir /tmp/leafs-lab-raw --output public/data/leafs-lab.json
```

`sample` defaults to `fixtures/config.json` and requires sample mode. `import` requires explicit real mode. `download` requires real mode and configured listed MoneyPuck HTTPS CSV URLs; it makes one request per source, with a 45-second timeout and no retries or sample fallback. Downloaded raw files go outside tracked source by default (`~/.cache/leafs-lab/raw`). Failed fetching, malformed CSVs, invalid schema or non-finite JSON leave the existing published file intact. Atomic replacement happens only after all validation and strict JSON serialization succeed. Raw downloads are retained for inspection even when validation fails. The CLI reports failures on stderr and exits 1.

A mapping config contains exactly `teams`, `skaters`, `goalies`, one CSV path each. Relative paths resolve against the config's directory. For multiple provider CSVs, concatenate compatible rows with one header before import; do not concatenate incompatible schemas. Canonical fixture config demonstrates a complete mapping. `fixtures/moneypuck-candidate-config.json` is an **unverified starting point**, not an executable verified download configuration. Replace candidate headers, unknown URLs and local paths with actual checked source information before use.

```json
{
  "data_mode": "real",
  "requested_seasons": ["20232024", "20242025", "20252026", "20262027"],
  "sources": {
    "teams": {
      "path": "/absolute/path/teams.csv",
      "url": "https://moneypuck.com/moneypuck/playerData/careers/gameByGame/all_teams.csv",
      "retrieved_at": "2026-10-12T10:00:00Z",
      "mapping_verified": false,
      "toi_unit": "seconds",
      "game_type_values": ["2"],
      "strength_values": {"all": "all", "5on5": "5on5", "5on4": null, "4on5": null, "other": null},
      "home_away_values": {"HOME": "home", "AWAY": "away"},
      "score_basis": "before_shootout",
      "mapping": {"season": "providerSeason", "game_id": "providerGameId", "team": "providerTeam", "game_type": "providerGameType", "strength": "providerSituation", "date": "providerDate", "opponent": "providerOpponent", "home_away": "providerVenue", "xgf": "providerRawXGF", "xga": "providerRawXGA", "gf": "providerGF", "ga": "providerGA", "shots_for": "providerSF", "shots_against": "providerSA", "toi_seconds": "providerTime"}
    },
    "skaters": {"...": "see full fixture/candidate config for all required mappings"},
    "goalies": {"...": "see full fixture/candidate config for all required mappings"}
  }
}
```

Mapping keys are canonical fields; values are exact CSV column names. Required keys (`game_type` may be omitted only with `game_type_from_id: true`):

| Source | Required mapping keys |
|---|---|
| All | `season`, `game_id`, `team`, `game_type`, `strength` |
| Teams | `date`, `opponent`, `home_away`, `xgf`, `xga`, `gf`, `ga`, `shots_for`, `shots_against`, `toi_seconds` |
| Skaters | `player_id`, `name`, `goals`, `ixg`, `shots`, `toi_seconds`, `onice_xgf`, `onice_xga` |
| Goalies | `player_id`, `name`, `xga`, `ga`, `shots_against`, `saves`, `toi_seconds` |

Optional team mappings: `score_basis`, `score_for`, `score_against`. Optional skater mapping: `position`. If an optional mapping is supplied its header must exist. Numeric fields require their headers even when every value is missing. Empty cells, `NA`, `N/A`, `null`, `none` are missing, case-insensitive. Non-finite/negative numbers fail. Goals/shots/saves require integers. `toi_unit` is explicitly `seconds` or `minutes`; no unit inference. `game_type_values` lists provider values denoting regular-season games only. `strength_values` maps provider situations to `all`, `5on5` or explicit exclusion (`null`); unknown situations fail. `home_away_values` maps provider values to `home`/`away`. Team `date_format` is explicitly `YYYY-MM-DD` (default) or `YYYYMMDD`; output always becomes `YYYY-MM-DD`. A provider without a game-type column may configure `game_type_from_id: true` instead of mapping `game_type`/supplying `game_type_values`: normalized ID type `02` is retained and other types are excluded. This configured inference is never implicit. `score_basis` may be fixed in config or mapped per row.

Game IDs normalize decimal `.0` suffixes and remove leading zeroes, then pad short numeric IDs to six digits and prefix the season starting year exactly once. `20001` + `20232024` becomes `2023020001`; `2023020001` remains unchanged. Full IDs must match the season year and regular-season type `02`. Season input accepts starting year (`2023`) or `20232024`. Dates must be within July 1 through June 30 for that season. Player IDs normalize integral `.0` suffixes (`17.0` → `17`) and preserve stable nonnumeric provider IDs. Join on IDs, never display names.

The adapter validates TOR/opponent pairing against NHL team abbreviations (including ARI/UTA), dates, IDs, regular-season types, mapped situations, units, numeric values, goalie saves+GA=shots-against when all three exist, cross-strength metadata and joins. Exact normalized duplicate rows deduplicate. Conflicting duplicate keys fail. Orphan player rows and player strengths absent from matching team games fail. No regular-season TOR team rows fails rather than erasing a useful prior snapshot. `requested_seasons` drives unavailable-season reporting; wall-clock season guesses do not establish coverage.

Every source has a `retrieved_at_basis`. An explicit config `retrieved_at` defaults to `declared_retrieval` and should come from an actual retrieval log (sample fixtures use a declared fixture timestamp). `download` replaces any prior timestamp and basis with its own fetch time and `downloaded`. Without an explicit timestamp, the local CSV modification time is recorded with `local_mtime`; this is only local file provenance, not proof of when the provider last updated. Rebuilding from unchanged inputs preserves the source timestamp and basis even as `generated_at` advances. `mapping_verified` is a human assertion after dictionary/header review; schema validation alone does not confirm provider semantic meanings. A real acceptance check still requires at least three TOR games and three player rows against original inputs. The shipped sample snapshot has no verified real-data acceptance.
