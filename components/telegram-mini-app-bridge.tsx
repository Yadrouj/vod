"use client";

import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type WebApp = {
  platform: string; ready: () => void; expand: () => void;
  safeAreaInset?: { top: number; bottom: number };
  contentSafeAreaInset?: { top: number; bottom: number };
  BackButton: { show: () => void; hide: () => void; onClick: (callback: () => void) => void; offClick: (callback: () => void) => void };
  onEvent: (event: string, callback: () => void) => void;
  offEvent: (event: string, callback: () => void) => void;
};

/** Public browsing only: no initDataUnsafe identity, tokens, or bot API calls. */
export function TelegramMiniAppBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(false);
  // Retain the SDK on subsequent in-app film/music navigation. Normal website
  // visits never download it. This conditional adjustment happens only once.
  if (!entered && pathname === "/mini-app") setEntered(true);
  useEffect(() => {
    if (!ready) return;
    const app = (window as Window & { Telegram?: { WebApp?: WebApp } }).Telegram?.WebApp;
    if (!app || app.platform === "unknown") return;
    app.ready(); app.expand();
    const root = document.documentElement;
    root.dataset.telegramMiniApp = "true";
    const insets = () => {
      for (const edge of ["top", "bottom"] as const) {
        const inset = Math.max(0, app.safeAreaInset?.[edge] || 0, app.contentSafeAreaInset?.[edge] || 0);
        root.style.setProperty(`--telegram-safe-${edge}`, `${Math.min(inset, 150)}px`);
      }
    };
    insets();
    const back = () => router.back();
    if (pathname === "/mini-app") app.BackButton.hide(); else app.BackButton.show();
    app.BackButton.onClick(back);
    app.onEvent("safeAreaChanged", insets); app.onEvent("contentSafeAreaChanged", insets);
    return () => {
      app.BackButton.offClick(back); app.BackButton.hide();
      app.offEvent("safeAreaChanged", insets); app.offEvent("contentSafeAreaChanged", insets);
      delete root.dataset.telegramMiniApp;
      root.style.removeProperty("--telegram-safe-top"); root.style.removeProperty("--telegram-safe-bottom");
    };
  }, [ready, pathname, router]);
  return entered ? <Script id="telegram-mini-app-sdk" src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={() => setReady(true)} /> : null;
}
