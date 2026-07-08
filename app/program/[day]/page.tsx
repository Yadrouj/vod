"use client";

import Link from "next/link";
import { use, useState } from "react";
import ExerciseBrowser from "@/components/ExerciseBrowser";
import { Thumb } from "@/components/ExerciseCard";
import { Button, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { tFocus, tWeekday } from "@/lib/i18n";
import { DEFAULT_SETTINGS, saveProgram } from "@/lib/db";
import { makeProgramExercise } from "@/lib/programming";
import { useExercises } from "@/lib/exercises";
import { useProgram, useSettings } from "@/lib/hooks";
import type { Exercise, Program, ProgramExercise } from "@/lib/types";

export default function DayEditorPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day: dayId } = use(params);
  const { t, lang } = useLang();
  const program = useProgram();
  const settings = useSettings() ?? DEFAULT_SETTINGS;
  const { index } = useExercises();
  const [picking, setPicking] = useState(false);

  if (program === undefined || !index) return <Spinner />;

  const day = program?.days.find((d) => d.id === dayId);
  if (!day) {
    return (
      <div className="px-4 pt-6">
        <Link href="/program" className="text-sm text-brand">
          {t("nav.train")}
        </Link>
        <p className="mt-8 text-center text-muted">{t("common.notFound")}</p>
      </div>
    );
  }

  async function update(mutate: (p: Program) => void) {
    const next: Program = structuredClone(program!);
    mutate(next);
    await saveProgram(next);
  }

  const withDay = (fn: (list: ProgramExercise[]) => void) =>
    update((p) => {
      const d = p.days.find((x) => x.id === dayId);
      if (d) fn(d.exercises);
    });

  const togglePick = (ex: Exercise) =>
    withDay((list) => {
      const i = list.findIndex((e) => e.exerciseId === ex.id);
      if (i >= 0) list.splice(i, 1);
      else
        list.push(
          makeProgramExercise(ex.id, ex.name, ex.mechanic, settings.goal, ex.primaryMuscles)
        );
    });

  const addedIds = new Set(day.exercises.map((e) => e.exerciseId));

  return (
    <div className="px-4 pt-6">
      <Link href="/program" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
        <Icon name="chevronLeft" className="size-4 flip-rtl" /> {t("nav.train")}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{tWeekday(lang, day.label)}</h1>
          <p className="text-sm text-muted">
            {day.focus.map((f) => tFocus(lang, f)).join(" + ") || t("prog.noFocus")}
          </p>
        </div>
        {day.exercises.length > 0 && !picking && (
          <Link
            href={`/workout/${day.id}`}
            className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brandink"
          >
            <Icon name="play" className="size-4 flip-rtl" /> {t("common.start")}
          </Link>
        )}
      </div>

      {picking ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">{t("prog.tapAdd")}</p>
            <Button variant="secondary" onClick={() => setPicking(false)}>
              {t("common.done")} ({day.exercises.length})
            </Button>
          </div>
          <ExerciseBrowser
            settings={settings}
            initialFocus={day.focus}
            onPick={togglePick}
            accessoryFor={(ex) => (
              <span
                className={cn(
                  "flex size-8 flex-shrink-0 items-center justify-center rounded-full",
                  addedIds.has(ex.id) ? "bg-brand text-brandink" : "bg-brand/15 text-brand"
                )}
              >
                <Icon name={addedIds.has(ex.id) ? "check" : "plus"} className="size-4" />
              </span>
            )}
          />
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-2">
            {day.exercises.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line bg-card/40 p-6 text-center text-sm text-muted">
                {t("prog.noExercises")}
              </p>
            )}
            {day.exercises.map((pe, i) => {
              const ex = index.byId.get(pe.exerciseId);
              if (!ex) return null;
              return (
                <ProgramExerciseRow
                  key={pe.exerciseId}
                  exercise={ex}
                  pe={pe}
                  t={t}
                  isFirst={i === 0}
                  isLast={i === day.exercises.length - 1}
                  onChange={(patch) =>
                    withDay((list) => {
                      const target = list.find((e) => e.exerciseId === pe.exerciseId);
                      if (target) Object.assign(target, patch);
                    })
                  }
                  onMove={(dir) =>
                    withDay((list) => {
                      const idx = list.findIndex((e) => e.exerciseId === pe.exerciseId);
                      const j = dir === "up" ? idx - 1 : idx + 1;
                      if (j < 0 || j >= list.length) return;
                      [list[idx], list[j]] = [list[j], list[idx]];
                    })
                  }
                  onRemove={() =>
                    withDay((list) => {
                      const idx = list.findIndex((e) => e.exerciseId === pe.exerciseId);
                      if (idx >= 0) list.splice(idx, 1);
                    })
                  }
                />
              );
            })}
          </div>

          <Button className="mt-4 w-full" onClick={() => setPicking(true)}>
            <Icon name="plus" className="size-4" /> {t("prog.addExercises")}
          </Button>
        </>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  unit,
  step = 1,
  min = 1,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  const { n } = useLang();
  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="text-[10px] font-bold text-faint">{label}</span>
      <div className="mt-1 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex size-7 items-center justify-center rounded-full bg-card2 text-muted ring-1 ring-line"
        >
          <Icon name="minus" className="size-3.5" />
        </button>
        <span className="w-10 text-center text-sm font-bold text-ink">
          {n(value)}
          {unit}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="flex size-7 items-center justify-center rounded-full bg-card2 text-muted ring-1 ring-line"
        >
          <Icon name="plus" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function ProgramExerciseRow({
  exercise,
  pe,
  t,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  exercise: Exercise;
  pe: ProgramExercise;
  t: (k: string) => string;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<ProgramExercise>) => void;
  onMove: (dir: "up" | "down") => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-line">
      <div className="flex items-center gap-3">
        <Thumb src={exercise.thumbnail} className="size-12" />
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{exercise.name}</p>
        <div className="flex flex-col gap-1 text-faint">
          <button type="button" onClick={() => onMove("up")} disabled={isFirst} className="disabled:opacity-30">
            <Icon name="arrowUp" className="size-4" />
          </button>
          <button type="button" onClick={() => onMove("down")} disabled={isLast} className="disabled:opacity-30">
            <Icon name="arrowDown" className="size-4" />
          </button>
        </div>
        <button type="button" onClick={onRemove} className="text-faint hover:text-rose-300" aria-label={t("common.remove")}>
          <Icon name="x" className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex items-stretch gap-2 border-t border-line pt-3">
        <Stepper label={t("prog.sets")} value={pe.sets} onChange={(v) => onChange({ sets: v })} />
        <Stepper
          label={pe.timed ? t("prog.seconds") : t("prog.reps")}
          value={pe.reps}
          step={pe.timed ? 5 : 1}
          onChange={(v) => onChange({ reps: v })}
        />
        <Stepper label={t("prog.rest")} value={pe.restSec} unit="s" step={15} min={0} onChange={(v) => onChange({ restSec: v })} />
      </div>
    </div>
  );
}
