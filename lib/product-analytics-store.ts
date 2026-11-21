import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { ProductPacket } from './product-analytics-schema';

type Scalar = string | number | null;
type Row = Record<string, Scalar>;
type Statement = { run: (...args: Scalar[]) => unknown; all: (...args: Scalar[]) => Row[]; get: (...args: Scalar[]) => Row | undefined };
type Database = { exec: (sql: string) => void; prepare: (sql: string) => Statement; close: () => void };
export const analyticsDay = (now: number) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const dayOffset = (day: string, offset: number) => new Date(Date.parse(`${day}T12:00:00Z`) + offset * 86400000).toISOString().slice(0,10);
const num = (value: Scalar | undefined) => typeof value === 'number' && Number.isFinite(value) ? value : 0;

export class ProductAnalyticsStore {
  private db: Database;
  private pruned = '';
  private timer:ReturnType<typeof setInterval>;
  private statements=new Map<string,Statement>();
  constructor(directory: string, private secret: string) {
    mkdirSync(directory, {recursive:true,mode:0o700});
    const file=path.join(directory,'product.sqlite');
    this.db=new DatabaseSync(file);
    try {chmodSync(file,0o600);} catch { /* Windows permissions use the workspace ACL. */ }
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=1000; PRAGMA synchronous=NORMAL;
      CREATE TABLE IF NOT EXISTS visitors(id TEXT PRIMARY KEY, first_day TEXT NOT NULL, last_day TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, visitor TEXT NOT NULL, started INTEGER NOT NULL, last_at INTEGER NOT NULL, last_pulse INTEGER NOT NULL, source TEXT NOT NULL, device TEXT NOT NULL, page TEXT NOT NULL, signal TEXT NOT NULL DEFAULT 'browsing', signal_at INTEGER NOT NULL, exit_seen INTEGER NOT NULL DEFAULT 0, starts INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS session_live ON sessions(last_at);
      CREATE TABLE IF NOT EXISTS activity(day TEXT, session TEXT, views INTEGER DEFAULT 0, engaged REAL DEFAULT 0, watch REAL DEFAULT 0, listen REAL DEFAULT 0, starts INTEGER DEFAULT 0, ends INTEGER DEFAULT 0, errors INTEGER DEFAULT 0, buffering REAL DEFAULT 0, downloads INTEGER DEFAULT 0, handoffs INTEGER DEFAULT 0, PRIMARY KEY(day,session));
      CREATE TABLE IF NOT EXISTS visit_days(visitor TEXT, day TEXT, PRIMARY KEY(visitor,day));
      CREATE INDEX IF NOT EXISTS visit_day ON visit_days(day);
      CREATE TABLE IF NOT EXISTS pages(day TEXT, path TEXT, views INTEGER DEFAULT 0, engaged REAL DEFAULT 0, departures INTEGER DEFAULT 0, PRIMARY KEY(day,path));
      CREATE TABLE IF NOT EXISTS content(day TEXT, kind TEXT, item TEXT, provider TEXT, starts INTEGER DEFAULT 0, seconds REAL DEFAULT 0, ends INTEGER DEFAULT 0, errors INTEGER DEFAULT 0, PRIMARY KEY(day,kind,item,provider));
      CREATE TABLE IF NOT EXISTS batches(id TEXT PRIMARY KEY, day TEXT);
    `);
    this.timer=setInterval(()=>{try{this.prune();}catch{console.warn('Product analytics retention cleanup failed');}},3600000);
    this.timer.unref();
  }
  close() {clearInterval(this.timer);this.db.close();}
  private hash(value: string) {return createHmac('sha256',this.secret).update(value).digest('hex');}
  private statement(sql:string) {let s=this.statements.get(sql);if(!s){s=this.db.prepare(sql);this.statements.set(sql,s);}return s;}
  private all(sql: string,...args: Scalar[]) {return this.statement(sql).all(...args);}
  private one(sql: string,...args: Scalar[]) {return this.statement(sql).get(...args) ?? {};}
  private run(sql: string,...args: Scalar[]) {this.statement(sql).run(...args);}
  ingest(packet: ProductPacket, now = Date.now()) {
    const day=analyticsDay(now), visitor=this.hash(`visitor:${packet.visitor}`), session=this.hash(`session:${packet.session}`), batch=this.hash(`batch:${packet.session}:${packet.batch}`);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if(this.one('SELECT id FROM batches WHERE id=?',batch).id) {this.db.exec('ROLLBACK');return false;}
      const old=this.one('SELECT * FROM sessions WHERE id=?',session);
      if(old.visitor && old.visitor!==visitor) throw new Error('Session identity mismatch');
      const firstPath=packet.events[0].path;
      this.run('INSERT OR IGNORE INTO visitors VALUES(?,?,?)',visitor,day,day);
      this.run('UPDATE visitors SET last_day=? WHERE id=?',day,visitor);
      this.run('INSERT OR IGNORE INTO sessions(id,visitor,started,last_at,last_pulse,source,device,page,signal_at) VALUES(?,?,?,?,?,?,?,?,?)',session,visitor,now,now,now,packet.source,packet.device,firstPath,now);
      this.run('INSERT OR IGNORE INTO visit_days VALUES(?,?)',visitor,day);
      this.run('INSERT OR IGNORE INTO activity(day,session) VALUES(?,?)',day,session);
      this.run('INSERT INTO batches VALUES(?,?)',batch,day);
      let elapsed=Math.min(15,Math.max(0,(now-num(old.last_pulse || now))/1000));
      for(const e of packet.events) {
        let views=0, engaged=0, watch=0, listen=0, starts=0, ends=0, errors=0, buffering=0, downloads=0, handoffs=0;
        if(e.type==='page_view') views=1;
        if(e.type==='pulse') {engaged=Math.min(e.engaged||0,elapsed); const seconds=Math.min(e.seconds||0,elapsed); if(e.kind==='audio')listen=seconds;else watch=seconds; buffering=Math.min(e.buffering||0,elapsed); elapsed=0;this.run('UPDATE sessions SET last_pulse=? WHERE id=?',now,session);}
        if(e.type==='play_start') starts=1;
        if(e.type==='media_end') ends=1;
        if(e.type==='media_error') errors=1;
        if(e.type==='download_click') downloads=1;
        if(e.type==='download_handoff') handoffs=1;
        const signal=errors ? 'error' : handoffs ? 'download' : buffering || e.type==='buffer' ? 'buffer' : ends ? 'completed' : starts || watch+listen>0 ? 'playing' : views ? 'browsing' : null;
        this.run('UPDATE sessions SET last_at=?, page=?, exit_seen=?, starts=starts+? WHERE id=?',now,e.path,e.type==='page_leave'&&e.exit?1:0,starts,session);
        if(signal)this.run('UPDATE sessions SET signal=?,signal_at=? WHERE id=?',signal,now,session);
        this.run('UPDATE activity SET views=views+?,engaged=engaged+?,watch=watch+?,listen=listen+?,starts=starts+?,ends=ends+?,errors=errors+?,buffering=buffering+?,downloads=downloads+?,handoffs=handoffs+? WHERE day=? AND session=?',views,engaged,watch,listen,starts,ends,errors,buffering,downloads,handoffs,day,session);
        this.run('INSERT OR IGNORE INTO pages(day,path) VALUES(?,?)',day,e.path);
        this.run('UPDATE pages SET views=views+?,engaged=engaged+?,departures=departures+? WHERE day=? AND path=?',views,engaged,e.type==='page_leave'?1:0,day,e.path);
        if(e.item && (starts||ends||errors||watch+listen>0)) {
          this.run('INSERT OR IGNORE INTO content(day,kind,item,provider) VALUES(?,?,?,?)',day,e.kind||'video',e.item,e.provider||'unknown');
          this.run('UPDATE content SET starts=starts+?,seconds=seconds+?,ends=ends+?,errors=errors+? WHERE day=? AND kind=? AND item=? AND provider=?',starts,watch+listen,ends,errors,day,e.kind||'video',e.item,e.provider||'unknown');
        }
      }
      this.db.exec('COMMIT');
    } catch(error) {this.db.exec('ROLLBACK');throw error;}
    this.prune(now);
    return true;
  }
  prune(now=Date.now()) {
    const day=analyticsDay(now);if(this.pruned===day)return;
    const cutoff=dayOffset(day,-89);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for(const table of ['activity','visit_days','pages','content'])this.run(`DELETE FROM ${table} WHERE day<?`,cutoff);
      this.run('DELETE FROM batches WHERE day<?',dayOffset(day,-1));
      this.run('DELETE FROM sessions WHERE last_at<?',now-90*86400000);
      this.run('DELETE FROM visitors WHERE last_day<?',cutoff);
      this.db.exec('COMMIT');this.pruned=day;
    } catch(error) {this.db.exec('ROLLBACK');throw error;}
  }
  snapshot(days=7,now=Date.now()) {
    days=[7,30,90].includes(days)?days:7;this.prune(now);
    const today=analyticsDay(now), since=dayOffset(today,1-days), prev=dayOffset(since,-days);
    const summary=(from:string,to:string)=>this.one(`SELECT COALESCE(SUM(a.views),0) views,COUNT(DISTINCT s.visitor) visitors,COUNT(DISTINCT a.session) sessions,COALESCE(SUM(a.engaged),0) engaged,COALESCE(SUM(a.watch),0) watch,COALESCE(SUM(a.listen),0) listen,COALESCE(SUM(a.starts),0) starts,COALESCE(SUM(a.ends),0) ends,COALESCE(SUM(a.errors),0) errors,COALESCE(SUM(a.buffering),0) buffering,COALESCE(SUM(a.downloads),0) downloads,COALESCE(SUM(a.handoffs),0) handoffs,COUNT(DISTINCT CASE WHEN a.errors>0 THEN a.session END) failedSessions,COUNT(DISTINCT CASE WHEN a.errors>0 OR a.starts>0 THEN a.session END) attemptedSessions FROM activity a JOIN sessions s ON s.id=a.session WHERE a.day>=? AND a.day<=?`,from,to);
    const series=this.all('SELECT a.day,COUNT(DISTINCT s.visitor) visitors,SUM(a.views) views,SUM(a.watch) watch,SUM(a.listen) listen,SUM(a.handoffs) handoffs FROM activity a JOIN sessions s ON s.id=a.session WHERE a.day>=? GROUP BY a.day ORDER BY a.day',since);
    const daily=Array.from({length:days},(_,index)=>{const day=dayOffset(since,index);return series.find(r=>r.day===day)??{day,visitors:0,views:0,watch:0,listen:0,handoffs:0};});
    const cohort=this.all('SELECT first_day day,COUNT(*) users FROM visitors WHERE first_day>=? GROUP BY first_day ORDER BY first_day DESC LIMIT 14',since).map(row=>{
      const retention=(offset:number)=>{
        const target=dayOffset(String(row.day),offset);if(target>today)return null;
        return num(this.one('SELECT COUNT(*) count FROM visit_days d JOIN visitors v ON v.id=d.visitor WHERE v.first_day=? AND d.day=?',String(row.day),target).count);
      };
      return {day:String(row.day),users:num(row.users),d1:retention(1),d7:retention(7),d30:retention(30)};
    });
    const retention=[1,7,30].map(offset=>{
      const eligible=this.one('SELECT COUNT(*) count FROM visitors WHERE first_day>=? AND first_day<=?',since,dayOffset(today,-offset));
      const returned=this.one("SELECT COUNT(*) count FROM visitors v JOIN visit_days d ON d.visitor=v.id AND d.day=date(v.first_day,'+' || ? || ' days') WHERE v.first_day>=? AND v.first_day<=?",offset,since,dayOffset(today,-offset));
      return {day:offset,eligible:num(eligible.count),returned:num(returned.count)};
    });
    const live=this.all('SELECT page,COUNT(DISTINCT visitor) users FROM sessions WHERE last_at>=? AND exit_seen=0 GROUP BY page ORDER BY users DESC LIMIT 8',now-60000);
    const liveUsers=num(this.one('SELECT COUNT(DISTINCT visitor) count FROM sessions WHERE last_at>=? AND exit_seen=0',now-60000).count);
    const breakdown=(column:'source'|'device')=>this.all(`SELECT s.${column} label,COUNT(DISTINCT s.visitor) visitors,SUM(a.views) views,SUM(a.watch+a.listen) seconds,SUM(a.handoffs) handoffs FROM activity a JOIN sessions s ON s.id=a.session WHERE a.day>=? GROUP BY s.${column} ORDER BY visitors DESC LIMIT 12`,since);
    const funnel=this.one(`SELECT COUNT(*) visitors,SUM(CASE WHEN starts>0 THEN 1 ELSE 0 END) played,SUM(CASE WHEN seconds>=60 THEN 1 ELSE 0 END) engaged,SUM(CASE WHEN handoffs>0 THEN 1 ELSE 0 END) downloaded FROM (SELECT s.visitor,SUM(a.starts) starts,SUM(a.watch+a.listen) seconds,SUM(a.handoffs) handoffs FROM activity a JOIN sessions s ON s.id=a.session WHERE a.day>=? GROUP BY s.visitor)`,since);
    const exits=this.all(`SELECT CASE WHEN last_at-signal_at<=30000 AND signal='error' THEN 'playback-error' WHEN last_at-signal_at<=30000 AND signal='buffer' THEN 'buffering' WHEN last_at-signal_at<=30000 AND signal='completed' THEN 'completed' WHEN last_at-signal_at<=30000 AND signal='download' THEN 'download-handoff' WHEN starts=0 THEN 'no-playback' ELSE 'unknown' END reason,COUNT(*) count FROM sessions WHERE started>=? AND (last_at<? OR exit_seen=1) GROUP BY reason ORDER BY count DESC`,Date.parse(`${since}T00:00:00Z`)-12600000,now-90000);
    return {generatedAt:new Date(now).toISOString(),days,since,timeZone:'Asia/Tehran',collectionStartedAt:this.one('SELECT MIN(first_day) day FROM visitors').day??null,summary:summary(since,today),previous:summary(prev,dayOffset(since,-1)),daily,liveUsers,live,sources:breakdown('source'),devices:breakdown('device'),funnel,retention,cohorts:cohort,exits,
      pages:this.all('SELECT path,SUM(views) views,SUM(engaged) engaged,SUM(departures) departures FROM pages WHERE day>=? GROUP BY path ORDER BY views DESC LIMIT 15',since),
      content:this.all('SELECT kind,item,SUM(starts) starts,SUM(seconds) seconds,SUM(ends) ends,SUM(errors) errors FROM content WHERE day>=? GROUP BY kind,item ORDER BY seconds DESC LIMIT 20',since),
      providers:this.all('SELECT provider,SUM(starts) starts,SUM(errors) errors,SUM(seconds) seconds FROM content WHERE day>=? GROUP BY provider ORDER BY errors DESC LIMIT 12',since)};
  }
}
export type ProductSnapshot = ReturnType<ProductAnalyticsStore['snapshot']>;
let singleton: {root:string;secret:string;store:ProductAnalyticsStore}|undefined;
export function analyticsEnabled() {return process.env.SARVNEMA_ANALYTICS_ENABLED!=='0' && (process.env.SARVNEMA_ADMIN_TOKEN?.trim().length??0)>=16;}
export function productAnalytics() {
  const root=path.resolve(process.env.SARVNEMA_ANALYTICS_DIR||'data/analytics'),secret=process.env.SARVNEMA_ANALYTICS_SECRET||process.env.SARVNEMA_ADMIN_TOKEN||'';
  const publicRoot=path.resolve('public');
  if(root===publicRoot||root.startsWith(publicRoot+path.sep))throw new Error('Analytics must not be stored in public');
  if(secret.length<16)throw new Error('Analytics not configured');
  if(!singleton||singleton.root!==root||singleton.secret!==secret){singleton?.store.close();singleton={root,secret,store:new ProductAnalyticsStore(root,secret)};}
  return singleton.store;
}
