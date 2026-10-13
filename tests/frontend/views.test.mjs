import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../../.test-build/App.js";
import { parseRoute } from "../../.test-build/route.js";
import { validateBundle } from "../../.test-build/data.js";
import { bundle } from "./fixture.mjs";
const render = (data, hash) =>
  renderToStaticMarkup(
    React.createElement(App, {
      bundle: data,
      initialRoute: parseRoute(hash, data),
    }),
  );
test("plain-language guide explains every measured family with hypothetical examples and limits", () => {
  const html = render(bundle, "#methodology");
  for (const text of [
    "How to read it",
    "How to read the numbers",
    "Shots on goal and unblocked attempts",
    "Shot share",
    "High-danger chances",
    "xG per unblocked attempt",
    "GP and minutes",
    "Cumulative and rolling windows",
    "4-on-5",
    "5-on-4",
    "Hypothetical examples",
    "0.2",
    "20%",
    "5 xGA",
    "3 goals allowed",
    "+2 GSAx",
    "0.5 xG",
    "15 minutes",
    "2 xG / 60",
    "Does not mean",
  ])
    assert.ok(html.includes(text), `Missing guide content: ${text}`);
  assert.match(html, /id="definitions"/);
  assert.match(html, /MoneyPuck glossary/);
  assert.match(html, /50%/);
  assert.match(html, /average shooter/);
  assert.match(html, /blocks are excluded/);
  assert.match(html, /not a forecast/);
  assert.match(html, /unavailable, never zero/);
  assert.match(html, /Goals before shootout/);
  assert.match(html, /tied pre-shootout score or an unknown result cannot tell you who won/);
});
test("all report views offer discoverable metric help and retain methodology deep links", () => {
  for (const view of ["watch", "games", "players", "trends"]) {
    const html = render(bundle, `#${view}`);
    assert.match(
      html,
      /<details class="metric-help"><summary>How to read these numbers<\/summary>/,
      view,
    );
    assert.match(html, /href="#methodology"/, view);
  }
});
test("published snapshot validates and each view renders with provenance and sample status", () => {
  const data = validateBundle(
    JSON.parse(fs.readFileSync("public/data/leafs-lab.json", "utf8")),
  );
  for (const view of ["games", "players", "trends", "methodology"]) {
    const html = render(data, `#${view}`);
    assert.match(html, /Data: MoneyPuck.com/);
    if (data.data_mode === "sample")
      assert.match(html, /Sample data — illustrative/);
  }
});
test("game deep link selects its own recorded score, date and selected-strength analysis", () => {
  const data = structuredClone(bundle),
    g = data.seasons[0].games[0];
  g.opponent = "OTT";
  g.stats.all.xgf = 7;
  const html = render(data, `#games?season=20242025&game=${g.id}&strength=all`);
  assert.match(html, /GAME REPORT \/ Oct 1, 2024/);
  assert.match(html, /Toronto generated 7.00 xG/);
  assert.match(html, /Goals before shootout/);
  assert.match(html, /All strengths/);
  assert.match(html, /View chart data/);
});
test("player search, window and detail state change rendered content", () => {
  const empty = render(bundle, "#players?search=Nobody");
  assert.match(empty, /No skaters match this search/);
  const five = render(bundle, "#players?window=5&player=100&strength=all");
  assert.match(five, /preceding 19 team games do not overlap the current 5/i);
  assert.match(five, /Finishing above expectation/);
  assert.match(five, /Finishing game by game/);
  const twenty = render(bundle, "#players?window=20&player=100");
  assert.match(twenty, /preceding 4 team games do not overlap the current 20/i);
});
test("goalie deep links show goalie trend and rate comparison without skater eligibility labels", () => {
  const html = render(bundle, "#players?player=g&window=5&strength=all");
  assert.match(html, /Goalie performance game by game/);
  assert.match(html, /GSAx \/ 60/);
  assert.match(html, /non-overlapping windows/);
});
test("season comparison stops every row at a common games-played horizon", () => {
  const data = structuredClone(bundle);
  data.seasons[0].games = data.seasons[0].games.slice(0, 12);
  const html = render(data, "#trends");
  assert.match(html, /common 12-game horizon/);
  assert.match(html, /Cumulative goalie GSAx/);
  assert.match(html, /Rolling sample sizes/);
});
test("a missing strength shows an unavailable game report rather than replacing it with all-strength values", () => {
  const data = structuredClone(bundle),
    g = data.seasons.at(-1).games.at(-1);
  g.stats = { all: g.stats.all };
  const html = render(data, "#games?strength=5on5");
  assert.match(html, /5-on-5 metrics are unavailable/);
  assert.match(html, /Analysis unavailable/);
  assert.doesNotMatch(html, /Toronto generated 3.50 xG/);
});
