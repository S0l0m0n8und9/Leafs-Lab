import type { Bundle, Strength } from './data.js';
import { chronological } from './analytics.js';
export type View='games'|'players'|'trends'|'methodology';
export interface Route { view:View; season:string; fallbackSeason:string; strength:Strength; game:string; player:string; window:5|10|20; search:string; sort:string; direction:'asc'|'desc' }
export const sortKeys=['appearances','goals','ixg','difference','shots','minutes','ixg60','goals60','oniceShare'] as const;
export function parseRoute(hash:string,bundle:Bundle):Route {
  const [page,query='']=hash.replace(/^#/,'').split('?'),p=new URLSearchParams(query);
  const populated=bundle.seasons.filter(s=>s.games.length),requested=populated.find(s=>s.id===p.get('season'));
  const latest=[...populated].sort((a,b)=>a.id.localeCompare(b.id)).at(-1);
  const season=requested??latest;
  // The canonical season points at usable data; retain why an empty selection changed.
  const emptySelection=bundle.seasons.find(s=>s.id===p.get('season')&&!s.games.length);
  const savedFallback=season?.id===latest?.id?bundle.seasons.find(s=>s.id===p.get('fallbackSeason')&&!s.games.length):undefined;
  const fallbackSeason=emptySelection?.id??savedFallback?.id??'';
  const games=season?chronological(season.games):[], game=games.find(g=>g.id===p.get('game'))??games.at(-1);
  return {view:(['games','players','trends','methodology'].includes(page)?page:'games') as View,season:season?.id??'',fallbackSeason,strength:p.get('strength')==='all'?'all':'5on5',game:game?.id??'',player:p.get('player')??'',window:([5,10,20].includes(Number(p.get('window')))?Number(p.get('window')):10) as 5|10|20,search:p.get('search')??'',sort:sortKeys.includes(p.get('sort') as typeof sortKeys[number])?p.get('sort')!:'ixg60',direction:p.get('direction')==='asc'?'asc':'desc'};
}
export function changeRoute(route:Route,changes:Partial<Route>,bundle:Bundle):Route {
  const next={...route,...changes};
  if(changes.season!==undefined)next.fallbackSeason='';
  return parseRoute(routeHash(next),bundle);
}
export function routeHash(route:Route):string {
  const p=new URLSearchParams();for(const [key,value] of Object.entries(route)){if(key!=='view'&&value!=='')p.set(key,String(value));}
  return '#'+route.view+'?'+p.toString();
}
export function subscribeRoute(target:EventTarget,callback:()=>void):()=>void {
  target.addEventListener('hashchange',callback);target.addEventListener('popstate',callback);
  return ()=>{target.removeEventListener('hashchange',callback);target.removeEventListener('popstate',callback);};
}
