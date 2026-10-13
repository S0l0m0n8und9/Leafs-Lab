const explanations = {
  watch:
    "Shot share measures volume; xG share measures modelled chance quality. High-danger means at least 20% goal probability in the model. Six games are a small sample, not a verdict on a player or coach.",
  games:
    "Goals are what went in; xG describes modelled chance quality. Above 50% xG share means Toronto had more of that quality, not a greater than 50% chance of winning. Positive GSAx means fewer goals allowed than the goalie model expected.",
  players:
    "Individual xG comes from a player’s own attempts; on-ice xG share is shared team context. Per-60 rates compare unequal minutes, not predicted full-game totals. GP counts appearances; a dash means unavailable, not zero.",
  trends:
    "Rolling values describe recent games; cumulative lines add games from the start. Positive goals-minus-xG means more scored; positive goals-against-minus-xGA means more conceded. Positive goalie GSAx means fewer conceded. Higher xGA / 60 means more modelled chances allowed, a worse defensive outcome in context.",
};
export default function MetricHelp({
  view,
}: {
  view: keyof typeof explanations;
}) {
  return (
    <details className="metric-help">
      <summary>How to read these numbers</summary>
      <p>{explanations[view]}</p>
      <a href="#methodology">Read the full metric guide →</a>
    </details>
  );
}
