# Current games: Leafs Lab proof of value

Snapshot retrieved 13 October 2026 at 10:18 UTC. Six completed 2026–27 Toronto games, 29 September–10 October; 108 skater appearances and six goalie appearances. Every statistical comparison below uses this season only. Players are actual Toronto participants, not a projected roster.

The decision: can Leafs Lab help Ben engage with the current games through useful questions, evidence and follow-up? This is a proof of value, not a product feature release. The useful proposed flow is **before the game: what to watch → after the game: what actually happened → next game: what still needs checking**.

Jim Hiller is Toronto's current coach ([team announcement](https://www.nhl.com/mapleleafs/news/maple-leafs-name-jim-hiller-41st-head-coach-in-franchise-history)). The current data includes Marchenko following the [September trade](https://www.nhl.com/mapleleafs/news/maple-leafs-complete-trade-with-columbus). These establish current context; none of the observations below identifies a causal coaching effect.

## Three current questions to watch

### 1. Is Toronto creating dangerous chances, or just keeping the shot count close?

At five-on-five, the shot count is nearly even: 130 for, 132 against. Expected goals are 10.253 for and 14.717 against: **41.1% of chance quality**. The 188 unblocked attempts for averaged 0.0545 xG each; the 204 against averaged 0.0721. Opponents' attempts averaged **32.3% more modelled goal probability**. High-danger unblocked attempts were 2 for and 11 against; MoneyPuck defines high danger as at least 20% goal probability.

Toronto had less than half the five-on-five xG in five of the six games. Omitting any one game leaves the aggregate share between **39.4% and 42.5%**. That is a sensitivity check, not a confidence interval or prediction: one game does not drive the observed gap, but opponent strength, deployment and score state remain unadjusted.

An optional descriptive decomposition splits the observed -4.464 xG gap into -1.013 from attempt-count differences and -3.451 from average-quality differences. The symmetric product formula averages both teams' values to allocate the arithmetic interaction. It does not identify causes or a coach's contribution.

**Watch:** When Toronto has a spell of possession, is the eventual attempt dangerous? Do opponents get a threatening look without needing much volume? Compare the visual impression with shot share and xG share after the game.

### 2. Where is Bobrovsky actually making the difference?

| Four Bobrovsky appearances | Minutes | xGA | GA | GSAx |
| --- | ---: | ---: | ---: | ---: |
| All strengths, inclusive | 242.5 | 16.675 | 12 | +4.675 |
| Five-on-five | 187.4 | 10.311 | 12 | -1.689 |
| Four-on-five | 27.7 | 4.579 | 0 | +4.579 |

His positive overall GSAx hides opposite results in these two situations. Other situations also contribute, so the displayed subset rows are not a complete partition; never add the inclusive all-strength total to its components. Across both goalies, Toronto allowed one four-on-five goal from 6.138 goalie-source xGA. That is **+5.138 four-on-five GSAx** across six team games, not an overall penalty-kill percentage.

**Watch:** During each four-on-five kill, does Toronto prevent dangerous looks, or does the goalie repeatedly have to stop them? Track chance suppression and saves separately. Four goalie appearances cannot establish future performance or prove a system is good or bad.

### 3. Is Marchenko's scoring line hiding useful chance creation?

Marchenko has **zero five-on-five goals from 1.457 individual xG** in 87.8 minutes across six games. That individual xG is second among Toronto's participants in this snapshot, narrowly behind Nylander's 1.508. Toronto's on-ice xG share with Marchenko was **54.0%**; with Nylander it was **36.4%**, despite Nylander's three five-on-five goals.

That is a distinction between a player's shots, scoring and the shared results while he is on the ice. It is not an isolated player-impact estimate: teammates, matchups, usage and score effects differ. Also, Marchenko recorded **zero unblocked attempts in the latest Colorado game**. The six-game chance-generation signal should be followed rather than treated as a current certainty.

**Watch:** If he plays, does Marchenko get his shooting opportunities back? Check his own attempts and the chances Toronto creates during his minutes after the game. Do not label him a disappointment from goals alone or promise that he will start scoring.

## How the latest game would be read

![Current-season shot-quality comparison and Bobrovsky strength split](current-proof.png)

Toronto's 6–3 win at Colorado included a 3–3 five-on-five score, with five-on-five xG **1.528–2.808 (35.2%)**. The remaining goal difference came from two five-on-four goals and one goal in the team `other` category. NHL's [game summary](https://www.nhl.com/gamecenter/tor-vs-col/2026/10/10/2026020080/summary) confirms the final score and an empty-net goal. This supports a precise review of how Toronto won; it does not make the win undeserved or diagnose its cause.

## Does this add something useful?

MoneyPuck already provides the component metrics and strength controls in its [team stats](https://moneypuck.com/teams.htm), [goalie stats](https://moneypuck.com/goalies.htm), [player views](https://moneypuck.com/player.htm) and [game page](https://moneypuck.com/g.htm?id=2026020080). GSAx and xG share themselves fail the differentiation test. The custom contribution here is the cross-view synthesis, explicit sample sensitivity, descriptive quality/volume decomposition and a persistent question to revisit in the next game.

The evidence supports testing a **current-game companion**, with three watch questions followed by the same questions answered after the game. It does not establish exclusive insights, an analytical edge or that no competitor offers a similar experience. A full competing-site interaction audit was not completed; the Natural Stat Trick page was unavailable to the research tool. Ben's assessment of whether these questions improve his engagement remains the product-value test.

## Inputs, calculation and quality

Listed MoneyPuck inputs: [Toronto team games](https://moneypuck.com/moneypuck/playerData/careers/gameByGame/regular/teams/TOR.csv), [2026 skater games](https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/2026/regular/skaters/TOR.csv), [2026 goalie games](https://moneypuck.com/moneypuck/playerData/teamPlayerGameByGame/2026/regular/goalies/TOR.csv). Definitions: [MoneyPuck glossary](https://moneypuck.com/glossary.htm). Source files were downloaded by [GitHub Actions run 38382465038](https://github.com/S0l0m0n8und9/Leafs-Lab/actions/runs/38382465038); the temporary artifact retains original CSVs for three days. The portable JSON contains only the selected current-season input columns and records original file hashes and retrieval times.

| Original input | SHA-256 |
| --- | --- |
| Teams | `1e88e24f39180a90f547e4bdebe7d013cd2a109976aebc78a4ed8b218e972661` |
| Skaters | `a211f3c2478113e47c9005f254be6bd03c6c7b69034ed45dbbd44601e6be4921` |
| Goalies | `7d392c1aa8aa3a7ed72d7d3e46c375e194fa6ad207ec8a9c1a00741476f69435` |

Run from the repo root: `python3 analysis/current_game_proof.py --plot`. The standard-library calculations validate identifiers, unique keys, game/date/opponent joins, strength coverage, additive individual/team statistics and the decomposition identity. Matplotlib is required only for the optional portable figure. The script executed successfully and the generated figure was visually inspected.

One source caveat is preserved: individual skater `other` totals do not reconcile to team `other` totals for Nashville and Vegas. Those player partitions are excluded from the findings; no cause for the discrepancy is assumed. All-strength and five-on-five individual totals used above reconcile to team totals within a 0.02 xG rounding tolerance. Missing input values fail rather than becoming zero. On-ice xG overlaps between players and is not summed to allocate team contributions.

The analysis is descriptive, uses raw unadjusted xG, and has six-game sampling uncertainty. It contains no previous-season baseline, new xG model, tactical tracking or coach attribution. Notebook runtime packages are unavailable; the preserved Python script and input JSON provide the runnable audit trail.
