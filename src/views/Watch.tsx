import type { Bundle, Season } from '../data.js';
import type { Route } from '../route.js';
import { routeHash } from '../route.js';
import { Empty } from '../components/common.js';
import {
  matchesWatchSnapshot,
  watchSnapshot as proof,
} from '../watchSnapshot.js';

const fixed = (n: number, digits = 3) => n.toFixed(digits);
const signed = (n: number) => (n < 0 ? '−' : '+') + Math.abs(n).toFixed(3);

export default function Watch({
  bundle,
  season,
  route,
}: {
  bundle: Bundle;
  season: Season;
  route: Route;
}) {
  const gameLink = routeHash({
    ...route,
    view: 'games',
    strength: '5on5',
    game: season.games.at(-1)?.id ?? '',
    player: '',
    search: '',
  });
  const playerLink = (player: string) =>
    routeHash({
      ...route,
      view: 'players',
      strength: '5on5',
      game: season.games.at(-1)?.id ?? '',
      player,
      window: 10,
      search: '',
    });
  if (!matchesWatchSnapshot(bundle, season))
    return (
      <>
        <div className="view-heading">
          <p className="eyebrow">CURRENT-GAME COMPANION</p>
          <h1>Watch guide</h1>
        </div>
        <Empty>
          <h2>Watch questions need a matching verified snapshot</h2>
          <p>
            The published evidence guide does not match this dataset. Explore
            the available game and player reports while the guide is refreshed.
          </p>
          <a href={gameLink}>Open the latest available game report →</a>
        </Empty>
      </>
    );
  const team = proof.team,
    player = proof.marchenko;
  const low = Math.min(...team.sensitivity.map((s) => s.xg_share));
  const high = Math.max(...team.sensitivity.map((s) => s.xg_share));
  return (
    <>
      <div className="view-heading watch-heading">
        <p className="eyebrow">CURRENT-GAME COMPANION / {season.label}</p>
        <h1>
          Watch the game.
          <br />
          Test the story.
        </h1>
        <p className="standfirst">
          Three questions to take into the next game, grounded in Toronto’s six
          games from September 29 through October 10, 2026. After watching,
          inspect the game and player evidence, then carry the unresolved
          questions forward.
        </p>
        <p className="watch-scope">
          A six-game starting point · Fixed strength labels on each card ·
          Snapshot downloaded October 13
        </p>
      </div>
      <div className="watch-cards">
        <article className="watch-card" aria-labelledby="attack-question">
          <div className="watch-card-heading">
            <span className="watch-number">01</span>
            <div>
              <p className="eyebrow">CHANCE QUALITY / 5-ON-5</p>
              <h2 id="attack-question">
                Are Toronto’s attacks dangerous enough?
              </h2>
            </div>
          </div>
          <div className="watch-metrics">
            <div>
              <strong>{fixed(team.shot_share, 1)}%</strong>
              <span>Toronto shot-on-goal share</span>
            </div>
            <div>
              <strong>{fixed(team.xg_share, 1)}%</strong>
              <span>Toronto expected-goal share</span>
            </div>
          </div>
          <p>
            The shots are nearly even, but the quality of the unblocked attempts
            favours the opposition. Toronto was below 50% of expected goals in{' '}
            {team.games_below_half_xg} of six games.
          </p>
          <aside className="watch-prompt">
            <strong>Watch for</strong>
            <p>
              Does sustained possession lead to threatening attempts? Do
              opponents create dangerous looks even when Toronto holds the shot
              count close?
            </p>
          </aside>
          <details className="watch-evidence">
            <summary>Inspect the evidence and limits</summary>
            <div
              className="table-scroll"
              role="region"
              aria-label="Six-game chance quality evidence"
              tabIndex={0}
            >
              <table>
                <caption>Six-game totals · 5-on-5 · MoneyPuck model</caption>
                <thead>
                  <tr>
                    <th scope="col">Measure</th>
                    <th scope="col">Toronto</th>
                    <th scope="col">Opponents</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Shots on goal</th>
                    <td>{team.shots_for}</td>
                    <td>{team.shots_against}</td>
                  </tr>
                  <tr>
                    <th scope="row">Expected goals</th>
                    <td>{fixed(team.xgf)}</td>
                    <td>{fixed(team.xga)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Unblocked attempts</th>
                    <td>{team.unblocked_attempts_for}</td>
                    <td>{team.unblocked_attempts_against}</td>
                  </tr>
                  <tr>
                    <th scope="row">xG per unblocked attempt</th>
                    <td>{fixed(team.xg_per_unblocked_attempt_for, 4)}</td>
                    <td>{fixed(team.xg_per_unblocked_attempt_against, 4)}</td>
                  </tr>
                  <tr>
                    <th scope="row">High-danger attempts</th>
                    <td>{team.high_danger_for}</td>
                    <td>{team.high_danger_against}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="fine-print">
              Removing one game at a time gives a Toronto xG share of{' '}
              {fixed(low, 1)}–{fixed(high, 1)}%: a sensitivity check, not a
              confidence interval. Raw xG is not adjusted for opponents, score
              state or deployment. It cannot establish a coaching effect.
            </p>
            <div
              className="table-scroll"
              role="region"
              aria-label="Shot and expected-goal shares by game"
              tabIndex={0}
            >
              <table>
                <caption>Does the gap appear game by game? · 5-on-5</caption>
                <thead>
                  <tr>
                    <th scope="col">Date / opponent</th>
                    <th scope="col">SOG share</th>
                    <th scope="col">xG share</th>
                  </tr>
                </thead>
                <tbody>
                  {proof.games.map((g) => (
                    <tr key={g.game_id}>
                      <th scope="row">
                        <a
                          href={routeHash({
                            ...route,
                            view: 'games',
                            strength: '5on5',
                            game: g.game_id,
                            player: '',
                          })}
                        >
                          {g.date.slice(5)} / {g.opponent}
                        </a>
                      </th>
                      <td>{fixed(g.shot_share, 1)}%</td>
                      <td>{fixed(g.xg_share, 1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <a className="watch-link" href={gameLink}>
            Inspect the latest game →
          </a>
        </article>
        <article className="watch-card" aria-labelledby="goalie-question">
          <div className="watch-card-heading">
            <span className="watch-number">02</span>
            <div>
              <p className="eyebrow">GOALTENDING / FOUR APPEARANCES</p>
              <h2 id="goalie-question">
                Where is Bobrovsky making the difference?
              </h2>
            </div>
          </div>
          <div className="watch-metrics three">
            {proof.bobrovsky.map((g) => (
              <div key={g.strength}>
                <strong>{signed(g.gsax)}</strong>
                <span>
                  GSAx ·{' '}
                  {g.strength === 'all'
                    ? 'all strengths'
                    : g.strength === '5on5'
                      ? '5-on-5'
                      : '4-on-5'}
                </span>
              </div>
            ))}
          </div>
          <p>
            The all-strength total hides a split: Bobrovsky allowed more goals
            than expected at 5-on-5, while allowing none against 4.579 xGA at
            4-on-5.
          </p>
          <aside className="watch-prompt">
            <strong>Watch for</strong>
            <p>
              Does the penalty kill prevent dangerous looks, or does it ask for
              repeated difficult saves? Separate the defensive work from the
              save that ends the sequence.
            </p>
          </aside>
          <details className="watch-evidence">
            <summary>Inspect the evidence and limits</summary>
            <div
              className="table-scroll"
              role="region"
              aria-label="Bobrovsky evidence by strength"
              tabIndex={0}
            >
              <table>
                <caption>
                  Sergei Bobrovsky · Four appearances · GSAx = goalie xGA −
                  goals allowed
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Strength</th>
                    <th scope="col">Minutes</th>
                    <th scope="col">xGA</th>
                    <th scope="col">GA</th>
                    <th scope="col">GSAx</th>
                  </tr>
                </thead>
                <tbody>
                  {proof.bobrovsky.map((g) => (
                    <tr key={g.strength}>
                      <th scope="row">
                        {g.strength === 'all'
                          ? 'All strengths'
                          : g.strength === '5on5'
                            ? '5-on-5'
                            : '4-on-5'}
                      </th>
                      <td>{fixed(g.minutes, 1)}</td>
                      <td>{fixed(g.xga)}</td>
                      <td>{g.ga}</td>
                      <td>{signed(g.gsax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine-print">
              All strengths includes 5-on-5 and 4-on-5; these rows overlap and
              must not be added together. The other strength situations explain
              the rest of the total. This is a small sample of model-based
              outcomes, not a forecast of future saves or an overall
              penalty-kill percentage.
            </p>
          </details>
          <a className="watch-link" href={playerLink('8475683')}>
            Inspect Bobrovsky’s 5-on-5 appearances →
          </a>
        </article>
        <article className="watch-card" aria-labelledby="player-question">
          <div className="watch-card-heading">
            <span className="watch-number">03</span>
            <div>
              <p className="eyebrow">CHANCE CREATION / 5-ON-5</p>
              <h2 id="player-question">
                Is Marchenko’s scoring line hiding chance creation?
              </h2>
            </div>
          </div>
          <div className="watch-metrics three">
            <div>
              <strong>{player.goals}</strong>
              <span>Goals · six appearances</span>
            </div>
            <div>
              <strong>{fixed(player.ixg)}</strong>
              <span>Individual xG · team rank 2</span>
            </div>
            <div>
              <strong>{fixed(player.onice_xg_share, 1)}%</strong>
              <span>Shared on-ice xG share</span>
            </div>
          </div>
          <p>
            Marchenko’s zero goals miss some of the chance creation during his
            first six appearances. But the latest game against Colorado included
            zero unblocked attempts by Marchenko.
          </p>
          <aside className="watch-prompt">
            <strong>Watch for</strong>
            <p>
              If he plays, does Marchenko get shooting opportunities back? Does
              Toronto keep creating chances during his minutes?
            </p>
          </aside>
          <details className="watch-evidence">
            <summary>Inspect the evidence and limits</summary>
            <dl className="watch-facts">
              <div>
                <dt>5-on-5 minutes</dt>
                <dd>{fixed(player.minutes, 1)}</dd>
              </div>
              <div>
                <dt>Individual expected goals</dt>
                <dd>
                  {fixed(player.ixg)} · 2nd among current Toronto participants
                </dd>
              </div>
              <div>
                <dt>On-ice xGF / xGA</dt>
                <dd>
                  {fixed(player.onice_xgf)} / {fixed(player.onice_xga)}
                </dd>
              </div>
              <div>
                <dt>Latest game unblocked attempts</dt>
                <dd>
                  {player.latest_unblocked_attempts} · October 10 at Colorado
                </dd>
              </div>
            </dl>
            <p className="fine-print">
              On-ice numbers are shared outcomes; they do not isolate
              Marchenko’s individual impact or adjust for teammates and
              opponents. Six appearances and zero goals do not imply that
              scoring is inevitable.
            </p>
          </details>
          <a className="watch-link" href={playerLink(player.player_id)}>
            Inspect Marchenko’s six appearances →
          </a>
        </article>
      </div>
      <section className="watch-followup" aria-labelledby="latest-question">
        <div>
          <p className="eyebrow">AFTER THE GAME / LATEST EVIDENCE</p>
          <h2 id="latest-question">What did the 6–3 win at Colorado settle?</h2>
          <p>
            At 5-on-5, goals were 3–3 and Toronto generated 1.528 xG against
            2.808. The result and the chance balance tell different parts of the
            game. Revisit the quality question alongside the score.
          </p>
        </div>
        <a href={gameLink}>Open October 10’s game report →</a>
      </section>
      <p className="fine-print watch-method">
        MoneyPuck supplies the underlying data and expected-goal model. Leafs
        Lab adds cross-metric questions, strength-specific comparisons and
        linked evidence for watching current games. This guide is pinned to the
        source hashes and six-game coverage below; a changed snapshot needs a
        refreshed guide.{' '}
        <a href={routeHash({ ...route, view: 'methodology' })}>
          Read the methodology →
        </a>
      </p>
    </>
  );
}
