"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useId, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import styles from "./responsive-dialog.module.css";

const mobileQuery = "(max-width: 760px), (pointer: coarse) and (max-height: 600px)";
const subscribe = (listener: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
export function useMobilePlayer() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(mobileQuery).matches, () => false);
}

let locks = 0;
let originalOverflow = "";
function lockPage() {
  if (locks++ === 0) { originalOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
  document.documentElement.dataset.mediaDialogOpen = "true";
  return () => {
    if (--locks === 0) { document.body.style.overflow = originalOverflow; delete document.documentElement.dataset.mediaDialogOpen; }
  };
}

type Props = {
  open: boolean; onClose: () => void; title: string; description?: string;
  children: ReactNode; footer?: ReactNode; mobileOnly?: boolean;
  theme?: "cinema" | "music"; closeLabel?: string; dir?: "rtl" | "ltr";
};

/** Only panels move into the top layer. The media engine never changes parents. */
export function ResponsiveDialog(props: Props) {
  const mobile = useMobilePlayer();
  if (!props.open) return null;
  if (props.mobileOnly && !mobile) return <>{props.children}</>;
  return <DialogSurface {...props} />;
}

function DialogSurface({ onClose, title, description, children, footer, theme = "cinema", closeLabel = "بستن", dir = "rtl" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  const id = useId();
  useLayoutEffect(() => { close.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockPage();
    const viewport = window.visualViewport;
    const place = () => {
      dialog.style.setProperty("--panel-height", `${viewport?.height ?? innerHeight}px`);
      dialog.style.setProperty("--panel-width", `${viewport?.width ?? innerWidth}px`);
      dialog.style.setProperty("--panel-top", `${viewport?.offsetTop ?? 0}px`);
      dialog.style.setProperty("--panel-left", `${viewport?.offsetLeft ?? 0}px`);
    };
    place();
    dialog.showModal();
    // A close event is queued. Strict Mode can reopen the same element before
    // that old event arrives; it must not dismiss the newly opened panel.
    const closed = () => { if (!dialog.open) close.current(); };
    dialog.addEventListener("close", closed);
    viewport?.addEventListener("resize", place);
    viewport?.addEventListener("scroll", place);
    window.addEventListener("resize", place);
    return () => {
      dialog.removeEventListener("close", closed);
      viewport?.removeEventListener("resize", place);
      viewport?.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      dialog.close();
      unlock();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(<dialog ref={ref} className={styles.dialog} data-responsive-dialog data-player-ui="true" data-media-theme={theme}
    dir={dir} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    onKeyDown={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}
    onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <header className={styles.header}>
      <div><h2 id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div>
      <button autoFocus type="button" onClick={onClose} aria-label={closeLabel}><X size={22} /></button>
    </header>
    <div className={styles.content}>{children}</div>
    {footer && <footer className={styles.footer}>{footer}</footer>}
  </dialog>, document.body);
}
