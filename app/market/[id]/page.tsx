"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { tFocus, tTag, tWeekday } from "@/lib/i18n";
import { useExercises } from "@/lib/exercises";
import { gateAction, useDietProfile, useSettings } from "@/lib/hooks";
import { saveDietPlan, saveDietProfile, saveProgram } from "@/lib/db";
import {
  applyGymPlan,
  dietProfileFromPlan,
  getPlan,
  trainerOf,
  type GymPlan,
  type MarketPlan,
} from "@/lib/marketplace";
import TrainerAvatar from "@/components/TrainerAvatar";
import { schemeFor } from "@/lib/programming";
import { macroTargets, nutritionExtras } from "@/lib/nutrition";
import { generatePlan, recommendSupplements } from "@/lib/foods";
import type { ExerciseIndex } from "@/lib/exercises";

function seedFromId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483647 || 1;
}

function mealName(t: (k: string) => string, name: string) {
  if (name.startsWith("Snack")) {
    const n = name.split(" ")[1];
    return t("meal.Snack") + (n ? ` ${n}` : "");
  }
  return t(`meal.${name}`);
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, lang } = useLang();
  const router = useRouter();
  const plan = getPlan(id);
  const { index } = useExercises();
  const existingDiet = useDietProfile();
  const settings = useSettings();
  const [applying, setApplying] = useState(false);

  if (!plan) {
    return (
      <div className="px-4 pt-6">
        <BackLink label={t("mkt.title")} />
        <p className="mt-8 text-center text-muted">{t("common.notFound")}</p>
      </div>
    );
  }

  const name = lang === "fa" ? plan.nameFa : plan.name;
  const desc = lang === "fa" ? plan.descFa : plan.desc;

  if (plan.kind === "gym") {
    const gymPlan = plan;
    async function apply() {
      if (!index) return;
      if (!confirm(t("mkt.replaceConfirm", { name }))) return;
      if (!(await gateAction((url) => router.push(url)))) return;
      setApplying(true);
      await saveProgram(applyGymPlan(gymPlan, index));
      router.push("/program");
    }
    return (
      <GymView plan={gymPlan} name={name} desc={desc} index={index} applying={applying} onApply={apply} />
    );
  }

  const dietPlan = plan;
  const sex = settings?.gender ?? "male";
  const profile = dietProfileFromPlan(dietPlan, existingDiet, sex);
  const targets = macroTargets(profile, dietPlan.bias);
  const extras = nutritionExtras(profile, targets);
  const sampleDay = generatePlan(profile, targets, 1, seedFromId(dietPlan.id)).days[0];
  const supps = recommendSupplements(profile).slice(0, 3);

  async function applyDiet() {
    if (!confirm(t("mkt.useDietConfirm", { name }))) return;
    if (!(await gateAction((url) => router.push(url)))) return;
    setApplying(true);
    await saveDietProfile(profile);
    await saveDietPlan({
      ...generatePlan(profile, targets, 7, seedFromId(dietPlan.id)),
      createdAt: Date.now(),
    });
    router.push("/diet");
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <BackLink label={t("mkt.title")} />
      <h1 className="mt-2 text-2xl font-extrabold text-ink">{name}</h1>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <Tags tags={dietPlan.tags} />
      <TrainerCard plan={dietPlan} />

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

      <p className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-muted">
        <span>{t("diet.style")}: {t(`style.${dietPlan.style}`)}</span>
        <span>{t("diet.goal")}: {t(`dgoal.${dietPlan.goal}`)}</span>
        <span>{t("diet.mealsPerDayN", { n: dietPlan.mealsPerDay })}</span>
      </p>

      <h2 className="mt-5 text-sm font-bold text-ink">{t("diet.sampleDay")}</h2>
      <div className="mt-2 space-y-2">
        {sampleDay.map((m, i) => (
          <div key={i} className="rounded-2xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">{mealName(t, m.name)}</h3>
              <span className="text-sm font-bold text-brand">{m.kcal} {t("diet.kcal")}</span>
            </div>
            <div className="mt-2 space-y-1">
              {m.items.map((it, j) => (
                <div key={j} className="flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {lang === "fa" ? it.nameFa : it.name}{" "}
                    <span className="text-faint">· {it.label}</span>
                  </span>
                  <span className="text-faint">{it.kcal}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-5 text-sm font-bold text-ink">{t("diet.suppTitle")}</h2>
      <div className="mt-2 space-y-2">
        {supps.map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-line">
            <span className="text-sm font-semibold text-ink">{lang === "fa" ? s.nameFa : s.name}</span>
            <span className="text-xs font-bold text-brand">{s.dose}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-faint">{t("mkt.statsNote")}</p>

      <Button className="mt-5 w-full" onClick={applyDiet} disabled={applying}>
        {applying ? t("mkt.applying") : t("mkt.use")}
      </Button>
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

function GymView({
  plan,
  name,
  desc,
  index,
  applying,
  onApply,
}: {
  plan: GymPlan;
  name: string;
  desc: string;
  index: ExerciseIndex | null;
  applying: boolean;
  onApply: () => void;
}) {
  const { t, lang } = useLang();
  const comp = schemeFor(plan.goal, "Compound");
  const iso = schemeFor(plan.goal, "Isolation");

  return (
    <div className="px-4 pb-24 pt-6">
      <BackLink label={t("mkt.title")} />
      <h1 className="mt-2 text-2xl font-extrabold text-ink">{name}</h1>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <Tags tags={plan.tags} />
      <TrainerCard plan={plan} />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label={t("mkt.goal")} value={t(`goal.${plan.goal}`)} />
        <Stat label={t("mkt.daysWk")} value={`${plan.days}`} />
        <Stat label={t("mkt.level")} value={t(`level.${plan.level}`)} />
      </div>

      <div className="mt-3 rounded-2xl bg-card p-4 text-sm text-muted ring-1 ring-line">
        {t("mkt.prescription", {
          cs: comp.sets,
          cr: comp.reps,
          crest: comp.restSec,
          is: iso.sets,
          ir: iso.reps,
          irest: iso.restSec,
        })}
      </div>

      <h2 className="mt-5 text-sm font-bold text-ink">{t("mkt.weekly")}</h2>
      {!index ? (
        <Spinner label={t("mkt.buildingPreview")} />
      ) : (
        <div className="mt-2 space-y-2">
          {applyGymPlan(plan, index).days.map((d, i) => (
            <div key={i} className="rounded-2xl bg-card p-4 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink">{tWeekday(lang, d.label)}</h3>
                <span className="text-xs font-bold text-brand">
                  {d.focus.map((f) => tFocus(lang, f)).join(" · ")}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {d.exercises.map((pe) => {
                  const ex = index.byId.get(pe.exerciseId);
                  return (
                    <li key={pe.exerciseId} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted" dir="ltr">
                        {ex?.name}
                      </span>
                      <span className="ms-2 flex-shrink-0 text-faint">
                        {pe.sets}×{pe.timed ? `${pe.reps}s` : pe.reps}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Button className="mt-5 w-full" onClick={onApply} disabled={applying || !index}>
        {applying ? t("mkt.applying") : t("mkt.use")}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3 text-center ring-1 ring-line">
      <p className="text-[10px] font-bold text-faint">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function TrainerCard({ plan }: { plan: MarketPlan }) {
  const { t, lang } = useLang();
  const trainer = trainerOf(plan);
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-line">
      <TrainerAvatar trainer={trainer} size="size-11 text-lg" />
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-ink">
          {t("mkt.by", { name: lang === "fa" ? trainer.nameFa : trainer.name })}
        </p>
        <p className="truncate text-xs text-muted">
          {lang === "fa" ? trainer.credFa : trainer.cred}
        </p>
      </div>
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  const { lang } = useLang();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-card2 px-2.5 py-0.5 text-[10px] font-bold text-faint ring-1 ring-line"
        >
          {tTag(lang, tag)}
        </span>
      ))}
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link href="/market" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
      <Icon name="chevronLeft" className="size-4 flip-rtl" /> {label}
    </Link>
  );
}
