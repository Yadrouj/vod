"use client";

import Link from "next/link";
import { Button, PageHeader, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { tFocus, tWeekday } from "@/lib/i18n";
import { makeDay, makeProgram, saveProgram, PROGRAM_ID } from "@/lib/db";
import { useProgram } from "@/lib/hooks";
import { FOCUS_GROUPS, WEEKDAYS } from "@/lib/taxonomy";
import type { Program, ProgramDay } from "@/lib/types";

export default function ProgramPage() {
  const { t, lang } = useLang();
  const program = useProgram();

  if (program === undefined) return <Spinner />;

  const days = program?.days ?? [];

  async function update(mutate: (p: Program) => void) {
    const base: Program = program ?? { id: PROGRAM_ID, daysPerWeek: 0, days: [] };
    const next: Program = structuredClone(base);
    mutate(next);
    next.daysPerWeek = next.days.length;
    await saveProgram(next);
  }

  const addDay = () =>
    update((p) => p.days.push(makeDay(WEEKDAYS[p.days.length % WEEKDAYS.length])));
  const removeDay = (id: string) =>
    update((p) => {
      p.days = p.days.filter((d) => d.id !== id);
    });
  const setLabel = (id: string, label: string) =>
    update((p) => {
      const d = p.days.find((x) => x.id === id);
      if (d) d.label = label;
    });
  const toggleFocus = (id: string, focus: string) =>
    update((p) => {
      const d = p.days.find((x) => x.id === id);
      if (!d) return;
      d.focus = d.focus.includes(focus)
        ? d.focus.filter((f) => f !== focus)
        : [...d.focus, focus];
    });

  return (
    <div className="px-4 pt-6">
      <PageHeader title={t("prog.title")} subtitle={t("prog.subtitle")} />

      {days.length === 0 && (
        <div className="mt-5">
          <Button onClick={() => saveProgram(makeProgram(4))}>{t("prog.create4")}</Button>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {days.map((day) => (
          <DayEditor
            key={day.id}
            day={day}
            lang={lang}
            t={t}
            onLabel={(l) => setLabel(day.id, l)}
            onToggleFocus={(f) => toggleFocus(day.id, f)}
            onRemove={() => removeDay(day.id)}
          />
        ))}
      </div>

      {days.length > 0 && (
        <Button variant="secondary" className="mt-4 w-full" onClick={addDay}>
          <Icon name="plus" className="size-4" /> {t("prog.addDay")}
        </Button>
      )}
    </div>
  );
}

function DayEditor({
  day,
  lang,
  t,
  onLabel,
  onToggleFocus,
  onRemove,
}: {
  day: ProgramDay;
  lang: "fa" | "en";
  t: (k: string, p?: Record<string, string | number>) => string;
  onLabel: (label: string) => void;
  onToggleFocus: (focus: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <select
          value={day.label}
          onChange={(e) => onLabel(e.target.value)}
          className="rounded-lg bg-card2 px-3 py-1.5 text-sm font-extrabold text-ink outline-none ring-1 ring-line"
        >
          {WEEKDAYS.map((w) => (
            <option key={w} value={w}>
              {tWeekday(lang, w)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm font-semibold text-rose-300 hover:text-rose-200"
        >
          {t("common.remove")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {FOCUS_GROUPS.map((g) => (
          <button
            key={g.name}
            type="button"
            onClick={() => onToggleFocus(g.name)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold transition-colors",
              day.focus.includes(g.name)
                ? "bg-brand text-brandink"
                : "bg-card2 text-muted ring-1 ring-line"
            )}
          >
            {tFocus(lang, g.name)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm text-muted">
          {t("common.exercisesN", { n: day.exercises.length })}
        </span>
        <Link
          href={`/program/${day.id}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-brand"
        >
          {t("prog.editExercises")} <Icon name="chevronRight" className="size-4 flip-rtl" />
        </Link>
      </div>
    </div>
  );
}
