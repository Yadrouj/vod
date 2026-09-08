"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Download, Film, History, Library, ListMusic, Music2, Search, Users, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActivityDialog, openActivity } from "./landing-activity";
import { SearchSuggest } from "./search-suggest";
import { WatchTogetherLauncher } from "./watch-together-launcher";
import type { Locale } from "@/lib/i18n";

export function MobileAppShell({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const watching = pathname.startsWith("/watch/");
  const room = pathname.startsWith("/watch-together/");
  const [roomMusic, setRoomMusic] = useState(false);
  const music = pathname.startsWith("/music") || (room && roomMusic);
  const fa = locale === "fa";
  const [offline, setOffline] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const libraryDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!room) return;
    // A room can switch between video and audio without changing its URL.
    let themeObserver: MutationObserver | undefined;
    const discovery = new MutationObserver(attach);
    function attach() {
      const stage = document.querySelector(".party-layout[data-media-theme]");
      if (!stage) return;
      discovery.disconnect();
      const read = () => setRoomMusic(stage.getAttribute("data-media-theme") === "music");
      read();
      themeObserver = new MutationObserver(read);
      themeObserver.observe(stage, { attributes: true, attributeFilter: ["data-media-theme"] });
    }
    discovery.observe(document.body, { childList: true, subtree: true });
    attach();
    return () => { discovery.disconnect(); themeObserver?.disconnect(); };
  }, [room, pathname]);

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
    libraryDialog.current?.close();
  }, [pathname]);

  const openSearch = () => { setSearchOpen(true); searchDialog.current?.showModal(); };
  return <>
    {offline && <div className="app-offline" role="status"><WifiOff size={16} />{fa ? "اتصال اینترنت قطع است؛ برای پخش و جستجو دوباره متصل شوید." : "You’re offline. Reconnect to search and play."}</div>}
    <nav className="app-mobile-nav" dir={fa ? "rtl" : "ltr"} data-theme={music ? "music" : "cinema"} data-hidden={hidden} aria-label={fa ? "منوی اصلی موبایل" : "Mobile navigation"}>
      <Link href={watching ? pathname.replace("/watch/", "/") : music ? "/music" : "/"} prefetch={false} aria-current={pathname === (music ? "/music" : "/") ? "page" : undefined}>
        <span className="app-nav-icon">{watching ? <ArrowRight /> : music ? <Music2 /> : <Film />}</span><span>{watching ? (fa ? "جزئیات" : "Details") : music ? (fa ? "موسیقی" : "Music") : (fa ? "فیلم‌ها" : "Cinema")}</span>
      </Link>
      <button className="app-nav-search" type="button" aria-haspopup="dialog" aria-expanded={searchOpen} onClick={openSearch}><span className="app-nav-icon"><Search /></span><span>{fa ? "جستجو" : "Search"}</span></button>
      <WatchTogetherLauncher key={music ? "listen" : "watch"} locale={locale} placement="dock" experience={music ? "listen" : "watch"} />
      <Link className="app-nav-switch" href={music ? "/" : "/music"} prefetch={false} aria-label={music ? (fa ? "رفتن به سینما" : "Switch to cinema") : (fa ? "رفتن به موسیقی" : "Switch to music")}><span className="app-nav-icon">{music ? <Film /> : <Music2 />}<i aria-hidden="true" /></span><span>{music ? (fa ? "سینما" : "Cinema") : (fa ? "موسیقی" : "Music")}</span></Link>
      <button type="button" className="app-nav-library" aria-haspopup="dialog" aria-expanded={libraryOpen} onClick={() => { setLibraryOpen(true); libraryDialog.current?.showModal(); }}>
        <span className="app-nav-icon"><Library /></span><span>{fa ? "کتابخانه" : "Library"}</span>
      </button>
    </nav>
    <dialog ref={libraryDialog} className="app-search-dialog app-library-dialog" data-theme={music ? "music" : "cinema"} dir={fa ? "rtl" : "ltr"} aria-labelledby="app-library-title" onClose={() => setLibraryOpen(false)} onClick={e => { if (e.target === e.currentTarget || (e.target as Element).closest("a[href]")) libraryDialog.current?.close(); }}>
      <header><div><small>{music ? (fa ? "دنیای موسیقی تو" : "Your music space") : (fa ? "دنیای سینمای تو" : "Your cinema space")}</small><h2 id="app-library-title">{fa ? "کتابخانه و دسترسی سریع" : "Library & shortcuts"}</h2></div><button autoFocus type="button" aria-label={fa ? "بستن" : "Close"} onClick={() => libraryDialog.current?.close()}><X /></button></header>
      <div className="app-library-grid">
        <Link href={music ? "/music/artists" : "/browse"} prefetch={false}>{music ? <Users /> : <Film />}<strong>{music ? (fa ? "خواننده‌ها" : "Artists") : (fa ? "فیلم و سریال" : "Movies & series")}</strong><small>{fa ? "کشف و مرور آرشیو" : "Explore the archive"}</small></Link>
        <Link href={music ? "/music/playlists" : "/browse?section=recent-films"} prefetch={false}>{music ? <ListMusic /> : <Library />}<strong>{music ? (fa ? "پلی‌لیست‌ها" : "Playlists") : (fa ? "تازه‌ها" : "New releases")}</strong><small>{music ? (fa ? "برای هر حال و هوا" : "For every mood") : (fa ? "فیلم‌های جدید" : "New movies")}</small></Link>
        <button type="button" onClick={() => { libraryDialog.current?.close(); openActivity("download"); }}><Download /><strong>{fa ? "دانلودها" : "Downloads"}</strong><small>{fa ? "لینک‌های اخیر این مرورگر" : "Recent links in this browser"}</small></button>
        <button type="button" onClick={() => { libraryDialog.current?.close(); openActivity("watch"); }}><History /><strong>{fa ? "آخرین نمایش‌ها" : "Recently watched"}</strong><small>{fa ? "از همان‌جا ادامه بده" : "Pick up where you left off"}</small></button>
      </div>
      <p className="app-search-tip">{fa ? "با دکمهٔ وسط منو اتاق بساز و لینک دعوت را برای دوستانت بفرست." : "Use the center button to create a room and invite your friends."}</p>
    </dialog>
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
