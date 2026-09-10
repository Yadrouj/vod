"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Schedule = { timeZone: string; startHour: number; endHour: number; days: number[] };
type Source = { id: string; name: string; siteUrl: string; scraper: string; enabled: boolean; startHour: number; endHour: number; days: number[]; kind: "known" | "manual" };
type Config = { version: number; schedule: Schedule; sources: Source[] };
type Job = Source & { script: string; state: string; phase: string; lastCheckedAt: string | null; startedAt: string | null; current: string | null; counts: { received: number | null; processed: number | null; total: number | null; failures: number | null } };
type Snapshot = { config: Config; schedule: Schedule & { active: boolean; trigger: { name?: string; activatedAt?: string } | null }; maintenance: { state: string; reason: string | null; checkedAt: string | null; local: { day?: string; hour?: number; minute?: number } | null }; summary: { sources: number; enabled: number; running: number; failures: number }; jobs: Job[]; generatedAt: string };

const DAYS = [{ value: 6, label: "شنبه" }, { value: 0, label: "یکشنبه" }, { value: 1, label: "دوشنبه" }, { value: 2, label: "سه‌شنبه" }, { value: 3, label: "چهارشنبه" }, { value: 4, label: "پنجشنبه" }, { value: 5, label: "جمعه" }];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const faNumber = (value: number) => value.toLocaleString("fa-IR");
const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

export function ScraperDashboard() {
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", siteUrl: "" });

  const headers = useCallback((json = false) => ({ ...(json ? { "content-type": "application/json" } : {}), ...(token.trim() ? { "x-admin-token": token.trim() } : {}) }), [token]);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/scrapers", { cache: "no-store", headers: headers() });
      const payload = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "دسترسی داشبورد تأیید نشد.");
      setSnapshot(payload); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "وضعیت اسکریپرها دریافت نشد."); }
  }, [headers]);

  // The token is an external browser-session value; hydrate it after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setToken(window.sessionStorage.getItem("sarvnema-admin-token") || ""); }, []);
  useEffect(() => { if (token) window.sessionStorage.setItem("sarvnema-admin-token", token); }, [token]);
  // Initial polling synchronizes the dashboard with the server-side status files.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5_000); return () => window.clearInterval(timer); }, [refresh]);

  const config = snapshot?.config;
  const updateSchedule = (field: keyof Schedule, value: number | string | number[]) => {
    if (!config) return;
    setSnapshot({ ...snapshot, config: { ...config, schedule: { ...config.schedule, [field]: value } } });
  };
  const updateSource = (id: string, patch: Partial<Source>) => {
    if (!config) return;
    setSnapshot({ ...snapshot, config: { ...config, sources: config.sources.map((source) => source.id === id ? { ...source, ...patch } : source) } });
  };
  const toggleDay = (days: number[], day: number) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort((a, b) => a - b);
  async function save() {
    if (!config) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/scrapers", { method: "POST", headers: headers(true), body: JSON.stringify({ action: "save-config", config }) });
      const payload = await response.json() as { config?: Config; error?: string };
      if (!response.ok) throw new Error(payload.error || "تنظیمات ذخیره نشد.");
      setSnapshot(snapshot ? { ...snapshot, config: payload.config || config } : snapshot); setMessage("تنظیمات ذخیره شد؛ تریگر روزانه از نوبت بعدی آن را می‌خواند.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تنظیمات ذخیره نشد."); }
    finally { setBusy(false); }
  }
  function addSource() {
    if (!config || !newSource.name.trim() || !newSource.siteUrl.trim()) { setMessage("نام و آدرس سایت را وارد کنید."); return; }
    const id = `custom-${Date.now()}`;
    const source: Source = { id, name: newSource.name.trim(), siteUrl: newSource.siteUrl.trim(), scraper: "manual", enabled: true, startHour: config.schedule.startHour, endHour: config.schedule.endHour, days: [...config.schedule.days], kind: "manual" };
    setSnapshot({ ...snapshot!, config: { ...config, sources: [...config.sources, source] } }); setNewSource({ name: "", siteUrl: "" }); setMessage("منبع اضافه شد؛ برای ثبت دائمی ذخیرهٔ تنظیمات را بزنید.");
  }
  const activeJobs = useMemo(() => snapshot?.jobs.filter((job) => job.enabled) || [], [snapshot]);

  return <section className="scraper-dashboard" dir="rtl">
    <div className="scraper-dashboard-head">
      <div><p className="label">کنترل خصوصی منابع</p><h1>داشبورد اسکریپرها</h1><p className="muted">وضعیت دریافت، زمان‌بندی و منابع را از یک جا ببینید. این پنل فقط با توکن مدیریت پاسخ می‌گیرد.</p></div>
      <label className="scraper-token"><span className="label">توکن دسترسی مدیر</span><input className="search" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="SARVNEMA_ADMIN_TOKEN" /><button className="play-glow" type="button" onClick={() => void refresh()}>اتصال و تازه‌سازی</button></label>
    </div>
    {message && <p className="admin-status">{message}</p>}
    {!snapshot ? <div className="scraper-empty"><strong>در انتظار اتصال به داشبورد…</strong><p>در production، توکن تنظیم‌شدهٔ `SARVNEMA_ADMIN_TOKEN` را وارد کنید.</p></div> : <>
      <div className="scraper-summary">
        <Summary label="اسکریپرها" value={`${faNumber(activeJobs.length)} / ${faNumber(snapshot.summary.sources)}`} />
        <Summary label="در حال دریافت" value={faNumber(snapshot.summary.running)} />
        <Summary label="خطاهای ثبت‌شده" value={faNumber(snapshot.summary.failures)} />
        <Summary label="آخرین بررسی" value={formatDate(snapshot.maintenance.checkedAt)} />
      </div>
      <section className="scraper-card scraper-schedule-card">
        <div className="scraper-card-head"><div><p className="label">تریگر `daily-scraper-check`</p><h2>زمان‌بندی اصلی</h2></div><span className={`scraper-pill ${snapshot.schedule.active ? "is-active" : ""}`}>{snapshot.schedule.active ? "فعال در بازه" : "خارج از بازه"}</span></div>
        <p className="muted">زمان‌ها به وقت {snapshot.schedule.timeZone} هستند. daemon هر ۱۵ دقیقه وضعیت را چک می‌کند و اولین بررسی هر روز تریگر را ثبت می‌کند.</p>
        <div className="scraper-form-grid"><label>از ساعت<select value={snapshot.config.schedule.startHour} onChange={(event) => updateSchedule("startHour", Number(event.target.value))}>{HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}</select></label><label>تا قبل از ساعت<select value={snapshot.config.schedule.endHour} onChange={(event) => updateSchedule("endHour", Number(event.target.value))}>{HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}</select></label><label>منطقه زمانی<input value={snapshot.config.schedule.timeZone} onChange={(event) => updateSchedule("timeZone", event.target.value)} /></label></div>
        <div className="scraper-days"><span className="label">روزهای اجرا</span>{DAYS.map((day) => <label key={day.value}><input type="checkbox" checked={snapshot.config.schedule.days.includes(day.value)} onChange={() => updateSchedule("days", toggleDay(snapshot.config.schedule.days, day.value))} />{day.label}</label>)}</div>
        <div className="scraper-trigger-line"><span>آخرین فعال‌سازی: {formatDate(snapshot.schedule.trigger?.activatedAt || null)}</span><span>وضعیت worker: {snapshot.maintenance.state}</span><button className="play-glow" type="button" disabled={busy} onClick={() => void save()}>ذخیرهٔ زمان‌بندی</button></div>
      </section>
      <section className="scraper-card"><div className="scraper-card-head"><div><p className="label">منابع و اسکریپرها</p><h2>کنترل هر منبع</h2></div><span className="muted">آخرین به‌روزرسانی: {formatDate(snapshot.generatedAt)}</span></div>
        <div className="scraper-list">{snapshot.jobs.map((job) => <article className="scraper-row" key={job.id}>
          <div className="scraper-row-title"><span className={`scraper-state scraper-state-${job.state}`}>{job.state === "running" ? "در حال دریافت" : job.state === "completed" ? "تکمیل‌شده" : job.state === "waiting" ? "در انتظار" : job.state}</span><h3>{job.name}</h3><a href={job.siteUrl || undefined} target="_blank" rel="noreferrer">{job.siteUrl || "بدون سایت"} ↗</a><small>{job.phase}{job.current ? ` · ${job.current}` : ""}</small></div>
          <div className="scraper-metrics"><span>گرفته‌شده<strong>{job.counts.received === null ? "—" : faNumber(job.counts.received)}</strong></span><span>پردازش<strong>{job.counts.processed === null ? "—" : faNumber(job.counts.processed)}</strong></span><span>خطا<strong>{faNumber(job.counts.failures || 0)}</strong></span><span>آخرین چک<strong>{formatDate(job.lastCheckedAt)}</strong></span></div>
          <div className="scraper-controls"><label className="scraper-enabled"><input type="checkbox" checked={job.enabled} onChange={(event) => updateSource(job.id, { enabled: event.target.checked })} /> فعال</label><label className="scraper-site-edit">سایت<input value={job.siteUrl} onChange={(event) => updateSource(job.id, { siteUrl: event.target.value })} /></label><label>از<select value={job.startHour} onChange={(event) => updateSource(job.id, { startHour: Number(event.target.value) })}>{HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}</select></label><label>تا<select value={job.endHour} onChange={(event) => updateSource(job.id, { endHour: Number(event.target.value) })}>{HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}</select></label><div className="scraper-mini-days">{DAYS.map((day) => <label key={day.value} title={day.label}><input type="checkbox" checked={job.days.includes(day.value)} onChange={() => updateSource(job.id, { days: toggleDay(job.days, day.value) })} />{day.label.slice(0, 1)}</label>)}</div></div>
        </article>)}</div>
        <button className="play-glow scraper-save" type="button" disabled={busy} onClick={() => void save()}>ذخیرهٔ همهٔ تنظیمات</button>
      </section>
      <section className="scraper-card scraper-add-card"><div><p className="label">منبع جدید</p><h2>اضافه‌کردن سایت برای پایش</h2><p className="muted">این فرم منبع را در رجیستری ذخیره می‌کند و URL را به‌عنوان «دستی» نشان می‌دهد؛ برای استخراج واقعی باید adapter امن همان سایت به کد اضافه شود.</p></div><div className="scraper-form-grid"><label>نام سایت<input value={newSource.name} onChange={(event) => setNewSource({ ...newSource, name: event.target.value })} placeholder="مثلاً آرشیو کودک" /></label><label>آدرس سایت<input type="url" value={newSource.siteUrl} onChange={(event) => setNewSource({ ...newSource, siteUrl: event.target.value })} placeholder="https://example.com" /></label><button className="play-glow" type="button" onClick={addSource}>افزودن به فهرست</button></div></section>
    </>}
  </section>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="scraper-summary-item"><span>{label}</span><strong>{value}</strong></div>; }
