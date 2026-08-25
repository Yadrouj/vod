"use client";

import { ExternalLink, Play, Radio } from "lucide-react";
import { useState } from "react";
import type { YouTubeSource } from "@/lib/old-iranian-media";

export function YouTubePlayer({ source, title }: { source: YouTubeSource; title: string }) {
  const [started, setStarted] = useState(false);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.videoId)}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;

  return (
    <section id="youtube-player" className="youtube-player-card" aria-label={`${title} YouTube player`}>
      <div className="youtube-player-heading">
        <div>
          <span className="youtube-player-kicker"><Radio size={15} /> Public video source</span>
          <h2>تماشای آنلاین {title}</h2>
          <p>این نسخه از یک ویدیوی عمومی YouTube پخش می‌شود؛ بدون دانلود واسطه‌ای و با کنترل‌های کامل خود YouTube.</p>
        </div>
        <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="youtube-source-link">
          <ExternalLink size={15} /> YouTube
        </a>
      </div>

      <div className="youtube-player-stage">
        {started ? (
          <iframe
            title={`${title} — ${source.title}`}
            src={embedUrl}
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
        <small>اگر پخش داخل صفحه محدود شد، از دکمهٔ YouTube استفاده کنید.</small>
      </footer>
    </section>
  );
}
