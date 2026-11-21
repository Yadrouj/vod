"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import styles from './analytics-dashboard.module.css';
export function AdminLogin({configured}:{configured:boolean}) {
 const router=useRouter(),[token,setToken]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false);
 return <main className={styles.login} dir="rtl"><form method="post" onSubmit={async e=>{e.preventDefault();setPending(true);setError('');try{const r=await fetch('/api/admin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});setToken('');if(!r.ok){setError(r.status===429?'تلاش‌های زیاد؛ یک دقیقه دیگر امتحان کنید.':r.status===503?'دسترسی مدیریت هنوز پیکربندی نشده است.':'کلید دسترسی درست نیست.');return;}router.refresh();}catch{setError('اتصال برقرار نشد. دوباره تلاش کنید.');}finally{setPending(false);}}}>
 <span className={styles.loginIcon}><LockKeyhole size={28}/></span><p>SARVNEMA · PRIVATE WORKSPACE</p><h1>اتاق کنترل سرونما</h1><div className={styles.muted}>تحلیل محصول، مخاطب و کیفیت پخش؛ فقط برای مدیر.</div>
 {configured?<><label htmlFor="admin-key">کلید دسترسی مدیریت</label><input id="admin-key" type="password" autoComplete="current-password" value={token} onChange={e=>setToken(e.target.value)} required maxLength={500}/><button className={styles.primary} disabled={pending}>{pending?'در حال ورود…':'ورود امن'}</button></>:<p className={styles.notice}>روی سرور مقدار <code dir="ltr">SARVNEMA_ADMIN_TOKEN</code> را با حداقل ۱۶ کاراکتر تنظیم کنید. هیچ رمز پیش‌فرض یا دسترسی عمومی وجود ندارد.</p>}
 {error&&<p role="alert">{error}</p>}<small>نشست امن ۸ ساعته · کلید در مرورگر ذخیره نمی‌شود.</small>
 </form></main>;
}
