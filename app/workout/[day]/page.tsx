"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import TimerRing from "@/components/TimerRing";
import VideoPlayer from "@/components/VideoPlayer";
import { Button, Spinner, cn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLang } from "@/components/LangProvider";
import { showInAppMessage } from "@/components/InAppMessages";
import { tWeekday } from "@/lib/i18n";
import { addSession, DEFAULT_SETTINGS } from "@/lib/db";
import { exitWorkoutCopy, hoursLeftInDay, workoutDing, workoutNudge } from "@/lib/personalization";
import { useExercises } from "@/lib/exercises";
import { estimateSessionKcal } from "@/lib/calories";
import { gateAction, useDietProfile, useProgram, useSettings } from "@/lib/hooks";
import { beep, useCountdown, useWakeLock, vibrate } from "@/lib/timer";
import type { Exercise, LoggedExercise, ProgramExercise, Session } from "@/lib/types";

type Phase = "work" | "rest" | "done";
interface QueueItem {
  pe: ProgramExercise;
  ex: Exercise;
}

export default function WorkoutPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day: dayId } = use(params);
  const { t, lang, n } = useLang();
  const router = useRouter();
  const program = useProgram();
  const { index } = useExercises();
  const settings = useSettings() ?? DEFAULT_SETTINGS;
  const dietProfile = useDietProfile();
  const weightKg = dietProfile?.weightKg ?? 75;

  const day = program?.days.find((d) => d.id === dayId);

  const queue = useMemo<QueueItem[]>(() => {
    if (!day || !index) return [];
    return day.exercises
      .map((pe) => ({ pe, ex: index.byId.get(pe.exerciseId) }))
      .filter((q): q is QueueItem => Boolean(q.ex));
  }, [day, index]);

  const [exIndex, setExIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("work");
  const [logs, setLogs] = useState<LoggedExercise[] | null>(null);
  const [ringTotal, setRingTotal] = useState(0);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [openedAt] = useState(() => new Date());
  const [showExit, setShowExit] = useState(false);
  const timer = useCountdown();
  useWakeLock(phase !== "done");

  const current = queue[exIndex];

  useEffect(() => {
    if (queue.length && !logs) {
      const id = window.setTimeout(() => {
        setLogs(
          queue.map((q) => ({
            exerciseId: q.ex.id,
            name: q.ex.name,
            sets: Array.from({ length: q.pe.sets }, () => ({
              reps: q.pe.reps,
              weight: 0,
              durationSec: q.pe.timed ? q.pe.reps : undefined,
              done: false,
            })),
          }))
        );
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [queue, logs]);

  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => {
      setReps(current.pe.reps);
      setWeight((prevW) => {
        const prevSet = logs?.[exIndex]?.sets?.[setIndex - 1];
        return prevSet?.weight ?? prevW ?? 0;
      });
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exIndex, setIndex, current?.ex.id]);

  useEffect(() => {
    if (!day) return;
    const today = openedAt.toLocaleDateString("en-US", { weekday: "long" });
    if (day.label !== today) return;
    const key = `ramagh-workout-nudge-${dayId}-${openedAt.toDateString()}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    const msg = workoutNudge({
      lang,
      gender: settings.gender,
      level: settings.level,
      goal: settings.goal,
      hoursLeft: hoursLeftInDay(openedAt),
    });
    const id = window.setTimeout(() => {
      showInAppMessage({ tone: "info", title: msg.title, body: msg.body });
    }, 650);
    return () => window.clearTimeout(id);
  }, [day, dayId, lang, openedAt, settings.gender, settings.goal, settings.level]);

  if (program === undefined || !index) return <Spinner />;
  if (!day)
    return (
      <div className="px-6 pt-20 text-center text-muted">
        <p>{t("wo.notFound")}</p>
        <Link href="/" className="mt-4 inline-block font-bold text-brand">
          {t("nav.home")}
        </Link>
      </div>
    );
  if (queue.length === 0)
    return (
      <div className="px-6 pt-20 text-center">
        <p className="text-muted">{t("wo.noExercises")}</p>
        <Link href={`/program/${dayId}`} className="mt-4 inline-block font-bold text-brand">
          {t("prog.addExercises")}
        </Link>
      </div>
    );
  if (!logs) return <Spinner />;

  const pe = current.pe;
  const totalSets = pe.sets;
  const setPills = logs[exIndex].sets;

  function cue() {
    if (settings.sound) beep(2);
    if (settings.vibrate) vibrate([120, 60, 120]);
  }
  function nextPos(ei: number, si: number): { ei: number; si: number } | null {
    if (si + 1 < queue[ei].pe.sets) return { ei, si: si + 1 };
    if (ei + 1 < queue.length) return { ei: ei + 1, si: 0 };
    return null;
  }
  function advance() {
    const nxt = nextPos(exIndex, setIndex);
    timer.stop();
    if (!nxt) {
      setPhase("done");
      return;
    }
    setExIndex(nxt.ei);
    setSetIndex(nxt.si);
    setPhase("work");
  }
  function completeSet(vals: { reps: number; weight: number; durationSec?: number }) {
    setLogs((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const s = next[exIndex].sets[setIndex];
      s.reps = vals.reps;
      s.weight = vals.weight;
      if (vals.durationSec != null) s.durationSec = vals.durationSec;
      s.done = true;
      return next;
    });
    showInAppMessage({ tone: "success", body: workoutDing("setDone", lang), durationMs: 2600 });
    const isFinal = !nextPos(exIndex, setIndex);
    if (isFinal) {
      timer.stop();
      setPhase("done");
      return;
    }
    if (pe.restSec > 0) {
      setRingTotal(pe.restSec);
      setPhase("rest");
      timer.start(pe.restSec, () => {
        cue();
        advance();
      });
    } else advance();
  }
  function startTimedSet() {
    setRingTotal(pe.reps);
    timer.start(pe.reps, () => {
      cue();
      completeSet({ reps: pe.reps, weight: 0, durationSec: pe.reps });
    });
  }
  function skipRest() {
    timer.stop();
    showInAppMessage({ tone: "info", body: workoutDing("skipRest", lang), durationMs: 2400 });
    advance();
  }
  function skipExercise() {
    timer.stop();
    showInAppMessage({ tone: "warn", body: workoutDing("skipExercise", lang), durationMs: 2600 });
    if (exIndex + 1 < queue.length) {
      setExIndex(exIndex + 1);
      setSetIndex(0);
      setPhase("work");
    } else setPhase("done");
  }
  async function finishAndSave() {
    if (!logs) return;
    // Saving a workout is a "significant action" — counts toward the free quota.
    if (!(await gateAction((url) => router.push(url)))) return;
    const session: Session = {
      dayId,
      dayLabel: day!.label,
      startedAt,
      finishedAt: Date.now(),
      exercises: logs
        .map((le) => ({ ...le, sets: le.sets.filter((s) => s.done) }))
        .filter((le) => le.sets.length > 0),
    };
    await addSession(session);
    router.push("/history");
  }
  function exit() {
    setShowExit(true);
  }

  if (phase === "done") {
    const doneSets = logs.reduce((n, le) => n + le.sets.filter((s) => s.done).length, 0);
    const prescribedSets = queue.reduce((n, q) => n + q.pe.sets, 0) || 1;
    const kcalBurned = Math.round(
      estimateSessionKcal(queue.map((q) => q.pe), weightKg) * (doneSets / prescribedSets)
    );
    return (
      <div className="min-h-dvh bg-gradient-to-b from-brand to-brand2 px-6 pb-10 pt-16 text-brandink">
        <div className="mx-auto max-w-md text-center">
          <Icon name="trophy" className="mx-auto size-16" />
          <h1 className="mt-4 text-3xl font-extrabold">{t("wo.complete")}</h1>
          <p className="mt-2 font-semibold opacity-80">
            {t("wo.setsDone", { day: tWeekday(lang, day.label), n: doneSets })}
          </p>
          {kcalBurned > 0 && (
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-brandink/15 px-4 py-2 text-sm font-extrabold">
              <Icon name="flame" className="size-4" /> {t("wo.kcalBurned", { n: n(kcalBurned) })}
            </div>
          )}

          <div className="mt-6 space-y-2 text-start">
            {logs.map((le) => {
              const done = le.sets.filter((s) => s.done);
              if (done.length === 0) return null;
              return (
                <div key={le.exerciseId} className="rounded-xl bg-brandink/10 p-3 text-sm">
                  <p className="font-bold" dir="ltr">
                    {le.name}
                  </p>
                  <p className="opacity-80" dir="ltr">
                    {n(
                      done
                        .map((s) =>
                          s.durationSec != null
                            ? `${s.durationSec}s`
                            : `${s.reps}${s.weight ? `×${s.weight}kg` : ""}`
                        )
                        .join(" · ")
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 space-y-2">
            <Button className="w-full bg-base text-brand shadow-none hover:bg-base2" onClick={finishAndSave}>
              {t("wo.saveWorkout")}
            </Button>
            <button type="button" onClick={() => router.push("/")} className="w-full py-2 text-sm font-semibold text-brandink/70">
              {t("wo.discard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nxt = nextPos(exIndex, setIndex);
  const doneSetsSoFar = logs.reduce((sum, le) => sum + le.sets.filter((s) => s.done).length, 0);
  const todayEn = openedAt.toLocaleDateString("en-US", { weekday: "long" });
  const isToday = day.label === todayEn;
  const nudge = workoutNudge({
    lang,
    gender: settings.gender,
    level: settings.level,
    goal: settings.goal,
    hoursLeft: hoursLeftInDay(openedAt),
  });
  const nextLabel = !nxt
    ? t("wo.finish")
    : nxt.ei === exIndex
    ? t("wo.nextSet", { n: nxt.si + 1, x: current.ex.name })
    : t("wo.upNext", { x: queue[nxt.ei].ex.name });

  return (
    <div className="flex min-h-dvh flex-col bg-base px-4 pb-8 pt-4">
      {showExit && (
        <WorkoutExitModal
          lang={lang}
          hoursLeft={hoursLeftInDay(openedAt)}
          doneSets={doneSetsSoFar}
          onStay={() => setShowExit(false)}
          onLeave={() => router.push("/")}
        />
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={exit}
          className="flex size-9 items-center justify-center rounded-full bg-card text-muted ring-1 ring-line"
          aria-label={t("wo.skip")}
        >
          <Icon name="x" className="size-4" />
        </button>
        <p className="text-sm font-bold text-muted">
          {t("wo.exerciseOf", { i: exIndex + 1, n: queue.length })}
        </p>
        <button type="button" onClick={skipExercise} className="inline-flex items-center gap-1 text-sm font-semibold text-faint">
          {t("wo.skip")} <Icon name="skip" className="size-4 flip-rtl" />
        </button>
      </div>

      {isToday && (
        <div className="mt-3 rounded-2xl bg-brand/10 p-3 text-sm ring-1 ring-brand/20">
          <p className="font-extrabold text-brand">{nudge.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{nudge.body}</p>
        </div>
      )}

      {phase === "rest" ? (
        <RestView timer={timer} ringTotal={ringTotal} nextLabel={nextLabel} nextIsNewExercise={Boolean(nxt) && nxt!.ei !== exIndex} onAdd={() => timer.addTime(15)} onSub={() => timer.addTime(-15)} onSkip={skipRest} onTogglePause={() => (timer.running ? timer.pause() : timer.resume())} />
      ) : (
        <div className="mt-3 flex flex-1 flex-col">
          <VideoPlayer exercise={current.ex} gender={settings.gender} angle={settings.angle} loopAutoplay showAngles={false} className="mx-auto w-full max-w-xs" />
          <h1 className="mt-3 text-center text-xl font-extrabold text-ink" dir="ltr">
            {current.ex.name}
          </h1>
          <p className="text-center text-sm text-muted" dir="ltr">
            {current.ex.primaryMuscles.join(", ")}
          </p>

          <div className="mt-3 flex justify-center gap-2">
            {setPills.map((s, i) => (
              <span
                key={i}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                  s.done ? "bg-brand text-brandink" : i === setIndex ? "bg-card2 text-ink ring-2 ring-brand" : "bg-card2 text-faint"
                )}
              >
                {s.done ? <Icon name="check" className="size-4" /> : n(i + 1)}
              </span>
            ))}
          </div>

          <p className="mt-2 text-center text-sm font-bold text-muted">
            {t("wo.setOf", { i: setIndex + 1, n: totalSets })}
          </p>
          {!pe.timed && pe.repsMin != null && pe.rir != null && (
            <p className="mt-0.5 text-center text-xs font-semibold text-faint">
              {t("wo.repRange", { min: pe.repsMin, max: pe.reps, rir: pe.rir })}
            </p>
          )}

          <div className="mt-auto">
            {pe.timed ? (
              <TimedControls timer={timer} ringTotal={ringTotal || pe.reps} target={pe.reps} onStart={startTimedSet} onDone={() => completeSet({ reps: pe.reps, weight: 0, durationSec: pe.reps })} />
            ) : (
              <RepsControls reps={reps} weight={weight} onReps={setReps} onWeight={setWeight} onDone={() => completeSet({ reps, weight })} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BigStepper({
  label,
  value,
  unit,
  step = 1,
  min = 0,
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
    <div className="flex flex-1 flex-col items-center rounded-2xl bg-card2 py-3 ring-1 ring-line">
      <span className="text-xs font-bold text-faint">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="flex size-9 items-center justify-center rounded-full bg-card text-muted ring-1 ring-line">
          <Icon name="minus" className="size-4" />
        </button>
        <span className="w-16 text-center text-2xl font-extrabold tabular-nums text-ink">
          {n(value)}
          {unit}
        </span>
        <button type="button" onClick={() => onChange(value + step)} className="flex size-9 items-center justify-center rounded-full bg-card text-muted ring-1 ring-line">
          <Icon name="plus" className="size-4" />
        </button>
      </div>
    </div>
  );
}

function RepsControls({
  reps,
  weight,
  onReps,
  onWeight,
  onDone,
}: {
  reps: number;
  weight: number;
  onReps: (v: number) => void;
  onWeight: (v: number) => void;
  onDone: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <BigStepper label={t("wo.reps")} value={reps} onChange={onReps} min={0} />
        <BigStepper label={t("wo.weight")} value={weight} unit="kg" step={2.5} onChange={onWeight} />
      </div>
      <Button className="w-full py-4 text-base" onClick={onDone}>
        <Icon name="check" className="size-5" /> {t("wo.doneSet")}
      </Button>
    </div>
  );
}

function TimedControls({
  timer,
  ringTotal,
  target,
  onStart,
  onDone,
}: {
  timer: ReturnType<typeof useCountdown>;
  ringTotal: number;
  target: number;
  onStart: () => void;
  onDone: () => void;
}) {
  const { t } = useLang();
  const active = timer.running || timer.remainingSec > 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <TimerRing remainingSec={active ? timer.remainingSec : target} totalSec={ringTotal} caption={t("wo.hold")} />
      {!active ? (
        <Button className="w-full py-4 text-base" onClick={onStart}>
          <Icon name="play" className="size-5 flip-rtl" /> {t("wo.startHold", { n: target })}
        </Button>
      ) : (
        <div className="flex w-full gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => (timer.running ? timer.pause() : timer.resume())}>
            {timer.running ? t("wo.pause") : t("wo.resume")}
          </Button>
          <Button className="flex-1" onClick={onDone}>
            <Icon name="check" className="size-5" /> {t("common.done")}
          </Button>
        </div>
      )}
    </div>
  );
}

function RestView({
  timer,
  ringTotal,
  nextLabel,
  nextIsNewExercise,
  onAdd,
  onSub,
  onSkip,
  onTogglePause,
}: {
  timer: ReturnType<typeof useCountdown>;
  ringTotal: number;
  nextLabel: string;
  nextIsNewExercise: boolean;
  onAdd: () => void;
  onSub: () => void;
  onSkip: () => void;
  onTogglePause: () => void;
}) {
  const { t, n } = useLang();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <p className="text-lg font-extrabold text-ink">
        {nextIsNewExercise ? t("wo.exerciseDone") : t("wo.rest")}
      </p>
      <TimerRing remainingSec={timer.remainingSec} totalSec={ringTotal} accent="#22d3ee" caption={t("wo.untilNext")} />
      <p className="text-sm text-muted" dir="auto">
        {nextLabel}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onSub}>−{n(15)}s</Button>
        <Button variant="secondary" onClick={onTogglePause}>
          {timer.running ? t("wo.pause") : t("wo.resume")}
        </Button>
        <Button variant="secondary" onClick={onAdd}>+{n(15)}s</Button>
      </div>
      {/* When the whole exercise (its "package" of sets) is finished, the button to
          begin the next exercise is bright and flashy so it's unmissable mid-workout. */}
      <Button
        className={cn("w-full", nextIsNewExercise && "flashy")}
        onClick={onSkip}
      >
        {nextIsNewExercise ? t("wo.startNext") : t("wo.skipRest")}
      </Button>
    </div>
  );
}

function WorkoutExitModal({
  lang,
  hoursLeft,
  doneSets,
  onStay,
  onLeave,
}: {
  lang: "fa" | "en";
  hoursLeft: number;
  doneSets: number;
  onStay: () => void;
  onLeave: () => void;
}) {
  const copy = exitWorkoutCopy({ lang, hoursLeft, doneSets });
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 px-4 pb-4 pt-16 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl shadow-black/60 ring-1 ring-line">
        <div className="flex items-start gap-3">
          <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl bg-warn-dim text-warn ring-1 ring-warn/25">
            <Icon name="bell" className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-ink">{copy.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{copy.body}</p>
            {doneSets > 0 && (
              <p className="mt-3 rounded-xl bg-brand/10 p-2 text-xs font-bold text-brand ring-1 ring-brand/20">
                {lang === "fa"
                  ? `${doneSets} ست انجام شده. حیفه همین‌جا خاموشش کنیم.`
                  : `${doneSets} set${doneSets === 1 ? "" : "s"} already done. Too alive to vanish now.`}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onLeave} className="w-full">
            {copy.leave}
          </Button>
          <Button onClick={onStay} className="w-full">
            <Icon name="play" className="size-4 flip-rtl" />
            {copy.stay}
          </Button>
        </div>
      </div>
    </div>
  );
}
