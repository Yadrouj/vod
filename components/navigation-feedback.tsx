"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PENDING_CLASS = "is-route-pending";

export function NavigationFeedback() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams().toString();
  const timeoutRef = useRef<number | null>(null);
  const clicked = useRef<HTMLAnchorElement | null>(null);
  const status = useRef<HTMLDivElement>(null);
  const finishNavigation = useCallback(() => {
    document.documentElement.classList.remove(PENDING_CLASS);
    clicked.current?.removeAttribute("data-route-pending");
    clicked.current = null;
    if (status.current) status.current.textContent = "";
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    finishNavigation();
  }, [finishNavigation, pathname, search]);

  useEffect(() => {
    function startNavigation() {
      document.documentElement.classList.add(PENDING_CLASS);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (status.current) status.current.textContent = document.documentElement.lang === "fa" ? "در حال باز کردن صفحه…" : "Opening page…";
      timeoutRef.current = window.setTimeout(() => {
        if (status.current) status.current.textContent = document.documentElement.lang === "fa" ? "دریافت صفحه طول کشیده؛ اتصال اینترنت را بررسی کنید." : "Still loading. Please check your connection.";
      }, 15_000);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download") || anchor.hasAttribute("data-no-navigation")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${destination.pathname}${destination.search}`;
      if (current === next) return;
      if (destination.pathname.startsWith("/api/") || /\.(mp4|mp3|mkv|zip|srt|vtt)$/i.test(destination.pathname)) return;
      clicked.current?.removeAttribute("data-route-pending");
      clicked.current = anchor;
      anchor.setAttribute("data-route-pending", "true");
      startNavigation();
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!event.defaultPrevented && form instanceof HTMLFormElement && form.method.toLowerCase() === "get"
        && new URL(form.action).origin === location.origin) startNavigation();
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    // Cached Back/Forward can commit synchronously before this listener runs.
    // Do not start a spinner after that commit; route loading handles slow Back.
    window.addEventListener("popstate", finishNavigation);
    window.addEventListener("sarvnema:navigation-error", finishNavigation);
    window.addEventListener("pageshow", finishNavigation);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("popstate", finishNavigation);
      window.removeEventListener("sarvnema:navigation-error", finishNavigation);
      window.removeEventListener("pageshow", finishNavigation);
      finishNavigation();
    };
  }, [finishNavigation]);

  useEffect(() => {
    // Intent-only prefetch: no catalog-wide fan-out, no downloads or room APIs.
    const seen = new Map<string, number>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = 0;
    const intent = (event: Event) => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      if (!navigator.onLine || connection?.saveData || /2g/.test(connection?.effectiveType ?? "")) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || anchor.target === "_blank") return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin || !/^\/(?:tt\d+|browse|music(?:\/[^?#]*)?|watch\/tt\d+)$/.test(url.pathname)) return;
      const href = url.pathname + url.search;
      if (href === location.pathname + location.search || Date.now() - (seen.get(href) ?? 0) < 30_000) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Date.now() - last < 600) return;
        last = Date.now();
        seen.set(href, last);
        if (seen.size > 40) seen.delete(seen.keys().next().value!);
        router.prefetch(href);
      }, 100);
    };
    const cancel = () => clearTimeout(timer);
    document.addEventListener("pointerover", intent);
    document.addEventListener("focusin", intent);
    document.addEventListener("pointerout", cancel);
    return () => { cancel(); document.removeEventListener("pointerover", intent); document.removeEventListener("focusin", intent); document.removeEventListener("pointerout", cancel); };
  }, [router]);

  return (
    <><div className="route-progress" aria-hidden="true">
      <span />
    </div><div ref={status} className="route-status" role="status" aria-live="polite" /></>
  );
}
