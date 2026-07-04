"use client";

// Horizontal news & announcements strip on the home screen: workout reminders
// (computed from local state) + app news. Dismissals persist in localStorage.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { useLang } from "./LangProvider";
import { cn } from "./ui";
import { buildNews, type NewsItem } from "@/lib/news";
import { useDietProfile, useProgram, useSessions } from "@/lib/hooks";

const LS_KEY = "ramagh-news-dismissed";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function NewsStrip() {
  const { lang } = useLang();
  const program = useProgram();
  const sessions = useSessions();
  const dietProfile = useDietProfile();
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  useEffect(() => setDismissed(readDismissed()), []);

  if (dismissed === null) return null;

  const items = buildNews(lang, program, sessions, dietProfile).filter(
    (n) => !dismissed.includes(n.id)
  );
  if (items.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1">
      {items.map((n) => (
        <NewsCard key={n.id} item={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  );
}

function NewsCard({ item, onDismiss }: { item: NewsItem; onDismiss: () => void }) {
  const isReminder = item.kind === "reminder";
  const inner = (
    <div
      className={cn(
        "relative w-64 flex-shrink-0 snap-start rounded-2xl p-3.5 ring-1 transition-colors",
        isReminder
          ? "bg-brand/10 ring-brand/30 hover:bg-brand/15"
          : "bg-card ring-line hover:bg-card2"
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-8 flex-shrink-0 items-center justify-center rounded-lg",
            isReminder ? "bg-brand/20 text-brand" : "bg-info-dim text-info"
          )}
        >
          <Icon name={item.icon} className="size-4" />
        </span>
        <div className="min-w-0 pe-5">
          <p className="truncate text-sm font-extrabold text-ink">{item.title}</p>
          {item.body && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
              {item.body}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="dismiss"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full text-faint hover:bg-card2 hover:text-ink"
      >
        <Icon name="x" className="size-3.5" />
      </button>
    </div>
  );

  return item.href ? <Link href={item.href}>{inner}</Link> : inner;
}
