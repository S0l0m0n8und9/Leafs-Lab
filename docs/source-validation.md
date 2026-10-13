# Source validation and outstanding real acceptance

The current snapshot is **sample data — illustrative games and players, not actual NHL results**. It contains 24 TOR team games in each of two illustrative seasons labelled 2024–25 and 2025–26, fictional skaters and goalies, separate all/5on5 data, tied pre-shootout scores, a missing xG value, zero xG/time cases and short/traded-player samples. Source `url` is null for fixtures. Their timestamp is fixture provenance, not a MoneyPuck retrieval claim.

The local environment received **HTTP 403** from the original team download on 12 October 2026. A permitted GitHub Actions runner subsequently downloaded all three listed Toronto game-level sources successfully (HTTP 200), recorded at **2026-10-13T09:14:24.760150+00:00** in its source-availability receipt:

- [Career team games](https://moneypuck.com/moneypuck/playerData/careers/gameByGame/regular/teams/TOR.csv).
- [2025–26 skater games](https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/2025/regular/skaters/TOR.csv).
- [2025–26 goalie games](https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/2025/regular/goalies/TOR.csv).

The receipt confirms original headers and limited representative all-strength rows from three games. It confirms runner download access; it does **not** establish complete semantic acceptance. `config/moneypuck-real.json` now uses the observed exact headers and keeps every source `mapping_verified: false` pending full original-row checks. The earlier `fixtures/moneypuck-candidate-config.json` is an obsolete exploratory starting point; use the new config for candidate preparation.

The team file has starting-year `season`, YYYYMMDD `gameDate`, full `gameId`, `team`, `opposingTeam`, `home_or_away`, `situation`, and case-sensitive `iceTime`. Player files use `playerTeam`, lowercase `icetime` and no season column. Their source-level `season_constant: "20252026"` is explicit and game IDs must match that starting year. Goalie `ongoal` is mapped to shots against, `goals` to goals against, `xGoals` to raw expected goals against; `derive_saves_from_shots_against_and_ga: true` calculates saves as shots against minus goals against. Missing inputs produce null and negative results fail validation. These header mappings are structurally testable, but units, score basis and metric meanings still require semantic checks against the full raw files and provider definitions.

Top-level `include_seasons: ["20252026"]` limits all sources before joining. This prevents the career team file from implying player coverage in unimported seasons. The four requested seasons remain in the config; the other three must be reported unavailable. Original-byte SHA-256 hashes cover the entire downloaded file, including excluded career rows.

`.github/workflows/real-data-candidate.yml` downloads the sources on push or manual dispatch and uploads the separate JSON candidate plus original raw CSVs for three days. Its artifact step also runs after failures to retain any partial successful downloads. This workflow does not replace `public/data`, publish a Site, commit raw data or enable the refresh gate. A candidate passing structural validation remains **unverified** until the following acceptance checks are complete.

Use only listed downloads and raw unadjusted xGoals consistently. Do not map score- or flurry-adjusted columns into these fields. Supply actual retrieval timestamps and preserve original raw inputs outside tracked source. Exported `retrieved_at_basis` distinguishes a declared timestamp, a pipeline download, and a local file modification time; none proves when the provider last updated the data. Credit [MoneyPuck.com](https://moneypuck.com/data.htm) in all derived real-statistic views and explain model limits using its [glossary](https://moneypuck.com/glossary.htm). The same credit appears in sample UI as the intended data provider; fixture statistics are authored locally.

Before real mode can be called accepted:

1. Obtain permitted game-level team/skater/goalie CSVs locally or through an authorized runner, inspect headers/dictionaries, and configure exact mappings and score basis.
2. Verify the canonical sample/strength/time/ID conventions against those actual files. Record the header and source URL/retrieval/hash, then set mapping_verified only for checked mappings.
3. Run `python3 -m pipeline import --config real-config.json --output /tmp/leafs-real.json`; inspect at least three TOR games and three player appearances against the raw inputs, including a tied/OT/shootout case when available and goalie sample alignment.
4. Run the Python suite, then the frontend tests/typecheck/build before replacing the published snapshot. A candidate mapping passing structural validation is not by itself semantic verification or historical coverage acceptance.

DuckDB and pytest were not installed in this environment. Execution uses Python's `csv`, `json`, `unittest` and atomic filesystem replacement. `requirements.txt` retains the optional DuckDB dependency. Future extension can store normalized team/player rows keyed exactly as this contract, query one strength at a time with null completeness guards, and emit the identical schema. Installing DuckDB must not change the metric/window/ID semantics. No database runtime is required for current import/export.

No unattended refresh or hosting scheduler was installed by this data task. The CLI is prepared for a later manual/daily workflow. GitHub runner HTTP access is confirmed. Complete provider mapping verification and full real-row spot checks remain outstanding.
