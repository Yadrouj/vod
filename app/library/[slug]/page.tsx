"use client";

import Link from "next/link";
import { use, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import { DifficultyBadge } from "@/components/ExerciseCard";
import { Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { tEquip, tWeekday } from "@/lib/i18n";
import { useExercises } from "@/lib/exercises";
import { useProgram, useSettings } from "@/lib/hooks";
import { DEFAULT_SETTINGS, saveProgram } from "@/lib/db";
import { makeProgramExercise } from "@/lib/programming";
import type { Program, ProgramDay } from "@/lib/types";

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { t, lang } = useLang();
  const { index } = useExercises();
  const settings = useSettings() ?? DEFAULT_SETTINGS;
  const program = useProgram();
  const [flash, setFlash] = useState<string | null>(null);

  if (!index) return <Spinner />;

  const exercise = index.bySlug.get(slug);
  if (!exercise) {
    return (
      <div className="px-4 pt-6">
        <BackLink label={t("nav.library")} />
        <p className="mt-8 text-center text-muted">{t("common.notFound")}</p>
      </div>
    );
  }

  async function addToDay(day: ProgramDay) {
    if (!program) return;
    const next: Program = structuredClone(program);
    const target = next.days.find((d) => d.id === day.id);
    if (!target) return;
    const dayName = tWeekday(lang, day.label);
    if (target.exercises.some((e) => e.exerciseId === exercise!.id)) {
      setFlash(t("ex.alreadyIn", { day: dayName }));
      return;
    }
    target.exercises.push(
      makeProgramExercise(
        exercise!.id,
        exercise!.name,
        exercise!.mechanic,
        settings.goal,
        exercise!.primaryMuscles
      )
    );
    await saveProgram(next);
    setFlash(t("ex.addedTo", { day: dayName }));
  }

  return (
    <div className="px-4 pt-6">
      <BackLink label={t("nav.library")} />

      <h1 className="mt-2 text-xl font-extrabold text-ink">{exercise.name}</h1>
      <div className="mt-1 flex items-center gap-2">
        <DifficultyBadge difficulty={exercise.difficulty} />
        <span className="text-xs text-muted">{tEquip(lang, exercise.category)}</span>
      </div>

      <div className="mt-4">
        <VideoPlayer exercise={exercise} gender={settings.gender} angle={settings.angle} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Info label={t("ex.force")} value={exercise.force ?? "—"} />
        <Info label={t("ex.type")} value={exercise.mechanic ?? "—"} />
        <Info label={t("ex.grip")} value={exercise.grips[0] ?? "—"} />
      </div>

      <section className="mt-5">
        <h2 className="text-sm font-bold text-ink">{t("ex.musclesWorked")}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {exercise.primaryMuscles.map((m) => (
            <span
              key={m}
              className="rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand"
            >
              {m}
            </span>
          ))}
          {exercise.secondaryMuscles.map((m) => (
            <span
              key={m}
              className="rounded-full bg-card2 px-3 py-1 text-xs font-medium text-muted ring-1 ring-line"
            >
              {m}
            </span>
          ))}
        </div>
      </section>

      {exercise.steps.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold text-ink">{t("ex.howTo")}</h2>
          <ol className="mt-2 space-y-2">
            {exercise.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brandink">
                  {i + 1}
                </span>
                <span className="text-sm text-muted" dir="ltr">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-line">
        <h2 className="text-sm font-bold text-ink">{t("ex.addToDay")}</h2>
        {program && program.days.length > 0 ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {program.days.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => addToDay(d)}
                  className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-3.5 py-1.5 text-sm font-bold text-brand ring-1 ring-brand/25 hover:bg-brand/25"
                >
                  <Icon name="plus" className="size-4" /> {tWeekday(lang, d.label)}
                </button>
              ))}
            </div>
            {flash && <p className="mt-3 text-sm font-semibold text-brand">{flash}</p>}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {t("ex.noProgram")}{" "}
            <Link href="/program" className="font-bold text-brand">
              {t("ex.createFirst")}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3 text-center ring-1 ring-line">
      <p className="text-[10px] font-bold uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link href="/library" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
      <Icon name="chevronLeft" className="size-4 flip-rtl" /> {label}
    </Link>
  );
}
