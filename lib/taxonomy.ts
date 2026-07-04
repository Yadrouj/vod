// Maps MuscleWiki's 45 granular muscles into the high-level body-part groups a
// user actually plans around ("Saturday = Arms"), plus a few shared constants.

import type { Level, ViewMode } from "./types";

export interface FocusGroup {
  name: string;
  muscles: string[]; // MuscleWiki muscle names that belong to this group
}

/** Ordered high-level groups. Every one of the 45 muscles maps into exactly one group. */
export const FOCUS_GROUPS: FocusGroup[] = [
  {
    name: "Chest",
    muscles: ["Chest", "Upper Pectoralis", "Mid and Lower Chest"],
  },
  {
    name: "Back",
    muscles: [
      "Lats",
      "Traps",
      "Upper Traps",
      "Lower Traps",
      "Traps (mid-back)",
      "Lower back",
    ],
  },
  {
    name: "Shoulders",
    muscles: [
      "Shoulders",
      "Anterior Deltoid",
      "Lateral Deltoid",
      "Posterior Deltoid",
      "Front Shoulders",
      "Rear Shoulders",
    ],
  },
  {
    name: "Arms",
    muscles: [
      "Biceps",
      "Long Head Bicep",
      "Short Head Bicep",
      "Triceps",
      "Long Head Tricep",
      "Forearms",
      "Wrist Extensors",
      "Wrist Flexors",
    ],
  },
  {
    name: "Core",
    muscles: ["Abdominals", "Upper Abdominals", "Lower Abdominals", "Obliques"],
  },
  {
    name: "Legs",
    muscles: [
      "Quads",
      "Inner Quadriceps",
      "Outer Quadricep",
      "Rectus Femoris",
      "Hamstrings",
      "Lateral Hamstrings",
      "Medial Hamstrings",
      "Glutes",
      "Gluteus Maximus",
      "Gluteus Medius",
      "Calves",
      "Gastrocnemius",
      "Soleus",
      "Tibialis",
      "Inner Thigh",
      "Groin",
      "Feet",
    ],
  },
  { name: "Neck", muscles: ["Neck"] },
];

const GROUP_BY_NAME = new Map(FOCUS_GROUPS.map((g) => [g.name, g]));

/** All MuscleWiki muscle names covered by the given focus group names. */
export function musclesForFocus(focus: string[]): Set<string> {
  const set = new Set<string>();
  for (const name of focus) {
    const group = GROUP_BY_NAME.get(name);
    group?.muscles.forEach((m) => set.add(m));
  }
  return set;
}

/** Which focus group a single muscle belongs to (for chips/labels). */
export function groupForMuscle(muscle: string): string | null {
  for (const g of FOCUS_GROUPS) if (g.muscles.includes(muscle)) return g.name;
  return null;
}

/** Equipment categories that represent mobility / joint-friendly work (the "Joints" view). */
export const MOBILITY_CATEGORIES = ["Stretches", "Yoga", "Recovery", "Pilates"];

export function isMobility(category: string): boolean {
  return MOBILITY_CATEGORIES.includes(category);
}

export function matchesView(category: string, view: ViewMode): boolean {
  return view === "mobility" ? isMobility(category) : !isMobility(category);
}

// Week starts on Saturday (matches a typical gym week / the user's example).
export const WEEKDAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const DIFFICULTY_RANK: Record<string, number> = {
  Novice: 0,
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

export function difficultyRank(d: string): number {
  return DIFFICULTY_RANK[d] ?? 1;
}

/** Beginners hide Advanced; advanced users see everything. */
export function levelAllows(level: Level, difficulty: string): boolean {
  if (level === "advanced") return true;
  return difficultyRank(difficulty) <= DIFFICULTY_RANK.Intermediate;
}
