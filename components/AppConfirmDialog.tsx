"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { Button, cn } from "./ui";
import { useLang } from "./LangProvider";

export default function AppConfirmDialog({
  open,
  tone = "warn",
  icon = "bell",
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  tone?: "info" | "success" | "warn" | "danger";
  icon?: IconName;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const { lang } = useLang();
  if (!open) return null;

  const toneClass = {
    info: "bg-sky-400/15 text-sky-200 ring-sky-400/25",
    success: "bg-success-dim text-success ring-success/25",
    warn: "bg-warn-dim text-warn ring-warn/25",
    danger: "bg-red-500/15 text-red-200 ring-red-400/25",
  }[tone];
  const confirmTone =
    tone === "danger"
      ? "bg-red-400 text-white hover:bg-red-300"
      : tone === "success"
      ? "bg-success text-base hover:bg-success/90"
      : "";

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 px-4 pb-4 pt-16 sm:items-center" dir={lang === "fa" ? "rtl" : "ltr"}>
      <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl shadow-black/60 ring-1 ring-line">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-11 flex-shrink-0 items-center justify-center rounded-2xl ring-1", toneClass)}>
            <Icon name={icon} className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-ink">{title}</p>
            {body && <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>}
            {children && <div className="mt-4">{children}</div>}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel} className="w-full" disabled={busy}>
            {cancelLabel ?? (lang === "fa" ? "نه، برگرد" : "Not now")}
          </Button>
          <Button onClick={onConfirm} className={cn("w-full", confirmTone)} disabled={busy}>
            {busy ? (lang === "fa" ? "در حال انجام..." : "Working...") : confirmLabel ?? (lang === "fa" ? "بله" : "Yes")}
          </Button>
        </div>
      </div>
    </div>
  );
}
