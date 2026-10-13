import type { ReactNode } from 'react';
import type { Bundle, N, Strength } from '../data.js';
import { sourceTimeLabel } from '../data.js';
export const strengthLabel=(s:Strength)=>s==='5on5'?'5-on-5':'All strengths';
export const fmt=(n:N|undefined,digits=2)=>n===null||n===undefined?'—':n.toFixed(digits);
export const signed=(n:N,digits=2)=>n===null?'—':(n>0?'+':'')+n.toFixed(digits);
export function dateLabel(date:string):string { const [y,m,d]=date.split('-').map(Number);return new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d))); }
export const localTime=(date:string)=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(date));
export function Empty({children}:{children:ReactNode}) { return <p className="empty-state">{children}</p>; }
export function ViewHeading({number,kicker,title,description}:{number:string;kicker:string;title:string;description:string}) { return <header className="view-heading"><p className="eyebrow"><span>{number}</span> / {kicker}</p><h1>{title}</h1><p className="standfirst">{description}</p></header>; }
export function DataTable({caption,head,rows}:{caption:string;head:string[];rows:ReactNode[][]}) { return <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}><table><caption>{caption}</caption><thead><tr>{head.map((h,i)=><th scope="col" key={i}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th scope="row" key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>; }
export function SourceMeta({bundle,compact=false}:{bundle:Bundle;compact?:boolean}) {
  return <aside className={'source-meta'+(compact?' compact':'')} aria-label="Data provenance"><p><a href="https://moneypuck.com/data.htm" target="_blank" rel="noreferrer">Data: MoneyPuck.com</a>{bundle.data_mode==='sample'?' · Intended provider; this snapshot uses local fixtures.':''}</p><p>Covered through {bundle.coverage.max_game_date?dateLabel(bundle.coverage.max_game_date):'no game date available'} · Mode: <strong>{bundle.data_mode}</strong></p>{!compact&&<ul>{bundle.sources.map(s=><li key={s.kind}>{s.kind}: {bundle.data_mode==='sample'&&s.retrieved_at_basis!=='local_mtime'?'Fixture provenance time':sourceTimeLabel(s)} <time dateTime={s.retrieved_at}>{localTime(s.retrieved_at)}</time>{s.retrieved_at_basis==='local_mtime'?' · Provider retrieval time is unconfirmed.':''}</li>)}</ul>}</aside>;
}
export function GoalieTable({caption,rows,onPlayer}:{caption:string;rows:import('../analytics.js').GoalieSummary[];onPlayer?:(id:string)=>void}) {
 return rows.length?<DataTable caption={caption} head={['Goalie','GP','Minutes','xGA','GA','GSAx','Saves / shots']} rows={rows.map(p=>[onPlayer?<button className="text-button" onClick={()=>onPlayer(p.player_id)}>{p.name}</button>:p.name,p.appearances,fmt(p.minutes,1),fmt(p.xga),fmt(p.ga,0),signed(p.gsax),`${fmt(p.saves,0)} / ${fmt(p.shots_against,0)}`])}/>:<Empty>No goalie appearances at this strength in this sample.</Empty>;
}
