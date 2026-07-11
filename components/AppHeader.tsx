"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { Logo } from "./Logo";
import NewsBell from "./NewsBell";
import { useLang } from "./LangProvider";

// Full-screen / focused flows get no chrome.
const HIDDEN = ["/onboarding", "/workout", "/login", "/admin"];

/**
 * Global glassmorphism top bar — brand logo + the three universal actions
 * (notifications, history, profile). Frosted glass with a soft top/bottom
 * shadow (no hairline divider), Apple-style.
 */
export default function AppHeader() {
  const pathname = usePathname();
  const { t } = useLang();
  if (HIDDEN.some((p) => pathname.startsWith(p))) return null;

  return (
    <header className="sticky top-0 z-50 mx-auto w-full max-w-md">
      <div className="flex items-center justify-between px-4 py-2.5 bg-base2/60 backdrop-blur-2xl shadow-[0_10px_30px_-12px_rgb(0_0_0/0.65)]">
        <Link href="/" aria-label="رمق" className="active:scale-95">
          <Logo markClass="size-8" />
        </Link>
        <div className="flex items-center gap-2">
          <NewsBell />
          <IconBtn href="/history" icon="history" label={t("nav.history")} />
          <IconBtn href="/profile" icon="user" label={t("prof.title")} />
        </div>
      </div>
    </header>
  );
}

function IconBtn({ href, icon, label }: { href: string; icon: "history" | "user"; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full bg-white/5 text-muted shadow-[0_2px_10px_-4px_rgb(0_0_0/0.5)] backdrop-blur-md transition-colors hover:text-ink"
    >
      <Icon name={icon} className="size-5" />
    </Link>
  );
}
