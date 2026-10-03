import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MELOOBIT_ROOT, MELOOBIT_ARCHIVE, MELOOBIT_DOWNLOAD_ROOT, siteUrl, downloadUrl, parseMeloobitListing,
  parseMeloobitDetail, parseMeloobitCollections, matchingIndexSources, mergeSources } from './meloobit-source.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function readJson(file, fallback) { try { return JSON.parse(await readFile(file,'utf8')); } catch (e) { if(e.code !== 'ENOENT') throw e; return fallback; } }
async function atomic(file, value) {
  await mkdir(path.dirname(file), {recursive:true});
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value)); await rename(tmp,file);
}
export function cliOptions(argv = process.argv.slice(2), env = process.env) {
  const args = new Set(argv), number = (key, fallback, max) => {
    const v = Number(argv.find(a=>a.startsWith(`--${key}=`))?.split('=')[1] ?? fallback);
    if (!Number.isFinite(v) || v < 0) throw new Error(`Invalid ${key}`);
    return Math.min(max, Math.floor(v));
  };
  return { directory: env.MELOOBIT_STATE_DIR || '.media-cache/music', statusFile: env.MELOOBIT_STATUS_FILE || 'data/meloobit-status.json',
    full: args.has('--full'), recentOnly:args.has('--recent-only'),
    pages: number('pages', env.MELOOBIT_RECENT_PAGES || 2, 1000),
    backfillPages:number('backfill-pages', env.MELOOBIT_BACKFILL_PAGES || 2,1000),
    detailLimit:number('detail-limit', env.MELOOBIT_DETAIL_LIMIT || 24,100000),
    budgetMs:Math.max(1000,number('budget-ms', env.MELOOBIT_BUDGET_MS || 420000,86400000)),
    gapMs:Math.max(250,number('delay-ms',env.MUSIC_REFRESH_REQUEST_GAP_MS || 1200,10000)),
    maxPage: number('max-page',506,10000) };
}
/** Finite, resumable batches with bounded checkpoint I/O; no full MP3 downloads. */
export async function scrapeMeloobit(options = cliOptions()) {
  const {directory,statusFile} = options, sourceFile=path.join(directory,'meloobit-source.json'), lockFile=path.join(directory,'meloobit.lock');
  await mkdir(directory,{recursive:true});
  // Read before acquiring a lock: a corrupt checkpoint must not strand a lock.
  const source=await readJson(sourceFile,{version:1,tracks:[],collections:[],completedPages:{},maxPage:options.maxPage});
  let lock;
  try { lock=await open(lockFile,'wx'); } catch(e) {
    if(e.code !== 'EEXIST') throw e;
    const old=await readJson(lockFile,{});
    if(!old.expiresAt || Date.now() < old.expiresAt) return {state:'locked'};
    await unlink(lockFile); lock=await open(lockFile,'wx');
  }
  const startedAt=new Date().toISOString(), deadline=Date.now()+options.budgetMs;
  await lock.writeFile(JSON.stringify({pid:process.pid,startedAt,expiresAt:deadline+3600000}));
  const tracks=new Map(source.tracks.map(t=>[t.id,t])), directories=new Map(), nextRequests=new Map();
  const status={provider:'meloobit',state:'running',startedAt,updatedAt:startedAt,current:null,pages:{complete:Object.keys(source.completedPages ?? {}).length,total:source.maxPage || options.maxPage},
    tracks:{discovered:tracks.size,new:0,complete:0,failures:0},links:{checked:0,available:0,unavailable:0},warnings:[]};
  source.completedPages ??= {};
  let interrupted=false, details=0, lastSaved=0;
  const interrupt=()=>{interrupted=true;};
  process.once('SIGTERM',interrupt); process.once('SIGINT',interrupt);
  function checkBudget(){ if(interrupted || Date.now()>=deadline || (process.env.MAINTENANCE_DEADLINE && Date.now()>=Number(process.env.MAINTENANCE_DEADLINE))) { const e=new Error('Time budget reached; remaining pages and links will resume'); e.code='TIME_BUDGET'; throw e; } }
  async function checkpoint(force=false){
    if(!force && Date.now()-lastSaved<10000)return;
    source.tracks=[...tracks.values()];source.updatedAt=new Date().toISOString();status.updatedAt=source.updatedAt;
    status.verifiedTracks=source.tracks.filter(t=>t.sources.some(s=>s.available===true)).length;
    await atomic(sourceFile,source);await atomic(statusFile,status);lastSaved=Date.now();
  }
  async function request(value,{media=false,probe=false}={}) {
    const url=media ? downloadUrl(value) : siteUrl(value);
    if(!url) throw new Error('Source URL outside allowed public hosts');
    for(let attempt=0;attempt<3;attempt++) {
      checkBudget();
      const host=new URL(url).host,gap=media ? Math.max(350,Math.floor(options.gapMs/2)) : options.gapMs;
      await sleep(Math.max(0,(nextRequests.get(host) || 0)-Date.now())); checkBudget();
      nextRequests.set(host,Date.now()+gap);
      const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(Math.min(20000,Math.max(1,deadline-Date.now()))),headers:{'User-Agent':'SarvNema music catalog/1.0 (+https://sarvnema.ir)',...(probe ? {Range:'bytes=0-2047'} : {})}});
      if([429,500,502,503,504].includes(r.status) && attempt<2) {
        await r.body?.cancel();const retry=Number(r.headers.get('retry-after'));await sleep(Math.min(15000,Number.isFinite(retry)&&retry>0 ? retry*1000 : 1000*2**attempt));continue;
      }
      return r;
    }
  }
  async function text(url, media=false) {
    const r=await request(url,{media});
    if(!r.ok) {await r.body?.cancel();throw new Error(`HTTP ${r.status}: ${url}`);}
    const type=r.headers.get('content-type') || '';
    if(!/html|text|xml/i.test(type)){await r.body?.cancel();throw new Error('Expected a listing page');}
    const reader=r.body.getReader();let size=0;const chunks=[];
    try {while(true){checkBudget();const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>3_000_000)throw new Error('Listing exceeds size limit');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
    return Buffer.concat(chunks).toString('utf8');
  }
  async function verify(s) {
    const checkedAt=new Date().toISOString();status.links.checked++;
    try {
      const r=await request(s.url,{media:true,probe:true});let available=false;
      if(r.ok && !/text|html|json|xml/i.test(r.headers.get('content-type')||'')) {
        const reader=r.body.getReader();const {value}=await reader.read();await reader.cancel();
        const b=Buffer.from(value ?? []), type=r.headers.get('content-type') || '';
        available=b.length>0 && (/^(audio|video)\//i.test(type) || b.toString('ascii',0,3)==='ID3' || (b[0]===255 && (b[1]&224)===224) || b.toString('ascii',4,8)==='ftyp' || b.toString('ascii',0,4)==='RIFF' || b.toString('ascii',0,4)==='fLaC');
      } else await r.body?.cancel();
      status.links[available ? 'available' : 'unavailable']++;return {...s,available,checkedAt};
    } catch(e) {if(e.code==='TIME_BUDGET')throw e;status.links.unavailable++;status.warnings.push(`${s.url}: ${e.message}`);return {...s,available:false,checkedAt};}
  }
  async function review(track,{detail=false}={}) {
    checkBudget(); status.current=track.sourceUrl;
    if(detail && details++<options.detailLimit) {
      try {track=parseMeloobitDetail(await text(track.sourceUrl),track);} catch(e){if(e.code==='TIME_BUDGET')throw e;status.warnings.push(`Detail ${track.sourceUrl}: ${e.message}`);}
    }
    for(const directoryUrl of new Set(track.sources.map(s=>s.basePath).filter(Boolean))) {
      const dir=downloadUrl(directoryUrl);if(!dir || !dir.startsWith(MELOOBIT_DOWNLOAD_ROOT))continue;
      try {if(!directories.has(dir))directories.set(dir,await text(dir,true));track.sources=mergeSources(track.sources,matchingIndexSources(directories.get(dir),dir,track));}
      catch(e){if(e.code==='TIME_BUDGET')throw e;status.warnings.push(`Index ${dir}: ${e.message}`);}
    }
    for(let i=0;i<track.sources.length;i++) {
      const s=track.sources[i];
      if(s.checkedAt && Date.now()-Date.parse(s.checkedAt)<86400000)continue;
      track.sources[i]=await verify(s);
      tracks.set(track.id,track);await checkpoint();
    }
    track.reviewedAt=new Date().toISOString();tracks.set(track.id,track);status.tracks.complete++;await checkpoint();
  }
  async function page(pageNumber) {
    const url=pageNumber===1 ? MELOOBIT_ARCHIVE : `${MELOOBIT_ARCHIVE}page/${pageNumber}/`;
    status.current=url;const html=await text(url), parsed=parseMeloobitListing(html,url);
    if(!parsed.length)throw new Error(`No songs parsed on page ${pageNumber}; refusing to mark it completed`);
    const last=[...html.matchAll(/\/page\/(\d+)\//g)].map(m=>Number(m[1]));
    source.maxPage=Math.max(source.maxPage || options.maxPage,...last);status.pages.total=source.maxPage;
    for(const incoming of parsed) {
      const old=tracks.get(incoming.id), track={...old,...incoming,addedAt:old?.addedAt || startedAt,sources:mergeSources(old?.sources,incoming.sources)};
      if(!old)status.tracks.new++;tracks.set(track.id,track);
    }
    source.completedPages[pageNumber]=new Date().toISOString();status.pages.complete=Object.keys(source.completedPages).length;status.tracks.discovered=tracks.size;await checkpoint(true);
    for(const incoming of parsed)await review(tracks.get(incoming.id),{detail:pageNumber<=options.pages});
    await checkpoint(true);
    console.log(JSON.stringify({provider:'meloobit',page:pageNumber,pages:status.pages,tracks:tracks.size,available:[...tracks.values()].filter(t=>t.sources.some(s=>s.available)).length}));
  }
  try {
    const home=await text(`${MELOOBIT_ROOT}/`);source.collections=parseMeloobitCollections(home);
    for(let pageNumber=1;pageNumber<=options.pages;pageNumber++)await page(pageNumber);
    // Retry interrupted validations before spending the budget on more history.
    for(const track of [...tracks.values()].filter(t=>!t.reviewedAt || t.sources.some(s=>!s.checkedAt || Date.now()-Date.parse(s.checkedAt)>(s.available ? 14 : 1)*86400000)).sort((a,b)=>String(b.publishedAt||'').localeCompare(String(a.publishedAt||''))).slice(0,options.full ? undefined : 50))await review(track);
    if(!options.recentOnly) {
      let reviewed=0;
      for(let pageNumber=options.pages+1;pageNumber<=source.maxPage;pageNumber++) {
        if(source.completedPages[pageNumber])continue;
        if(!options.full && reviewed>=options.backfillPages)break;
        await page(pageNumber);reviewed++;
      }
    }
    status.state='completed';
  } catch(e) {
    status.state=e.code==='TIME_BUDGET' ? 'partial' : 'failed';status.error=e.message;
    if(e.code!=='TIME_BUDGET')status.tracks.failures++;
  } finally {
    status.warnings=status.warnings.slice(-100);status.current=null;status.finishedAt=new Date().toISOString();
    status.verifiedTracks=[...tracks.values()].filter(t=>t.sources.some(s=>s.available===true)).length;
    try {await checkpoint(true);} finally {await lock.close();await unlink(lockFile).catch(()=>{});process.removeListener('SIGTERM',interrupt);process.removeListener('SIGINT',interrupt);}
  }
  console.log(JSON.stringify(status));return status;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) scrapeMeloobit().then(status=>{if(status.state==='failed')process.exitCode=1;if(status.state==='locked')process.exitCode=75;}).catch(e=>{console.error(e);process.exitCode=1;});
