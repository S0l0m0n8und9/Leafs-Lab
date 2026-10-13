# Real-data source validation report

## Published coverage

The published snapshot is real MoneyPuck Toronto regular-season data for starting season `20252026`: **82 games, 1,476 skater game appearances, and 91 goalie game appearances**, covered through **2026-04-15**. The 2023–24, 2024–25, and 2026–27 seasons are listed as unavailable; the player source files used here cover only 2025–26. This is a static snapshot and does not update automatically.

The source URLs are the listed [Toronto career team-game CSV](https://moneypuck.com/moneypuck/playerData/careers/gameByGame/regular/teams/TOR.csv), [2025–26 skater-game CSV](https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/2025/regular/skaters/TOR.csv), and [2025–26 goalie-game CSV](https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/2025/regular/goalies/TOR.csv). MoneyPuck’s data page lists game-by-game team, skater, and goalie downloads and requires credit when its data is shown.

## Source provenance

A permitted GitHub Actions runner downloaded the complete CSVs on 2026-10-13. The bundle preserves the pipeline download timestamps and SHA-256 hashes of the original bytes (including excluded seasons in the career team file):

| Source | Retrieved (UTC) | SHA-256 |
| --- | --- | --- |
| Teams | 2026-10-13 09:53:22 | `1e88e24f39180a90f547e4bdebe7d013cd2a109976aebc78a4ed8b218e972661` |
| Skaters | 2026-10-13 09:53:22 | `bbb04d9b7406a12180a3653d142e86016388537c340745efae3c78d3a4a3e261` |
| Goalies | 2026-10-13 09:53:23 | `4a61202e5cbf615bf0698911bf34c0c5087f341b45cdb9fe05ea57c995589c3f` |

`mapping_verified` is true for each source in `config/moneypuck-real.json`; the mapping reflects checks against the full candidate files, not just their headers. The artifact and raw CSVs were temporary validation inputs and are not committed.

## Field and row reconciliation

The complete imports were reconciled to their corresponding original raw rows, limited to the configured `all` and `5on5` situations for Toronto and the 2025–26 regular season. Every compared value matched: **1,558 team-field checks across 164 strength rows, 23,616 skater-field checks across 2,952 strength rows, and 1,274 goalie-field checks across 182 strength rows**. No missing game/player join or value mismatch was found. Player files have no season column, so the explicit `season_constant: "20252026"` is checked against each full game ID.

Mappings checked include team game ID, YYYYMMDD date, opponent, home/away, situation, raw unadjusted xGoals, goals, shots on goal and `iceTime`; skater ID/name/position, individual goals/xGoals/shots, on-ice xGF/xGA and `icetime`; and goalie ID/name, `xGoals`, `goals`, `ongoal` and `icetime`. The source dictionary and [MoneyPuck glossary](https://moneypuck.com/glossary.htm) describe xGoals as the model-estimated value of unblocked shot attempts and goalie GSAx as expected goals against minus actual goals allowed.

Goalie saves are derived per source row as `ongoal - goals`; missing inputs remain null and impossible negative values fail import validation. This is consistent with the observed source rows and preserves `saves + goals allowed = shots on goal`. Goalie GSAx uses the goalie’s own matched xGA/GA, never team totals. Team goals allowed and goalie goals allowed are intentionally not forced equal: goalie rows describe goalie time and exclude goals not charged to that goalie, such as some empty-net situations.

Three explicit game spot checks, all matching the raw CSVs, are:

| Date | Opponent | TOR goals | Opponent goals | TOR xGF | TOR xGA |
| --- | --- | ---: | ---: | ---: | ---: |
| 2025-10-08 | MTL | 5 | 2 | 3.803 | 2.991 |
| 2026-01-03 | NYI | 3 | 4 | 2.008 | 2.088 |
| 2026-04-15 | OTT | 1 | 3 | 1.642 | 4.995 |

The 2026-04-15 OTT game is also an example where team goals against (3) differs from goalie-source goals allowed (2); they are distinct measures. Player spot checks included John Tavares against the 2025-10-08 raw row (0 goals, 0.159 individual xG, 2 shots, 1,053 seconds, on-ice xGF/xGA 2.340/0.561) and the 2026-04-15 raw row for Luke Haymes (0 goals, 0.004 individual xG, 1 shot, 884 seconds, on-ice xGF/xGA 0.501/0.559). Goalie rows were separately reconciled, including the 2025-10-08 Anthony Stolarz row (2 goals allowed, 2.991 xGA, 31 shots against, 29 derived saves, 3,582 seconds).

## Score basis and limitations

MoneyPuck’s `goalsFor` / `goalsAgainst` values are the analytical game goals, not the final score after shootout tiebreakers. The app labels the score as “Goals before shootout” and leaves a tied score’s outcome unknown. Five Toronto games have tied pre-shootout goals in this snapshot. This was checked against NHL shootout reports/recaps for sample cases: [MTL–TOR, Dec. 6](https://www.nhl.com/scores/htmlreports/20252026/SO020444.HTM), [TOR–VAN, Jan. 31](https://www.nhl.com/scores/htmlreports/20252026/SO020869.HTM), and [TOR–NJD, Mar. 4](https://www.nhl.com/scores/htmlreports/20252026/SO020971.HTM). Those records show the game-level score needs a separate shootout tiebreaker; the shootout result is not substituted into analytical goals.

Coverage is only one complete regular season. The values are descriptive outputs from MoneyPuck’s model and game-event data, not causal conclusions, a forecast, or an official NHL record. Credit MoneyPuck in views using its statistics. The 48-hour source-age indicator is about this static snapshot’s pipeline retrieval timestamp, not the provider’s last data update.

## Verification performed

On the verified candidate and final data: Python `unittest` suite, frontend tests, TypeScript typecheck, and Vite production build passed. The GitHub CI run for candidate preparation also passed. Raw files remain outside git; only derived data, its provenance hashes, and this report are published.

Unattended refresh is not enabled: the repository validation gate remains off, and the hosted Site is a static snapshot.
