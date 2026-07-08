"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Segmented } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import {
  DEFAULT_SETTINGS,
  getProgram,
  saveProgram,
  saveSettings,
} from "@/lib/db";
import { loadIndex } from "@/lib/exercises";
import { buildProgram, defaultSplit, TRAINING_GOALS } from "@/lib/programming";
import { useSettings } from "@/lib/hooks";
import type { Gender, Level, TrainingGoal, ViewMode } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { t, n } = useLang();
  const existing = useSettings();

  const [gender, setGender] = useState<Gender>(DEFAULT_SETTINGS.gender);
  const [level, setLevel] = useState<Level>(DEFAULT_SETTINGS.level);
  const [goal, setGoal] = useState<TrainingGoal>(DEFAULT_SETTINGS.goal);
  const [view, setView] = useState<ViewMode>(DEFAULT_SETTINGS.view);
  const [days, setDays] = useState(4);
  const [saving, setSaving] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  if (existing && !hydrated) {
    setGender(existing.gender);
    setLevel(existing.level);
    setGoal(existing.goal ?? DEFAULT_SETTINGS.goal);
    setView(existing.view);
    setHydrated(true);
  }

  async function finish() {
    setSaving(true);
    await saveSettings({ gender, level, goal, view, onboarded: true });
    const current = await getProgram();
    if (!current) {
      const index = await loadIndex();
      const program = buildProgram(defaultSplit(days, level), index, goal, level);
      await saveProgram(program);
    }
    router.push("/program");
  }

  return (
    <div className="min-h-dvh px-6 pb-10 pt-14">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-brandink shadow-lg shadow-brand/30">
            <Icon name="dumbbell" className="size-8" />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-ink">{t("app.name")}</p>
            <p className="text-xs text-muted">{t("app.tagline")}</p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink">
          {t("ob.title")}
        </h1>
        <p className="mt-2 text-muted">{t("ob.subtitle")}</p>

        <div className="mt-6 space-y-6 rounded-3xl bg-card p-5 ring-1 ring-line">
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
            <Hint>{t("ob.levelHint")}</Hint>
          </Field>

          <Field label={t("ob.goal")}>
            <Segmented
              value={goal}
              onChange={setGoal}
              options={TRAINING_GOALS.map((g) => ({
                value: g.value,
                label: t(`goal.${g.value}`),
              }))}
            />
            <Hint>{t(`goal.${goal}Hint`)}</Hint>
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
            <Hint>{t("ob.focusHint")}</Hint>
          </Field>

          <Field label={t("ob.days")}>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold transition-colors ${
                    days === d
                      ? "bg-brand text-brandink"
                      : "bg-card2 text-muted ring-1 ring-line"
                  }`}
                >
                  {n(d)}
                </button>
              ))}
            </div>
          </Field>

          <Button className="w-full" onClick={finish} disabled={saving}>
            {saving ? t("ob.building") : t("ob.create")}
            {!saving && <Icon name="chevronRight" className="size-4 flip-rtl" />}
          </Button>
        </div>
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

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-faint">{children}</p>;
}
