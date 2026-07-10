"use client";

import { LogoMark } from "./Logo";
import { useLang } from "./LangProvider";

export default function LoadingSplash() {
  const { t } = useLang();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="relative">
        <span className="absolute -inset-6 animate-pulse rounded-[2rem] bg-brand/25 blur-2xl" />
        <LogoMark className="relative size-24 drop-shadow-[0_0_30px_rgb(184_242_74/0.45)]" />
      </div>
      <p className="text-3xl font-black tracking-tight text-ink">{t("app.name")}</p>
      <p className="max-w-xs text-sm font-semibold text-muted">{t("app.slogan")}</p>
      <span className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-card2 ring-1 ring-line">
        <span className="block h-full w-1/2 animate-[ramagh-load_1.1s_ease-in-out_infinite] rounded-full bg-brand shadow-[0_0_18px_rgb(184_242_74/0.55)]" />
      </span>
    </div>
  );
}
