"use client";

// Floating "ask the coach" button — visible across the app, but NOT where it
// would get in the way: the workout player, the coach itself, onboarding,
// login, and the admin panel.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { useLang } from "./LangProvider";

const HIDDEN_PREFIXES = ["/workout", "/coach", "/onboarding", "/login", "/admin"];

export default function CoachFab() {
  const pathname = usePathname();
  const { t } = useLang();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.6rem] z-40 mx-auto flex max-w-md justify-start px-3">
      <Link
        href="/coach"
        aria-label={t("coach.title")}
        className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-brandink shadow-[0_10px_30px_-6px_rgb(184,242,74,0.55)] ring-1 ring-brand2 transition-transform hover:scale-105 active:scale-95"
      >
        <Icon name="sparkles" className="size-4" />
        <span className="text-xs font-extrabold">{t("coach.fab")}</span>
      </Link>
    </div>
  );
}
