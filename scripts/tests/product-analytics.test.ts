import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ProductAnalyticsStore, analyticsDay } from '../../lib/product-analytics-store';
import { analyticsPath, parseProductPacket, trafficSource, analyticsCsvCell, type ProductPacket, type ProductEvent } from '../../lib/product-analytics-schema';
import { ADMIN_COOKIE, ADMIN_TTL, createAdminSession, validAdminSession, isAdminRequest, sameAdminOrigin, smallJson } from '../../lib/admin-auth';

const secret='unit-test-private-analytics-secret-not-a-production-key';
const packet=(events:ProductEvent[],batch='batch-0000001',visitor='visitor-00001',session='session-00001'):ProductPacket=>({consent:true,visitor,session,batch,source:'google',device:'mobile',events});
const storeTest=(run:(store:ProductAnalyticsStore,root:string)=>void)=>{const root=mkdtempSync(path.join(tmpdir(),'sn-analytics-'));const store=new ProductAnalyticsStore(root,secret);try{run(store,root);}finally{store.close();assert.ok(path.resolve(root).startsWith(path.join(path.resolve(tmpdir()),'sn-analytics-')));rmSync(root,{recursive:true,force:true});}};
test('private/children routes and URL secrets never enter page data; campaign and referrer are minimized',()=>{
 assert.equal(analyticsPath('/watch/tt0903747?token=secret#chat'),'/watch/tt0903747');
 assert.equal(analyticsPath('/download/continue?url=https://private.example/file'),'/download');
 assert.equal(analyticsPath('/watch-together/private-room-token'),'/watch-together/room');
 for(const p of ['/kids','/kids/learn','/admin/settings','/api/private','//evil.example'])assert.equal(analyticsPath(p),null,p);
 assert.equal(trafficSource('https://www.google.com/search?q=private'),'google');
 assert.equal(trafficSource('https://m.bing.com/search?q=private'),'bing');
 assert.equal(trafficSource('https://example.com/path?email=private'),'example.com');
 assert.equal(trafficSource('','my-secret-email@example.com'),'direct');
 assert.equal(trafficSource('','telegram'),'telegram');
});
test('ingestion validates consent, finite durations, bounded batches and safe public content IDs',()=>{
 const good=packet([{type:'pulse',path:'/music/song',seconds:15,item:'music:roz-123',kind:'audio'}]);
 assert.ok(parseProductPacket(good));
 for(const bad of [{...good,consent:false},{...good,visitor:'x'},{...good,events:Array(21).fill(good.events[0])},{...good,events:[{type:'pulse',path:'/',seconds:Infinity}]},{...good,events:[{type:'pulse',path:'/kids'}]},{...good,events:[{type:'pulse',path:'/'},{type:'pulse',path:'/'}]}])assert.equal(parseProductPacket(bad),null);
 assert.equal(parseProductPacket(packet([{type:'page_view',path:'/browse?q=private'}]))?.events[0].path,'/browse');
});
test('duplicates and immediate pulse replays cannot multiply time; wall time is capped and identities are hashed',()=>storeTest((store,root)=>{
 const now=Date.parse('2026-11-01T10:00:00Z');
 const page=packet([{type:'page_view',path:'/watch/tt1234567'}]);
 assert.equal(store.ingest(page,now),true);assert.equal(store.ingest(page,now),false);
 const pulse=[{type:'play_start',path:'/watch/tt1234567',item:'tt1234567',kind:'video',provider:'source.example'},{type:'pulse',path:'/watch/tt1234567',item:'tt1234567',kind:'video',seconds:15,engaged:15}] as ProductEvent[];
 store.ingest(packet(pulse,'batch-0000002'),now+15000);
 store.ingest(packet([{...pulse[1],seconds:15}],'batch-0000003'),now+15000);
 const data=store.snapshot(7,now+16000);
 assert.equal(data.summary.views,1);assert.equal(data.summary.watch,15);assert.equal(data.liveUsers,1);
 assert.equal(data.summary.handoffs,0);
 const raw=readFileSync(path.join(root,'product.sqlite')).toString('utf8');
 assert.ok(!raw.includes('visitor-00001')&&!raw.includes('session-00001'));
 assert.throws(()=>store.ingest(packet([{type:'page_view',path:'/'}],'other-batch-000','different-visitor'),now+20000),/identity/);
}));
test('audio duration and download handoffs remain separate from click intent and completion claims',()=>storeTest(store=>{
 const now=Date.parse('2026-11-01T10:00:00Z');
 store.ingest(packet([{type:'page_view',path:'/music/a'}]),now);
 store.ingest(packet([{type:'play_start',path:'/music/a',kind:'audio',item:'music:hosted-example'},{type:'pulse',path:'/music/a',kind:'audio',item:'music:hosted-example',seconds:15},{type:'download_click',path:'/music/a'}],'batch-000002'),now+15000);
 let data=store.snapshot(7,now+16000);assert.equal(data.summary.watch,0);assert.equal(data.summary.listen,15);assert.equal(data.summary.downloads,1);assert.equal(data.summary.handoffs,0);
 store.ingest(packet([{type:'download_handoff',path:'/download'}],'batch-000003'),now+21000);
 data=store.snapshot(7,now+22000);assert.equal(data.summary.handoffs,1);assert.equal(data.funnel.downloaded,1);
}));
test('retention uses exact Tehran cohort days, rejects immature denominators and does not invent history',()=>storeTest(store=>{
 const start=Date.parse('2026-11-01T10:00:00Z');
 for(const offset of [0,1,7])store.ingest(packet([{type:'page_view',path:'/'}],`batch-0000${offset}`,'same-browser-000',`session-0000${offset}`),start+offset*86400000);
 const data=store.snapshot(30,start+8*86400000);
 assert.equal(data.summary.visitors,1);assert.equal(data.summary.sessions,3);
 assert.deepEqual(data.retention,[{day:1,eligible:1,returned:1},{day:7,eligible:1,returned:1},{day:30,eligible:0,returned:0}]);
 assert.equal(data.cohorts[0].d30,null);
 assert.equal(analyticsDay(Date.parse('2026-11-01T21:00:00Z')),'2026-11-02');
 assert.equal(store.snapshot(30,start+120*86400000).summary.visitors,0);
}));
test('exit clues report observable errors, not a guessed reason; live expires without heartbeat',()=>storeTest(store=>{
 const now=Date.parse('2026-11-01T10:00:00Z');
 store.ingest(packet([{type:'page_view',path:'/watch/a'},{type:'media_error',path:'/watch/a',item:'tt1234567'}]),now);
 assert.equal(store.snapshot(7,now+30000).liveUsers,1);
 const after=store.snapshot(7,now+120000);assert.equal(after.liveUsers,0);assert.equal(after.exits[0].reason,'playback-error');
}));
test('a download handoff is not mislabeled as playback abandonment',()=>storeTest(store=>{
 const now=Date.parse('2026-11-01T10:00:00Z');
 store.ingest(packet([{type:'page_view',path:'/download'},{type:'download_handoff',path:'/download'},{type:'page_leave',path:'/download',exit:true}]),now);
 assert.equal(store.snapshot(7,now+1000).exits[0].reason,'download-handoff');
}));
test('same-origin checks use the actual Host when a reverse proxy normalizes request URLs',()=>{
 assert.ok(sameAdminOrigin(new Request('http://localhost:3000/api/admin/session',{method:'POST',headers:{host:'sarvnema.ir',origin:'https://sarvnema.ir'}})));
 assert.ok(!sameAdminOrigin(new Request('http://localhost:3000/api/admin/session',{method:'POST',headers:{host:'sarvnema.ir',origin:'https://evil.example'}})));
});
test('admin sessions fail closed, expire, rotate with the secret and enforce cookie CSRF checks',()=>{
 const old=process.env.SARVNEMA_ADMIN_TOKEN;process.env.SARVNEMA_ADMIN_TOKEN=secret;
 try{const now=Date.now(),session=createAdminSession(now);assert.ok(validAdminSession(session,now));assert.ok(!validAdminSession(session+'x',now));assert.ok(!validAdminSession(session,now+ADMIN_TTL*1000));
 const request=(method:string,origin?:string)=>new Request('https://sarvnema.ir/api/admin/analytics',{method,headers:{cookie:`${ADMIN_COOKIE}=${session}`,...(origin?{origin}:{})}});
 assert.ok(isAdminRequest(request('GET')));assert.ok(!isAdminRequest(request('POST','https://evil.example')));assert.ok(isAdminRequest(request('POST','https://sarvnema.ir')));
 process.env.SARVNEMA_ADMIN_TOKEN='different-secret-at-least-16';assert.ok(!validAdminSession(session));delete process.env.SARVNEMA_ADMIN_TOKEN;
 assert.ok(!isAdminRequest(new Request('http://localhost/api/admin/analytics')));
 }finally{if(old===undefined)delete process.env.SARVNEMA_ADMIN_TOKEN;else process.env.SARVNEMA_ADMIN_TOKEN=old;}
});
test('request bodies and CSV cells cannot turn into unbounded reads or spreadsheet formulae',async()=>{
 await assert.rejects(smallJson(new Request('https://sarvnema.ir',{method:'POST',body:'x'.repeat(100)}),20),/body_too_large/);
 assert.equal(analyticsCsvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
 assert.equal(analyticsCsvCell('/watch/tt1234567'),'"/watch/tt1234567"');
});

test('aggregates survive a process-store restart in the private database',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'sn-analytics-'));
 let store:ProductAnalyticsStore|undefined;
 try {
  const now=Date.parse('2026-11-01T10:00:00Z');
  store=new ProductAnalyticsStore(root,secret);
  store.ingest(packet([{type:'page_view',path:'/watch/tt1234567'}]),now);
  store.close();store=undefined;
  store=new ProductAnalyticsStore(root,secret);
  assert.equal(store.snapshot(7,now+1000).summary.views,1);
  assert.equal(store.snapshot(7,now+1000).summary.visitors,1);
 } finally {
  store?.close();
  assert.ok(path.resolve(root).startsWith(path.join(path.resolve(tmpdir()),'sn-analytics-')));
  rmSync(root,{recursive:true,force:true});
 }
});
