// Rough energy-expenditure estimate for a resistance-training session.
// MET-based: kcal = MET × bodyweight(kg) × hours. We approximate session
// duration from the prescribed sets, per-set work time, and rest.

import type { ProgramExercise } from "./types";

const MET = 5.5; // vigorous free-weight/resistance training (Compendium ~5–6)

export function sessionSeconds(exercises: ProgramExercise[]): number {
  let s = 0;
  for (const pe of exercises) {
    const workSec = pe.timed ? (pe.reps || 30) + 15 : 45; // ~45s per straight set
    const rest = pe.restSec ?? 60;
    s += pe.sets * (workSec + rest);
  }
  return s;
}

export function sessionMinutes(exercises: ProgramExercise[]): number {
  return Math.round(sessionSeconds(exercises) / 60);
}

/** Estimated calories burned for a workout day. */
export function estimateSessionKcal(
  exercises: ProgramExercise[],
  weightKg = 75
): number {
  if (!exercises.length) return 0;
  const hours = sessionSeconds(exercises) / 3600;
  return Math.round(MET * weightKg * hours);
}
