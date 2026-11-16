"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Clapperboard, History, Home, Search } from "lucide-react";
import { nextTVFocus, type TVDirection } from "@/lib/tv-navigation";
import type { Locale } from "@/lib/i18n";

const focusSelector = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]';
function focusable(root: ParentNode) {
  return [...root.querySelectorAll<HTMLElement>(focusSelector)].filter(element => {
    if (element.closest('[inert],[hidden],[aria-hidden="true"]') || !element.getClientRects().length || getComputedStyle(element).visibility === "hidden") return false;
    const recovery = element.closest('[data-player-frame]')?.querySelector('[data-player-recovery]');
    return !recovery || recovery.contains(element);
  });
}

export function TVShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  const pathname = usePathname(), router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const watch = pathname.startsWith("/tv/watch/");
  const fa = locale === "fa";
  useEffect(() => {
    document.documentElement.dataset.tv = "true";
    return () => { delete document.documentElement.dataset.tv; };
  }, []);
  useEffect(() => {
    const shell = root.current;
    if (!shell) return;
    let saved = "";
    try { saved = sessionStorage.getItem(`tv-focus:${pathname}`) || ""; } catch { /* Storage is optional. */ }
    let focused = false;
    const place = (fallback = false) => {
      if (focused) return;
      const elements = focusable(shell);
      const target = elements.find(el => el.dataset.tvFocus === saved) ?? shell.querySelector<HTMLElement>('[data-tv-initial]') ?? (fallback ? elements[0] : null);
      if (target) { focused = true; target.focus({ preventScroll: true }); }
    };
    const observer = new MutationObserver(() => place());
    observer.observe(shell, { childList: true, subtree: true });
    const timer = setTimeout(() => place(true), 2000);
    place();
    const interacted = () => { focused = true; };
    shell.addEventListener("pointerdown", interacted); shell.addEventListener("keydown", interacted);
    const remember = (event: FocusEvent) => {
      const element = event.target as HTMLElement;
      if (element.dataset.tvFocus) try { sessionStorage.setItem(`tv-focus:${pathname}`, element.dataset.tvFocus); } catch { /* Optional. */ }
    };
    shell.addEventListener("focusin", remember);
    return () => { clearTimeout(timer); observer.disconnect(); shell.removeEventListener("focusin", remember); shell.removeEventListener("pointerdown", interacted); shell.removeEventListener("keydown", interacted); };
  }, [pathname]);
  useEffect(() => {
    const back = (event: Event) => {
      const dialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);
      if (dialog) { event.preventDefault(); dialog.dispatchEvent(new Event("cancel", { cancelable: true })); return; }
      if (document.fullscreenElement) { event.preventDefault(); void document.exitFullscreen().catch(() => {}); return; }
      if (pathname !== "/tv") {
        event.preventDefault();
        if (history.length > 1) router.back();
        else router.replace(pathname.startsWith("/tv/watch/") ? pathname.replace("/tv/watch/", "/tv/title/") : "/tv");
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Escape" || event.key === "BrowserBack" || event.key === "GoBack") { back(event); return; }
      const directions: TVDirection[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!directions.includes(event.key as TVDirection)) return;
      const current = document.activeElement as HTMLElement | null;
      const input = current instanceof HTMLInputElement;
      // Native text editing and range adjustment retain their familiar controls.
      if ((current instanceof HTMLSelectElement && (event.key === "ArrowUp" || event.key === "ArrowDown")) || current instanceof HTMLTextAreaElement || (input && (event.key === "ArrowLeft" || event.key === "ArrowRight"))) return;
      if (current?.matches("[data-player-frame]")) {
        event.preventDefault();
        current.dispatchEvent(new Event("sarvnema:tv-controls"));
        return;
      }
      const dialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);
      const scope = dialog ?? root.current;
      if (!scope) return;
      const candidates = focusable(scope).filter(el => el !== current);
      if (!current || !scope.contains(current)) { event.preventDefault(); candidates[0]?.focus(); return; }
      const index = nextTVFocus(current.getBoundingClientRect(), candidates.map(el => el.getBoundingClientRect()), event.key as TVDirection);
      event.preventDefault();
      if (index >= 0) {
        const next = candidates[index];
        next.focus({ preventScroll: true });
        next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      }
    };
    document.addEventListener("keydown", key, true);
    window.addEventListener("sarvnema:tv-back", back);
    return () => { document.removeEventListener("keydown", key, true); window.removeEventListener("sarvnema:tv-back", back); };
  }, [pathname, router]);
  return <div className={`tv-app ${watch ? "tv-app--watch" : ""}`} dir={fa ? "rtl" : "ltr"} ref={root}>
    {!watch && <aside className="tv-sidebar" aria-label={fa ? "منوی تلویزیون" : "TV navigation"}>
      <Link href="/tv" className="tv-brand" aria-label="SarvNema TV" data-tv-focus="brand"><img src="/brand/sarvnema-mark.svg" alt="" width="38" height="38" /><span>سرونما<small>TV EDITION</small></span></Link>
      <nav>
        {[
          { href: "/tv/search", label: fa ? "جستجو" : "Search", icon: <Search /> },
          { href: "/tv", label: fa ? "خانه" : "Home", icon: <Home /> },
          { href: "/tv#continue", label: fa ? "ادامهٔ تماشا" : "Continue", icon: <History /> },
        ].map(item => <Link key={item.href} href={item.href} data-tv-focus={`nav-${item.href}`} aria-current={pathname === item.href ? "page" : undefined}>{item.icon}<span>{item.label}</span></Link>)}
      </nav>
      <Link href="/apps" className="tv-exit" data-tv-focus="apps"><Clapperboard /><span>{fa ? "دربارهٔ برنامه" : "About the app"}</span></Link>
    </aside>}
    <main className="tv-main" id="tv-content">{children}</main>
  </div>;
}

export function TVBack({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="tv-button tv-button--ghost" data-tv-focus="back"><ArrowLeft />{children}</Link>;
}
