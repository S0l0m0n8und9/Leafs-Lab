# Leafs Lab — product and build specification

Version 1 · 12 October 2026 · Owner: Ben Jones

## Purpose and agreed scope

Build a useful, entertaining Toronto Maple Leafs fan site that answers three questions: did the performance match the result; which players are creating chances versus scoring above or below expectation; and are the team's underlying numbers improving? Ben accepted the Leafs Lab concept and explicitly requested a build delegated to subagents. This document is the implementation authority and the handoff for future Work sessions.

The MVP has three analytical views and a methodology view. It uses reproducible calculations, plain explanations and visible samples. It is a non-commercial personal project. No AI inference, accounts, payments, betting advice, live xG, player photos or official logos. Line combinations, a Curse Index, forecasts, shot maps and natural-language Q&A are later releases.

## Architecture decision

| Option | Tradeoff | Decision |
|---|---|---|
| Python batch pipeline + static React site | Cheap, reproducible, no server to maintain; updates require regenerated data | Choose this |
| Browser downloads raw CSVs | Large downloads, CORS and repeated work on every visit | Reject |
| Continuously running backend | Flexible live features, greater operational burden | Defer |

Python normalizes provider CSVs, computes metrics and exports a versioned JSON bundle. DuckDB is the preferred local analytical store; if it cannot be installed here, a standard-library CSV implementation must retain the same contract and the limitation must be recorded. React + TypeScript + Vite produce a static `dist/` site. There are no provider requests from visitors' browsers. Hosting uses a new private Site; the source is synchronized to its native Git repository. Ben subsequently authorized pushing the completed source to https://github.com/S0l0m0n8und9/Leafs-Lab. Preserve the Sites native source repository and push the same reviewed source to that GitHub repository after the build.

## Sources and feasibility

MoneyPuck is the MVP source for team, skater and goalie game data. Its downloads page permits non-commercial use with clear attribution, lists game data and dictionaries, and identifies nightly shot updates. Use only listed downloads; do not scrape its analytical pages. Source: https://moneypuck.com/data.htm (checked 12 October 2026).

Metric definitions are grounded in https://moneypuck.com/glossary.htm. Expected goals are modelled chance quality, not an exact prediction or proof of luck. Its basic xG model does not account for individual shooting talent. Keep our editorial labels separate from MoneyPuck's own model outputs.

Potential later enrichment: NHL schedule, score and event endpoints. NHL terms restrict automated collection and reuse; review before adding. https://www.nhl.com/info/terms-of-service. Core MVP must work without NHL API access. Do not claim API contracts were verified: the endpoint could not be inspected in this session.

Candidate team download: https://moneypuck.com/moneypuck/playerData/careers/gameByGame/all_teams.csv. Resolve season-specific skater and goalie download links from the downloads page, validate dictionaries and headers, and store URLs in configuration. Headers and CSV contents were not retrievable in this environment: direct download attempts returned 403. Imported data must therefore be validated, not accepted on assumed column names.

Target regular seasons 2023–24, 2024–25, 2025–26 and 2026–27 when available. Discover coverage from files, not the clock. Never fabricate current rosters, scores or statistics. If live downloads remain blocked, ship a functional sample mode with a prominent persistent banner: “Sample data — illustrative games and players, not actual NHL results.” Record that real-data acceptance remains outstanding. Real import must be supported via local CSV paths. Fixture names should be fictional player names, not invented statistics attached to real people.

## Navigation and presentation

Mobile-first, readable on an iPhone at 390 px. A premium editorial sports feel: deep Leafs blue, white/ice backgrounds, restrained cyan highlights, large numerals, compact analytical charts and strong typography. Original abstract rink geometry is acceptable; external imagery is unnecessary. Avoid a generic grid of interchangeable metric cards. All interactive controls have visible labels, keyboard access and focus states. Positive/negative values have text or symbols as well as colour.

Primary navigation: Games, Player form, Season trends, Methodology. Shared controls: available season and strength (`5on5` default; `all` alternative). Hash or query routing must preserve view, season, strength, game and player across reload and browser back. Show the latest available completed game on initial load. An empty current season may fall back to the latest populated season with an explanation. Dates display provider game date as a calendar date, without timezone-shifting it. Data timestamps are UTC internally and display in the viewer's locale.

### Games — Reality Check

Show a season game list with opponent, date, home/away, recorded goals, xG share and verdict. Clicking a game opens its report. The report includes:

- Recorded all-strength goals for and against, plus result if unambiguous. If the provider's score basis excludes a shootout deciding goal, label it “Goals before shootout”; do not infer a winner from tied goals. Unknown outcome is null.
- Selected-strength xGF, xGA, xG share, goals and shots; make strength visible beside every chart and verdict.
- A horizontal xG comparison, actual-goal versus xG comparison, and a brief deterministic explanation citing the figures.
- Goalie rows: xGA, GA, GSAx and sample. Use goalie-source totals; never call team xGA minus all goals conceded goalie GSAx because empty-net goals can contaminate it.
- Source, download/retrieval time, covered-through game date and links to methodology.

Verdict is a descriptive heuristic, not a win probability. At xG share >=55%, Toronto “led chance quality”; <=45%, “trailed chance quality”; otherwise “chance quality was close”. Combine with a reliable result: “Strong process, positive result”, “Encouraging underlying performance”, “Won despite trailing chance quality”, “Result matched weaker chance quality”, or “A close game on chance quality”. With an unknown result, use only the chance-quality phrase. With missing xG, use “Analysis unavailable”. Explain that score effects, special teams, model limits and finishing can affect the interpretation; never diagnose causation from xG alone.

### Player form — Hot or just scoring above expectation?

List players who appeared for TOR during the selected window, not a guessed current roster. Window: last 5, 10 (default) or 20 completed TOR team games in selected season. Player games played is appearances in that window, not N automatically. Skaters show goals, individual xG, goals minus individual xG, shots, TOI minutes, individual xG/60, goals/60, on-ice xG share, and a form label. Show positions only when supplied. Search by name; sort by any numeric displayed metric; nulls sort last in both directions. Details show a per-game trend and a preceding, non-overlapping 20-team-game baseline when available. Compare like strength and rates, never raw unequal-window totals.

Editorial labels: goals minus xG >=2 → “Finishing above expectation”; <=-2 → “Finishing below expectation”; otherwise “Finishing near expectation”. These require at least 5 appearances and 60 minutes at selected strength. Otherwise show “Small sample”. No claim that an above-expectation scorer is merely lucky or will regress. Goalies have a separate table: appearances, minutes, xGA, GA, GSAx, saves/shot denominator if available; no skater form labels or skater eligibility rules.

### Season trends

Display per-game and rolling 10-team-game xG share; cumulative selected-strength goals minus xG for and against; and goalie GSAx from goalie rows. Display season aggregate xG share and per-60 xGF/xGA using team ice time. Never average percentages to produce aggregates. The initial rolling window may be shorter and must show its size. Compare seasons only at a common games-played horizon and the same strength; report the horizon. Include an accessible table behind charts and empty states when a metric is absent. No league rankings or playoff forecast in MVP.

### Methodology and freshness

Define xG, individual versus on-ice measures, per-60 rates, GSAx, thresholds, strength, windows and limitations. Credit “Data: MoneyPuck.com” wherever derived statistics appear, with a link. Show `data_mode`, source retrieval times and maximum covered game date. A successful rebuild timestamp is not proof of new provider data. Mark snapshots older than 48 hours as old; acknowledge off-season/no-game intervals. Distinguish no data, missing metric, fetch error, invalid schema and stale snapshot. Sample mode remains labelled on every view, including shared links.

## Metric rules

| Metric | Exact calculation |
|---|---|
| xG share | `100 * sum(xGF) / (sum(xGF) + sum(xGA))`; zero denominator → null |
| Individual finishing difference | `sum(individual_goals) - sum(individual_xg)` |
| Rate per 60 | `3600 * sum(numerator) / sum(toi_seconds)`; zero time → null |
| GSAx | `sum(goalie_xGA) - sum(goalie_GA)` using matched goalie strength/sample |
| Rolling xG share | Ratio of sums over up to last 10 team games; never mean of percentages |
| Player sample | Count appearances and sum selected-strength ice time within team-game window |

Keep `all` and `5on5` rows separate. Do not sum all rows with situation rows. Use raw unadjusted xGoals consistently; do not mix score/flurry-adjusted figures. Scores and actual outcomes are separate from selected-strength performance goals. Rates use seconds as the canonical time unit. Shootouts do not contribute to analytical goals or xG. Missing data is null, never zero. Calculations use full precision; display xG to two decimals, percentages to one, rates to two.

## Data contract and pipeline

Export `public/data/leafs-lab.json`, schema version 1, with `{schema_version, data_mode, generated_at, sources, coverage, seasons}`. `data_mode` is `real` or `sample`; `sources` contains URL, retrieved_at, hash and validation status; coverage carries maximum game date and unavailable seasons. Each season contains id, label, games, skaters and goalies. Each game has id (string), date, opponent, home_away, result (win/loss/null), score_for/against (number/null), score_basis and stats keyed by strength. Stats carry xgf/xga/gf/ga/shots_for/shots_against/toi_seconds (number/null). Skater rows have game_id, player_id, name, position and stats by strength; fields are goals, ixg, shots, toi_seconds, onice_xgf/onice_xga. Goalie rows use xga, ga, shots_against, saves, toi_seconds by strength. Exact optional fields and canonical schema are documented in `docs/data-contract.md` by Task 1 and consumed by Task 2 without guessing.

Adapter validates required identifiers, TOR/opponent pairing, game type, situations, units, non-negative counts and uniqueness. Keys: team-game-situation; player-team-game-situation. Exact repeated rows may deduplicate; conflicting rows fail. Source IDs may differ between files; normalization must be documented and tested before joining. Exclude preseason/playoffs in v1 and do not join by display names. Unknown required columns fail with a useful error. Preserve source provenance and raw downloads outside tracked source. Malformed/failed refresh must preserve the prior published JSON; write validated snapshots atomically. Reprocessing identical inputs must produce identical analytical values. Provide CLI download and local-import modes, plus explicit fixture mode; no silent fallback from real to sample.

## Refresh and delivery

Provide manual refresh and daily refresh configuration (11:17 UTC), with provider delays handled as unavailable rather than fabricated. CI runs calculation tests, type checking, frontend tests and production build before publishing artifacts. Do not imply the schedule is active simply because a workflow file exists. The initial Site is an inspectable static snapshot; automatic hosted updates require an actually configured scheduler and deployment credentials. Deliver clear instructions and state whether unattended refresh is installed or only prepared. No paid service purchases.

## Acceptance and tests

1. All four views work; game selection, filters, player search/sort, windows, deep links and back navigation change real displayed content.
2. A hand-checkable fixture has xGF=3.5, xGA=1.9 → xG share=64.8148…%; goals=2, ixG=3.5 → difference=-1.5; 2 goals over 120 minutes → 1 goal/60; goalie xGA=1.9, GA=4 → GSAx=-2.1.
3. Threshold boundaries, zero denominators, missing values, duplicates/conflicts, mixed situations, seconds/minutes, tied scores, traded players, short windows and ratio-of-sums have meaningful tests.
4. Sample mode is unmistakable. Real mode requires validated real CSVs and spot checks of at least three TOR games and three player rows against their inputs. No sample statistic may be presented as a real result.
5. Production build and calculation tests pass. Responsive UI has no horizontal page overflow at 390 px; chart information has a text/table alternative. Browser QA is performed only if supported browser tools exist; otherwise disclose the limit.
6. Publish a private working Site, retain source and handoff documents, and report actual data coverage, test results, refresh state and remaining blockers.

## Future Work handoff

Build/continue Leafs Lab from this specification and `docs/superpowers/plans/2026-10-12-leafs-lab.md`. Use delegated implementation with independent reviews. Start by reading the execution ledger and Git history; continue unfinished work. Keep the three analytical views, deterministic metrics and explicit provenance. If downloads are blocked, preserve the labelled sample build and finish the real-data adapter; report the blocker. Do not add line blending, forecasts, AI Q&A or commercial features. Publish using the Sites workflow, and distinguish tested code from unverified source mappings or inactive schedules.
