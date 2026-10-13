export type Strength = 'all' | '5on5';
export type N = number | null;
export type Stats<T> = Partial<Record<Strength, T>>;
export interface TeamStats { xgf:N; xga:N; gf:N; ga:N; shots_for:N; shots_against:N; toi_seconds:N }
export interface SkaterStats { goals:N; ixg:N; shots:N; toi_seconds:N; onice_xgf:N; onice_xga:N }
export interface GoalieStats { xga:N; ga:N; shots_against:N; saves:N; toi_seconds:N }
export interface Game { id:string; date:string; opponent:string; home_away:'home'|'away'; result:'win'|'loss'|null; score_for:N; score_against:N; score_basis:'before_shootout'|'final'|'unknown'; stats:Stats<TeamStats> }
export interface SkaterAppearance { game_id:string; player_id:string; name:string; position:string|null; stats:Stats<SkaterStats> }
export interface GoalieAppearance { game_id:string; player_id:string; name:string; stats:Stats<GoalieStats> }
export interface Season { id:string; label:string; games:Game[]; skaters:SkaterAppearance[]; goalies:GoalieAppearance[] }
export interface Source { kind:'teams'|'skaters'|'goalies'; url:string|null; retrieved_at:string; retrieved_at_basis:'declared_retrieval'|'downloaded'|'local_mtime'; hash:string; validation_status:'schema_validated'|'sample_validated'; mapping_status:'verified'|'unverified' }
export interface Bundle { schema_version:1; data_mode:'real'|'sample'; generated_at:string; sources:Source[]; coverage:{max_game_date:string;unavailable_seasons:string[]}; seasons:Season[] }

function requireValid(condition:unknown,path:string):asserts condition { if(!condition)throw new Error(`Invalid schema: ${path}`); }
function object(v:unknown):v is Record<string,unknown> { return v!==null&&typeof v==='object'&&!Array.isArray(v); }
function text(v:unknown):v is string { return typeof v==='string'&&v.length>0; }
function timestamp(v:unknown):boolean { return typeof v==='string'&&/(Z|\+00:00)$/.test(v)&&Number.isFinite(Date.parse(v)); }
function calendar(v:unknown):boolean { return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v; }
function numeric(v:unknown,count=false):boolean { return v===null || (typeof v==='number'&&Number.isFinite(v)&&v>=0&&(!count||Number.isInteger(v))); }
const fields={teams:['xgf','xga','gf','ga','shots_for','shots_against','toi_seconds'],skaters:['goals','ixg','shots','toi_seconds','onice_xgf','onice_xga'],goalies:['xga','ga','shots_against','saves','toi_seconds']} as const;
function validStats(value:unknown,kind:keyof typeof fields,path:string):void {
  requireValid(object(value),path);
  for(const [strength,stats] of Object.entries(value)) {
    requireValid(['all','5on5'].includes(strength)&&object(stats),path+'.'+strength);
    for(const field of fields[kind])requireValid(numeric(stats[field],['gf','ga','goals','shots','shots_for','shots_against','saves'].includes(field)),path+'.'+strength+'.'+field);
  }
}
export function validateBundle(value:unknown):Bundle {
  requireValid(object(value),'bundle');
  requireValid(value.schema_version===1,'schema_version must be 1');
  requireValid(value.data_mode==='real'||value.data_mode==='sample','data_mode');
  requireValid(timestamp(value.generated_at),'generated_at');
  requireValid(Array.isArray(value.sources),'sources');
  for(const source of value.sources) {
    requireValid(object(source)&&['teams','skaters','goalies'].includes(String(source.kind)),'source kind');
    requireValid(source.url===null||(typeof source.url==='string'&&/^https?:\/\//.test(source.url)),'source URL');
    requireValid(timestamp(source.retrieved_at),'source time');
    requireValid(['declared_retrieval','downloaded','local_mtime'].includes(String(source.retrieved_at_basis)),'source time basis');
    requireValid(typeof source.hash==='string'&&/^sha256:[a-f0-9]{64}$/.test(source.hash),'source hash');
    requireValid(['schema_validated','sample_validated'].includes(String(source.validation_status))&&['verified','unverified'].includes(String(source.mapping_status)),'source validation');
  }
  requireValid(object(value.coverage)&&Array.isArray(value.coverage.unavailable_seasons)&&value.coverage.unavailable_seasons.every(text),'coverage');
  requireValid(value.coverage.max_game_date===''||calendar(value.coverage.max_game_date),'coverage date');
  requireValid(Array.isArray(value.seasons),'seasons');
  const seasonIds=new Set<string>();
  for(const season of value.seasons) {
    requireValid(object(season)&&text(season.id)&&text(season.label),'season');
    requireValid(!seasonIds.has(season.id),'duplicate season');seasonIds.add(season.id);
    requireValid(Array.isArray(season.games)&&Array.isArray(season.skaters)&&Array.isArray(season.goalies),'season arrays');
    const ids=new Set<string>(), games=new Map<string,Record<string,unknown>>();
    for(const game of season.games) {
      requireValid(object(game)&&text(game.id)&&!ids.has(game.id),'game identifier');ids.add(game.id);games.set(game.id,game);
      requireValid(calendar(game.date)&&text(game.opponent)&&['home','away'].includes(String(game.home_away)),'game date/opponent/location');
      requireValid(game.result===null||game.result==='win'||game.result==='loss','game result');
      requireValid(numeric(game.score_for,true)&&numeric(game.score_against,true)&&['before_shootout','final','unknown'].includes(String(game.score_basis)),'score');
      requireValid(game.result===null||(game.score_basis!=='unknown'&&game.score_for!==null&&game.score_against!==null&&game.score_for!==game.score_against&&((game.score_for as number)>(game.score_against as number)?game.result==='win':game.result==='loss')),'ambiguous result');
      validStats(game.stats,'teams','game stats');requireValid(object(game.stats)&&game.stats.all!==undefined,'all-strength game stats');
    }
    for(const kind of ['skaters','goalies'] as const) {
      const keys=new Set<string>();
      for(const row of season[kind] as unknown[]) {
        requireValid(object(row)&&text(row.player_id)&&text(row.game_id)&&ids.has(row.game_id)&&text(row.name),'player join/name');
        const key=row.game_id+':'+row.player_id;requireValid(!keys.has(key),'duplicate player appearance');keys.add(key);
        if(kind==='skaters')requireValid(row.position===null||text(row.position),'player position');
        validStats(row.stats,kind,'player stats');
        for(const strength of Object.keys(row.stats as object))requireValid(object(games.get(row.game_id)?.stats)&&strength in (games.get(row.game_id)!.stats as object),'player strength join');
      }
    }
  }
  return value as unknown as Bundle;
}
export function sourceTimeLabel(source:Source):string { return source.retrieved_at_basis==='local_mtime'?'Local file time':source.retrieved_at_basis==='downloaded'?'Downloaded at':'Declared retrieval time'; }
