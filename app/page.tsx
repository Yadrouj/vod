"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSplash from "@/components/LoadingSplash";
import { Icon, type IconName } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { tFocus, tWeekday } from "@/lib/i18n";
import { getSettings } from "@/lib/db";
import { loadIndex } from "@/lib/exercises";
import { useProgram, useSessions } from "@/lib/hooks";
import type { ProgramDay } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [now] = useState(() => Date.now());
  const program = useProgram();
  const sessions = useSessions();

  useEffect(() => {
    getSettings().then((s) => {
      if (!s || !s.onboarded) router.replace("/onboarding");
      else setStatus("ready");
    });
    // Warm the exercise dataset in the background so "Start workout" is instant.
    loadIndex().catch(() => {});
  }, [router]);

  if (status === "loading") return <LoadingSplash />;

  const todayEn = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayFa = new Date().toLocaleDateString("fa-IR", { weekday: "long" });
  const days = program?.days ?? [];
  const todayDay = days.find((d) => d.label === todayEn && d.exercises.length > 0);

  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = (sessions ?? []).filter((s) => s.startedAt >= weekAgo).length;
  const total = sessions?.length ?? 0;

  const focusText = (d: ProgramDay) =>
    d.focus.map((f) => tFocus(lang, f)).join(" + ");

  return (
    <div className="px-4 pb-36 pt-6">
      <div>
        <p className="text-sm font-medium text-muted">
          {lang === "fa" ? todayFa : todayEn}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {t("home.move")}
        </h1>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat value={thisWeek} label={t("home.thisWeek")} icon="flame" />
        <Stat value={total} label={t("home.allTime")} icon="trophy" />
      </div>

      {todayDay ? (
        <Link
          href={`/workout/${todayDay.id}`}
          className="sheen mt-4 block overflow-hidden rounded-3xl bg-gradient-to-br from-brand3 via-brand to-brand2 p-4 text-brandink shadow-[0_8px_28px_-8px_rgb(184_242_74/0.45)]"
        >
          <p className="text-sm font-bold opacity-70">
            {t("home.today", { day: todayFa })}
          </p>
          <p className="mt-1 text-xl font-extrabold">
            {focusText(todayDay) || t("nav.train")}
          </p>
          <p className="mt-1 text-sm font-medium opacity-80">
            {t("common.exercisesN", { n: todayDay.exercises.length })}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-brandink/15 px-3.5 py-1.5 text-xs font-bold">
            <Icon name="play" className="size-4 flip-rtl" /> {t("home.startWorkout")}
          </span>
        </Link>
      ) : (
        <div className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-line">
          <p className="font-bold text-ink">{t("home.noToday")}</p>
          <p className="mt-1 text-sm text-muted">{t("home.noTodayHint")}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <QuickLink href="/library" icon="library" label={t("home.qlLibrary")} />
        <QuickLink href="/coach" icon="whistle" label={t("home.qlCoach")} />
        <QuickLink href="/analysis" icon="user" label={t("home.qlAnalysis")} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">{t("home.yourWeek")}</h2>
        <Link href="/program" className="text-sm font-bold text-brand">
          {t("common.edit")}
        </Link>
      </div>

      {days.length === 0 ? (
        <Link
          href="/program"
          className="mt-3 block rounded-2xl border border-dashed border-line bg-card/40 p-6 text-center font-bold text-ink"
        >
          {t("home.buildProgram")}
        </Link>
      ) : (
        <div className="mt-3 space-y-2">
          {days.map((d) => (
            <DayRow
              key={d.id}
              day={d}
              today={d.label === todayEn}
              focusText={focusText(d)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: IconName;
}) {
  const { n } = useLang();
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-line">
      <div className="flex items-center gap-2 text-brand">
        <Icon name={icon} className="size-5" />
        <p className="text-xl font-extrabold text-ink">{n(value)}</p>
      </div>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: IconName;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl bg-card p-2 text-center ring-1 ring-line"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand/15 text-brand">
        <Icon name={icon} className="size-5" />
      </span>
      <span className="text-[11px] font-bold text-ink">{label}</span>
    </Link>
  );
}

function DayRow({
  day,
  today,
  focusText,
}: {
  day: ProgramDay;
  today: boolean;
  focusText: string;
}) {
  const { t, lang } = useLang();
  const empty = day.exercises.length === 0;
  const href = empty ? `/program/${day.id}` : `/workout/${day.id}`;
  const dayLabel = tWeekday(lang, day.label);
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl bg-card p-3 ring-1 ring-line"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          {dayLabel}
          {today && (
            <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold text-brand">
              {t("home.todayBadge")}
            </span>
          )}
        </p>
        <p className="truncate text-sm text-muted">
          {focusText || t("home.rest")} ·{" "}
          {t("common.exercisesN", { n: day.exercises.length })}
        </p>
      </div>
      <span className="ms-3 flex-shrink-0 text-sm font-bold text-brand">
        {empty ? t("common.plan") : t("common.start")}
      </span>
    </Link>
  );
}
