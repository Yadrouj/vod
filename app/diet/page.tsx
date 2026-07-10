"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, PageHeader, Segmented, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import GeneratingOverlay from "@/components/GeneratingOverlay";
import { useLang } from "@/components/LangProvider";
import { downloadDietPdf } from "@/lib/pdf";
import { gateAiFeature } from "@/lib/hooks";
import {
  dietRegenerateStatus,
  getDietPlan,
  getDietProfile,
  markDietPlanGenerated,
  saveDietPlan,
} from "@/lib/db";
import {
  macroTargets,
  nutritionExtras,
  periWorkout,
  tdee,
  type DietProfile,
  type MacroTargets,
  type PeriMeal,
} from "@/lib/nutrition";
import {
  dayTotals,
  generatePlan,
  recommendSupplements,
  type DietPlan,
  type PlanMeal,
  type Supplement,
} from "@/lib/foods";

function newSeed() {
  return Math.floor(Date.now() % 2147483647);
}

function mealLabel(t: (k: string) => string, name: string): string {
  if (name.startsWith("Snack")) {
    const n = name.split(" ")[1];
    return t("meal.Snack") + (n ? ` ${n}` : "");
  }
  return t(`meal.${name}`);
}

function cooldownLabel(ms: number, lang: "fa" | "en", n: (v: string | number) => string): string {
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.ceil((ms % 86_400_000) / 3_600_000);
  if (days > 0) return lang === "fa" ? `${n(days)} روز و ${n(hours)} ساعت` : `${days}d ${hours}h`;
  return lang === "fa" ? `${n(Math.max(1, hours))} ساعت` : `${Math.max(1, hours)}h`;
}

export default function DietPage() {
  const { t, lang, n } = useLang();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "noprofile" | "generating" | "ready">("loading");
  const [profile, setProfile] = useState<DietProfile | null>(null);
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [pending, setPending] = useState<DietPlan | null>(null);
  const [view, setView] = useState<"day" | "week">("day");
  const [cooldown, setCooldown] = useState<{ remainingMs: number; nextAt: number | null }>({
    remainingMs: 0,
    nextAt: null,
  });

  useEffect(() => {
    (async () => {
      const p = await getDietProfile();
      if (!p) {
        setState("noprofile");
        return;
      }
      setProfile(p);
      const existing = await getDietPlan();
      if (existing) {
        setPlan(existing);
        const status = await dietRegenerateStatus();
        setCooldown({ remainingMs: status.remainingMs, nextAt: status.nextAt });
        setState("ready");
      } else {
        // First plan — show the "designing…" animation.
        const createdAt = Date.now();
        const pl = { ...generatePlan(p, macroTargets(p, p.bias), 7, newSeed()), createdAt };
        await saveDietPlan(pl);
        await markDietPlanGenerated(createdAt);
        const status = await dietRegenerateStatus();
        setCooldown({ remainingMs: status.remainingMs, nextAt: status.nextAt });
        setPending(pl);
        setState("generating");
      }
    })();
  }, []);

  async function regenerate() {
    if (!profile) return;
    const status = await dietRegenerateStatus();
    if (!status.allowed) {
      setCooldown({ remainingMs: status.remainingMs, nextAt: status.nextAt });
      return;
    }
    // Regenerating a plan counts toward the free AI-feature quota.
    if (!(await gateAiFeature((url) => router.push(url)))) return;
    const createdAt = Date.now();
    const pl = {
      ...generatePlan(profile, macroTargets(profile, profile.bias), 7, newSeed()),
      createdAt,
    };
    await saveDietPlan(pl);
    await markDietPlanGenerated(createdAt);
    const nextStatus = await dietRegenerateStatus();
    setCooldown({ remainingMs: nextStatus.remainingMs, nextAt: nextStatus.nextAt });
    setPending(pl);
    setState("generating");
  }

  function revealPlan() {
    if (pending) setPlan(pending);
    setPending(null);
    setState("ready");
  }

  function handlePdf() {
    if (!plan || !profile) return;
    const tg = macroTargets(profile, profile.bias);
    downloadDietPdf({
      lang,
      profile,
      targets: tg,
      plan,
      supplements: recommendSupplements(profile),
      extras: nutritionExtras(profile, tg),
      goalLabel: t(`dgoal.${profile.goal}`),
      mealName: (name) => mealLabel(t, name),
    });
  }

  if (state === "loading") return <Spinner />;

  if (state === "generating") {
    return (
      <GeneratingOverlay
        title={t("diet.designing")}
        icon="diet"
        steps={[t("diet.gen1"), t("diet.gen2"), t("diet.gen3"), t("diet.gen4")]}
        onDone={revealPlan}
      />
    );
  }

  if (state === "noprofile") {
    return (
      <div className="px-4 pt-6">
        <PageHeader title={t("diet.title")} />
        <div className="mt-6">
          <EmptyState
            icon={<Icon name="diet" className="size-10" />}
            title={t("diet.buildTitle")}
            hint={t("diet.buildHint")}
          >
            <Link href="/diet/setup" className="mt-2">
              <Button>
                {t("diet.getStarted")}
                <Icon name="chevronRight" className="size-4 flip-rtl" />
              </Button>
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  const targets = macroTargets(profile!, profile!.bias);
  const extras = nutritionExtras(profile!, targets);
  const maintenance = Math.round(tdee(profile!) / 10) * 10;
  const goalLabel = t(`dgoal.${profile!.goal}`);
  const days = view === "day" ? plan!.days.slice(0, 1) : plan!.days;
  const supplements = recommendSupplements(profile!);
  const peri = periWorkout(profile!);
  const isCooldown = cooldown.remainingMs > 0;

  return (
    <div className="px-4 pt-6">
      <PageHeader
        title={t("diet.title")}
        subtitle={t("diet.subtitle", { goal: goalLabel, n: maintenance })}
        right={
          <Link
            href="/diet/setup"
            className="flex size-10 items-center justify-center rounded-full bg-card text-muted ring-1 ring-line"
            aria-label={t("common.settings")}
          >
            <Icon name="settings" className="size-5" />
          </Link>
        }
      />

      <div className="mt-4 rounded-3xl bg-gradient-to-br from-brand to-brand2 p-5 text-brandink shadow-xl shadow-brand/20">
        <p className="text-sm font-bold opacity-70">{t("diet.dailyTarget")}</p>
        <p className="mt-1 text-4xl font-extrabold">
          {n(targets.kcal)}
          <span className="mx-1 text-lg font-bold opacity-70">{t("diet.kcal")}</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MacroPill label={t("diet.protein")} grams={targets.protein} />
          <MacroPill label={t("diet.carbs")} grams={targets.carbs} />
          <MacroPill label={t("diet.fat")} grams={targets.fat} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-5 text-xs font-bold opacity-80">
          <span>{t("diet.fiber", { n: extras.fiber })}</span>
          <span>{t("diet.water", { n: extras.waterL })}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handlePdf}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-card2 py-2.5 text-sm font-bold text-ink ring-1 ring-line transition-colors hover:bg-card3"
      >
        <Icon name="download" className="size-4 text-brand" /> {t("diet.downloadPdf")}
      </button>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "day", label: t("diet.oneDay") },
              { value: "week", label: t("diet.week") },
            ]}
          />
        </div>
        <Button variant="secondary" onClick={regenerate} disabled={isCooldown}>
          <Icon name="refresh" className="size-4" /> {t("diet.regenerate")}
        </Button>
      </div>
      {isCooldown && (
        <p className="mt-2 rounded-2xl bg-warn-dim px-3 py-2 text-xs font-bold text-warn ring-1 ring-warn/25">
          {lang === "fa"
            ? `برای تولید دوباره برنامه تغذیه باید ${cooldownLabel(cooldown.remainingMs, lang, n)} صبر کنی.`
            : `You can regenerate this nutrition plan again in ${cooldownLabel(cooldown.remainingMs, lang, n)}.`}
        </p>
      )}

      <div className="mt-5 space-y-5">
        {days.map((meals, dayIdx) => (
          <div key={dayIdx}>
            {view === "week" && (
              <h2 className="mb-2 text-sm font-extrabold text-brand">
                {t("diet.dayN", { n: dayIdx + 1 })}
              </h2>
            )}
            <div className="space-y-2">
              {meals.map((m, i) => (
                <MealCard key={i} meal={m} />
              ))}
            </div>
            <DayTotalRow totals={dayTotals(meals)} target={targets} />
          </div>
        ))}
      </div>

      <section className="mt-7">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Icon name="timer" className="size-5 text-brand" /> {t("peri.title")}
        </h2>
        <p className="mt-1 text-xs text-faint">{t("peri.subtitle")}</p>
        <div className="mt-3 grid gap-2">
          <PeriCard label={t("peri.pre")} icon="play" accent="brand" meal={peri.pre} />
          <PeriCard label={t("peri.post")} icon="flame" accent="orange" meal={peri.post} />
        </div>
        <div className="mt-2 flex items-start gap-2 rounded-2xl bg-sky-500/10 p-3 text-xs font-semibold text-sky-200 ring-1 ring-sky-500/20">
          <Icon name="diet" className="mt-0.5 size-4 flex-shrink-0 text-sky-300" />
          <span>
            <b>{t("peri.hydration")}:</b> {lang === "fa" ? peri.hydrationFa : peri.hydration}
          </span>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Icon name="pill" className="size-5 text-brand" /> {t("diet.suppTitle")}
        </h2>
        <p className="mt-1 text-xs text-faint">{t("diet.livePriceNote")}</p>
        <div className="mt-3 space-y-2">
          {supplements.map((s) => (
            <SupplementRow key={s.name} supp={s} />
          ))}
        </div>
        <p className="mt-3 px-1 text-xs text-faint">{t("diet.suppNote")}</p>
      </section>
    </div>
  );
}

function MacroPill({ label, grams }: { label: string; grams: number }) {
  const { n } = useLang();
  return (
    <div className="rounded-xl bg-brandink/10 p-2 text-center">
      <p className="text-lg font-extrabold">{n(grams)}g</p>
      <p className="text-[10px] font-bold opacity-70">{label}</p>
    </div>
  );
}

function MealCard({ meal }: { meal: PlanMeal }) {
  const { t, lang, n } = useLang();
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-ink">{mealLabel(t, meal.name)}</h3>
        <span className="text-sm font-bold text-brand">
          {n(meal.kcal)} {t("diet.kcal")}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {meal.items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="size-1.5 flex-shrink-0 rounded-full bg-brand/60" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {lang === "fa" ? it.nameFa : it.name}
              </p>
              <p className="text-xs text-faint">{it.label}</p>
            </div>
            <span className="text-xs font-semibold text-muted">
              {n(it.kcal)} {t("diet.kcal")}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 border-t border-line pt-2 text-xs font-semibold">
        <span className="text-protein" dir="ltr">P {n(meal.protein)}g</span>
        <span className="text-carbs" dir="ltr">C {n(meal.carbs)}g</span>
        <span className="text-fat" dir="ltr">F {n(meal.fat)}g</span>
      </div>
    </div>
  );
}

function DayTotalRow({ totals, target }: { totals: MacroTargets; target: MacroTargets }) {
  const { t, n } = useLang();
  const pct = Math.round((totals.kcal / target.kcal) * 100);
  // Verdict color: near-target reads success, under warns, over flags.
  const verdict =
    pct >= 90 && pct <= 110
      ? "text-success"
      : pct < 90
      ? "text-warn"
      : "text-danger";
  return (
    <div className="mt-2 flex items-center justify-between rounded-2xl bg-card2 px-4 py-3 ring-1 ring-line">
      <span className="text-sm font-bold text-ink">{t("diet.dayTotal")}</span>
      <div className="flex items-center gap-3 text-xs font-semibold">
        <span className="text-protein" dir="ltr">{n(totals.protein)}g P</span>
        <span className="text-muted tnum" dir="ltr">
          {n(totals.kcal)} / {n(target.kcal)}
        </span>
        <span className={`tnum font-bold ${verdict}`} dir="ltr">
          {n(pct)}%
        </span>
      </div>
    </div>
  );
}

function PeriCard({
  label,
  icon,
  accent,
  meal,
}: {
  label: string;
  icon: "play" | "flame";
  accent: "brand" | "orange";
  meal: PeriMeal;
}) {
  const { lang, n } = useLang();
  const tone =
    accent === "brand"
      ? "bg-brand/15 text-brand ring-brand/25"
      : "bg-orange-500/15 text-orange-300 ring-orange-500/25";
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${tone}`}>
          <Icon name={icon} className="size-3.5 flip-rtl" /> {label}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted">
          <Icon name="clock" className="size-3.5 text-faint" /> {lang === "fa" ? meal.whenFa : meal.when}
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-ink">{lang === "fa" ? meal.foodsFa : meal.foods}</p>
      <div className="mt-2 flex gap-2">
        <span className="rounded-full bg-carbs/15 px-2 py-0.5 text-[11px] font-bold text-carbs" dir="ltr">
          {n(meal.carbs)}g {lang === "fa" ? "کربو" : "carbs"}
        </span>
        <span className="rounded-full bg-protein/15 px-2 py-0.5 text-[11px] font-bold text-protein" dir="ltr">
          {n(meal.protein)}g {lang === "fa" ? "پروتئین" : "protein"}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">{lang === "fa" ? meal.tipFa : meal.tip}</p>
    </div>
  );
}

function SupplementRow({ supp }: { supp: Supplement }) {
  const { t, lang, n } = useLang();
  const [live, setLive] = useState<{ price: number; url: string } | null>(null);
  const loc = lang === "fa" ? "fa-IR" : "en-US";

  // Show the estimate immediately; upgrade to a live Torob price if reachable.
  useEffect(() => {
    let alive = true;
    fetch(`/api/torob?q=${encodeURIComponent(supp.query)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.found && d.price) setLive({ price: d.price, url: d.url });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [supp.query]);

  const name = lang === "fa" ? supp.nameFa : supp.name;
  const why = lang === "fa" ? supp.whyFa : supp.why;
  const timing = lang === "fa" ? supp.timingFa : supp.timing;
  const torobSearch = `https://torob.com/search/?query=${encodeURIComponent(supp.query)}`;

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-bold text-ink">
            {name}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ring-1 ${
                supp.tier === "A"
                  ? "bg-success-dim text-success ring-success/25"
                  : supp.tier === "B"
                  ? "bg-info-dim text-info ring-info/25"
                  : "bg-card2 text-faint ring-line"
              }`}
              title={lang === "fa" ? "سطح شواهد علمی" : "Evidence tier"}
            >
              {supp.tier}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-muted">{why}</p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand">
          {n(supp.dose)}
        </span>
      </div>

      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-card2 px-2 py-0.5 text-[11px] font-bold text-muted ring-1 ring-line">
        <Icon name="clock" className="size-3 text-brand" /> {timing}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
        {live ? (
          <a href={live.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand">
            <Icon name="store" className="size-4" />
            {t("diet.torobFrom", { p: live.price.toLocaleString(loc) })}
          </a>
        ) : (
          <span className="text-xs font-semibold text-faint">
            {t("diet.estPrice")}:{" "}
            <span className="text-muted" dir="ltr">
              {n(supp.priceFrom.toLocaleString(loc))}–{n(supp.priceTo.toLocaleString(loc))}
            </span>{" "}
            {t("diet.toman")}
          </span>
        )}
        <a href={torobSearch} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300">
          <Icon name="store" className="size-3.5" /> {t("diet.onTorob")}
        </a>
      </div>
    </div>
  );
}
