"use client";

import { EmptyState, PageHeader, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { tWeekday } from "@/lib/i18n";
import { db } from "@/lib/db";
import { useSessions } from "@/lib/hooks";
import { computePRs } from "@/lib/records";
import type { Session } from "@/lib/types";

export default function HistoryPage() {
  const { t, lang, n } = useLang();
  const sessions = useSessions();

  if (sessions === undefined) return <Spinner />;

  const prs = computePRs(sessions).slice(0, 6);

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

      {prs.length > 0 && (
        <section className="mt-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Icon name="trophy" className="size-5 text-amber-400" /> {t("pr.title")}
          </h2>
          <p className="mt-1 text-xs text-faint">{t("pr.subtitle")}</p>
          <div className="mt-3 space-y-2">
            {prs.map((pr, i) => (
              <div key={pr.name} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-line">
                <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-sm font-extrabold text-amber-300">
                  {n(i + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink" dir="ltr">{pr.name}</p>
                  <p className="text-xs text-muted" dir="ltr">
                    {n(pr.weight)}kg × {n(pr.reps)}
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-extrabold text-brand" dir="ltr" title={t("pr.est1RM")}>
                  {n(pr.est1RM)}kg <span className="text-[10px] font-bold opacity-70">1RM</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

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
                        {n(e.sets.length)} ×{" "}
                        {e.sets[0]?.durationSec != null
                          ? `${n(e.sets[0].durationSec)}s`
                          : n(e.sets[0]?.reps ?? 0)}
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
