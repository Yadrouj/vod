"use client";

import { LogoMark } from "./Logo";
import { useLang } from "./LangProvider";

/** Branded first-load screen: the mark, the «رمق» name, and the slogan beneath it. */
export default function LoadingSplash() {
  const { t } = useLang();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="relative">
        <span className="absolute -inset-5 animate-pulse rounded-[2rem] bg-brand/25 blur-2xl" />
        <LogoMark className="relative size-20 drop-shadow-[0_0_24px_rgb(184_242_74/0.5)]" />
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-ink">{t("app.name")}</p>
      <p className="max-w-xs text-sm font-semibold text-muted">{t("app.slogan")}</p>
      <span className="mt-2 size-6 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
    </div>
  );
}
