import test from 'node:test';
import assert from 'node:assert/strict';
import {bundle} from './fixture.mjs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import App from '../../.test-build/App.js';
import {parseRoute,routeHash,subscribeRoute} from '../../.test-build/route.js';
import * as routing from '../../.test-build/route.js';
import {validateBundle,sourceTimeLabel} from '../../.test-build/data.js';

test('shareable links retain view, season, strength, details and form controls',()=>{const hash='#players?season=20242025&strength=all&game=2024020001&player=100&window=5&search=Finn%20Frost&sort=goals&direction=asc';const route=parseRoute(hash,bundle);assert.equal(route.view,'players');assert.equal(route.season,'20242025');assert.equal(route.strength,'all');assert.equal(route.player,'100');assert.equal(route.window,5);assert.equal(route.search,'Finn Frost');assert.deepEqual(parseRoute(routeHash(route),bundle),route);});
test('initial selection is latest populated season and latest completed game',()=>{const route=parseRoute('',bundle);assert.equal(route.season,bundle.seasons.at(-1).id);assert.equal(route.game,bundle.seasons.at(-1).games.at(-1).id);assert.equal(route.strength,'5on5');});
test('invalid links and an empty selected season fall back to usable controls',()=>{const b=structuredClone(bundle);b.seasons.push({id:'20262027',label:'2026–27',games:[],skaters:[],goalies:[]});const route=parseRoute('#invalid?season=20262027&strength=bogus&window=7',b);assert.equal(route.view,'watch');assert.equal(route.season,'20252026');assert.equal(route.window,10);assert.equal(route.strength,'5on5');});
const withEmptySeason = () => {
  const data = structuredClone(bundle);
  data.seasons.push({id:'20262027',label:'2026–27',games:[],skaters:[],goalies:[]});
  return data;
};
test('empty-season fallback keeps a visible explanation in canonical links and on reload',()=>{
  const data=withEmptySeason();
  const route=parseRoute('#games?season=20262027',data);
  assert.equal(route.fallbackSeason,'20262027');
  assert.equal(route.season,'20252026');
  assert.equal(route.game,data.seasons[1].games.at(-1).id);
  const hash=routeHash(route);
  assert.match(hash,/season=20252026/);
  assert.match(hash,/fallbackSeason=20262027/);
  const reloaded=parseRoute(hash,data);
  assert.deepEqual(reloaded,route);
  assert.deepEqual(routing.changeRoute(parseRoute('#games',data),{season:'20262027',game:''},data),route);
  assert.equal(routing.changeRoute(reloaded,{strength:'all'},data).fallbackSeason,'20262027');
  const html=renderToStaticMarkup(React.createElement(App,{bundle:data,initialRoute:reloaded}));
  assert.match(html,/The requested season has no available games/);
  assert.match(html,/<option value="20252026" selected=""/);
  assert.match(html,/GAME REPORT \/ Oct 24, 2025/);
});
test('selecting a populated season clears the fallback explanation and shared metadata',()=>{
  const data=withEmptySeason();
  const route=parseRoute('#games?season=20262027',data);
  assert.equal(typeof routing.changeRoute,'function');
  const selected=routing.changeRoute(route,{season:'20242025',game:'',player:''},data);
  assert.equal(selected.season,'20242025');
  assert.equal(selected.fallbackSeason,'');
  assert.doesNotMatch(routeHash(selected),/fallbackSeason/);
  const html=renderToStaticMarkup(React.createElement(App,{bundle:data,initialRoute:selected}));
  assert.doesNotMatch(html,/The requested season has no available games/);
  assert.match(html,/<option value="20242025" selected=""/);
});
test('browser history state changes are subscribed and cleaned up',()=>{const target=new EventTarget();let count=0;const unsubscribe=subscribeRoute(target,()=>count++);target.dispatchEvent(new Event('hashchange'));target.dispatchEvent(new Event('popstate'));assert.equal(count,2);unsubscribe();target.dispatchEvent(new Event('hashchange'));assert.equal(count,2);});
test('sample warning and provider attribution survive every shared view',()=>{for(const view of ['games','players','trends','methodology']){const initialRoute=parseRoute(`#${view}`,bundle);const html=renderToStaticMarkup(React.createElement(App,{bundle,initialRoute}));assert.match(html,/Sample data — illustrative games and players, not actual NHL results\./);assert.match(html,/Data: MoneyPuck\.com/);assert.match(html,/Sample/);}});
test('empty dataset is understandable and sample-labelled',()=>{const b={...bundle,seasons:[]};const html=renderToStaticMarkup(React.createElement(App,{bundle:b}));assert.match(html,/No seasons available/);assert.match(html,/Sample data/);});
test('malformed schema, metrics, dates and referential joins fail explicitly',()=>{assert.throws(()=>validateBundle({...bundle,schema_version:2}),/Invalid schema/);const b=structuredClone(bundle);b.seasons[0].games[0].stats.all.xgf='3';assert.throws(()=>validateBundle(b),/Invalid schema/);const d=structuredClone(bundle);d.seasons[0].games[0].date='2025-02-31';assert.throws(()=>validateBundle(d),/Invalid schema/);const orphan=structuredClone(bundle);orphan.seasons[0].skaters[0].game_id='orphan';assert.throws(()=>validateBundle(orphan),/Invalid schema/);assert.equal(validateBundle(bundle).data_mode,'sample');});
test('local modification time never implies confirmed source retrieval',()=>{const label=sourceTimeLabel({...bundle.sources[0],retrieved_at_basis:'local_mtime'});assert.match(label,/Local file time/i);assert.doesNotMatch(label,/retrieved|downloaded/i);});

test('invalid calendar months are reported as schema errors',()=>{const b=structuredClone(bundle);b.seasons[0].games[0].date='2025-13-01';assert.throws(()=>validateBundle(b),/Invalid schema/);});
