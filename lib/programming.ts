// Evidence-based training prescription (an "exercise-science" layer):
//  - set / rep / rest schemes per training goal (strength / hypertrophy / endurance)
//  - sound weekly splits by days-per-week (full-body, upper/lower, PPL, push/pull, bro)
//  - exercise selection that leads with compounds, respects level, and balances muscles
//
// Principles applied: compounds before isolation; ~10–20 hard sets per muscle/week for
// hypertrophy; heavier/lower-rep + longer rest for strength; higher-rep + short rest for
// endurance; each session covers agonist/antagonist pairs to avoid imbalance.

import type { Level, Program, ProgramDay, ProgramExercise, TrainingGoal } from "./types";
import type { ExerciseIndex } from "./exercises";
import {
  difficultyRank,
  isMobility,
  levelAllows,
  musclesForFocus,
  WEEKDAYS,
} from "./taxonomy";

export const TRAINING_GOALS: {
  value: TrainingGoal;
  label: string;
  hint: string;
}[] = [
  { value: "strength", label: "Strength", hint: "Heavy, low reps, long rest" },
  { value: "hypertrophy", label: "Muscle", hint: "Moderate reps, moderate rest" },
  { value: "endurance", label: "Endurance", hint: "High reps, short rest" },
];

interface Scheme {
  sets: number;
  reps: number; // top of the rep range
  repsMin: number; // bottom of the rep range
  rir: number; // reps-in-reserve target
  restSec: number;
}

// Evidence-based prescriptions (RIR-anchored; compounds rest >=2.5 min per Schoenfeld 2016).
const SCHEMES: Record<
  TrainingGoal,
  { compound: Scheme; isolation: Scheme }
> = {
  strength: {
    compound: { sets: 4, reps: 5, repsMin: 3, rir: 2, restSec: 210 },
    isolation: { sets: 3, reps: 8, repsMin: 6, rir: 2, restSec: 120 },
  },
  hypertrophy: {
    compound: { sets: 4, reps: 10, repsMin: 6, rir: 2, restSec: 150 },
    isolation: { sets: 3, reps: 15, repsMin: 10, rir: 1, restSec: 90 },
  },
  endurance: {
    compound: { sets: 3, reps: 20, repsMin: 12, rir: 1, restSec: 75 },
    isolation: { sets: 2, reps: 25, repsMin: 15, rir: 1, restSec: 45 },
  },
};

/** Double progression: work repsMin→reps at the target RIR; when all sets hit the
 * top at ≤RIR, add load (+2.5% upper/isolation, +5% lower compounds; -7.5% after
 * missing repsMin two sessions running). Surfaced to the UI as guidance text. */
export const PROGRESSION = {
  upperIncPct: 2.5,
  lowerIncPct: 5,
  backoffPct: 7.5,
};

/** Mesocycle: 4 loading weeks + 1 deload (beginners ~7 weeks between deloads).
 * Deload = half the sets, ~85% loads, stop at RIR 4. */
export const MESOCYCLE = {
  weeks: 5,
  deloadWeek: 5,
  rirByWeek: [3, 2, 1, 1],
  deload: { setFactor: 0.5, loadFactor: 0.85, rir: 4 },
};

/** Weekly conditioning alongside lifting, per goal. */
export const CARDIO: Record<
  TrainingGoal,
  { sessions: number; minutes: number }
> = {
  strength: { sessions: 2, minutes: 25 },
  hypertrophy: { sessions: 2, minutes: 25 },
  endurance: { sessions: 4, minutes: 35 },
};

export function inferTimed(name: string): boolean {
  return /plank|hold|wall ?sit|dead ?hang|\bhang\b|isometric|balance|bridge/i.test(
    name
  );
}

/** Prescription for one exercise given the goal and whether it's compound/timed. */
export function schemeFor(
  goal: TrainingGoal,
  mechanic: string | null,
  timed = false
): ProgramExercise & { exerciseId: number } {
  if (timed) {
    return { exerciseId: 0, sets: 3, reps: 40, restSec: 45, timed: true };
  }
  const s = mechanic === "Compound" ? SCHEMES[goal].compound : SCHEMES[goal].isolation;
  return {
    exerciseId: 0,
    sets: s.sets,
    reps: s.reps,
    repsMin: s.repsMin,
    rir: s.rir,
    restSec: s.restSec,
    timed: false,
  };
}

/** Squat/hinge patterns need 3–4 min between sets; upper compounds 2–3 min. */
const LOWER_COMPOUND_REST_BONUS = 60;

export function makeProgramExercise(
  exerciseId: number,
  name: string,
  mechanic: string | null,
  goal: TrainingGoal,
  primaryMuscles: string[] = []
): ProgramExercise {
  const timed = inferTimed(name);
  const s = schemeFor(goal, mechanic, timed);
  let restSec = s.restSec;
  if (
    !timed &&
    mechanic === "Compound" &&
    primaryMuscles.some((m) => LEGS.includes(m))
  ) {
    restSec += LOWER_COMPOUND_REST_BONUS;
  }
  return {
    exerciseId,
    sets: s.sets,
    reps: s.reps,
    repsMin: s.repsMin,
    rir: s.rir,
    restSec,
    timed,
  };
}

// ---- Muscle target sets ----

const grp = (g: string) => [...musclesForFocus([g])];
const CHEST = grp("Chest");
const BACK = grp("Back");
const SHOULDERS = grp("Shoulders");
const LEGS = grp("Legs");
const CORE = grp("Core");
const BICEPS = ["Biceps", "Long Head Bicep", "Short Head Bicep", "Forearms", "Wrist Flexors", "Wrist Extensors"];
const TRICEPS = ["Triceps", "Long Head Tricep"];
const ARMS = [...BICEPS, ...TRICEPS];

// ---- Split templates ----

export interface Block {
  muscles: string[];
  count: number;
}
export interface DaySpec {
  label: string;
  focus: string[]; // display group names
  blocks: Block[];
}

export type SplitKind =
  | "fullbody"
  | "upperlower"
  | "ppl"
  | "pushpull"
  | "brosplit";

const dayTemplates = {
  full: (): Block[] => [
    { muscles: LEGS, count: 2 },
    { muscles: CHEST, count: 1 },
    { muscles: BACK, count: 1 },
    { muscles: SHOULDERS, count: 1 },
    { muscles: ARMS, count: 1 },
    { muscles: CORE, count: 1 },
  ],
  upper: (): Block[] => [
    { muscles: CHEST, count: 2 },
    { muscles: BACK, count: 2 },
    { muscles: SHOULDERS, count: 1 },
    { muscles: BICEPS, count: 1 },
    { muscles: TRICEPS, count: 1 },
  ],
  lower: (): Block[] => [
    { muscles: LEGS, count: 3 },
    { muscles: CORE, count: 1 },
  ],
  push: (): Block[] => [
    { muscles: CHEST, count: 2 },
    { muscles: SHOULDERS, count: 2 },
    { muscles: TRICEPS, count: 1 },
  ],
  pull: (): Block[] => [
    { muscles: BACK, count: 3 },
    { muscles: BICEPS, count: 2 },
  ],
  legs: (): Block[] => [
    { muscles: LEGS, count: 3 },
    { muscles: CORE, count: 1 },
  ],
  arms: (): Block[] => [
    { muscles: BICEPS, count: 3 },
    { muscles: TRICEPS, count: 3 },
  ],
} as const;

function day(label: string, focus: string[], blocks: Block[]): DaySpec {
  return { label, focus, blocks };
}

/** Sequence of day patterns for a split kind at a given day count. */
function pattern(kind: SplitKind, days: number): { name: string; focus: string[]; blocks: Block[] }[] {
  const T = dayTemplates;
  const seqs: Record<SplitKind, () => { name: string; focus: string[]; blocks: Block[] }[]> = {
    fullbody: () =>
      Array.from({ length: days }, (_, i) => ({
        name: `Full Body ${String.fromCharCode(65 + i)}`,
        focus: ["Chest", "Back", "Legs", "Shoulders", "Arms"],
        blocks: T.full(),
      })),
    upperlower: () =>
      Array.from({ length: days }, (_, i) =>
        i % 2 === 0
          ? { name: "Upper", focus: ["Chest", "Back", "Shoulders", "Arms"], blocks: T.upper() }
          : { name: "Lower", focus: ["Legs", "Core"], blocks: T.lower() }
      ),
    ppl: () => {
      const base = [
        { name: "Push", focus: ["Chest", "Shoulders", "Arms"], blocks: T.push() },
        { name: "Pull", focus: ["Back", "Arms"], blocks: T.pull() },
        { name: "Legs", focus: ["Legs", "Core"], blocks: T.legs() },
      ];
      return Array.from({ length: days }, (_, i) => base[i % 3]);
    },
    pushpull: () =>
      Array.from({ length: days }, (_, i) =>
        i % 2 === 0
          ? { name: "Push", focus: ["Chest", "Shoulders", "Arms"], blocks: T.push() }
          : { name: "Pull", focus: ["Back", "Legs", "Arms"], blocks: [...T.pull(), { muscles: LEGS, count: 2 }] }
      ),
    brosplit: () => {
      const base = [
        { name: "Chest", focus: ["Chest"], blocks: [{ muscles: CHEST, count: 4 }, { muscles: TRICEPS, count: 1 }] },
        { name: "Back", focus: ["Back"], blocks: [{ muscles: BACK, count: 4 }, { muscles: BICEPS, count: 1 }] },
        { name: "Legs", focus: ["Legs"], blocks: T.legs() },
        { name: "Shoulders", focus: ["Shoulders"], blocks: [{ muscles: SHOULDERS, count: 4 }, { muscles: CORE, count: 1 }] },
        { name: "Arms", focus: ["Arms"], blocks: T.arms() },
      ];
      return Array.from({ length: days }, (_, i) => base[i % 5]);
    },
  };
  return seqs[kind]();
}

export function buildSplit(kind: SplitKind, days: number): DaySpec[] {
  return pattern(kind, days).map((p, i) => day(WEEKDAYS[i % WEEKDAYS.length], p.focus, p.blocks));
}

/** Best-practice default split for a given day count + level (used at onboarding).
 * Note: 3-day PPL hits each muscle only 1×/week (below MEV for most) — full-body
 * at 3 days gives frequency 3 and lands in the productive volume window, so
 * full-body is the 3-day default for every level; PPL is reserved for 5–6 days. */
export function defaultSplit(days: number, level: Level): DaySpec[] {
  void level;
  if (days <= 2) return buildSplit("fullbody", Math.max(2, days));
  if (days === 3) return buildSplit("fullbody", 3);
  if (days === 4) return buildSplit("upperlower", 4);
  if (days === 5)
    return [
      ...buildSplit("upperlower", 2),
      ...buildSplit("ppl", 3).map((d, i) => ({ ...d, label: WEEKDAYS[(2 + i) % WEEKDAYS.length] })),
    ];
  return buildSplit("ppl", 6);
}

// ---- Exercise selection ----

const EQUIP_RANK = [
  "Barbell",
  "Dumbbells",
  "Machine",
  "Cables",
  "Smith-Machine",
  "Kettlebells",
  "Bodyweight",
  "Plate",
  "Band",
  "TRX",
];

export function selectExercises(
  index: ExerciseIndex,
  muscles: string[],
  count: number,
  opts: { level: Level; exclude: Set<number>; equip?: string[] }
) {
  const set = new Set(muscles);
  const equipSet = opts.equip ? new Set(opts.equip) : null;
  const cands = index.all.filter(
    (ex) =>
      !isMobility(ex.category) &&
      (ex.videos.male.length || ex.videos.female.length) &&
      levelAllows(opts.level, ex.difficulty) &&
      (!equipSet || equipSet.has(ex.category)) &&
      ex.primaryMuscles.some((m) => set.has(m)) &&
      !opts.exclude.has(ex.id)
  );
  cands.sort((a, b) => {
    const ac = a.mechanic === "Compound" ? 0 : 1;
    const bc = b.mechanic === "Compound" ? 0 : 1;
    if (ac !== bc) return ac - bc; // compounds first
    const ae = EQUIP_RANK.indexOf(a.category);
    const be = EQUIP_RANK.indexOf(b.category);
    const aer = ae < 0 ? 99 : ae;
    const ber = be < 0 ? 99 : be;
    if (aer !== ber) return aer - ber; // preferred equipment
    return difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
  });
  const picked = [];
  for (const ex of cands) {
    if (picked.length >= count) break;
    picked.push(ex);
    opts.exclude.add(ex.id);
  }
  return picked;
}

let counter = 0;
function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `d${Date.now().toString(36)}-${counter++}`;
}

/** Turn a split spec into a concrete, prescribed program using the loaded dataset. */
export function buildProgram(
  daySpecs: DaySpec[],
  index: ExerciseIndex,
  goal: TrainingGoal,
  level: Level,
  equip?: string[] // restrict to these equipment categories (home/dumbbell plans)
): Program {
  const exclude = new Set<number>();
  const days: ProgramDay[] = daySpecs.map((spec) => {
    // Exclude within a day so we don't repeat a lift; reset per day so different
    // days can reuse the best compounds.
    const dayExclude = new Set<number>();
    const exercises: ProgramExercise[] = [];
    for (const block of spec.blocks) {
      // Beginners progress near MEV with less fatigue — trim the biggest blocks.
      const count =
        level === "beginner" && block.count >= 3 ? block.count - 1 : block.count;
      const picks = selectExercises(index, block.muscles, count, {
        level,
        exclude: dayExclude,
        equip,
      });
      for (const ex of picks) {
        exercises.push(
          makeProgramExercise(ex.id, ex.name, ex.mechanic, goal, ex.primaryMuscles)
        );
      }
    }
    exclude.clear();
    return { id: uid(), label: spec.label, focus: spec.focus, exercises };
  });
  return { id: "current", daysPerWeek: daySpecs.length, days };
}
