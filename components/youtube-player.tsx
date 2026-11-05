"use client";

import { ChevronDown, Copy, Download, ExternalLink, Play, Radio } from "lucide-react";
import { useId, useRef, useState } from "react";
import { contentRestriction, restrictionMessage } from "@/lib/content-restrictions.mjs";
import type { YouTubeSource } from "@/lib/old-iranian-media";
import { canonicalYouTubeUrl, youtubeDownloadGuide, YOINKS_REPOSITORY, YOINKS_VERSION } from "./youtube-download-guide";
import styles from "./youtube-player.module.css";

function YouTubeDownloadGuidance({ source, title }: { source: YouTubeSource; title: string }) {
  const fieldId = useId();
  const noteId = useId();
  const commandField = useRef<HTMLTextAreaElement>(null);
  const sourceField = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [copyTarget, setCopyTarget] = useState<"command" | "link">("command");
  const guide = youtubeDownloadGuide(source, title);

  if (!guide) return <p className={styles.unavailable}>برای این منبع، دستور دانلود ارائه نمی‌شود؛ شناسهٔ نامعتبر یا وضعیت «در دسترس نیست» قابل استفاده نیست.</p>;
  const command = guide.command;
  const sourceUrl = guide.sourceUrl;

  async function copyText(target: "command" | "link") {
    setCopyTarget(target);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(target === "command" ? command : sourceUrl);
      setCopyStatus("copied");
    } catch {
      const field = target === "command" ? commandField.current : sourceField.current;
      field?.focus(); field?.select();
      setCopyStatus("manual");
    }
  }

  return (
    <details className={styles.guidance} dir="rtl" data-youtube-download-guidance>
      <summary className={styles.downloadCta}>
        <Download size={22} aria-hidden="true" />
        <span><strong>دانلود از YouTube</strong><small>نیازمند ابزار دسکتاپ — دانلود مستقیم در مرورگر نیست</small></span>
        <ChevronDown size={20} className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.body}>
        <p>راهنمای استفاده از <a href={YOINKS_REPOSITORY} target="_blank" rel="noopener noreferrer">Yoinks {YOINKS_VERSION}</a> برای «{title}». این ابزار تعاملی در ترمینال رایانه اجرا می‌شود؛ سایت فایل ویدیو را دریافت یا ارسال نمی‌کند و موفقیت دانلود تضمین نمی‌شود.</p>
        <p><a href={guide.sourceUrl} target="_blank" rel="noopener noreferrer">ویدیوی اصلی در YouTube</a> · {source.channel} · {source.title}</p>
        <ol>
          <li>فقط ویدیوی خودتان یا محتوایی را که مجوز نگهداری آن را دارید دانلود کنید؛ حقوق صاحب اثر، شرایط مجوز و مقررات پلتفرم را رعایت کنید.</li>
          <li>روی رایانهٔ دسکتاپ، Node.js نسخهٔ ۲۲ یا بالاتر و npm لازم است. معرفی Yoinks حداقل ۱۸ را نوشته، اما وابستگی فعلی Ink به ۲۲ نیاز دارد. دستور زیر ابزار شخص ثالث را دریافت و اجرا می‌کند؛ ممکن است yt-dlp و ffmpeg را هم دریافت کند.</li>
          <li>دستور را در ترمینال اجرا کنید؛ با کلیدهای جهت کیفیت را انتخاب کنید و Enter بزنید. طبق راهنمای Yoinks، فایل در <code dir="ltr">~/Downloads</code> ذخیره می‌شود؛ مرورگر دانلودی را شروع نمی‌کند.</li>
        </ol>
        <label htmlFor={`${fieldId}-source`}>لینک مستقیم همین ویدیو در YouTube</label>
        <div className={styles.commandRow}>
          <input id={`${fieldId}-source`} ref={sourceField} className={styles.sourceInput} value={guide.sourceUrl} readOnly dir="ltr" type="url" onFocus={event => event.currentTarget.select()} />
          <button type="button" className={styles.copyButton} onClick={() => void copyText("link")} aria-label={`کپی لینک یوتیوب ${title}`}><Copy size={16} aria-hidden="true" />کپی لینک</button>
        </div>
        <label htmlFor={fieldId}>دستور مخصوص این ویدیو</label>
        <div className={styles.commandRow}>
          <textarea id={fieldId} ref={commandField} className={styles.command} value={guide.command} readOnly rows={3} dir="ltr" lang="en" spellCheck={false} aria-describedby={noteId} onFocus={event => event.currentTarget.select()} />
          <button type="button" className={styles.copyButton} onClick={() => void copyText("command")} aria-label={`کپی دستور دانلود ${title}`}><Copy size={16} aria-hidden="true" />کپی دستور</button>
        </div>
        <p className={styles.copyStatus} role="status" aria-live="polite" aria-atomic="true">{copyStatus === "copied" ? `${copyTarget === "command" ? "دستور" : "لینک"} کپی شد؛ هیچ برنامه یا دانلودی اجرا نشد.` : copyStatus === "manual" ? `کپی خودکار ممکن نشد؛ ${copyTarget === "command" ? "متن دستور" : "لینک"} انتخاب شده است. آن را دستی کپی کنید.` : "دکمهٔ کپی فقط متن را کپی می‌کند؛ برنامه یا دانلودی اجرا نمی‌شود."}</p>
        <p id={noteId}>Yoinks و سرونما ورود به حساب، تأیید سن، محدودیت منطقه‌ای، پرداخت یا محدودیت حق نشر را دور نمی‌زنند. اگر دسترسی نیازمند تأیید است، به منبع اصلی مراجعه کنید؛ از کوکی یا اطلاعات حساب کاربر برای این راهنما استفاده نمی‌شود.</p>
        <details className={styles.testResult}><summary>وضعیت بررسی ابزار دانلود</summary><p>بررسی ۵ نوامبر ۲۰۲۶: دریافت بستهٔ npm و اجرای راهنمای CLI نسخهٔ ۰٫۳٫۱ موفق بود. دانلود واقعی نمونهٔ مجاز Blender به‌علت عدم اتصال این شبکه به YouTube ناموفق بود؛ هیچ دانلود موفقی تأیید نشده است. اجرای راهنما به‌معنای تأیید دانلود نیست.</p></details>
        <p><a href="https://support.google.com/youtube/answer/2802167?hl=fa" target="_blank" rel="noopener noreferrer">راهنمای رسمی محدودیت سنی YouTube</a> · <a href="https://peach.blender.org/about/" target="_blank" rel="noopener noreferrer">مجوز نمونهٔ آزمایش Blender</a></p>
      </div>
    </details>
  );
}

export function YouTubePlayer({ source, title }: { source: YouTubeSource; title: string }) {
  const [started, setStarted] = useState(false);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.videoId)}?rel=0&playsinline=1&autoplay=1`;

  if (contentRestriction({ title, source })) {
    return <section className="youtube-player-card" aria-label={title}><h2>{title}</h2><p>{restrictionMessage("fa")}</p></section>;
  }
  const sourceUrl = canonicalYouTubeUrl(source.videoId);
  if (!sourceUrl) return <section className="youtube-player-card" aria-label={title}><h2>{title}</h2><p className={styles.unavailable}>شناسهٔ این ویدیوی YouTube معتبر نیست؛ منبع دیگری را انتخاب کنید.</p></section>;

  return (
    <section id="youtube-player" className="youtube-player-card" aria-label={`${title} YouTube player`}>
      <div className="youtube-player-heading">
        <div>
          <span className="youtube-player-kicker"><Radio size={15} /> منبع ویدیوی عمومی</span>
          <h2>تماشای آنلاین {title}</h2>
          <p>این نسخه از یک ویدیوی عمومی YouTube پخش می‌شود؛ بدون دانلود واسطه‌ای و با کنترل‌های کامل خود YouTube.</p>
        </div>
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="youtube-source-link">
          <ExternalLink size={15} /> YouTube
        </a>
      </div>

      <YouTubeDownloadGuidance key={source.videoId} source={source} title={title} />

      <div className="youtube-player-stage">
        {started ? (
          <iframe
            title={`${title} — ${source.title}`}
            src={embedUrl}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="youtube-player-poster"
            style={{ backgroundImage: `url(${JSON.stringify(source.thumbnailUrl)})` }}
            onClick={() => setStarted(true)}
            aria-label={`Play ${title} on YouTube`}
          >
            <span className="youtube-play-control" aria-hidden="true"><Play size={30} fill="currentColor" /></span>
            <span className="youtube-poster-copy"><strong>شروع تماشا</strong><small>{source.channel} · {source.title}</small></span>
          </button>
        )}
      </div>

      <footer className="youtube-player-footer">
        <span><Radio size={14} /> {source.channel}</span>
        <small>اگر YouTube ورود به حساب می‌خواهد، ویدیو را با دکمهٔ YouTube باز کنید. محدودیت سنی، منطقه‌ای یا تأیید حساب را خود YouTube تعیین می‌کند و سرونما نمی‌تواند آن را حذف کند.{source.evidenceUrl && <> · <a href={source.evidenceUrl} target="_blank" rel="noopener noreferrer">منبع شناسایی فیلم</a></>}</small>
      </footer>
    </section>
  );
}
