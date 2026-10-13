# Leafs Lab

An independent, non-commercial Toronto hockey lab: game reality checks, player form, season trends and a transparent methodology. React + TypeScript + Vite serve one precomputed JSON snapshot. Visitors make no provider requests. No accounts, payments, forecasts, AI inference, official logos or player photography.

**The shipped site uses sample data — illustrative games and players, not actual NHL results.** Two illustrative seasons contain 24 games each with fictional skaters and goalies. The sample warning stays visible in every view and shared link. MoneyPuck is the intended real-data provider; the current fixture is authored locally.

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

## Import real CSVs locally

Direct permitted team download attempts returned HTTP 403 in this environment. Actual CSV headers and metric semantics remain unverified. The [source acceptance checklist](docs/source-validation.md) records the blocker and candidate URL coverage. Do not label the real dataset accepted until at least three TOR games and three player rows have been checked against the original inputs, including strengths, time units, ID joins and score basis.

1. Obtain the listed MoneyPuck team/skater/goalie game CSVs through permitted download access. Keep raw files outside tracked source.
2. Copy `fixtures/moneypuck-candidate-config.json` to local `real-config.json` (ignored by git). Replace paths/URLs and exact mapped headers after checking the provider dictionaries. The candidate URLs cover one skater/goalie season only; they do not establish all requested-season coverage.
3. Confirm raw unadjusted xGoals, situation mappings, seconds/minutes, regular-season filtering and separate all-strength scores. Set `mapping_verified: true` only for checked sources. Record actual retrieval times; absent timestamps use explicitly labelled local file time.
4. Generate a candidate without replacing the published snapshot:

```sh
python3 -m pipeline import --config real-config.json --output /tmp/leafs-real.json
```

Inspect the candidate and original CSV rows. Once the acceptance checks are complete, run:

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

On push, an independent non-blocking source-availability job runs `scripts/probe_sources.py` against three provider-listed TOR CSVs. It prints HTTP outcomes and original CSV headers, plus one field-limited representative row from each of the latest three distinct 2025-season TOR all-strength games when identifiable. Player names and other fields are excluded. A small JSON receipt is uploaded as `leafs-lab-source-validation`; raw CSVs are never committed. This checks GitHub runner access despite local HTTP 403 and does not establish verified semantic mappings, switch data mode, or refresh/publish the app. Its failures cannot mask the core validation/build job. The first hosted runner receipt still needs review.

To run this source-only probe from a permitted network:

```sh
python3 scripts/probe_sources.py --output /tmp/leafs-source-receipt.json
```

`.github/workflows/refresh.yml` prepares daily refresh at **11:17 UTC** and manual `workflow_dispatch`. Its data job is **gated off by default**: both scheduled and manual jobs skip unless repository variable `LEAFS_REAL_DATA_VALIDATED` is exactly `true`. No scheduled job tries the null/unverified candidate configuration. No unattended refresh is currently installed or enabled in this environment.

Before enabling it, complete real acceptance, commit a portable checked configuration (suggested `config/moneypuck-real.json`) containing listed HTTPS MoneyPuck URLs and all `mapping_verified: true`, and set `LEAFS_REAL_CONFIG_PATH` if using another path. Do not commit private raw files or credentials. Enable `LEAFS_REAL_DATA_VALIDATED=true` only after the real checks; the manual input can choose a checked repository configuration path. Disable that variable if mappings or access cease to be valid.

The refresh downloads to a separate candidate, validates the frontend contract, runs the checks/build, and uploads a validated JSON/build artifact. Errors produce no published artifact and never deploy over the previous hosted snapshot. The workflow has read-only repository permissions and does not commit output or publish to Sites.

**Hosted refresh is not wired.** The Site is a static snapshot. Uploading artifacts or adding a cron expression does not update hosting. A future supported Site publication step and deployment credentials must be configured and verified before claiming unattended hosted updates. No paid resources are required or provisioned.

## Navigation and access

Shared hash URLs retain view, season, strength, game/player selection, window, player search, numeric sort and order across reload/back navigation. The initial view opens the latest available completed game. Missing selected strengths stay unavailable. Charts have expandable accessible data tables; form tables support horizontal scrolling within their own region. Every control has a visible label and keyboard focus style.

Data: [MoneyPuck.com](https://moneypuck.com/data.htm). Definitions: [MoneyPuck glossary](https://moneypuck.com/glossary.htm). This project is not affiliated with the Toronto Maple Leafs, NHL or MoneyPuck.
