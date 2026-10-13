import type { Game, SkaterAppearance, GoalieAppearance, Strength, N } from './data.js';
export interface PlayerSummary { player_id:string; name:string; position:string|null; appearances:number; goals:N; ixg:N; difference:N; shots:N; toi_seconds:N; minutes:N; ixg60:N; goals60:N; oniceShare:N; label:string }
export interface GoalieSummary { player_id:string; name:string; appearances:number; minutes:N; xga:N; ga:N; gsax:N; saves:N; shots_against:N }
export interface TrendPoint { game:Game; size:number; share:N; rollingShare:N; cumulativeFor:N; cumulativeAgainst:N; cumulativeGsax:N }
export function sum(values:N[]):N { return !values.length || values.some(v=>v===null) ? null : values.reduce<number>((a,b)=>a+b!,0); }
export function share(a:N,b:N):N { return a===null||b===null||a+b===0 ? null : 100*a/(a+b); }
export function rate(a:N,seconds:N):N { return a===null||seconds===null||seconds===0 ? null : 3600*a/seconds; }
export function difference(a:N,b:N):N { return a===null||b===null ? null : a-b; }
export function chronological(games:Game[]):Game[] { return [...games].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)); }
export function selectWindow(games:Game[],size:number,baselineSize=20):{current:Game[];baseline:Game[]} {
  const sorted=chronological(games), start=Math.max(0,sorted.length-size);
  return {current:sorted.slice(start),baseline:sorted.slice(Math.max(0,start-baselineSize),start)};
}
export function gameVerdict(game:Game,strength:Strength):string {
  const stats=game.stats[strength], value=stats?share(stats.xgf,stats.xga):null;
  if(value===null)return 'Analysis unavailable';
  const result=game.score_basis!=='unknown' && game.score_for!==null && game.score_against!==null && game.score_for!==game.score_against ? game.result : null;
  if(result===null)return value>=55?'led chance quality':value<=45?'trailed chance quality':'chance quality was close';
  if(value>=55)return result==='win'?'Strong process, positive result':'Encouraging underlying performance';
  if(value<=45)return result==='win'?'Won despite trailing chance quality':'Result matched weaker chance quality';
  return 'A close game on chance quality';
}
export function aggregatePlayer(rows:SkaterAppearance[],games:Game[],strength:Strength):PlayerSummary {
  const ids=new Set(games.map(g=>g.id)), sample=rows.filter(r=>ids.has(r.game_id)&&r.stats[strength]);
  const stats=sample.map(r=>r.stats[strength]!), goals=sum(stats.map(s=>s.goals)), ixg=sum(stats.map(s=>s.ixg)), seconds=sum(stats.map(s=>s.toi_seconds)), diff=difference(goals,ixg);
  const eligible=sample.length>=5 && seconds!==null && seconds>=3600;
  return {player_id:rows[0]?.player_id??'',name:rows.at(-1)?.name??'',position:rows.at(-1)?.position??null,appearances:sample.length,goals,ixg,difference:diff,shots:sum(stats.map(s=>s.shots)),toi_seconds:seconds,minutes:seconds===null?null:seconds/60,ixg60:rate(ixg,seconds),goals60:rate(goals,seconds),oniceShare:share(sum(stats.map(s=>s.onice_xgf)),sum(stats.map(s=>s.onice_xga))),label:!eligible?'Small sample':diff===null?'Finishing analysis unavailable':diff>=2?'Finishing above expectation':diff<=-2?'Finishing below expectation':'Finishing near expectation'};
}
export function aggregateGoalie(rows:GoalieAppearance[],games:Game[],strength:Strength):GoalieSummary {
  const ids=new Set(games.map(g=>g.id)), sample=rows.filter(r=>ids.has(r.game_id)&&r.stats[strength]), stats=sample.map(r=>r.stats[strength]!);
  const xga=sum(stats.map(s=>s.xga)), ga=sum(stats.map(s=>s.ga)),seconds=sum(stats.map(s=>s.toi_seconds));
  return {player_id:rows[0]?.player_id??'',name:rows.at(-1)?.name??'',appearances:sample.length,minutes:seconds===null?null:seconds/60,xga,ga,gsax:difference(xga,ga),saves:sum(stats.map(s=>s.saves)),shots_against:sum(stats.map(s=>s.shots_against))};
}
export function teamAggregate(games:Game[],strength:Strength) {
  const stats=games.map(g=>g.stats[strength]);
  const total=(key:keyof NonNullable<typeof stats[number]>)=>sum(stats.map(s=>s?.[key]??null));
  const xgf=total('xgf'),xga=total('xga'),toi=total('toi_seconds');
  return {xgf,xga,gf:total('gf'),ga:total('ga'),share:share(xgf,xga),xgf60:rate(xgf,toi),xga60:rate(xga,toi),toi};
}
export function rollingTrend(games:Game[],goalies:GoalieAppearance[],strength:Strength,size=10):TrendPoint[] {
  const sorted=chronological(games);
  return sorted.map((game,index)=>{
    const current=sorted.slice(Math.max(0,index-size+1),index+1), cumulative=sorted.slice(0,index+1), totals=teamAggregate(cumulative,strength), s=game.stats[strength];
    const goalieComplete=cumulative.every(g=>goalies.some(r=>r.game_id===g.id&&r.stats[strength]));
    return {game,size:current.length,share:s?share(s.xgf,s.xga):null,rollingShare:teamAggregate(current,strength).share,cumulativeFor:difference(totals.gf,totals.xgf),cumulativeAgainst:difference(totals.ga,totals.xga),cumulativeGsax:goalieComplete?aggregateGoalie(goalies,cumulative,strength).gsax:null};
  });
}
export function compareNullable(a:N,b:N,direction:'asc'|'desc'):number { return a===null?(b===null?0:1):b===null?-1:direction==='asc'?a-b:b-a; }
