import { spawn } from 'node:child_process';
import { scrapeMeloobit, cliOptions } from './scrape-meloobit.mjs';
import { mkdir, open, unlink, stat } from 'node:fs/promises';

await mkdir('data',{recursive:true});
const file='data/daily-music-refresh.lock';
let lock;
try {lock=await open(file,'wx');}catch(e){
  if(e.code !== 'EEXIST')throw e;
  const info=await stat(file);
  if(Date.now()-info.mtimeMs<12*3600000){console.log('Another music catalog refresh is running; refusing a concurrent publisher.');process.exit(75);}
  await unlink(file);lock=await open(file,'wx');
}
await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString(),provider:'meloobit'}));
try {
const status = await scrapeMeloobit(cliOptions());
if(status.state === 'locked') process.exitCode = 75;
else {
  // Even a partial batch publishes verified successes; unchecked files stay private.
  for(const [script,args] of [['merge-meloobit-source.mjs',[]],['build-music-landing-index.mjs',[]],['build-mood-playlists.mjs',[]]]) {
    const code = await new Promise((resolve,reject) => {
      const child=spawn(process.execPath,[`scripts/${script}`,...args],{stdio:'inherit',windowsHide:true});
      child.once('error',reject);child.once('exit',code=>resolve(code));
    });
    if(code !== 0) {process.exitCode=1;break;}
  }
  if(status.state === 'failed') process.exitCode=1;
}
} finally {await lock.close();await unlink(file).catch(()=>{});}
