import { isAdminRequest, PRIVATE_HEADERS } from '@/lib/admin-auth';
import { analyticsEnabled, productAnalytics } from '@/lib/product-analytics-store';
import { checkRateLimit } from '@/lib/runtime-cache';
import { readFile, statfs } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyticsCsvCell } from '@/lib/product-analytics-schema';
import { readFileSnapshot, type FileSnapshot } from '@/lib/file-snapshot';
import { persianTitleOrFallback } from '@/lib/title-display';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type LabelCard={imdbCode:string;title:string;persianTitle?:string|null};
const videoLabels:FileSnapshot<{items:LabelCard[]}>= {}, musicLabels:FileSnapshot<{tracks:{id:string;title:string;persianTitle?:string|null}[]}>= {};
async function contentLabels(rows:ReturnType<ReturnType<typeof productAnalytics>['snapshot']>['content']) {
  if(!rows.length)return rows;
  const [vod,music]=await Promise.all([
    readFileSnapshot(path.join(process.cwd(),'public/data/vod-home.json'),videoLabels).catch(()=>({items:[]})),
    readFileSnapshot(path.join(process.cwd(),'public/data/music-landing.json'),musicLabels).catch(()=>({tracks:[]})),
  ]);
  const names=new Map<string,string>();
  for(const item of vod.items??[])names.set(item.imdbCode,persianTitleOrFallback(item)||item.title);
  for(const track of music.tracks??[])names.set(`music:${track.id}`,track.persianTitle||track.title);
  return rows.map(row=>({...row,title:names.get(String(row.item))||null}));
}
async function operations() {
  const memory=process.memoryUsage(),disk=await statfs(process.cwd()).catch(()=>null);
  const jobs=await Promise.all([
    ['news','public/data/vod-news.json'],['video','public/data/vod-sync-status.json'],['music','data/daily-music-refresh-status.json'],['maintenance','data/maintenance-scheduler-status.json'],
  ].map(async ([name,file])=>{try{const o=JSON.parse(await readFile(path.join(process.cwd(),file),'utf8'));return {name,state:String(o.state|| (o.generatedAt?'available':'unknown')).slice(0,40),checkedAt:o.updatedAt||o.checkedAt||o.generatedAt||null};}catch{return {name,state:'unavailable',checkedAt:null};}}));
  return {rssMb:Math.round(memory.rss/1048576),heapMb:Math.round(memory.heapUsed/1048576),uptimeSeconds:Math.floor(process.uptime()),loadAverage:os.loadavg()[0],diskFreeGb:disk?Math.round(disk.bavail*disk.bsize/1073741824*10)/10:null,jobs};
}
export async function GET(request:Request) {
  if(!isAdminRequest(request))return Response.json({error:'unauthorized'},{status:401,headers:PRIVATE_HEADERS});
  if(!checkRateLimit('admin-analytics',120,60000).allowed)return Response.json({error:'busy'},{status:429,headers:PRIVATE_HEADERS});
  try {
    const params=new URL(request.url).searchParams,days=Number(params.get('days'))||7;
    const snapshot=productAnalytics().snapshot(days);
    if(params.get('format')==='csv') {
      const rows=[['date','observed_browsers','page_views','video_seconds','audio_seconds','download_handoffs'],...snapshot.daily.map(r=>[r.day,r.visitors,r.views,r.watch,r.listen,r.handoffs])];
      return new Response('\uFEFF'+rows.map(row=>row.map(analyticsCsvCell).join(',')).join('\r\n'),{headers:{...PRIVATE_HEADERS,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="sarvnema-analytics.csv"'}});
    }
    return Response.json({...snapshot,content:await contentLabels(snapshot.content),enabled:analyticsEnabled(),operations:await operations()},{headers:PRIVATE_HEADERS});
  }catch{return Response.json({error:'analytics_unavailable'},{status:503,headers:PRIVATE_HEADERS});}
}
