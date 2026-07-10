"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Segmented, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import {
  clearDietPlan,
  DEFAULT_SETTINGS,
  getProgram,
  saveDietProfile,
  saveProgram,
  saveSettings,
} from "@/lib/db";
import { loadIndex } from "@/lib/exercises";
import { buildProgram, defaultSplit, TRAINING_GOALS } from "@/lib/programming";
import { useDietProfile, useSettings } from "@/lib/hooks";
import {
  ACTIVITY_OPTIONS,
  ALLERGEN_OPTIONS,
  DIET_PROFILE_ID,
  GOAL_OPTIONS,
  STYLE_OPTIONS,
  macroTargets,
  nutritionExtras,
  type ActivityLevel,
  type Allergen,
  type DietProfile,
  type DietStyle,
  type Goal,
} from "@/lib/nutrition";
import type { Gender, Level, TrainingGoal, ViewMode } from "@/lib/types";

type Step = 0 | 1 | 2;

const STEP_LABELS = ["پروفایل", "برنامه تمرین", "تغذیه"];

export default function OnboardingPage() {
  const router = useRouter();
  const { t, n } = useLang();
  const existingSettings = useSettings();
  const existingDiet = useDietProfile();

  const [step, setStep] = useState<Step>(0);
  const [gender, setGender] = useState<Gender>(existingSettings?.gender ?? DEFAULT_SETTINGS.gender);
  const [level, setLevel] = useState<Level>(existingSettings?.level ?? DEFAULT_SETTINGS.level);
  const [goal, setGoal] = useState<TrainingGoal>(existingSettings?.goal ?? DEFAULT_SETTINGS.goal);
  const [view, setView] = useState<ViewMode>(existingSettings?.view ?? DEFAULT_SETTINGS.view);
  const [days, setDays] = useState(4);
  const [age, setAge] = useState(existingDiet?.age ?? 28);
  const [height, setHeight] = useState(existingDiet?.heightCm ?? 175);
  const [weight, setWeight] = useState(existingDiet?.weightKg ?? 75);
  const [activity, setActivity] = useState<ActivityLevel>(existingDiet?.activity ?? "moderate");
  const [dietGoal, setDietGoal] = useState<Goal>(existingDiet?.goal ?? goalToDiet(goal));
  const [style, setStyle] = useState<DietStyle>(existingDiet?.style ?? "omnivore");
  const [allergens, setAllergens] = useState<Allergen[]>(existingDiet?.allergens ?? []);
  const [meals, setMeals] = useState(existingDiet?.mealsPerDay ?? 4);
  const [saving, setSaving] = useState(false);

  const split = defaultSplit(days, level);
  const profile: DietProfile = {
    id: DIET_PROFILE_ID,
    sex: gender,
    age,
    heightCm: height,
    weightKg: weight,
    activity,
    goal: dietGoal,
    style,
    allergens,
    mealsPerDay: meals,
  };
  const targets = macroTargets(profile);
  const extras = nutritionExtras(profile, targets);

  function next() {
    setStep((current) => Math.min(2, current + 1) as Step);
  }

  function prev() {
    setStep((current) => Math.max(0, current - 1) as Step);
  }

  function toggleAllergen(item: Allergen) {
    setAllergens((current) => current.includes(item) ? current.filter((x) => x !== item) : [...current, item]);
  }

  async function finish() {
    setSaving(true);
    await saveSettings({ gender, level, goal, view, onboarded: true });
    await saveDietProfile(profile);
    await clearDietPlan();
    const current = await getProgram();
    if (!current || current.daysPerWeek !== days) {
      const index = await loadIndex();
      await saveProgram(buildProgram(split, index, goal, level));
    }
    router.push("/diet?from=onboarding");
  }

  return (
    <div className="min-h-dvh px-5 pb-10 pt-10">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-brandink shadow-lg shadow-brand/30">
            <Icon name="dumbbell" className="size-8" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-ink">{t("app.name")}</p>
            <p className="text-xs text-muted">سه قدم تا برنامه تمرین و تغذیه شخصی</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-card p-4 ring-1 ring-line">
          <StepBar step={step} />

          {step === 0 && (
            <section className="mt-5 space-y-5">
              <Header title="۱. پروفایل پایه" text="اول خودت را معرفی کن تا کتابخانه تمرین، برنامه و تغذیه از حالت عمومی خارج شود." />
              <Field label={t("ob.who")}>
                <Segmented
                  value={gender}
                  onChange={setGender}
                  options={[
                    { value: "male", label: `♂ ${t("common.male")}` },
                    { value: "female", label: `♀ ${t("common.female")}` },
                  ]}
                />
              </Field>
              <Field label={t("ob.level")}>
                <Segmented
                  value={level}
                  onChange={setLevel}
                  options={[
                    { value: "beginner", label: t("ob.beginner") },
                    { value: "advanced", label: t("ob.advanced") },
                  ]}
                />
                <Hint>سطح فقط برای شروع است؛ برنامه بعدا با عملکردت تنظیم می‌شود.</Hint>
              </Field>
              <Field label={t("ob.goal")}>
                <Segmented
                  value={goal}
                  onChange={(value) => {
                    setGoal(value);
                    setDietGoal(goalToDiet(value));
                  }}
                  options={TRAINING_GOALS.map((item) => ({
                    value: item.value,
                    label: t(`goal.${item.value}`),
                  }))}
                />
              </Field>
              <Field label={t("ob.focus")}>
                <Segmented
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "strength", label: t("ob.muscles") },
                    { value: "mobility", label: t("ob.joints") },
                  ]}
                />
              </Field>
            </section>
          )}

          {step === 1 && (
            <section className="mt-5 space-y-5">
              <Header title="۲. برنامه تمرین پیشنهادی" text="رمق براساس سطح و هدف، تقسیم هفتگی را می‌سازد. تعداد روزها را انتخاب کن." />
              <Field label={t("ob.days")}>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDays(item)}
                      className={cn("h-11 rounded-xl text-sm font-black ring-1", days === item ? "bg-brand text-brandink ring-brand" : "bg-card2 text-muted ring-line")}
                    >
                      {n(item)}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="space-y-2">
                {split.map((day, index) => (
                  <div key={`${day.label}-${index}`} className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-ink">روز {n(index + 1)}</p>
                      <span className="rounded-full bg-brand/15 px-2 py-1 text-[10px] font-black text-brand">{day.focus.join(" + ")}</span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-muted">
                      شروع امن با حرکات اصلی، حجم قابل کنترل و پیشرفت آرام. بعد از ساخت برنامه، هر حرکت با ویدیو و عضلات هدف نمایش داده می‌شود.
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-brand/10 p-4 ring-1 ring-brand/20">
                <p className="text-sm font-black text-ink">پیشنهاد رمق</p>
                <p className="mt-2 text-xs leading-6 text-muted">
                  برای {t(`goal.${goal}`)} با سطح {level === "beginner" ? "مبتدی" : "پیشرفته"}، {n(days)} روز در هفته نقطه شروع خوبی است. اگر ریکاوری سخت شد، یک روز کم کن.
                </p>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="mt-5 space-y-5">
              <Header title="۳. تغذیه و کالری" text="حالا بدن و سبک غذا را مشخص کن تا کالری، ماکرو و وعده‌های پیشنهادی دقیق‌تر شوند." />
              <div className="grid grid-cols-3 gap-3">
                <NumberField label="سن" value={age} onChange={setAge} suffix="سال" min={12} max={100} />
                <NumberField label="قد" value={height} onChange={setHeight} suffix="cm" min={120} max={230} />
                <NumberField label="وزن" value={weight} onChange={setWeight} suffix="kg" min={30} max={250} />
              </div>
              <Field label="فعالیت روزانه">
                <div className="space-y-2">
                  {ACTIVITY_OPTIONS.map((item) => (
                    <OptionCard key={item.value} active={activity === item.value} onClick={() => setActivity(item.value)} title={activityFa(item.value)} hint={item.hint} />
                  ))}
                </div>
              </Field>
              <Field label="هدف تغذیه">
                <div className="grid grid-cols-3 gap-2">
                  {GOAL_OPTIONS.map((item) => (
                    <button key={item.value} type="button" onClick={() => setDietGoal(item.value)} className={cn("rounded-2xl p-3 text-center text-xs font-black ring-1", dietGoal === item.value ? "bg-brand text-brandink ring-brand" : "bg-card2 text-muted ring-line")}>
                      {dietGoalFa(item.value)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="سبک غذا">
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((item) => (
                    <Chip key={item.value} active={style === item.value} onClick={() => setStyle(item.value)}>{styleFa(item.value)}</Chip>
                  ))}
                </div>
              </Field>
              <Field label="حساسیت یا پرهیز">
                <div className="flex flex-wrap gap-2">
                  {ALLERGEN_OPTIONS.map((item) => (
                    <Chip key={item.value} active={allergens.includes(item.value)} onClick={() => toggleAllergen(item.value)}>{allergenFa(item.value)}</Chip>
                  ))}
                </div>
              </Field>
              <Field label="تعداد وعده">
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 5, 6].map((item) => (
                    <button key={item} type="button" onClick={() => setMeals(item)} className={cn("h-10 rounded-xl text-sm font-black ring-1", meals === item ? "bg-brand text-brandink ring-brand" : "bg-card2 text-muted ring-line")}>{n(item)}</button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="کالری هدف" value={`${targets.kcal}`} unit="kcal" />
                <Stat label="پروتئین" value={`${targets.protein}`} unit="g" />
                <Stat label="کربوهیدرات" value={`${targets.carbs}`} unit="g" />
                <Stat label="آب" value={`${extras.waterL}`} unit="L" />
              </div>
            </section>
          )}

          <div className="mt-6 flex gap-2">
            {step > 0 && <Button variant="secondary" className="flex-1" onClick={prev}>قبلی</Button>}
            {step < 2 ? (
              <Button className="flex-1" onClick={next}>
                ادامه
                <Icon name="chevronRight" className="size-4 flip-rtl" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={finish} disabled={saving}>
                {saving ? "در حال ساخت..." : "ساخت برنامه و تغذیه"}
                {!saving && <Icon name="sparkles" className="size-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepBar({ step }: { step: Step }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STEP_LABELS.map((label, index) => (
        <div key={label} className={cn("rounded-2xl p-3 ring-1", index <= step ? "bg-brand text-brandink ring-brand" : "bg-card2 text-muted ring-line")}>
          <p className="text-center text-xs font-black">{index + 1}. {label}</p>
        </div>
      ))}
    </div>
  );
}

function Header({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h1 className="text-xl font-black text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
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

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-faint">{children}</p>;
}

function NumberField({ label, value, onChange, suffix, min, max }: { label: string; value: number; onChange: (value: number) => void; suffix: string; min: number; max: number }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-faint">{label}</span>
      <span className="flex items-center rounded-xl bg-card2 px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
        <input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} className="w-full bg-transparent py-2.5 text-sm font-black text-ink outline-none" />
        <span className="text-[10px] font-bold text-faint">{suffix}</span>
      </span>
    </label>
  );
}

function OptionCard({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center justify-between rounded-xl px-4 py-3 text-start ring-1", active ? "bg-brand/15 ring-brand" : "bg-card2 ring-line")}>
      <div>
        <p className={cn("text-sm font-black", active ? "text-brand" : "text-ink")}>{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {active && <Icon name="check" className="size-4 text-brand" />}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full px-4 py-2 text-xs font-black", active ? "bg-brand text-brandink" : "bg-card2 text-muted ring-1 ring-line")}>
      {children}
    </button>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
      <p className="text-[10px] font-bold text-faint">{label}</p>
      <p className="mt-1 text-xl font-black text-ink" dir="ltr">{value}</p>
      <p className="text-[10px] font-black text-brand">{unit}</p>
    </div>
  );
}

function goalToDiet(goal: TrainingGoal): Goal {
  if (goal === "hypertrophy") return "gain";
  if (goal === "endurance") return "maintain";
  return "maintain";
}

function activityFa(value: ActivityLevel) {
  return {
    sedentary: "کم‌تحرک",
    light: "سبک",
    moderate: "متوسط",
    active: "فعال",
    athlete: "ورزشکار",
  }[value];
}

function dietGoalFa(value: Goal) {
  return { lose: "کاهش چربی", maintain: "حفظ وزن", gain: "عضله‌سازی" }[value];
}

function styleFa(value: DietStyle) {
  return { omnivore: "همه‌چیزخوار", halal: "حلال", vegetarian: "گیاه‌خواری", vegan: "وگان" }[value];
}

function allergenFa(value: Allergen) {
  return { dairy: "لبنیات", egg: "تخم‌مرغ", nuts: "مغزها", gluten: "گلوتن", fish: "ماهی" }[value];
}
