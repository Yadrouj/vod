import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { readScraperDashboardConfig } from './scraper-dashboard-config.mjs';
import { pathToFileURL } from 'node:url';

const statusFile='data/meloobit-backfill-status.json';
export function backfillProgress(source) {
  const pending=source.tracks.filter(t=>!t.reviewedAt || t.sources.some(s=>!s.checkedAt)).length;
  const complete=Array.from({length:source.maxPage},(_,i)=>i+1).every(p=>source.completedPages[p]) && !pending;
  return {pages:Object.keys(source.completedPages).length,totalPages:source.maxPage,discovered:source.tracks.length,verified:source.tracks.filter(t=>t.sources.some(s=>s.available===true)).length,pendingReviews:pending,state:complete ? 'completed' : 'running'};
}
async function status(value){
  await mkdir('data',{recursive:true});const tmp=`${statusFile}.${process.pid}.tmp`;
  await writeFile(tmp,JSON.stringify({...value,updatedAt:new Date().toISOString()}));await rename(tmp,statusFile);
  console.log(JSON.stringify(value));
}
async function main(){
let stopping=false, child;
const stop=()=>{stopping=true;child?.kill('SIGTERM');};
process.once('SIGTERM',stop);process.once('SIGINT',stop);
let failures=0,batches=0;
try{
while(!stopping){
  const config=await readScraperDashboardConfig();
  if(config.sources.find(s=>s.id==='meloobit')?.enabled===false){await status({state:'disabled',batches});break;}
  await status({state:'running',batches});
  const code=await new Promise((resolve,reject)=>{
    child=spawn(process.execPath,['scripts/refresh-meloobit.mjs','--full','--pages=0','--budget-ms=900000',...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});
    child.once('error',reject);child.once('exit',code=>{child=null;resolve(code);});
  });
  if(stopping){await status({state:'stopped',batches});break;}
  if(code===75){await status({state:'waiting-for-music-lock',batches});await new Promise(r=>setTimeout(r,30000));continue;}
  if(code!==0){
    if(++failures>=3){await status({state:'failed',batches,reason:'Three batches failed; inspect the source report before retrying.'});process.exitCode=1;break;}
    await new Promise(r=>setTimeout(r,30000*failures));continue;
  }
  failures=0;batches++;
  const source=JSON.parse(await readFile(`${process.env.MELOOBIT_STATE_DIR || '.media-cache/music'}/meloobit-source.json`,'utf8'));
  const progress=backfillProgress(source);
  await status({...progress,batches});
  if(progress.state==='completed')break;
}
}finally{process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e);process.exitCode=1;});
