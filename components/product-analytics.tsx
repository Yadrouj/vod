"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PRODUCT_CONSENT, PRODUCT_VISITOR, measurementBlocked, startProductMeasurement } from '@/lib/product-analytics-client';
import styles from './product-analytics.module.css';
export function ProductAnalytics() {
  const pathname=usePathname();
  const [choice,setChoice]=useState<string|null>(null),[enabled,setEnabled]=useState(false);
  useEffect(()=>{const controller=new AbortController();queueMicrotask(()=>{if(controller.signal.aborted||measurementBlocked())return;try{setChoice(localStorage.getItem(PRODUCT_CONSENT));}catch{return;}void fetch('/api/analytics',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(v=>{if(!controller.signal.aborted)setEnabled(v?.enabled===true);}).catch(()=>{});});return()=>controller.abort();},[]);
  useEffect(()=>{if(enabled&&choice==='yes')return startProductMeasurement();},[choice,enabled]);
  useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key===PRODUCT_CONSENT)setChoice(event.newValue);};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
  useEffect(()=>{window.dispatchEvent(new Event('sarvnema:analytics-route'));},[pathname]);
  function choose(value:string) {try{localStorage.setItem(PRODUCT_CONSENT,value);if(value!=='yes'){localStorage.removeItem(PRODUCT_VISITOR);sessionStorage.removeItem('sarvnema-product-session-v1');}}catch{}setChoice(value);}
  if(!enabled)return null;
  if(choice)return <button className={styles.preferences} onClick={()=>choose(choice==='yes'?'no':'yes')} aria-label={choice==='yes'?'توقف آمار ناشناس محصول':'اجازه به آمار ناشناس محصول'} title={choice==='yes'?'توقف آمار ناشناس محصول':'اجازه به آمار ناشناس محصول'}>حریم خصوصی · {choice==='yes'?'آمار روشن':'آمار خاموش'}</button>;
  return <aside className={styles.consent} aria-label="اجازه آمار محصول" dir="rtl"><div><strong>سرونما را با هم بهتر کنیم؟</strong><p>با اجازهٔ شما، بازدید و زمان پخش را بدون نام، IP، متن جستجو یا ضبط صفحه اندازه می‌گیریم. هر وقت بخواهید می‌توانید خاموشش کنید.</p></div><button onClick={()=>choose('yes')}>موافقم</button><button onClick={()=>choose('no')}>نه، ممنون</button></aside>;
}
