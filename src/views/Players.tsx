import type { Season, Bundle, N } from '../data.js';
import type { Route } from '../route.js';
import { sortKeys } from '../route.js';
import {
  aggregatePlayer,
  aggregateGoalie,
  compareNullable,
  selectWindow,
  rate,
} from '../analytics.js';
import type { PlayerSummary } from '../analytics.js';
import {
  ViewHeading,
  DataTable,
  fmt,
  signed,
  dateLabel,
  strengthLabel,
  GoalieTable,
  SourceMeta,
  Empty,
} from '../components/common.js';
import { LineChart } from '../components/charts.js';
const columnLabels: Record<string, string> = {
  appearances: 'Appearances',
  goals: 'Goals',
  ixg: 'Individual xG',
  difference: 'Goals minus xG',
  shots: 'Shots',
  minutes: 'Minutes',
  ixg60: 'Individual xG / 60',
  goals60: 'Goals / 60',
  oniceShare: 'On-ice xG share',
};
export default function Players({
  bundle,
  season,
  route,
  update,
}: {
  bundle: Bundle;
  season: Season;
  route: Route;
  update: (change: Partial<Route>) => void;
}) {
  const { current, baseline } = selectWindow(season.games, route.window),
    ids = new Set(current.map((g) => g.id));
  const skaterIds = [
    ...new Set(
      season.skaters
        .filter((p) => ids.has(p.game_id) && p.stats[route.strength])
        .map((p) => p.player_id),
    ),
  ];
  const players = skaterIds
    .map((id) =>
      aggregatePlayer(
        season.skaters.filter((p) => p.player_id === id),
        current,
        route.strength,
      ),
    )
    .filter((p) => p.name.toLowerCase().includes(route.search.toLowerCase()))
    .sort(
      (a, b) =>
        compareNullable(
          a[route.sort as keyof PlayerSummary] as N,
          b[route.sort as keyof PlayerSummary] as N,
          route.direction,
        ) || a.name.localeCompare(b.name),
    );
  const goalieIds = [
    ...new Set(
      season.goalies
        .filter((p) => ids.has(p.game_id) && p.stats[route.strength])
        .map((p) => p.player_id),
    ),
  ];
  const goalies = goalieIds
    .map((id) =>
      aggregateGoalie(
        season.goalies.filter((p) => p.player_id === id),
        current,
        route.strength,
      ),
    )
    .filter((p) => p.name.toLowerCase().includes(route.search.toLowerCase()));
  const skaterRows = season.skaters.filter((p) => p.player_id === route.player),
    goalieRows = season.goalies.filter((p) => p.player_id === route.player);
  const player = skaterRows.length
      ? aggregatePlayer(skaterRows, current, route.strength)
      : null,
    goalie =
      !player && goalieRows.length
        ? aggregateGoalie(goalieRows, current, route.strength)
        : null;
  const basePlayer = player
      ? aggregatePlayer(skaterRows, baseline, route.strength)
      : null,
    baseGoalie = goalie
      ? aggregateGoalie(goalieRows, baseline, route.strength)
      : null;
  const labels = current.map((g) => `${dateLabel(g.date)} · ${g.opponent}`);
  return (
    <>
      <ViewHeading
        number="02"
        kicker="PLAYER FORM"
        title="Creating. Scoring. Or both?"
        description="The players who actually appeared for Toronto in this window. Chance creation and finishing, with the sample always in view."
      />
      <div className="form-controls">
        <fieldset>
          <legend>Last team games</legend>
          <div className="segmented">
            {([5, 10, 20] as const).map((n) => (
              <button
                key={n}
                aria-pressed={route.window === n}
                onClick={() => update({ window: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          Search players
          <input
            type="search"
            placeholder="Search a name"
            value={route.search}
            onChange={(e) => update({ search: e.target.value })}
          />
        </label>
        <label>
          Sort by
          <select
            value={route.sort}
            onChange={(e) => update({ sort: e.target.value })}
          >
            {sortKeys.map((key) => (
              <option key={key} value={key}>
                {columnLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Order
          <select
            value={route.direction}
            onChange={(e) =>
              update({ direction: e.target.value as Route['direction'] })
            }
          >
            <option value="desc">Highest first</option>
            <option value="asc">Lowest first</option>
          </select>
        </label>
      </div>
      <div className="section-heading">
        <h2>The form book</h2>
        <span>
          {strengthLabel(route.strength)} · {current.length} team games
        </span>
      </div>
      <p className="table-hint">
        {current.length
          ? `${dateLabel(current[0].date)} to ${dateLabel(current.at(-1)!.date)}`
          : 'No games available'}{' '}
        · GP counts actual appearances. — means unavailable. Scroll the table
        for every measure.
      </p>
      {players.length ? (
        <DataTable
          caption={`Skater form · ${strengthLabel(route.strength)} · last ${current.length} team games. Select a player for details.`}
          head={[
            'Player',
            'GP',
            'Goals',
            'i xG',
            'G − i xG',
            'Shots',
            'TOI min',
            'i xG / 60',
            'Goals / 60',
            'On-ice xG %',
            'Form',
          ]}
          rows={players.map((p) => [
            <button
              className="player-pick"
              aria-pressed={route.player === p.player_id}
              onClick={() => update({ player: p.player_id })}
            >
              {p.name}
              {p.position && <small>{p.position}</small>}
            </button>,
            p.appearances,
            fmt(p.goals, 0),
            fmt(p.ixg),
            signed(p.difference),
            fmt(p.shots, 0),
            fmt(p.minutes, 1),
            fmt(p.ixg60),
            fmt(p.goals60),
            fmt(p.oniceShare, 1),
            <span
              className={
                'form-label' + (p.label === 'Small sample' ? ' small' : '')
              }
            >
              {p.label}
            </span>,
          ])}
        />
      ) : (
        <Empty>No skaters match this search, window and strength.</Empty>
      )}
      <p className="fine-print">
        Finishing labels require at least 5 appearances and 60 minutes at this
        strength. Above or below expectation describes the numbers; it does not
        prove luck or predict regression.
      </p>
      <section className="goalie-section">
        <div className="section-heading">
          <h2>The crease</h2>
          <span>{strengthLabel(route.strength)}</span>
        </div>
        <GoalieTable
          caption={`Goalie form · ${strengthLabel(route.strength)} · last ${current.length} team games`}
          rows={goalies}
          onPlayer={(id) => update({ player: id })}
        />
        <p className="fine-print">
          Goalie samples are separate. GSAx = goalie xGA − goalie goals allowed.
          No skater finishing labels apply.
        </p>
      </section>
      {route.player ? (
        <section className="player-detail" aria-label="Player detail">
          <div className="section-heading">
            <h2>{player?.name ?? goalie?.name ?? 'Player unavailable'}</h2>
            <button
              className="text-button"
              onClick={() => update({ player: '' })}
            >
              Close detail ×
            </button>
          </div>
          {player ? (
            <>
              <p className="detail-deck">
                {player.label} · {player.appearances} appearances ·{' '}
                {fmt(player.minutes, 1)} minutes ·{' '}
                {strengthLabel(route.strength)}
              </p>
              <LineChart
                title="Finishing game by game"
                labels={labels}
                strength={route.strength}
                series={[
                  {
                    label: 'Goals',
                    values: current.map(
                      (g) =>
                        skaterRows.find((r) => r.game_id === g.id)?.stats[
                          route.strength
                        ]?.goals ?? null,
                    ),
                  },
                  {
                    label: 'Individual xG',
                    dashed: true,
                    values: current.map(
                      (g) =>
                        skaterRows.find((r) => r.game_id === g.id)?.stats[
                          route.strength
                        ]?.ixg ?? null,
                    ),
                  },
                ]}
              />
              <p className="fine-print">
                A gap can mean no appearance, missing strength or missing
                metric; it is not zero.
              </p>
              {baseline.length ? (
                <DataTable
                  caption={`Rate comparison at ${strengthLabel(route.strength)}; preceding ${baseline.length} team games do not overlap the current ${current.length}.`}
                  head={[
                    'Measure',
                    `Current ${current.length} team games`,
                    `Preceding ${baseline.length} team games`,
                  ]}
                  rows={[
                    [
                      'Appearances',
                      player.appearances,
                      basePlayer!.appearances,
                    ],
                    [
                      'Minutes',
                      fmt(player.minutes, 1),
                      fmt(basePlayer!.minutes, 1),
                    ],
                    [
                      'Individual xG / 60',
                      fmt(player.ixg60),
                      fmt(basePlayer!.ixg60),
                    ],
                    [
                      'Goals / 60',
                      fmt(player.goals60),
                      fmt(basePlayer!.goals60),
                    ],
                    [
                      'On-ice xG share',
                      player.oniceShare === null
                        ? '—'
                        : fmt(player.oniceShare, 1) + '%',
                      basePlayer!.oniceShare === null
                        ? '—'
                        : fmt(basePlayer!.oniceShare, 1) + '%',
                    ],
                  ]}
                />
              ) : (
                <Empty>
                  No preceding team games are available for a non-overlapping
                  baseline.
                </Empty>
              )}
            </>
          ) : goalie ? (
            <>
              <p className="detail-deck">
                {goalie.appearances} appearances · {fmt(goalie.minutes, 1)}{' '}
                minutes · {strengthLabel(route.strength)}
              </p>
              <LineChart
                title="Goalie performance game by game"
                labels={labels}
                strength={route.strength}
                series={[
                  {
                    label: 'Goals saved above expected',
                    values: current.map(
                      (g) =>
                        aggregateGoalie(goalieRows, [g], route.strength).gsax,
                    ),
                  },
                ]}
              />
              {baseline.length ? (
                <DataTable
                  caption={`Goalie rate comparison · ${strengthLabel(route.strength)} · non-overlapping windows`}
                  head={[
                    'Measure',
                    `Current ${current.length} team games`,
                    `Preceding ${baseline.length} team games`,
                  ]}
                  rows={[
                    [
                      'Appearances',
                      goalie.appearances,
                      baseGoalie!.appearances,
                    ],
                    [
                      'xGA / 60',
                      fmt(
                        rate(
                          goalie.xga,
                          goalie.minutes === null ? null : goalie.minutes * 60,
                        ),
                      ),
                      fmt(
                        rate(
                          baseGoalie!.xga,
                          baseGoalie!.minutes === null
                            ? null
                            : baseGoalie!.minutes * 60,
                        ),
                      ),
                    ],
                    [
                      'GA / 60',
                      fmt(
                        rate(
                          goalie.ga,
                          goalie.minutes === null ? null : goalie.minutes * 60,
                        ),
                      ),
                      fmt(
                        rate(
                          baseGoalie!.ga,
                          baseGoalie!.minutes === null
                            ? null
                            : baseGoalie!.minutes * 60,
                        ),
                      ),
                    ],
                    [
                      'GSAx / 60',
                      signed(
                        rate(
                          goalie.gsax,
                          goalie.minutes === null ? null : goalie.minutes * 60,
                        ),
                      ),
                      signed(
                        rate(
                          baseGoalie!.gsax,
                          baseGoalie!.minutes === null
                            ? null
                            : baseGoalie!.minutes * 60,
                        ),
                      ),
                    ],
                  ]}
                />
              ) : (
                <Empty>No preceding team games for a baseline.</Empty>
              )}
            </>
          ) : (
            <Empty>
              The selected player ID has no appearances in this season.
            </Empty>
          )}
        </section>
      ) : (
        <p className="detail-invitation">
          Select any skater or goalie to explore their per-game trend and
          preceding baseline. ↗
        </p>
      )}
      <SourceMeta bundle={bundle} compact />
    </>
  );
}
