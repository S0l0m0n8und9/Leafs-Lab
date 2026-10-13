import type { Bundle } from "../data.js";
import {
  ViewHeading,
  SourceMeta,
  localTime,
  dateLabel,
} from "../components/common.js";
export default function Methodology({ bundle }: { bundle: Bundle }) {
  const old = bundle.sources.filter(
    (s) => Date.now() - Date.parse(s.retrieved_at) > 48 * 60 * 60 * 1000,
  );
  return (
    <>
      <ViewHeading
        number="04"
        kicker="READING GUIDE & PROVENANCE"
        title="How to read the numbers."
        description="Transparent calculations, honest samples and a clear line between what the numbers describe and what they cannot tell us."
      />
      <div className="method-layout">
        <aside className="method-index">
          <p className="eyebrow">ON THIS PAGE</p>
          <a
            href="#definitions"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("definitions")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            The measures
          </a>
          <a
            href="#windows"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("windows")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Windows & thresholds
          </a>
          <a
            href="#freshness"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("freshness")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Freshness & sources
          </a>
          <a
            href="#limitations"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("limitations")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Limits of the model
          </a>
        </aside>
        <div className="method-content">
          <section id="definitions">
            <p className="eyebrow">01 / THE MEASURES</p>
            <h2>How to read the numbers</h2>
            <p>
              Start with the strength and sample, then read quality alongside
              volume and actual goals. Hypothetical examples below explain the
              measures; they are not current games.
            </p>
            <dl className="definitions">
              <div>
                <dt>Goals (GF and GA)</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> GF is goals for; GA is goals
                    against. These count what actually went in at the selected
                    strength. Analytical goals exclude shootouts; the recorded
                    scoreboard may use a different labelled basis.
                  </p>
                  <p>
                    <strong>How to read:</strong> More GF is more scoring; more
                    GA is more conceded. The “Goals before shootout” score label
                    tells you the shootout is excluded.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> Goals alone do not describe
                    chance quality or explain why a result happened. A tied
                    pre-shootout score or an unknown result cannot tell you who
                    won.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Shots on goal and unblocked attempts</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> Shots on goal are attempts that
                    score or require a save. Unblocked attempts include shots on
                    goal plus misses; blocks are excluded.
                  </p>
                  <p>
                    <strong>How to read:</strong> Unblocked attempts show a
                    broader volume of shooting than shots on goal.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> An attempt is not
                    necessarily on target or dangerous.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Shot share</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> Toronto’s shots divided by both
                    teams’ combined shots, shown as a percentage. Read the
                    label: shots-on-goal share and unblocked-attempt share use
                    different counts.
                  </p>
                  <p>
                    <strong>How to read:</strong> Above 50% means Toronto took
                    more of the specified shots; below 50% means fewer.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> Volume share does not
                    account for chance quality or give win probability.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Expected goals (xG, xGF and xGA)</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> Each unblocked attempt receives a
                    modelled goal probability based on shot characteristics for
                    an average shooter. The values add up: xGF is the quality
                    created; xGA is the quality allowed. We use raw, unadjusted
                    xGoals.
                  </p>
                  <p>
                    <strong>How to read:</strong> Higher xGF means more modelled
                    scoring chances; higher xGA means more allowed. Hypothetical
                    examples: a 0.2 xG attempt represents a modelled 20% goal
                    probability; five such attempts sum to 1 xG.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> The model is not the true
                    probability for a particular shooter. 0.2 xG is not a 20%
                    chance of winning, and 1 xG does not promise one goal.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Individual xG (ixG) and on-ice xG share</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> ixG adds the modelled probabilities
                    of a player’s own attempts. On-ice xG share includes the
                    team’s chances for and against while that player was on the
                    ice.
                  </p>
                  <p>
                    <strong>How to read:</strong> ixG describes personal chance
                    creation; on-ice share describes shared team context.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> On-ice chances are not
                    individual credit or proof of a player’s or coach’s causal
                    impact.
                  </p>
                </dd>
              </div>
              <div>
                <dt>xG share</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> Toronto’s xGF as a percentage of the
                    combined xGF and xGA. Season and rolling shares use summed
                    xG, not averages of game percentages.
                  </p>
                  <p>
                    <strong>How to read:</strong> 50% is an equal split of
                    modelled chance quality. Hypothetical example: 3 xGF and 2
                    xGA give 60% xG share.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> 60% chance quality is not a
                    60% chance of winning. Zero combined xG means unavailable.
                  </p>
                </dd>
              </div>
              <div>
                <dt>High-danger chances</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> MoneyPuck classifies an attempt as
                    high-danger when its modelled goal probability is at least
                    20%.
                  </p>
                  <p>
                    <strong>How to read:</strong> More high-danger attempts
                    means more chances in that model category, at the stated
                    strength and window.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> It is a model threshold, not
                    certainty of a goal or a universal hockey definition.
                  </p>
                </dd>
              </div>
              <div>
                <dt>xG per unblocked attempt</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> Total xG divided by the number of
                    unblocked attempts: average modelled quality per attempt.
                  </p>
                  <p>
                    <strong>How to read:</strong> Hypothetical example: 2 xG
                    across 20 attempts is 0.10 xG per attempt. A higher value
                    means better average quality in the model.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> It does not measure total
                    chance creation by itself; a small number of attempts can
                    have a high average.
                  </p>
                </dd>
              </div>
              <div>
                <dt>GP and minutes</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> GP counts a player’s appearances at
                    the selected strength in the window; minutes are recorded
                    ice time. A recorded zero-time row still counts as an
                    appearance.
                  </p>
                  <p>
                    <strong>How to read:</strong> Use both to understand the
                    sample behind totals and rates.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> GP is not necessarily the
                    number of Toronto team games in the window, nor a guessed
                    current roster.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Per-60 rates</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> A measure divided by recorded
                    minutes, then scaled to 60 minutes at the same strength.
                  </p>
                  <p>
                    <strong>How to read:</strong> Hypothetical example: 0.5 xG
                    in 15 minutes is 2 xG / 60. Higher xGF / 60 means more
                    chance creation per minute; higher xGA / 60 means more
                    chances allowed, a worse defensive outcome in context.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> This is a normalized rate,
                    not a forecast or a full-game projection. Zero time means
                    unavailable.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Goals minus ixG; goals against minus xGA; GSAx</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> Goals minus ixG describes scoring
                    relative to personal chance quality. Goals against minus xGA
                    describes conceded goals relative to team chance quality.
                    Goalie GSAx reverses that sign: goalie-source xGA minus
                    goals allowed.
                  </p>
                  <p>
                    <strong>How to read:</strong> Positive goals minus ixG means
                    more scored than modelled; positive goals against minus xGA
                    means more conceded. Positive GSAx means fewer conceded.
                    Hypothetical example: 5 xGA and 3 goals allowed gives +2
                    GSAx.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> The signs are not
                    interchangeable. GSAx uses the goalie’s own data, not team
                    totals; gaps do not prove luck, skill, causation or
                    inevitable future regression.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Cumulative and rolling windows</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> Cumulative totals add from the
                    season’s start. Rolling values use the most recent games in
                    the stated window; the earliest windows can be shorter.
                  </p>
                  <p>
                    <strong>How to read:</strong> Cumulative lines show
                    accumulated differences; rolling lines describe recent
                    samples. Small samples can change sharply after one game.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> Neither is a forecast.
                    Overlapping rolling points are not independent evidence.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Strength and inclusive totals</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> 5-on-5 means five skaters on each
                    side; 4-on-5 means Toronto is shorthanded; 5-on-4 means
                    Toronto has a skater advantage. All strengths includes these
                    and other situations.
                  </p>
                  <p>
                    <strong>How to read:</strong> Compare like strengths.
                    Special-team evidence on Watch cards keeps its own strength
                    labels.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> All strengths overlaps the
                    situation rows: do not add 5-on-5, 4-on-5 or 5-on-4 to it,
                    or substitute all strengths for missing strength data.
                  </p>
                </dd>
              </div>
              <div>
                <dt>Missing values</dt>
                <dd>
                  <p>
                    <strong>Means:</strong> A dash means unavailable, never
                    zero.
                  </p>
                  <p>
                    <strong>How to read:</strong> An interrupted line preserves
                    missing information instead of inventing a point.
                  </p>
                  <p>
                    <strong>Does not mean:</strong> A blank value does not
                    establish no activity or a poor performance.
                  </p>
                </dd>
              </div>
            </dl>
          </section>
          <section id="windows">
            <p className="eyebrow">02 / WINDOWS & THRESHOLDS</p>
            <h2>Keep the sample in the picture.</h2>
            <p>
              Player form covers the last 5, 10 or 20 completed Toronto team
              games in the selected season. GP is the player's actual
              appearances at the selected strength in that window, including
              recorded zero-time rows. These are Toronto appearances, not a
              guessed current roster.
            </p>
            <p>
              The baseline is the preceding, non-overlapping 20 team games,
              shortened when fewer exist. Compare rates at the same strength
              rather than raw totals across unequal windows.
            </p>
            <dl className="definitions">
              <div>
                <dt>Finishing form</dt>
                <dd>
                  At least 5 appearances and 3600 seconds are required. Goals
                  minus individual xG ≥ +2: above expectation; ≤ −2: below
                  expectation; otherwise near expectation. Smaller samples say
                  “Small sample”. Missing finishing data stays unavailable.
                </dd>
              </div>
              <div>
                <dt>Chance-quality verdict</dt>
                <dd>
                  xG share ≥ 55%: led chance quality. ≤ 45%: trailed chance
                  quality. Between: close. A reliable result adds descriptive
                  context; an unknown result uses only the chance-quality
                  phrase. Missing xG says “Analysis unavailable”. These labels
                  are our editorial heuristics.
                </dd>
              </div>
              <div>
                <dt>Rolling & season comparisons</dt>
                <dd>
                  Rolling xG share covers up to 10 team games; each initial
                  shorter window shows its size. Season comparisons use the
                  first common number of games at one strength, with the horizon
                  shown.
                </dd>
              </div>
              <div>
                <dt>Missing data</dt>
                <dd>
                  A dash means unavailable, never zero. Complete-sample sums and
                  rates require every included component. A missing value
                  interrupts a line instead of inventing a point.
                </dd>
              </div>
            </dl>
          </section>
          <section id="freshness">
            <p className="eyebrow">03 / FRESHNESS & SOURCES</p>
            <h2>What is actually in this snapshot?</h2>
            <div className="freshness-panel">
              <p>
                Data mode: <strong>{bundle.data_mode}</strong> · Schema{" "}
                {bundle.schema_version}
              </p>
              <p>
                Build generated:{" "}
                <time dateTime={bundle.generated_at}>
                  {localTime(bundle.generated_at)}
                </time>
              </p>
              <p>
                Maximum covered game date:{" "}
                <strong>
                  {bundle.coverage.max_game_date
                    ? dateLabel(bundle.coverage.max_game_date)
                    : "Unavailable"}
                </strong>
              </p>
              <p>
                A successful rebuild is not proof of new provider data. Game
                dates are displayed as provider calendar dates; source
                timestamps are stored in UTC and displayed in your locale.
              </p>
              {old.length ? (
                <p className="old-warning">
                  Old snapshot: {old.length} source timestamp
                  {old.length === 1 ? " is" : "s are"} more than 48 hours old.{" "}
                  {old.some((s) => s.retrieved_at_basis === "local_mtime")
                    ? "Local file times do not confirm retrieval freshness. "
                    : ""}
                  Off-season and no-game intervals can explain an unchanged
                  coverage date.
                </p>
              ) : (
                <p>
                  Source timestamps are within 48 hours. This does not establish
                  when the provider last updated its data; local file times are
                  only file provenance.
                </p>
              )}
              {bundle.coverage.unavailable_seasons.length > 0 && (
                <p>
                  Unavailable requested seasons:{" "}
                  {bundle.coverage.unavailable_seasons.join(", ")}. Coverage
                  comes from actual input files.
                </p>
              )}
            </div>
            <SourceMeta bundle={bundle} />
            <div className="source-records">
              {bundle.sources.map((s) => (
                <details key={s.kind}>
                  <summary>{s.kind} source record</summary>
                  <p>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        Source CSV
                      </a>
                    ) : (
                      "Local authored fixture; no provider download."
                    )}
                  </p>
                  <p>
                    Validation: {s.validation_status} · Mapping:{" "}
                    {s.mapping_status}
                    {bundle.data_mode === "sample"
                      ? " (fixture mapping only)"
                      : ""}
                  </p>
                  <p className="hash">Original bytes: {s.hash}</p>
                </details>
              ))}
            </div>
            {bundle.data_mode === "sample" && (
              <p className="acceptance-note">
                Real-data acceptance remains outstanding. Downloads returned
                HTTP 403 in this environment; actual headers, semantic mappings,
                and three-game / three-player spot checks have not been
                completed. All games and player statistics here are
                illustrative, and all player names are fictional.
              </p>
            )}
            <p>
              The daily refresh workflow remains gated off and has no Site
              publication step. This is a static snapshot; unattended hosted
              updates are not wired.
            </p>
            <p>
              No seasons means no coverage. Missing metrics stay blank. Fetch
              errors and invalid schemas stop loading with a clear error. An old
              snapshot remains inspectable with its age warning.
            </p>
          </section>
          <section id="limitations">
            <p className="eyebrow">04 / MODEL LIMITS</p>
            <h2>Interpretation needs restraint.</h2>
            <p>
              xG does not fully account for individual shooting talent. Score
              effects, special teams, finishing and modelling choices all
              matter. A gap between goals and xG does not establish luck,
              causation or future regression.
            </p>
            <p>
              No win probabilities, league rankings, playoff forecasts, betting
              recommendations or live xG are provided. There is no AI inference.
              This is an independent, non-commercial fan project with no
              official affiliation.
            </p>
            <p>
              Source and definitions:{" "}
              <a
                href="https://moneypuck.com/data.htm"
                target="_blank"
                rel="noreferrer"
              >
                MoneyPuck downloads
              </a>{" "}
              ·{" "}
              <a
                href="https://moneypuck.com/glossary.htm"
                target="_blank"
                rel="noreferrer"
              >
                MoneyPuck glossary
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
