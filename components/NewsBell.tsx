"use client";

// Notification bell in the home header: workout reminders (computed from
// local state) + app news, in a dropdown panel. Read ids persist in
// localStorage — an unread lime dot shows until the panel is opened.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { useLang } from "./LangProvider";
import { cn } from "./ui";
import { buildNews, type NewsItem } from "@/lib/news";
import { useDietProfile, useProgram, useSessions } from "@/lib/hooks";

const LS_KEY = "ramagh-news-read";

function readReadIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function NewsBell() {
  const { t, lang } = useLang();
  const program = useProgram();
  const sessions = useSessions();
  const dietProfile = useDietProfile();
  const [read, setRead] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setRead(readReadIds()), []);

  const items = buildNews(lang, program, sessions, dietProfile);
  const hasUnread =
    read !== null && items.some((n) => !read.includes(n.id));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // Opening marks everything currently listed as read.
      const merged = Array.from(
        new Set([...(read ?? []), ...items.map((n) => n.id)])
      );
      setRead(merged);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={t("news.title")}
        aria-expanded={open}
        className="flex size-10 items-center justify-center rounded-full bg-card text-muted ring-1 ring-line"
      >
        <Icon name="bell" className="size-5" />
        {hasUnread && (
          <span className="absolute end-2 top-2 size-2 rounded-full bg-brand shadow-[0_0_6px_rgb(184_242_74/0.8)]" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute end-0 start-auto top-full z-50 mt-2 max-h-96 w-80 max-w-[85vw] overflow-y-auto rounded-2xl bg-card2 shadow-xl ring-1 ring-line2">
            <p className="border-b border-line/70 px-3.5 py-2.5 text-[13px] font-extrabold text-ink">
              {t("news.title")}
            </p>
            {items.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-xs text-muted">
                {t("news.empty")}
              </p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id} className="border-b border-line/40 last:border-b-0">
                    <BellRow item={n} onNavigate={() => setOpen(false)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BellRow({
  item,
  onNavigate,
}: {
  item: NewsItem;
  onNavigate: () => void;
}) {
  const isReminder = item.kind === "reminder";
  const inner = (
    <div className="flex items-start gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-card3/60">
      <span
        className={cn(
          "flex size-8 flex-shrink-0 items-center justify-center rounded-lg",
          isReminder ? "bg-brand/20 text-brand" : "bg-info-dim text-info"
        )}
      >
        <Icon name={item.icon} className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-ink">{item.title}</p>
        {item.body && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.body}</p>
        )}
      </div>
    </div>
  );

  return item.href ? (
    <Link href={item.href} onClick={onNavigate} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
