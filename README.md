# Leafs Lab

An independent, non-commercial Toronto hockey lab: a current-game watch guide, game reality checks, player form, season trends and a transparent methodology. React + TypeScript + Vite serve one precomputed JSON snapshot. Visitors make no provider requests. No accounts, payments, forecasts, AI inference, official logos or player photography.

**The shipped snapshot contains real MoneyPuck Toronto data for the 2026–27 regular season:** six games, 108 skater game appearances and six goalie game appearances, covered through October 10, 2026 and downloaded October 13. Only current-season participants are shown. The snapshot is a static extract, not a live feed; the Site does not refresh automatically.

## Run and validate

Use Node 24 (minimum 22.12), npm and Python 3.12. No Python packages are required for the current CSV pipeline.

```sh
npm ci
python3 -m unittest discover -s tests -v
npm test
npm run typecheck
npm run build
```

`dist/` is the static build. `npm run dev` starts Vite for local development outside the managed Sites environment. Tests compile TypeScript into ignored `.test-build/` and use Node's test runner plus React server rendering. They have an independent hand-checkable sample fixture, so changing the published snapshot to real data does not invalidate sample/routing tests.

In a managed Sites environment, use its native install/build helpers:

```sh
node /root/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/scripts/install-dependencies.mjs
node /root/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/scripts/build-site.mjs
```

Browser QA was unavailable in the build environment: no supported control-browser tool exists, and managed Sites forbids improvised browser installs or preview servers. Typecheck, calculation tests, server-rendered view checks and the production build were performed. The 390 px layout and keyboard flow still need an actual supported-browser check.

## Data and reproducibility

The frozen [schema 1 contract](docs/data-contract.md) defines `public/data/leafs-lab.json`. [The product specification](docs/superpowers/specs/2026-10-12-leafs-lab-design.md) defines exact metrics and UI behavior. The pipeline keeps `all` and `5on5` separate, sums raw unadjusted xGoals, uses seconds for rates, preserves missing metrics as null, and writes validated JSON atomically. Unknown outcomes stay unknown; a tied pre-shootout score does not imply a winner. Goalie GSAx uses matched goalie rows, not team totals.

Source hashes preserve original CSV-byte provenance. Rebuilding advances `generated_at`, but not the source timestamps for unchanged inputs. `retrieved_at_basis` distinguishes an actual pipeline download, a declared retrieval log, and local CSV file modification time. **Local file time is not confirmed provider retrieval freshness.** The UI shows source timestamps in the viewer's locale, calendar game dates without timezone shifts, and an old-source warning after 48 hours. Off-season/no-game intervals can leave covered-through dates unchanged.

DuckDB is preferred for later local analytics, but it was not installed in this environment. The tested pipeline uses Python's standard-library CSV/JSON implementation. `requirements.txt` lists the optional DuckDB dependency; it is not needed to import, export or run tests.

Regenerate the explicit sample (never an automatic real-fetch fallback):

```sh
python3 -m pipeline sample --output public/data/leafs-lab.json
```

## Rebuild the real snapshot locally

The [source acceptance report](docs/source-validation.md) records complete raw-row reconciliation, verified field mappings, score-basis checks and source hashes for the earlier 2025–26 snapshot. The URLs in `config/moneypuck-real.json` are the listed MoneyPuck Toronto regular-season team, skater and goalie game CSVs. Preserve source retrieval timestamps and keep raw files outside tracked source. The player URLs and included/requested season now cover 2026–27. The [current-season proof](analysis/current-season-proof.md) records the current source hashes, primary-strength reconciliation and the unsupported player `other` partitions.

To generate a separate candidate, copy the config to ignored `real-config.json`, add the raw CSV paths, and set the `retrieved_at` timestamp and `retrieved_at_basis` for each downloaded source. Keep the verified mappings unchanged unless a source schema changes. Then run:

```sh
python3 -m pipeline import --config real-config.json --output /tmp/leafs-real.json
```

Inspect the candidate and original CSV rows. The currently shipped snapshot was generated from the verified source inputs as follows:

```sh
python3 -m pipeline import --config real-config.json --output public/data/leafs-lab.json
python3 -m unittest discover -s tests -v
npm test
npm run typecheck
npm run build
```

For permitted downloads with a fully checked configuration:

```sh
python3 -m pipeline download --config real-config.json --raw-dir /tmp/leafs-raw --output /tmp/leafs-real.json
```

Import/download failure preserves the prior output, with no silent sample fallback. Schema validation alone cannot verify the provider's semantic mappings.

## CI and refresh state

`.github/workflows/ci.yml` runs Python tests, frontend tests, typecheck and the production build, then uploads `dist/` as an inspectable artifact.

On push, an independent non-blocking source-availability job runs `scripts/probe_sources.py` against three provider-listed TOR CSVs. It prints HTTP outcomes and original CSV headers, plus one field-limited representative row from each of the latest three distinct 2025-season TOR all-strength games when identifiable. Player names and other fields are excluded. A small JSON receipt is uploaded as `leafs-lab-source-validation`; raw CSVs are never committed. This checks GitHub runner access despite local HTTP 403 and does not itself establish semantic mappings, switch data mode, or refresh/publish the app. Its failures cannot mask the core validation/build job. The first hosted runner receipt confirms HTTP 200 for all three sources and the recorded headers. Full-file semantic review and the row reconciliation are documented in `docs/source-validation.md`.

`.github/workflows/real-data-candidate.yml` runs on push or manual dispatch, downloads with the verified config, and uploads a separate candidate plus original CSVs as `leafs-lab-real-candidate` (three-day retention). Partial raw files are uploaded after failures when available. This workflow never replaces the shipped snapshot, publishes the Site, writes to git or changes the refresh gate.

To run this source-only probe from a permitted network:

```sh
python3 scripts/probe_sources.py --output /tmp/leafs-source-receipt.json
```

`.github/workflows/refresh.yml` prepares daily refresh at **11:17 UTC** and manual `workflow_dispatch`. Its data job is **gated off by default**: both scheduled and manual jobs skip unless repository variable `LEAFS_REAL_DATA_VALIDATED` is exactly `true`. Both scheduled and manual runs remain disabled while that variable is unset. No unattended refresh is currently installed or enabled in this environment.

Real-data field mappings are verified for the checked 2026–27 inputs, and `config/moneypuck-real.json` is the portable checked configuration. Do not commit raw files or credentials. The variable `LEAFS_REAL_DATA_VALIDATED` remains unset, so unattended data downloads remain gated off; the user-facing Site is still a static snapshot.

The refresh downloads to a separate candidate, validates the frontend contract, runs the checks/build, and uploads a validated JSON/build artifact. Errors produce no published artifact and never deploy over the previous hosted snapshot. The workflow has read-only repository permissions and does not commit output or publish to Sites.

**Hosted refresh is not wired.** The Site is a static snapshot. Uploading artifacts or adding a cron expression does not update hosting. A future supported Site publication step and deployment credentials must be configured and verified before claiming unattended hosted updates. No paid resources are required or provisioned.

## Navigation and access

Shared hash URLs retain view, season, strength, game/player selection, window, player search, numeric sort and order across reload/back navigation. The initial view opens the current-season Watch guide; existing game, player, trend and methodology deep links remain available. Missing selected strengths stay unavailable. Charts have expandable accessible data tables; form tables support horizontal scrolling within their own region. Every control has a visible label and keyboard focus style.

Data: [MoneyPuck.com](https://moneypuck.com/data.htm). Definitions: [MoneyPuck glossary](https://moneypuck.com/glossary.htm). This project is not affiliated with the Toronto Maple Leafs, NHL or MoneyPuck.

## Current-game companion

The Watch guide puts three questions ahead of the numbers: attack quality versus shot volume, Bobrovsky’s strength-specific results, and Marchenko’s chance creation beyond goals. Each card includes a watch prompt, expandable numerical evidence, limits and links to the corresponding current game or player report. Player links use a ten-team-game window so all six available appearances are included. Guide figures carry fixed strength labels; the report strength switch does not apply to the guide.

`src/watchSnapshot.ts` is the selected machine-readable companion to `analysis/current-proof-results.json`. Its facts are pinned to the exact original source hashes, season, game identifiers and covered-through date. If a candidate replaces the dataset without updating the verified guide, the guide suppresses its findings and directs visitors to available reports. Regenerate and review the proof and selected companion when refreshing coverage; deploying a new raw snapshot alone does not refresh the interpretation.

The six-game analysis is descriptive. Leave-one-game-out shares are a sensitivity check, not a confidence interval; shared on-ice outcomes are not isolated player impact; raw xG cannot establish coaching causation. The model and data are credited to MoneyPuck. The extra value is the cross-metric questions and linked, inspectable current-game evidence, rather than a new xG model or a forecast.
