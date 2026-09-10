"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { KIDS_AGES, KIDS_CATEGORIES, KIDS_RESOURCES, KIDS_STORAGE_KEY, kidsEmbedUrl, kidsVisible, parseKidsSettings, safeKidsUrl, sessionSeconds, type KidsAge, type KidsCategory, type KidsItem, type KidsSettings } from "@/lib/kids";
import styles from "./kids-space.module.css";

async function hashPin(pin: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("");
}
const faNumber = (n: number) => n.toLocaleString("fa-IR");
const learningCategories: KidsCategory[] = ["language", "math", "science", "art", "feelings", "story"];

export function KidsSpace({ items, learning = false }: { items: KidsItem[]; learning?: boolean }) {
  const [settings, setSettings] = useState<KidsSettings | null>(null);
  const [ready, setReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  const [parent, setParent] = useState(false);
  const [category, setCategory] = useState<KidsCategory>("all");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(0);
  const [active, setActive] = useState<KidsItem | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  const gate = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const read = () => {
      try { setSettings(parseKidsSettings(localStorage.getItem(KIDS_STORAGE_KEY))); }
      catch { setStorageProblem(true); }
      setNow(Date.now()); setReady(true);
    };
    read();
    const sync = (event: StorageEvent) => { if (event.key === KIDS_STORAGE_KEY || event.key === null) { read(); setParent(false); setActive(null); } };
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("storage", sync);
    return () => { clearInterval(timer); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    if (!parent) return;
    const timer = setTimeout(() => { setParent(false); setActive(null); }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [parent]);
  const seconds = settings ? sessionSeconds(settings.deadline, now) : 0;
  const running = ready && Boolean(settings) && seconds > 0;
  const visible = useMemo(() => items.filter(item => settings && kidsVisible(item, settings)), [items, settings]);
  const filtered = (parent ? items : visible).filter(item => (!learning || item.categories.some(c => learningCategories.includes(c))) && (category === "all" || item.categories.includes(category)) && item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const playing = active && (parent || running) && (parent || visible.some(item => item.id === active.id));

  function save(next: KidsSettings) {
    try {
      localStorage.setItem(KIDS_STORAGE_KEY, JSON.stringify(next));
      setSettings(next); setStorageProblem(false); return true;
    } catch { setStorageProblem(true); setError("ذخیرهٔ تنظیمات در مرورگر ممکن نیست؛ حالت کودک شروع نشد."); return false; }
  }
  function openParent() { setActive(null); setPin(""); setConfirmPin(""); setError(""); gate.current?.showModal(); }
  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy || Date.now() < retryAt) return;
    if (!/^\d{4,8}$/.test(pin)) { setError("رمز ۴ تا ۸ رقمی با اعداد انگلیسی وارد کنید."); return; }
    setBusy(true); setError("");
    try {
      if (settings) {
        if (await hashPin(pin, settings.salt) !== settings.pinHash) {
          const count = attempts + 1; setAttempts(count);
          if (count >= 5) { setRetryAt(Date.now() + 30000); setAttempts(0); }
          setError("رمز درست نیست. بعد از پنج تلاش، ۳۰ ثانیه صبر کنید."); return;
        }
      } else {
        if (pin !== confirmPin) { setError("رمز و تکرار آن یکی نیستند."); return; }
        const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
        const next: KidsSettings = { version: 1, age: "6-8", approved: [], minutes: 20, audioOnly: false, autoNext: false, pinHash: await hashPin(pin, salt), salt, deadline: 0 };
        if (!save(next)) return;
      }
      setAttempts(0); setParent(true); setActive(null); setPin(""); setConfirmPin(""); gate.current?.close();
    } catch { setError("امکان حفاظت از رمز وجود ندارد؛ از اتصال HTTPS یا مرورگر جدید استفاده کنید."); }
    finally { setBusy(false); }
  }
  function startSession() {
    if (!settings || !parent) return;
    if (!visible.length) { setError("برای این سن، یک فایل صوتی یا ویدیو را پس از بازبینی تأیید کنید."); return; }
    const time = Date.now();
    if (!save({ ...settings, deadline: time + settings.minutes * 60000 })) return;
    setNow(time); setActive(null); setParent(false); setCategory("all"); setQuery(""); setError("");
  }
  function choose(item: KidsItem) {
    // Event-handler clock check: the rendered one-second counter may be stale.
    // eslint-disable-next-line react-hooks/purity
    if (!parent && (!settings || Date.now() >= settings.deadline || !kidsVisible(item, settings))) { openParent(); return; }
    setActive(item);
    requestAnimationFrame(() => stage.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }
  function next() {
    if (!settings?.autoNext || parent || Date.now() >= settings.deadline || !active) { setActive(null); return; }
    const queue = visible.filter(i => i.kind === active.kind);
    const index = queue.findIndex(i => i.id === active.id);
    // A finite queue: never loop or pull recommendations from the general catalogue.
    setActive(queue[index + 1] || null);
  }

  return <main className={styles.space} dir="rtl" data-kids-space>
    <header className={styles.header}>
      <Link className={styles.brand} href="/kids"><span aria-hidden="true">🌱</span><span>سرونما <b>کودک</b></span></Link>
      <nav aria-label="دنیای کودک"><Link href="/kids" aria-current={!learning ? "page" : undefined}>بازی و تماشا</Link><Link href="/kids/learn" aria-current={learning ? "page" : undefined}>کشف و یادگیری</Link></nav>
      <button type="button" onClick={openParent} disabled={!ready}>🔒 برای بزرگ‌ترها</button>
    </header>
    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>یک دنیای کوچک، برای کنجکاوی‌های بزرگ</span><h1>{learning ? <>هر روز، یک چیز<br /><em>تازه یاد بگیریم!</em></> : <>قصه، بازی، لبخند<br /><em>خوش اومدی کوچولو!</em></>}</h1><p>با هم بخوانیم، کشف کنیم و بعد کمی هم از صفحه فاصله بگیریم.</p>
        <div className={styles.actions}><button className={styles.primary} onClick={parent ? startSession : openParent} disabled={!ready}>{parent ? "شروع زمان کودک" : settings ? "تنظیم برنامه با بزرگ‌ترها" : "شروع با کمک مامان یا بابا"} ✨</button><a href="#kids-library">بریم کشف کنیم ↓</a></div>
      </div><div className={styles.mascot} aria-hidden="true"><span className={styles.sun}>☀</span><div className={styles.cloud}><i /><i /><b>⌣</b></div><span className={styles.book}>📚</span><span className={styles.star}>✦</span><span className={styles.flower}>🌼</span></div>
    </section>
    <div className={styles.status} role="status"><span>🛡️ {parent ? "پنل والدین · پس از ۵ دقیقه قفل می‌شود" : running ? "فقط انتخاب‌های تأییدشدهٔ خانواده" : "برای پخش، بزرگ‌ترها برنامه را شروع کنند"}</span><span>{settings ? `گروه ${settings.age.replace("-", " تا ")} سال` : "بدون نیاز به نام و تاریخ تولد"}</span><strong>{running && !parent ? `${faNumber(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")} باقی مانده` : "زمان‌بندی با والدین"}</strong></div>
    {storageProblem && <p className={styles.notice} role="alert">ذخیره‌سازی مرورگر در دسترس نیست. برای اعمال کنترل والدین، ذخیره‌سازی را فعال کنید.</p>}
    {parent && settings && <section className={styles.parents} aria-labelledby="parents-title">
      <h2 id="parents-title">یک برنامهٔ کوچک برای امروز</h2><p>سن‌ها پیشنهاد تحریریه‌اند، نه رده‌بندی رسمی. قبل از تأیید، نسخهٔ صوتی/دوبله و قسمت‌ها را ببینید. تأیید سریال شامل همهٔ قسمت‌های ارائه‌شدهٔ آن عنوان است.</p>
      <div className={styles.settings}>
        <label>گروه سنی<select value={settings.age} onChange={e => { setActive(null); save({ ...settings, age: e.target.value as KidsAge, audioOnly: e.target.value === "0-2" ? true : settings.audioOnly }); }}>{KIDS_AGES.map(age => <option key={age} value={age}>{age.replace("-", " تا ")} سال</option>)}</select></label>
        <label>مدت برنامه<select value={settings.minutes} onChange={e => save({ ...settings, minutes: Number(e.target.value) })}>{[10, 20, 30, 45, 60].map(n => <option key={n} value={n}>{faNumber(n)} دقیقه</option>)}</select></label>
        <label><input type="checkbox" checked={settings.audioOnly} disabled={settings.age === "0-2"} onChange={e => { setActive(null); save({ ...settings, audioOnly: e.target.checked }); }} /> فقط صدا؛ بدون تصویر</label>
        <label><input type="checkbox" checked={settings.autoNext} onChange={e => save({ ...settings, autoNext: e.target.checked })} /> رفتن به عنوان مجاز بعدی (بدون تکرار)</label>
      </div>
      <div className={styles.actions}><button className={styles.primary} onClick={startSession}>شروع برنامهٔ {faNumber(settings.minutes)} دقیقه‌ای</button><button onClick={() => { save({ ...settings, deadline: 0 }); setActive(null); setParent(false); }}>پایان برنامه و قفل</button><Link href="/">خروج به سایت اصلی ↗</Link></div>
      {error && <p role="alert">{error}</p>}
      <p className={styles.fine}>این قفل، حفاظ محلی مرورگر است؛ جایگزین نظارت بزرگ‌تر یا کنترل والدین سیستم‌عامل نیست. پاک‌کردن داده‌های مرورگر تنظیمات را حذف می‌کند. اینجا نام، صدا یا تاریخ تولد کودک را نمی‌گیریم. پخش از میزبان رسانه، اتصال اینترنتی به همان میزبان دارد.</p>
    </section>}
    <div ref={stage} className={styles.stage}>
      {playing && active && <section className={styles.playerPanel} aria-label="پخش انتخاب‌شده"><header><h2>{active.title}</h2><button onClick={() => setActive(null)}>بستن ×</button></header>
        {active.kind === "resource" && parent ? <FamilyEmbed key={active.id} item={active} /> : active.kind === "activity" ? <KidsActivity key={active.id} item={active} /> : <KidsPlayer key={active.id} item={active} deadline={parent ? 0 : settings!.deadline} onEnded={next} />}
        <p>{active.note}</p>
      </section>}
      {!running && !parent && ready && settings && <div className={styles.break}><span aria-hidden="true">🌿</span><h2>وقت یک استراحت کوچولو!</h2><p>پخش متوقف است. برای برنامهٔ بعدی از بزرگ‌ترها کمک بگیر.</p></div>}
    </div>
    <section id="kids-library" className={styles.library}>
      <div className={styles.sectionTitle}><div><small>انتخاب‌های کوچک و دوست‌داشتنی</small><h2>{parent ? "بازبینی و انتخاب برای کودک" : learning ? "باشگاه کاشف‌های کوچک" : "امروز چی دوست داری؟"}</h2></div><label>جستجو در همین فهرست<input value={query} onChange={e => setQuery(e.target.value)} placeholder="قصه، رنگ، ستاره…" /></label></div>
      <div className={styles.categories} role="group" aria-label="دسته‌بندی کودک">{KIDS_CATEGORIES.filter(([id]) => !learning || id === "all" || learningCategories.includes(id)).map(([id, title, icon]) => <button key={id} aria-pressed={category === id} onClick={() => setCategory(id)}><span aria-hidden="true">{icon}</span>{title}</button>)}</div>
      {!ready ? <p role="status">در حال آماده‌سازی دنیای کودک…</p> : <div className={styles.grid}>{filtered.map((item, index) => <article key={item.id} className={styles.card} data-tone={index % 5}>
        <button className={styles.art} onClick={() => choose(item)} aria-label={`${parent ? "پیش‌نمایش" : "شروع"} ${item.title}`}>
          {/* Only explicitly shortlisted or approved covers, never the adult feed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.poster ? <img src={item.poster} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{KIDS_CATEGORIES.find(c => c[0] === item.categories[0])?.[2] || "🌟"}</span>}<b>{item.kind === "activity" ? "بازی کنیم" : parent ? "پیش‌نمایش" : "پخش"} ▶</b>
        </button><div className={styles.cardBody}><small>{item.kind === "activity" ? "بازی داخلی" : item.kind === "audio" ? "صوت" : item.categories.includes("series") ? "سریال" : "فیلم"} · {item.ages.join("، ").replaceAll("-", " تا ")} سال</small><h3>{item.title}</h3>
          {parent && <><p>{item.note}</p><small>{item.provider}</small>{item.kind !== "activity" && <label className={styles.approve}><input type="checkbox" checked={settings!.approved.includes(item.id)} onChange={e => save({ ...settings!, approved: e.target.checked ? [...new Set([...settings!.approved, item.id])] : settings!.approved.filter(id => id !== item.id) })} /> بررسی کردم؛ برای کودک من مجاز است</label>}</>}
        </div></article>)}</div>}
      {ready && filtered.length === 0 && <div className={styles.empty}><span>🧸</span><h3>این قفسه هنوز انتخابی ندارد</h3><p>{parent ? "دسته یا جستجو را تغییر دهید؛ منابع آموزشی پایین صفحه هم در دسترس‌اند." : "بزرگ‌ترها می‌توانند محتوا را بررسی کنند و به فهرست تو اضافه کنند."}</p><button onClick={openParent}>کمک از بزرگ‌ترها</button></div>}
    </section>
    {parent && <section className={styles.resources}><h2>منابع رسمی برای تماشای همراه خانواده</h2><p>این لینک‌ها از محیط کودک خارج می‌شوند؛ تایمر و فهرست مجاز سرونما روی سایت مقصد اعمال نمی‌شوند. صرف درج لینک، مجوز بازنشر نیست.</p>
      <div className={styles.resourceGrid}>{KIDS_RESOURCES.filter(resource => !learning || resource.categories.some(c => learningCategories.includes(c))).map(resource => <article key={resource.id}><small>{resource.provider}</small><h3>{resource.title}</h3><p>{resource.note}</p>{kidsEmbedUrl(resource) && <button onClick={() => choose(resource)}>پخش با پلیر آپارات، همراه بزرگ‌تر</button>}<a href={safeKidsUrl(resource.sourceUrl) || undefined} target="_blank" rel="noopener noreferrer">باز کردن منبع اصلی با بزرگ‌تر ↗</a></article>)}</div>
      <aside className={styles.notice}><h3>آپارات کودک</h3><p>نام و لینک اصلی حفظ شده است. صفحهٔ این سرویس جاسازی در سایت دیگر را مسدود می‌کند؛ پخش درون سرونما منوط به دریافت کد رسمی قابل‌جاسازی از ارائه‌دهنده است. فایل ویدیو استخراج یا بازنشر نشده است.</p><a href="https://www.aparatkids.com/term" target="_blank" rel="noopener noreferrer">شرایط عمومی آپارات کودک ↗</a></aside>
    </section>}
    <footer className={styles.footer}><strong>سرونما کودک 🌱</strong><p>با انتخاب خانواده، یک تجربهٔ آرام‌تر. بدون چت عمومی، پیشنهاد از آرشیو بزرگسالان یا پخش بی‌پایان.</p><p>پخش رسانه به دسترسی و سازگاری منبع وابسته است؛ هیچ منبع بیرونی را بدون بازبینی، امنِ قطعی نمی‌نامیم.</p></footer>
    <dialog ref={gate} className={styles.gate} aria-labelledby="kids-gate-title" onClose={() => { setPin(""); setConfirmPin(""); }}><form onSubmit={unlock}><h2 id="kids-gate-title">🔒 مخصوص بزرگ‌ترها</h2><p>{settings ? "رمز والدین را وارد کنید." : "برای شروع، یک رمز والدین بسازید. رمز را در اختیار کودک نگذارید."}</p><label>رمز والدین<input autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={e => setPin(e.target.value)} required /></label>{!settings && <label>تکرار رمز<input type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} required /></label>}<p role="alert">{error}</p><div className={styles.actions}><button className={styles.primary} disabled={busy || now < retryAt}>{busy ? "یک لحظه…" : "ورود والدین"}</button><button type="button" onClick={() => gate.current?.close()}>برگشت</button></div><p className={styles.fine}>تنظیمات فقط در این مرورگر می‌ماند. رمز حساب کاربری خود را اینجا استفاده نکنید.</p></form></dialog>
  </main>;
}

function KidsPlayer({ item, deadline, onEnded }: { item: KidsItem; deadline: number; onEnded: () => void }) {
  const [sources, setSources] = useState<Array<{ url: string; label: string }>>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/kids/media/${encodeURIComponent(item.id)}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("برای این عنوان فعلاً نسخهٔ سازگار با پلیر کودک پیدا نشد.");
      const result = await response.json();
      setSources((result.sources || []).filter((s: { url: string }) => safeKidsUrl(s.url))); setLoading(false);
    }).catch(reason => { if (reason.name !== "AbortError") { setError(reason.message || "اتصال به منبع ممکن نیست."); setLoading(false); } });
    return () => controller.abort();
  }, [item.id]);
  useEffect(() => {
    const media = ref.current;
    const stop = () => { if (document.hidden || (deadline > 0 && Date.now() >= deadline)) media?.pause(); };
    document.addEventListener("visibilitychange", stop);
    const timer = setInterval(stop, 500);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", stop); media?.pause(); };
  }, [deadline, sources, index]);
  const props = { ref, controls: true, autoPlay: false, preload: "none" as const, controlsList: "nodownload noremoteplayback", disablePictureInPicture: true, onPlay: () => { if (deadline > 0 && Date.now() >= deadline) ref.current?.pause(); }, onError: () => setError("این نسخه پخش نشد؛ نسخهٔ دیگری را امتحان کنید. فایل‌های ناسازگار و لینک‌های خراب خودکار جایگزین نمی‌شوند."), onEnded };
  return <div className={styles.media}>{loading && <p role="status">در حال آماده‌سازی پلیر…</p>}{sources.length > 0 && <><label>قسمت / کیفیت<select value={index} onChange={e => { setIndex(Number(e.target.value)); setError(""); }}>{sources.map((s, i) => <option key={`${s.url}-${i}`} value={i}>{s.label}</option>)}</select></label>{item.kind === "audio" ? <audio key={index} {...props} src={sources[index]?.url} /> : <video key={index} {...props} src={sources[index]?.url} playsInline poster={item.poster || undefined} />}</>}{error && <p role="alert">{error}</p>}<p className={styles.fine}>برای شروع، دکمهٔ پخش را بزنید. تبلیغ و پیشنهاد عمومی به این پلیر اضافه نمی‌شود.</p></div>;
}

function FamilyEmbed({ item }: { item: KidsItem }) {
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    const hide = () => { if (document.hidden) setConsent(false); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const src = kidsEmbedUrl(item);
  return <div className={styles.media}>
    <p>تماشای همراه خانواده: پلیر رسمی ممکن است تبلیغ، پیشنهاد یا لینک خارجی نمایش دهد. کنترل محتوای داخل آن با آپارات است؛ به همین دلیل در برنامهٔ مستقل کودک قرار نمی‌گیرد.</p>
    {consent && src ? <iframe title={item.title} src={src} style={{ width: "100%", aspectRatio: "16 / 9", border: 0 }} allow="fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" /> : <button onClick={() => setConsent(true)}>همراه کودک هستم؛ پلیر رسمی بارگذاری شود</button>}
    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">مشاهده در منبع اصلی: {item.provider} ↗</a>
  </div>;
}

function KidsActivity({ item }: { item: KidsItem }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const colors = [["آبی", "#3b82f6"], ["زرد", "#f5c542"], ["سبز", "#3da87e"], ["صورتی", "#e57bac"]];
  const words = [["🐱", "Cat", "گربه"], ["☀️", "Sun", "خورشید"], ["🍎", "Apple", "سیب"], ["🐟", "Fish", "ماهی"], ["🌳", "Tree", "درخت"]];
  const story = ["ابر کوچولو بالای یک باغ زندگی می‌کرد. یک روز دید گل زرد سرش را پایین انداخته.", "ابر پرسید: دوست داری کنارت باشم؟ گل گفت: آره، امروز کمی تشنه‌ام.", "ابر چند قطره باران فرستاد. گل لبخند زد و گفت: ممنون که از من پرسیدی!", "آفتاب از پشت ابر بیرون آمد. با هم یک رنگین‌کمان ساختند. تو امروز چطور می‌توانی به یک دوست کمک کنی؟"];
  const count = step % 5 + 1;
  return <div className={styles.activity}>
    {item.activity === "count" && <><p>چند ستاره می‌بینی؟</p><div className={styles.bigArt} aria-label={`${faNumber(count)} ستاره`}>{"⭐".repeat(count)}</div><div className={styles.answers}>{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setAnswer(n === count ? "آفرین! حالا یکی دیگر را امتحان کنیم." : "یک بار دیگر با هم بشماریم.")}>{faNumber(n)}</button>)}</div></>}
    {item.activity === "colors" && <><p>کدام رنگ {colors[step % 4][0]} است؟</p><div className={styles.answers}>{colors.map(([name, color]) => <button key={name} aria-label={name} style={{ backgroundColor: color }} onClick={() => setAnswer(name === colors[step % 4][0] ? "پیداش کردی!" : "دوباره امتحان کنیم.")}>● <span>{name}</span></button>)}</div></>}
    {item.activity === "english" && <><div className={styles.bigArt}>{words[step % words.length][0]}</div><strong lang="en" dir="ltr">{words[step % words.length][1]}</strong><p>{words[step % words.length][2]}</p><p>با هم بلند بگویید و یک نمونه دوروبرتان پیدا کنید.</p></>}
    {item.activity === "story" && <><span className={styles.bigArt}>☁️ 🌼</span><p>{story[Math.min(step, story.length - 1)]}</p></>}
    <p role="status">{answer}</p><button onClick={() => { setStep(s => s + 1); setAnswer(""); }} disabled={item.activity === "story" && step >= story.length - 1}>{item.activity === "story" ? "صفحهٔ بعد" : "یکی دیگه!"}</button>
  </div>;
}
