// Core domain types shared across the app.

export type Gender = "male" | "female";
export type Level = "beginner" | "advanced";
/** The "Muscles ⇄ Joints" toggle: strength training vs mobility/stretching work. */
export type ViewMode = "strength" | "mobility";
/** Primary training adaptation — drives set/rep/rest prescription. */
export type TrainingGoal = "strength" | "hypertrophy" | "endurance";

export interface VideoClip {
  angle: string; // "front" | "side" | ...
  url: string;
  poster: string | null;
}

export interface Exercise {
  id: number;
  slug: string;
  name: string;
  category: string; // equipment, e.g. "Barbell"
  force: string | null; // Push | Pull | Hold
  mechanic: string | null; // Isolation | Compound
  difficulty: string; // Novice | Beginner | Intermediate | Advanced
  primaryMuscles: string[];
  secondaryMuscles: string[];
  grips: string[];
  steps: string[];
  thumbnail: string | null;
  videos: { male: VideoClip[]; female: VideoClip[] };
}

export interface Filters {
  equipment: string[];
  muscles: string[];
  difficulties: string[];
}

/** Single persisted settings row (single-user app). */
export interface Settings {
  id: string; // always SETTINGS_ID
  gender: Gender;
  level: Level;
  view: ViewMode;
  goal: TrainingGoal;
  angle: string; // preferred camera angle
  sound: boolean;
  vibrate: boolean;
  onboarded: boolean;
}

export interface ProgramExercise {
  exerciseId: number;
  sets: number;
  reps: number; // top of the target rep range, or seconds when timed
  repsMin?: number; // bottom of the range (double progression: repsMin→reps, then add load)
  rir?: number; // reps-in-reserve target for working sets
  restSec: number;
  timed?: boolean; // hold-for-time (planks etc.) instead of counting reps
}

export interface ProgramDay {
  id: string;
  label: string; // "Saturday"
  focus: string[]; // ["Arms"]
  exercises: ProgramExercise[];
}

export interface Program {
  id: string; // always PROGRAM_ID
  daysPerWeek: number;
  days: ProgramDay[];
}

// ---- Workout history ----

export interface LoggedSet {
  reps: number;
  weight: number;
  durationSec?: number;
  done: boolean;
}

export interface LoggedExercise {
  exerciseId: number;
  name: string;
  sets: LoggedSet[];
}

export interface Session {
  id?: number; // autoincrement
  dayId: string;
  dayLabel: string;
  startedAt: number;
  finishedAt: number;
  exercises: LoggedExercise[];
}

// ---- Analytics / support / analysis (local-first) ----

/** One counter row per app section — bumped on visit, aggregated in /admin. */
export interface SectionStat {
  section: string; // "home" | "program" | "library" | ...
  count: number;
  lastVisit: number;
}

export interface Feedback {
  id?: number;
  type: "bug" | "idea" | "other";
  message: string;
  contact: string | null;
  createdAt: number;
}

/** A message in the body-analysis thread. User sends photos+note; the analysis
 * team (admin panel) replies with text and optional image/PDF attachments. */
export interface AnalysisMsg {
  id?: number;
  from: "user" | "team";
  text: string;
  images: string[]; // data URLs
  pdf: string | null; // data URL (application/pdf)
  pdfName: string | null;
  createdAt: number;
}

// ---- Account & usage gate ----

/** Signed-in identity (Google) or a locally-created account. */
export interface Account {
  id: string; // always ACCOUNT_ID
  provider: "google" | "local";
  email: string;
  name: string;
  picture: string | null;
  createdAt: number;
}

/** Free-usage meter — when `count` passes the free limit without an account, the app asks to sign in. */
export interface Usage {
  id: string; // always USAGE_ID
  count: number;
  firstUsedAt: number;
  lastUsedAt: number;
}
