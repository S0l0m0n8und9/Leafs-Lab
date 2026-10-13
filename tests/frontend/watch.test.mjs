import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../../.test-build/App.js';
import { parseRoute, routeHash } from '../../.test-build/route.js';
import { validateBundle } from '../../.test-build/data.js';
import { watchSnapshot } from '../../.test-build/watchSnapshot.js';
const current = validateBundle(
  JSON.parse(readFileSync('public/data/leafs-lab.json', 'utf8')),
);
const render = (bundle = current, hash = '') =>
  renderToStaticMarkup(
    React.createElement(App, {
      bundle,
      initialRoute: parseRoute(hash, bundle),
    }),
  );
test('default watch guide exposes three current-season questions and inspectable evidence', () => {
  assert.equal(parseRoute('', current).view, 'watch');
  const html = render();
  for (const value of [
    'Are Toronto’s attacks dangerous enough?',
    'Where is Bobrovsky making the difference?',
    'Is Marchenko’s scoring line hiding chance creation?',
    '49.6%',
    '41.1%',
    '1.457',
    '54.0%',
    '+4.675',
    '−1.689',
    '+4.579',
    '2026–27',
    'six games',
    '39.4–42.5%',
  ])
    assert.ok(html.includes(value), value);
  assert.equal((html.match(/<details/g) || []).length, 4);
  assert.doesNotMatch(html, /<legend>Strength<\/legend>/);
  assert.match(html, /sensitivity check, not a confidence interval/);
  assert.match(html, /shared outcomes/);
});
test('watch links preserve current game and six-game player context while old deep links survive', () => {
  const html = render();
  assert.match(
    html,
    /#games\?season=20262027&amp;strength=5on5&amp;game=2026020080/,
  );
  assert.match(
    html,
    /#players\?season=20262027&amp;strength=5on5&amp;game=2026020080&amp;player=8480893&amp;window=10/,
  );
  for (const view of ['watch', 'games', 'players', 'trends', 'methodology']) {
    const route = parseRoute('#' + view, current);
    assert.equal(parseRoute(routeHash(route), current).view, view);
  }
});
test('changed source, coverage or game membership suppresses pinned findings', () => {
  for (const mutate of [
    (b) => (b.sources[0].hash = 'sha256:' + '0'.repeat(64)),
    (b) => (b.coverage.max_game_date = '2026-10-11'),
    (b) => b.seasons[0].games.pop(),
    (b) => (b.data_mode = 'sample'),
  ]) {
    const b = structuredClone(current);
    mutate(b);
    const html = render(b);
    assert.match(html, /Watch questions need a matching verified snapshot/);
    assert.doesNotMatch(
      html,
      /1\.457|49\.6%|Bobrovsky making|Marchenko’s scoring/,
    );
  }
});
test('published bundle contains only the current season and reconciled source hashes', () => {
  const published = validateBundle(
    JSON.parse(readFileSync('public/data/leafs-lab.json', 'utf8')),
  );
  assert.deepEqual(
    published.seasons.map((s) => s.id),
    ['20262027'],
  );
  assert.equal(published.seasons[0].games.length, 6);
  assert.equal(published.seasons[0].skaters.length, 108);
  for (const source of published.sources)
    assert.equal(source.hash, watchSnapshot.source_hashes[source.kind]);
});

test('returning to the guide from an older game resets inspection links to latest coverage', () => {
  const html = render(
    current,
    '#watch?game=2026020002&strength=all&search=Nobody',
  );
  assert.match(
    html,
    /#players\?season=20262027&amp;strength=5on5&amp;game=2026020080&amp;player=8480893&amp;window=10/,
  );
});
test('guide selected figures match the reproducible current-season proof', () => {
  const raw = JSON.parse(
    readFileSync('analysis/current-proof-results.json', 'utf8'),
  );
  assert.deepEqual(watchSnapshot.team, raw.five_on_five);
  assert.deepEqual(watchSnapshot.games, raw.games);
  assert.deepEqual(
    watchSnapshot.marchenko,
    raw.players.find((p) => p.player_id === '8480893'),
  );
  assert.deepEqual(
    watchSnapshot.bobrovsky,
    raw.goalies.filter(
      (g) =>
        g.name === 'Sergei Bobrovsky' &&
        ['all', '5on5', '4on5'].includes(g.strength),
    ),
  );
});
