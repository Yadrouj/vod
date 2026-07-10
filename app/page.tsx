"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSplash from "@/components/LoadingSplash";
import NewsStrip from "@/components/NewsStrip";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/components/ui";
import { useLang } from "@/components/LangProvider";
import { tFocus, tWeekday } from "@/lib/i18n";
import { getSettings } from "@/lib/db";
import { loadIndex } from "@/lib/exercises";
import { useProgram, useSessions, useSettings, useSubscription } from "@/lib/hooks";
import { hoursLeftInDay, workoutNudge } from "@/lib/personalization";
import type { ProgramDay } from "@/lib/types";

interface LatestMagArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  image: string;
  imageAlt?: string;
}

export default function HomePage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [now] = useState(() => Date.now());
  const [todayDate] = useState(() => new Date());
  const program = useProgram();
  const sessions = useSessions();
  const settings = useSettings();
  const subscription = useSubscription();
  const [latestMag, setLatestMag] = useState<LatestMagArticle[]>([]);

  useEffect(() => {
    getSettings().then((s) => {
      if (!s || !s.onboarded) router.replace("/onboarding");
      else setStatus("ready");
    });
    // Warm the exercise dataset in the background so "Start workout" is instant.
    loadIndex().catch(() => {});
  }, [router]);

  useEffect(() => {
    let alive = true;
    fetch("/api/mag/latest", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { articles: [] }))
      .then((data: { articles?: LatestMagArticle[] }) => {
        if (alive) setLatestMag((data.articles ?? []).slice(0, 5));
      })
      .catch(() => {
        if (alive) setLatestMag([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (status === "loading") return <LoadingSplash />;

  const todayEn = todayDate.toLocaleDateString("en-US", { weekday: "long" });
  const todayFa = todayDate.toLocaleDateString("fa-IR", { weekday: "long" });
  const days = program?.days ?? [];
  const todayDay = days.find((d) => d.label === todayEn && d.exercises.length > 0);

  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = (sessions ?? []).filter((s) => s.startedAt >= weekAgo).length;
  const total = sessions?.length ?? 0;
  const vipActive =
    subscription?.status === "vip" &&
    typeof subscription.vipUntil === "number" &&
    subscription.vipUntil > now;

  const focusText = (d: ProgramDay) =>
    d.focus.map((f) => tFocus(lang, f)).join(" + ");
  const coachNote = settings
    ? workoutNudge({
        lang,
        gender: settings.gender,
        level: settings.level,
        goal: settings.goal,
        hoursLeft: hoursLeftInDay(todayDate),
        isFriday: todayDate.getDay() === 5,
      })
    : null;

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

      <NewsStrip />

      {latestMag.length > 0 && <LatestMagStrip articles={latestMag} />}

      {coachNote && (
        <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-brand/25">
          <div className="flex items-start gap-3">
            <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
              <Icon name="sparkles" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-ink">{coachNote.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{coachNote.body}</p>
            </div>
          </div>
        </div>
      )}

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

      <div className="mt-4 grid grid-cols-4 gap-2">
        <QuickLink href="/library" icon="library" label={t("home.qlLibrary")} />
        <QuickLink href="/coach" icon="whistle" label={t("home.qlCoach")} />
        <QuickLink href="/club" icon="trophy" label={lang === "fa" ? "باشگاه" : "Club"} />
        <QuickLink
          href={vipActive ? "/analysis" : "/upgrade?feature=analysis"}
          icon={vipActive ? "user" : "lock"}
          label={t("home.qlAnalysis")}
          locked={!vipActive}
        />
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

function LatestMagStrip({ articles }: { articles: LatestMagArticle[] }) {
  const { lang } = useLang();
  const viewAll = lang === "fa" ? "مشاهده همه" : "View all";
  const title = lang === "fa" ? "آخرین خبرها و مقاله‌ها" : "Latest news and articles";
  const magazine = lang === "fa" ? "مجله" : "Magazine";

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black text-brand">{magazine}</p>
          <h2 className="text-base font-extrabold text-ink">{title}</h2>
        </div>
        <Link href="/mag" className="flex-shrink-0 rounded-full bg-brand/15 px-3 py-1.5 text-xs font-black text-brand ring-1 ring-brand/25">
          {viewAll}
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {articles.slice(0, 5).map((article) => (
          <Link
            key={article.id}
            href={`/mag/${article.slug}`}
            className="group flex h-72 w-[78vw] max-w-80 flex-shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-line transition-colors hover:bg-card2 sm:w-72"
          >
            <div className="relative h-36 flex-shrink-0 overflow-hidden">
              <img
                src={article.image}
                alt={article.imageAlt || article.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-[10px] font-bold text-white">
                <span className="max-w-32 truncate rounded-full bg-brand px-2 py-1 text-brandink">
                  {article.category}
                </span>
                <time className="flex-shrink-0" dateTime={article.publishedAt}>
                  {new Date(article.publishedAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US")}
                </time>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-3.5">
              <p className="line-clamp-3 text-sm font-extrabold leading-6 text-ink">
                {article.title}
              </p>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">{article.excerpt}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-black text-brand">
                {lang === "fa" ? "خواندن مقاله" : "Read article"}
                <Icon name="chevronLeft" className="size-3.5 flip-rtl" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function QuickLink({
  href,
  icon,
  label,
  locked,
}: {
  href: string;
  icon: IconName;
  label: string;
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl bg-card p-2 text-center ring-1 ring-line",
        locked && "opacity-55 grayscale"
      )}
    >
      <span className={cn("flex size-9 items-center justify-center rounded-xl", locked ? "bg-card2 text-faint" : "bg-brand/15 text-brand")}>
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
