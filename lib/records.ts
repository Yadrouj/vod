// Personal records from logged workouts — a bodybuilder's core progress metric.
// Best lift per exercise, ranked by estimated 1-rep-max (Epley formula).

import type { Session } from "./types";

export interface PR {
  name: string;
  weight: number; // kg
  reps: number;
  est1RM: number; // kg, Epley
  at: number; // timestamp of the PR
}

/** Epley estimated 1RM. */
export const epley1RM = (weight: number, reps: number) =>
  weight * (1 + Math.max(0, reps) / 30);

/** Best weighted set per exercise across all sessions, strongest first. */
export function computePRs(sessions: Session[]): PR[] {
  const best = new Map<string, PR>();
  for (const s of sessions) {
    for (const e of s.exercises) {
      for (const set of e.sets) {
        // Only real, completed, weighted (non-timed) sets count as lifts.
        if (!set.done || set.durationSec != null) continue;
        if (!set.weight || set.weight <= 0) continue;
        const est = epley1RM(set.weight, set.reps || 0);
        const cur = best.get(e.name);
        if (!cur || est > cur.est1RM) {
          best.set(e.name, {
            name: e.name,
            weight: set.weight,
            reps: set.reps || 0,
            est1RM: Math.round(est),
            at: s.startedAt,
          });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.est1RM - a.est1RM);
}
