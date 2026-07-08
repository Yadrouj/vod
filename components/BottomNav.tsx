"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";
import { Icon, type IconName } from "./icons";
import { useLang } from "./LangProvider";

// Four tabs max — Library lives inside Train/home quick links; History moved
// to the home header next to the profile icon.
const TABS: { href: string; key: string; icon: IconName }[] = [
  { href: "/", key: "nav.home", icon: "home" },
  { href: "/program", key: "nav.train", icon: "dumbbell" },
  { href: "/diet", key: "nav.diet", icon: "diet" },
  { href: "/gyms", key: "nav.gyms", icon: "pin" },
  { href: "/market", key: "nav.store", icon: "store" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();

  if (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/workout") ||
    pathname.startsWith("/vod")
  ) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md bg-base2/60 backdrop-blur-2xl pb-safe shadow-[0_-10px_30px_-12px_rgb(0_0_0/0.7)]">
      <ul className="flex">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors",
                  active ? "text-brand" : "text-faint"
                )}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />
                )}
                <Icon
                  name={tab.icon}
                  className={cn(
                    "size-5",
                    active && "drop-shadow-[0_0_6px_rgba(184,242,74,0.5)]"
                  )}
                />
                {t(tab.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
