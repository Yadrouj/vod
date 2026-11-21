import { stat } from 'node:fs/promises';
import path from 'node:path';
import { productAnalytics } from '../lib/product-analytics-store';
async function main() {
 try {process.loadEnvFile('.env.local');} catch { /* Environment may be injected. */ }
 const file=path.join(process.env.SARVNEMA_ANALYTICS_DIR||'data/analytics','product.sqlite');
 if(await stat(file).catch(()=>null)) {
  const store=productAnalytics();
  try {store.prune();} finally {store.close();}
  console.log(JSON.stringify({state:'pruned',dailyRetentionDays:90,at:new Date().toISOString()}));
 } else console.log(JSON.stringify({state:'skipped',reason:'No analytics database exists'}));
}
void main().catch(()=>{console.error('Private analytics cleanup failed; check configuration and database access.');process.exitCode=1;});
