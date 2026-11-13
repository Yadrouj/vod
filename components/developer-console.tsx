"use client";
import { useEffect, useState } from 'react';
import { Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { MCP_PLANS } from '@/lib/mcp/plans';
import styles from './developer-console.module.css';
type Usage = { plan: string; used: number; remaining: number; monthlyRequests: number; period: string; paidUntil: number | null };
type Invoice = { id: string; address: string; amount: string; network: string; expiresAt: number; state: string; credited: boolean; transaction: string | null };
export function DeveloperConsole({ paymentsEnabled }: { paymentsEnabled: boolean }) {
  const [key, setKey] = useState(''); const [usage, setUsage] = useState<Usage | null>(null); const [invoice, setInvoice] = useState<Invoice | null>(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const invoiceId = invoice?.id; const credited = invoice?.credited;
  async function request(url: string, body?: object) {
    const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'درخواست انجام نشد'); return result;
  }
  useEffect(() => {
    if (!invoiceId || credited || !key) return;
    const controller = new AbortController();
    const tick = async () => {
      try {
        const response = await fetch(`/api/developers/invoices/${invoiceId}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) return; const current = await response.json(); setInvoice(current);
        if (current.credited) { setMessage('پرداخت روی شبکه تأیید شد؛ پلن فعال است.'); const status = await fetch('/api/developers/account', { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: controller.signal }); if (status.ok) setUsage(await status.json()); }
      } catch { /* Preserve the invoice; a temporary connection failure is not payment failure. */ }
    };
    const timer = setInterval(tick, 10000); return () => { controller.abort(); clearInterval(timer); };
  }, [invoiceId, credited, key]);
  async function action(fn: () => Promise<void>) { setBusy(true); setMessage(''); try { await fn(); } catch (error) { setMessage(error instanceof Error ? error.message : 'خطای ارتباط'); } finally { setBusy(false); } }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setMessage('کپی شد.'); } catch { setMessage('کپی خودکار در مرورگر ممکن نیست؛ متن را انتخاب و کپی کن.'); } }
  return <div className={styles.console}>
    <section className={styles.access}>
      <h2><KeyRound size={20} />کلید دسترسی و مصرف</h2>
      <p>در گفت‌وگوی خصوصی <a href="https://t.me/Sarvnema_bot?start=developers">بات سرونما</a> دستور <code dir="ltr">/apikey</code> را بفرست. کلید را فقط خودت نگه دار.</p>
      <form onSubmit={event => { event.preventDefault(); void action(async () => { setUsage(await request('/api/developers/account')); }); }}>
        <label htmlFor="mcp-key">کلید خصوصی API</label>
        <div className={styles.inputRow}><input id="mcp-key" type="password" value={key} onChange={event => { setKey(event.target.value); setUsage(null); setInvoice(null); }} autoComplete="off" spellCheck={false} placeholder="sn_mcp_…" dir="ltr" /><button disabled={busy || !key}>نمایش مصرف</button></div>
      </form>
      <small>کلید فقط در حافظهٔ همین صفحه می‌ماند؛ در آدرس یا حافظهٔ مرورگر ذخیره نمی‌شود.</small>
      {usage && <p className={styles.usage}>پلن {usage.plan} · {usage.used.toLocaleString('fa-IR')} مصرف‌شده · {usage.remaining.toLocaleString('fa-IR')} باقی‌مانده از {usage.monthlyRequests.toLocaleString('fa-IR')} فراخوانی ابزار در ماه {usage.period}</p>}
    </section>
    <section className={styles.pricing} aria-label="پلن‌های MCP">{Object.entries(MCP_PLANS).map(([id, plan]) => <article key={id}>
      <span>{plan.name}</span><h2 dir="ltr">{id === 'free' ? 'رایگان' : `${plan.priceUsd} USDT`}</h2><p>{plan.monthlyRequests.toLocaleString('fa-IR')} فراخوانی ابزار در ماه تقویمی UTC</p><p>{plan.perMinute.toLocaleString('fa-IR')} فراخوانی در دقیقه</p><small>{id === 'free' ? 'بدون کارت بانکی؛ یک حساب برای هر کاربر تلگرام' : '۳۰ روز دسترسی · بدون تمدید یا برداشت خودکار'}</small>
      {id === 'free' ? <a href="https://t.me/Sarvnema_bot?start=developers">دریافت کلید رایگان</a> : <button type="button" disabled={!paymentsEnabled || !usage || busy} onClick={() => void action(async () => { setInvoice(await request('/api/developers/checkout', { plan: id })); })}>{paymentsEnabled ? 'ساخت فاکتور تتر' : 'پرداخت به‌زودی؛ در انتظار تنظیم کیف پول'}</button>}
    </article>)}</section>
    <p className={styles.note}>هزینهٔ سرویس جستجو است، نه خرید حق پخش یا فایل آثار. مبلغ دقیق فاکتور کمتر از ۰٫۰۱ تتر اعشار شناسایی دارد؛ همان مبلغ را بدون گردکردن بفرست. انتقال شبکه ممکن است کارمزد داشته باشد.</p>
    {invoice && <section className={styles.invoice}>
      <h2><ShieldCheck size={20} />فاکتور USDT · فقط BEP‑20</h2>
      <p>فقط روی <strong>{invoice.network}</strong> پرداخت کن؛ نه TRC‑20 یا شبکهٔ اتریوم. برای شناسایی خودکار، مبلغ باید دقیقاً برابر فاکتور باشد.</p>
      <label>مبلغ دقیق USDT</label><div className={styles.copyRow}><code dir="ltr">{invoice.amount}</code><button type="button" onClick={() => void copy(invoice.amount)} aria-label="کپی مبلغ"><Copy size={18} /></button></div>
      <label>آدرس دریافت</label><div className={styles.copyRow}><code dir="ltr">{invoice.address}</code><button type="button" onClick={() => void copy(invoice.address)} aria-label="کپی آدرس"><Copy size={18} /></button></div>
      <p>مهلت انتقال: {new Date(invoice.expiresAt).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran' })} تهران · وضعیت: {invoice.credited ? 'تأیید و فعال شد' : invoice.state === 'expired' ? 'مهلت تمام شده؛ پرداخت جدید نفرست' : 'در انتظار تراکنش نهایی‌شده'}</p>
      <small>بررسی در سرور خودکار ادامه دارد، حتی اگر این صفحه را ببندی. پرداخت ناقص، شبکهٔ اشتباه یا انتقال پس از مهلت، پلن را خودکار فعال نمی‌کند؛ پیش از تلاش مجدد با پشتیبانی هماهنگ کن.</small>
      {invoice.transaction && <a href={`https://bscscan.com/tx/${invoice.transaction}`} target="_blank" rel="noreferrer">مشاهدهٔ تراکنش روی شبکه</a>}
    </section>}
    <p role="status" className={styles.note}>{message}</p>
    <section className={styles.access}><h2>اتصال MCP</h2><p>آدرس سرویس: <code dir="ltr">https://sarvnema.ir/mcp</code>؛ کلید را در هدر <code dir="ltr">Authorization: Bearer …</code> قرار بده. این نسخه با کلاینت‌های دارای هدر سفارشی و پل stdio کار می‌کند؛ ورود OAuth مرورگری هنوز ارائه نشده است.</p><pre dir="ltr">{JSON.stringify({ mcpServers: { sarvnema: { url: 'https://sarvnema.ir/mcp', headers: { Authorization: 'Bearer YOUR_API_KEY' } } } }, null, 2)}</pre></section>
  </div>;
}
