"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Download, Film, History, Home, Music2, Search, Users, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActivityDialog, openActivity } from "./landing-activity";
import { SearchSuggest } from "./search-suggest";
import type { Locale } from "@/lib/i18n";

export function MobileAppShell({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const music = pathname.startsWith("/music");
  const watching = pathname.startsWith("/watch/");
  const room = pathname.startsWith("/watch-together/");
  const fa = locale === "fa";
  const [offline, setOffline] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    let availableHeight = innerHeight;
    const updateViewport = () => {
      const editing = Boolean(document.activeElement?.matches("input:not([type=range]):not([type=checkbox]), textarea, [contenteditable=true]"));
      if (!editing) availableHeight = Math.max(availableHeight, innerHeight);
      const keyboard = Boolean(window.visualViewport && innerHeight - window.visualViewport.height > 160) || (editing && availableHeight - innerHeight > 160);
      document.documentElement.dataset.appKeyboard = String(keyboard);
      setHidden(Boolean(document.fullscreenElement) || keyboard);
    };
    updateConnection(); updateViewport();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    document.addEventListener("fullscreenchange", updateViewport);
    window.addEventListener("resize", updateViewport);
    document.addEventListener("focusin", updateViewport);
    document.addEventListener("focusout", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      document.removeEventListener("fullscreenchange", updateViewport);
      window.removeEventListener("resize", updateViewport);
      document.removeEventListener("focusin", updateViewport);
      document.removeEventListener("focusout", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      delete document.documentElement.dataset.appKeyboard;
    };
  }, []);

  useEffect(() => {
    // Do not reload active video/audio when a new worker becomes available.
    if (process.env.NODE_ENV !== "production" || !isSecureContext || !("serviceWorker" in navigator)) return;
    const timer = window.setTimeout(() => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => { /* App works without offline support. */ });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    searchDialog.current?.close();
  }, [pathname]);

  const openSearch = () => { setSearchOpen(true); searchDialog.current?.showModal(); };
  return <>
    {offline && <div className="app-offline" role="status"><WifiOff size={16} />{fa ? "اتصال اینترنت قطع است؛ برای پخش و جستجو دوباره متصل شوید." : "You’re offline. Reconnect to search and play."}</div>}
    <nav className="app-mobile-nav" data-theme={music ? "music" : "cinema"} data-hidden={hidden} aria-label={fa ? "منوی اصلی موبایل" : "Mobile navigation"}>
      <Link href={watching ? pathname.replace("/watch/", "/") : "/"} prefetch={false} aria-current={pathname === "/" ? "page" : undefined}>
        {watching ? <ArrowRight /> : <Home />}<span>{watching ? (fa ? "جزئیات" : "Details") : (fa ? "خانه" : "Home")}</span>
      </Link>
      <Link href={music ? "/music/artists" : "/browse"} prefetch={false} aria-current={pathname.startsWith(music ? "/music/artists" : "/browse") ? "page" : undefined}>
        {music ? <Users /> : <Film />}<span>{music ? (fa ? "خواننده‌ها" : "Artists") : (fa ? "فیلم و سریال" : "Explore")}</span>
      </Link>
      <button className="app-nav-search" type="button" aria-haspopup="dialog" onClick={openSearch}><Search /><span>{fa ? "جستجو" : "Search"}</span></button>
      <Link href={music ? "/" : "/music"} prefetch={false}>{music ? <Film /> : <Music2 />}<span>{music ? (fa ? "سینما" : "Cinema") : (fa ? "موسیقی" : "Music")}</span></Link>
      <button type="button" aria-haspopup="dialog" onClick={() => openActivity(watching || room || music ? "watch" : "download")}>
        {watching || room || music ? <History /> : <Download />}<span>{watching || room || music ? (fa ? "ادامه تماشا" : "History") : (fa ? "دانلودها" : "Downloads")}</span>
      </button>
    </nav>
    <ActivityDialog locale={locale} />
    <dialog ref={searchDialog} className="app-search-dialog" data-theme={music ? "music" : "cinema"} dir={fa ? "rtl" : "ltr"} aria-labelledby="app-search-title" onClose={() => setSearchOpen(false)} onClick={e => { if (e.target === e.currentTarget || (e.target as Element).closest("a[href]")) searchDialog.current?.close(); }}>
      <header><div><small>{fa ? "کشف در سرونما" : "Discover SarvNema"}</small><h2 id="app-search-title">{fa ? "چی دوست داری ببینی یا بشنوی؟" : "What would you like to discover?"}</h2></div><button autoFocus type="button" aria-label={fa ? "بستن" : "Close"} onClick={() => searchDialog.current?.close()}><X /></button></header>
      {searchOpen && <form action={music ? "/music" : "/browse"} onSubmit={() => searchDialog.current?.close()}>
        <SearchSuggest key={music ? "music" : "cinema"} locale={locale} endpoint={music ? "/api/music/search" : "/api/suggest"} placeholder={fa ? music ? "نام آهنگ یا خواننده…" : "نام فیلم یا سریال…" : "Search…"} hrefForItem={music ? item => `/music/${item.imdbCode}` : undefined} viewAllHref={music ? q => `/music?q=${encodeURIComponent(q)}` : undefined} />
        <button className="app-search-submit" type="submit">{fa ? "همه نتیجه‌ها" : "All results"}</button>
      </form>}
      <p className="app-search-tip">{fa ? "بنویس یا روی میکروفون بزن؛ نتیجه‌ها همین‌جا نمایش داده می‌شوند." : "Type or tap the microphone. Suggestions appear here."}</p>
    </dialog>
  </>;
}
