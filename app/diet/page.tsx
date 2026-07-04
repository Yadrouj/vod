"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, PageHeader, Segmented, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { gateAction } from "@/lib/hooks";
import { getDietPlan, getDietProfile, saveDietPlan } from "@/lib/db";
import {
  GOAL_OPTIONS,
  macroTargets,
  nutritionExtras,
  tdee,
  type DietProfile,
  type MacroTargets,
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

export default function DietPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "noprofile" | "ready">("loading");
  const [profile, setProfile] = useState<DietProfile | null>(null);
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [view, setView] = useState<"day" | "week">("day");

  useEffect(() => {
    (async () => {
      const p = await getDietProfile();
      if (!p) {
        setState("noprofile");
        return;
      }
      setProfile(p);
      let pl = await getDietPlan();
      if (!pl) {
        pl = { ...generatePlan(p, macroTargets(p, p.bias), 7, newSeed()), createdAt: Date.now() };
        await saveDietPlan(pl);
      }
      setPlan(pl);
      setState("ready");
    })();
  }, []);

  async function regenerate() {
    if (!profile) return;
    // Regenerating a plan counts toward the free quota.
    if (!(await gateAction((url) => router.push(url)))) return;
    const pl = {
      ...generatePlan(profile, macroTargets(profile, profile.bias), 7, newSeed()),
      createdAt: Date.now(),
    };
    await saveDietPlan(pl);
    setPlan(pl);
  }

  if (state === "loading") return <Spinner />;

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
          {targets.kcal}
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

      <div className="mt-4 flex items-center gap-2">
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
        <Button variant="secondary" onClick={regenerate}>
          <Icon name="refresh" className="size-4" /> {t("diet.regenerate")}
        </Button>
      </div>

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
  return (
    <div className="rounded-xl bg-brandink/10 p-2 text-center">
      <p className="text-lg font-extrabold">{grams}g</p>
      <p className="text-[10px] font-bold opacity-70">{label}</p>
    </div>
  );
}

function MealCard({ meal }: { meal: PlanMeal }) {
  const { t, lang } = useLang();
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-ink">{mealLabel(t, meal.name)}</h3>
        <span className="text-sm font-bold text-brand">
          {meal.kcal} {t("diet.kcal")}
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
              {it.kcal} {t("diet.kcal")}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 border-t border-line pt-2 text-xs font-semibold">
        <span className="text-protein" dir="ltr">P {meal.protein}g</span>
        <span className="text-carbs" dir="ltr">C {meal.carbs}g</span>
        <span className="text-fat" dir="ltr">F {meal.fat}g</span>
      </div>
    </div>
  );
}

function DayTotalRow({ totals, target }: { totals: MacroTargets; target: MacroTargets }) {
  const { t } = useLang();
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
        <span className="text-protein" dir="ltr">{totals.protein}g P</span>
        <span className="text-muted tnum" dir="ltr">
          {totals.kcal} / {target.kcal}
        </span>
        <span className={`tnum font-bold ${verdict}`} dir="ltr">
          {pct}%
        </span>
      </div>
    </div>
  );
}

function SupplementRow({ supp }: { supp: Supplement }) {
  const { t, lang } = useLang();
  const [data, setData] = useState<
    { found: boolean; price?: number; url?: string } | null
  >(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/torob?q=${encodeURIComponent(supp.query)}`)
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ found: false }));
    return () => {
      alive = false;
    };
  }, [supp.query]);

  const name = lang === "fa" ? supp.nameFa : supp.name;
  const why = lang === "fa" ? supp.whyFa : supp.why;

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
                  : "bg-info-dim text-info ring-info/25"
              }`}
              title={lang === "fa" ? "سطح شواهد علمی" : "Evidence tier"}
            >
              {supp.tier}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-muted">{why}</p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand">
          {supp.dose}
        </span>
      </div>
      <div className="mt-3 border-t border-line pt-2">
        {data == null ? (
          <span className="inline-block h-4 w-24 animate-pulse rounded-full bg-card2" />
        ) : data.found && data.price ? (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand"
          >
            <Icon name="store" className="size-4" />
            {t("diet.torobFrom", {
              p: data.price.toLocaleString(lang === "fa" ? "fa-IR" : "en-US"),
            })}
            <Icon name="chevronRight" className="size-3.5 flip-rtl opacity-70" />
          </a>
        ) : (
          <span className="text-xs text-faint">{t("diet.priceNA")}</span>
        )}
      </div>
    </div>
  );
}
