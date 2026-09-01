"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const PENDING_CLASS = "is-route-pending";

export function NavigationFeedback() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const timeoutRef = useRef<number | null>(null);
  const finishNavigation = useCallback(() => {
    document.documentElement.classList.remove(PENDING_CLASS);
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
      timeoutRef.current = window.setTimeout(finishNavigation, 12_000);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${destination.pathname}${destination.search}`;
      if (current === next) return;
      startNavigation();
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", finishNavigation);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", finishNavigation);
      finishNavigation();
    };
  }, [finishNavigation]);

  return (
    <div className="route-progress" role="progressbar" aria-label="Loading page" aria-hidden="true">
      <span />
    </div>
  );
}
