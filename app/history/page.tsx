"use client";

import { EmptyState, PageHeader, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { tWeekday } from "@/lib/i18n";
import { db } from "@/lib/db";
import { useSessions } from "@/lib/hooks";
import type { Session } from "@/lib/types";

export default function HistoryPage() {
  const { t, lang } = useLang();
  const sessions = useSessions();

  if (sessions === undefined) return <Spinner />;

  const locale = lang === "fa" ? "fa-IR" : "en-US";
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const duration = (s: Session) =>
    t("hist.minN", { n: Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000)) });

  return (
    <div className="px-4 pt-6">
      <PageHeader title={t("hist.title")} subtitle={t("hist.subtitle")} />

      {sessions.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Icon name="history" className="size-9" />}
            title={t("hist.empty")}
            hint={t("hist.emptyHint")}
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {sessions.map((s) => {
            const totalSets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
            return (
              <div key={s.id} className="rounded-2xl bg-card p-4 ring-1 ring-line">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-ink">{tWeekday(lang, s.dayLabel)}</p>
                    <p className="text-xs text-muted">
                      {formatDate(s.startedAt)} · {duration(s)} ·{" "}
                      {t("hist.setsN", { n: totalSets })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => s.id != null && db.sessions.delete(s.id)}
                    className="text-faint hover:text-rose-300"
                    aria-label={t("common.remove")}
                  >
                    <Icon name="x" className="size-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-1">
                  {s.exercises.map((e) => (
                    <div key={e.exerciseId} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted" dir="ltr">
                        {e.name}
                      </span>
                      <span className="ms-2 flex-shrink-0 text-faint">
                        {e.sets.length} ×{" "}
                        {e.sets[0]?.durationSec != null
                          ? `${e.sets[0].durationSec}s`
                          : `${e.sets[0]?.reps ?? 0}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
