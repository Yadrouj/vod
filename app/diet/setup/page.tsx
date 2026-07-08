"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Segmented, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { clearDietPlan, saveDietProfile } from "@/lib/db";
import { useDietProfile, useSettings } from "@/lib/hooks";
import {
  ACTIVITY_OPTIONS,
  ALLERGEN_OPTIONS,
  DIET_PROFILE_ID,
  GOAL_OPTIONS,
  STYLE_OPTIONS,
  type ActivityLevel,
  type Allergen,
  type DietProfile,
  type DietStyle,
  type Goal,
  type Sex,
} from "@/lib/nutrition";

export default function DietSetupPage() {
  const router = useRouter();
  const { t } = useLang();
  const settings = useSettings();
  const existing = useDietProfile();

  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState(28);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(75);
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [style, setStyle] = useState<DietStyle>("omnivore");
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [meals, setMeals] = useState(4);
  const [saving, setSaving] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && (existing || settings)) {
    if (existing) {
      setSex(existing.sex);
      setAge(existing.age);
      setHeight(existing.heightCm);
      setWeight(existing.weightKg);
      setActivity(existing.activity);
      setGoal(existing.goal);
      setStyle(existing.style);
      setAllergens(existing.allergens);
      setMeals(existing.mealsPerDay);
    } else if (settings) {
      setSex(settings.gender);
    }
    setHydrated(true);
  }

  const toggleAllergen = (a: Allergen) =>
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  async function save() {
    setSaving(true);
    const profile: DietProfile = {
      id: DIET_PROFILE_ID,
      sex,
      age,
      heightCm: height,
      weightKg: weight,
      activity,
      goal,
      style,
      allergens,
      mealsPerDay: meals,
    };
    await saveDietProfile(profile);
    // Clear any old plan so /diet regenerates it fresh — with the "designing…" animation.
    await clearDietPlan();
    router.push("/diet");
  }

  return (
    <div className="px-4 pt-6">
      <Link href="/diet" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
        <Icon name="chevronLeft" className="size-4 flip-rtl" /> {t("nav.diet")}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-ink">{t("ds.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("ds.subtitle")}</p>

      <div className="mt-5 space-y-5">
        <Field label={t("ds.sex")}>
          <Segmented
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: `♂ ${t("common.male")}` },
              { value: "female", label: `♀ ${t("common.female")}` },
            ]}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <NumberField label={t("ds.age")} value={age} onChange={setAge} suffix={t("ds.yr")} min={12} max={100} />
          <NumberField label={t("ds.height")} value={height} onChange={setHeight} suffix={t("ds.cm")} min={120} max={230} />
          <NumberField label={t("ds.weight")} value={weight} onChange={setWeight} suffix={t("ds.kg")} min={30} max={250} />
        </div>

        <Field label={t("ds.activity")}>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map((a) => (
              <OptionCard
                key={a.value}
                active={activity === a.value}
                onClick={() => setActivity(a.value)}
                title={t(`act.${a.value}`)}
                hint={t(`act.${a.value}Hint`)}
              />
            ))}
          </div>
        </Field>

        <Field label={t("ds.goal")}>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={cn(
                  "rounded-2xl p-3 text-center ring-1 transition-colors",
                  goal === g.value ? "bg-brand text-brandink ring-brand" : "bg-card2 text-muted ring-line"
                )}
              >
                <p className="text-sm font-bold">{t(`dgoal.${g.value}`)}</p>
                <p className="mt-0.5 text-[10px] opacity-80">{t(`dgoal.${g.value}Hint`)}</p>
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("ds.dietStyle")}>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((s) => (
              <Chip2 key={s.value} active={style === s.value} onClick={() => setStyle(s.value)}>
                {t(`style.${s.value}`)}
              </Chip2>
            ))}
          </div>
        </Field>

        <Field label={t("ds.avoid")}>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_OPTIONS.map((a) => (
              <Chip2
                key={a.value}
                active={allergens.includes(a.value)}
                onClick={() => toggleAllergen(a.value)}
              >
                {t(`alg.${a.value}`)}
              </Chip2>
            ))}
          </div>
        </Field>

        <Field label={t("ds.mealsPerDay")}>
          <div className="flex gap-2">
            {[3, 4, 5, 6].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeals(m)}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-extrabold transition-colors",
                  meals === m ? "bg-brand text-brandink" : "bg-card2 text-muted ring-1 ring-line"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>

        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? t("ds.generating") : t("ds.generate")}
          {!saving && <Icon name="sparkles" className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-ink">{label}</label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-faint">{label}</label>
      <div className="flex items-center rounded-xl bg-card2 px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent py-2.5 text-lg font-bold text-ink outline-none"
        />
        <span className="text-xs font-semibold text-faint">{suffix}</span>
      </div>
    </div>
  );
}

function OptionCard({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-4 py-3 text-start ring-1 transition-colors",
        active ? "bg-brand/15 ring-brand" : "bg-card2 ring-line"
      )}
    >
      <div>
        <p className={cn("text-sm font-bold", active ? "text-brand" : "text-ink")}>{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full ring-2",
          active ? "bg-brand ring-brand" : "ring-line"
        )}
      >
        {active && <Icon name="check" className="size-3 text-brandink" />}
      </span>
    </button>
  );
}

function Chip2({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-bold transition-colors",
        active ? "bg-brand text-brandink" : "bg-card2 text-muted ring-1 ring-line"
      )}
    >
      {children}
    </button>
  );
}
