import { analyticsPath, trafficSource, type ProductEvent } from './product-analytics-schema';
export const PRODUCT_CONSENT='sarvnema-product-consent-v1';
export const PRODUCT_VISITOR='sarvnema-product-visitor-v1';
const SESSION='sarvnema-product-session-v1';
export const measurementBlocked=()=>navigator.doNotTrack==='1'||Boolean((navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl);
type Tracked=HTMLMediaElement & {dataset:DOMStringMap};
export function startProductMeasurement() {
  let visitor='',session='';
  try {
    if(measurementBlocked()||localStorage.getItem(PRODUCT_CONSENT)!=='yes')return ()=>{};
    visitor=localStorage.getItem(PRODUCT_VISITOR)||crypto.randomUUID();localStorage.setItem(PRODUCT_VISITOR,visitor);
    const saved=JSON.parse(sessionStorage.getItem(SESSION)||'null') as {id:string;at:number;visitor?:string}|null;
    session=saved && saved.visitor===visitor && Date.now()-saved.at<30*60000 ? saved.id : crypto.randomUUID();
    sessionStorage.setItem(SESSION,JSON.stringify({id:session,at:Date.now(),visitor}));
  } catch {return ()=>{};}
  const source=trafficSource(document.referrer,new URLSearchParams(location.search).get('utm_source')||'',location.origin);
  const device=location.pathname.startsWith('/tv')?'tv':matchMedia('(max-width:760px)').matches?'mobile':'desktop';
  let current=analyticsPath(location.pathname)||'/',active:Tracked|null=null,playing=false,buffering=false,last=performance.now(),lastSent=Date.now(),visible=document.visibilityState==='visible',seconds=0,engaged=0,buffered=0,queue:ProductEvent[]=[],stopped=false;
  const started=new Set<string>();
  const identity=()=>active?.dataset.analyticsId;
  const meta=()=>({kind:active?.dataset.analyticsMedia==='audio'?'audio' as const:'video' as const,item:identity(),provider:active?.dataset.analyticsProvider||'unknown'});
  const accrue=()=>{const now=performance.now(),delta=Math.min(15,Math.max(0,(now-last)/1000));last=now;if(visible)engaged=Math.min(15,engaged+delta);if(playing&&!buffering)seconds=Math.min(15,seconds+delta);if(buffering)buffered=Math.min(15,buffered+delta);};
  const send=(beacon=false)=>{
    if(stopped||measurementBlocked())return;
    try{if(localStorage.getItem(PRODUCT_CONSENT)!=='yes'){queue=[];return;}}catch{return;}
    if(Date.now()-lastSent>=30*60000){session=crypto.randomUUID();started.clear();if(!queue.some(e=>e.type==='page_view'))queue.unshift({type:'page_view',path:current});}
    lastSent=Date.now();accrue();
    if(engaged||seconds||buffered)queue.push({type:'pulse',path:current,...meta(),seconds,engaged,buffering:buffered});
    seconds=0;engaged=0;buffered=0;
    if(!queue.length)return;
    const body=JSON.stringify({consent:true,visitor,session,batch:crypto.randomUUID(),source,device,events:queue.splice(0,18)});
    try {sessionStorage.setItem(SESSION,JSON.stringify({id:session,at:Date.now(),visitor}));} catch{}
    if(beacon&&navigator.sendBeacon('/api/analytics',new Blob([body],{type:'application/json'})))return;
    void fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
  };
  const emit=(event:ProductEvent)=>{queue.push(event);if(queue.length>=12)send();};
  const media=(event:Event)=>{
    const target=event.target;
    if(!(target instanceof HTMLMediaElement)||!target.dataset.analyticsMedia||!target.dataset.analyticsId)return;
    accrue();
    if(['waiting','stalled'].includes(event.type)&&!active)active=target;
    if(event.type==='playing') {
      if(active && active!==target)send();
      active=target;playing=true;buffering=false;
      const key=`${meta().kind}:${identity()}`;
      if(!started.has(key)){started.add(key);emit({type:'play_start',path:current,...meta()});send();}
    } else if(event.type==='error') {
      if(!active)active=target;
      emit({type:'media_error',path:current,kind:target.dataset.analyticsMedia==='audio'?'audio':'video',item:target.dataset.analyticsId,provider:target.dataset.analyticsProvider||'unknown'});
      if(active===target){playing=false;buffering=false;}send();
    } else if(active===target) {
      if(['waiting','stalled'].includes(event.type)){buffering=true;emit({type:'buffer',path:current,...meta()});}
      if(event.type==='pause'){playing=false;buffering=false;send();}
      if(event.type==='ended'){emit({type:'media_end',path:current,...meta()});playing=false;buffering=false;send();}
    }
  };
  const navigate=()=>{
    const next=analyticsPath(location.pathname);
    if(!next||next===current)return;
    emit({type:'page_leave',path:current});send();current=next;emit({type:'page_view',path:current});send();
  };
  const click=(event:MouseEvent)=>{
    const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
    if(!anchor)return;
    try{const url=new URL(anchor.href);if(url.origin===location.origin && url.pathname==='/download/continue') {emit({type:'download_click',path:current});send(true);}}catch{}
  };
  const handoff=()=>{emit({type:'download_handoff',path:current});send(true);};
  const hide=()=>{emit({type:'page_leave',path:current,exit:true});send(true);};
  const visibility=()=>{accrue();visible=document.visibilityState==='visible';send(!visible);};
  const show=(event:PageTransitionEvent)=>{if(!event.persisted)return;last=performance.now();emit({type:'page_view',path:current});send();};
  const types=['playing','pause','ended','waiting','stalled','error'];
  types.forEach(type=>document.addEventListener(type,media,true));
  document.addEventListener('click',click,true);document.addEventListener('visibilitychange',visibility);
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
  window.addEventListener('sarvnema:analytics-route',navigate);window.addEventListener('sarvnema:download-handoff',handoff);
  const timer=setInterval(()=>{if(active&&!active.isConnected){accrue();active=null;playing=false;buffering=false;}if(document.visibilityState==='visible'||playing)send();},15000);
  emit({type:'page_view',path:current});send();
  document.querySelectorAll<Tracked>('audio[data-analytics-media],video[data-analytics-media]').forEach(el=>{if(!el.paused&&!el.ended)media({target:el,type:'playing'} as unknown as Event);});
  return ()=>{stopped=true;clearInterval(timer);queue=[];types.forEach(type=>document.removeEventListener(type,media,true));document.removeEventListener('click',click,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);window.removeEventListener('sarvnema:analytics-route',navigate);window.removeEventListener('sarvnema:download-handoff',handoff);};
}
