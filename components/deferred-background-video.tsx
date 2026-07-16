"use client";

import { useEffect, useState } from "react";

export function DeferredBackgroundVideo({ src, poster }: { src: string; poster?: string | null }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
    const activate = () => setEnabled(true);
    const requestIdle = window.requestIdleCallback?.bind(window);
    const usedIdleCallback = typeof requestIdle === "function";
    const idleId = usedIdleCallback
      ? requestIdle(activate, { timeout: 1_800 })
      : window.setTimeout(activate, 1_200);
    return () => {
      if (usedIdleCallback) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  if (!enabled) return null;
  return (
    <video
      className="detail-video-bg"
      src={src}
      poster={poster ?? undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
