// Local-first persistence (IndexedDB via Dexie). No server, no accounts —
// settings, the current program, and workout history all live on this device.

import Dexie, { type Table } from "dexie";
import type {
  Account,
  AnalysisMsg,
  Feedback,
  Program,
  ProgramDay,
  SectionStat,
  Session,
  Settings,
  SocialProfile,
  Subscription,
  Usage,
} from "./types";
import { WEEKDAYS } from "./taxonomy";
import type { DietProfile } from "./nutrition";
import { DIET_PROFILE_ID } from "./nutrition";
import type { DietPlan } from "./foods";
import { DIET_PLAN_ID } from "./foods";

export const SETTINGS_ID = "me";
export const PROGRAM_ID = "current";
export const DIET_META_ID = "cooldown";
export const DIET_REGEN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface DietMeta {
  id: string;
  lastGeneratedAt: number;
}

class GymDB extends Dexie {
  settings!: Table<Settings, string>;
  program!: Table<Program, string>;
  sessions!: Table<Session, number>;
  dietProfile!: Table<DietProfile, string>;
  dietPlan!: Table<DietPlan, string>;
  dietMeta!: Table<DietMeta, string>;
  account!: Table<Account, string>;
  usage!: Table<Usage, string>;
  sectionStats!: Table<SectionStat, string>;
  feedback!: Table<Feedback, number>;
  analysis!: Table<AnalysisMsg, number>;
  social!: Table<SocialProfile, string>;
  subscription!: Table<Subscription, string>;

  constructor() {
    super("gym-trainer");
    this.version(1).stores({
      settings: "id",
      program: "id",
      sessions: "++id, dayId, startedAt",
    });
    this.version(2).stores({
      dietProfile: "id",
      dietPlan: "id",
    });
    this.version(3).stores({
      account: "id",
      usage: "id",
    });
    this.version(4).stores({
      sectionStats: "section",
      feedback: "++id, createdAt",
      analysis: "++id, createdAt",
    });
    this.version(5).stores({
      social: "id",
    });
    this.version(6).stores({
      dietMeta: "id",
    });
    this.version(7).stores({
      subscription: "id",
    });
  }
}

export const db = new GymDB();

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  gender: "male",
  level: "beginner",
  view: "strength",
  goal: "hypertrophy",
  angle: "front",
  sound: true,
  vibrate: true,
  theme: "classic",
  onboarded: false,
};

// ---- Settings ----

export function getSettings(): Promise<Settings | undefined> {
  return db.settings.get(SETTINGS_ID);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = (await getSettings()) ?? DEFAULT_SETTINGS;
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID });
}

// ---- Program ----

export function makeDay(label: string): ProgramDay {
  return { id: uid(), label, focus: [], exercises: [] };
}

/** Build a fresh N-day program using weekday labels starting from Saturday. */
export function makeProgram(daysPerWeek: number): Program {
  const days: ProgramDay[] = [];
  for (let i = 0; i < daysPerWeek; i++) {
    days.push(makeDay(WEEKDAYS[i % WEEKDAYS.length]));
  }
  return { id: PROGRAM_ID, daysPerWeek, days };
}

export function getProgram(): Promise<Program | undefined> {
  return db.program.get(PROGRAM_ID);
}

export async function saveProgram(program: Program): Promise<void> {
  await db.program.put({ ...program, id: PROGRAM_ID });
}

// ---- History ----

export async function addSession(session: Session): Promise<number> {
  return db.sessions.add(session);
}

export function getSessions(): Promise<Session[]> {
  return db.sessions.orderBy("startedAt").reverse().toArray();
}

// ---- Diet ----

export function getDietProfile(): Promise<DietProfile | undefined> {
  return db.dietProfile.get(DIET_PROFILE_ID);
}

export async function saveDietProfile(profile: DietProfile): Promise<void> {
  await db.dietProfile.put({ ...profile, id: DIET_PROFILE_ID });
}

export function getDietPlan(): Promise<DietPlan | undefined> {
  return db.dietPlan.get(DIET_PLAN_ID);
}

export async function saveDietPlan(plan: DietPlan): Promise<void> {
  await db.dietPlan.put({ ...plan, id: DIET_PLAN_ID });
}

export function getDietMeta(): Promise<DietMeta | undefined> {
  return db.dietMeta.get(DIET_META_ID);
}

export async function markDietPlanGenerated(at = Date.now()): Promise<void> {
  await db.dietMeta.put({ id: DIET_META_ID, lastGeneratedAt: at });
}

export async function dietRegenerateStatus(now = Date.now()): Promise<{
  allowed: boolean;
  lastGeneratedAt: number | null;
  nextAt: number | null;
  remainingMs: number;
}> {
  const [meta, plan] = await Promise.all([getDietMeta(), getDietPlan()]);
  const lastGeneratedAt = meta?.lastGeneratedAt ?? plan?.createdAt ?? null;
  if (!lastGeneratedAt) {
    return { allowed: true, lastGeneratedAt: null, nextAt: null, remainingMs: 0 };
  }
  const nextAt = lastGeneratedAt + DIET_REGEN_COOLDOWN_MS;
  const remainingMs = Math.max(0, nextAt - now);
  return { allowed: remainingMs === 0, lastGeneratedAt, nextAt, remainingMs };
}

/** Drop the saved plan so the diet page regenerates a fresh one (with the "designing…" animation). */
export async function clearDietPlan(): Promise<void> {
  await db.dietPlan.delete(DIET_PLAN_ID);
}

// ---- Account & usage gate ----

export const ACCOUNT_ID = "me";
export const USAGE_ID = "meter";
export const SUBSCRIPTION_ID = "vip";
export const VIP_PLAN_PRICE_TOMAN = 100_000;
export const VIP_CARD_NUMBER = "6219861970108964";
export const VIP_CARD_NAME = "Vahid Yadrouj";
export const VIP_TELEGRAM_USERNAME = "Yadrouj";

/** Free significant actions (workout saves, plan generations, AI messages) before sign-in is required. */
export const FREE_USAGE_LIMIT = 12;

export function getAccount(): Promise<Account | undefined> {
  return db.account.get(ACCOUNT_ID);
}

export async function saveAccount(
  a: Omit<Account, "id" | "createdAt">
): Promise<void> {
  const current = await getAccount();
  await db.account.put({ ...current, ...a, id: ACCOUNT_ID, createdAt: current?.createdAt ?? Date.now() });
}

export async function saveSignedInUser(input: {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
    restricted: boolean;
    adminMessage: string | null;
    adminMessageAt: number | null;
    vipStatus: "none" | "pending" | "vip";
    vipUntil: number | null;
    receiptSentAt: number | null;
  };
}): Promise<void> {
  const current = await getAccount();
  await db.account.put({
    id: ACCOUNT_ID,
    provider: "local",
    userId: input.user.id,
    token: input.token,
    role: input.user.role,
    email: input.user.email,
    name: input.user.name,
    picture: current?.picture ?? null,
    restricted: input.user.restricted,
    adminMessage: input.user.adminMessage,
    adminMessageAt: input.user.adminMessageAt,
    createdAt: current?.createdAt ?? Date.now(),
  });
  await db.subscription.put({
    id: SUBSCRIPTION_ID,
    status: input.user.vipStatus,
    vipUntil: input.user.vipUntil,
    receiptSentAt: input.user.receiptSentAt,
  });
}

export async function syncSignedInUser(input: {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  restricted: boolean;
  adminMessage: string | null;
  adminMessageAt: number | null;
  vipStatus: "none" | "pending" | "vip";
  vipUntil: number | null;
  receiptSentAt: number | null;
}): Promise<void> {
  const current = await getAccount();
  if (current) {
    await db.account.put({
      ...current,
      userId: input.id,
      role: input.role,
      email: input.email,
      name: input.name,
      restricted: input.restricted,
      adminMessage: input.adminMessage,
      adminMessageAt: input.adminMessageAt,
    });
  }
  await db.subscription.put({
    id: SUBSCRIPTION_ID,
    status: input.vipStatus,
    vipUntil: input.vipUntil,
    receiptSentAt: input.receiptSentAt,
  });
}

export async function signOut(): Promise<void> {
  await db.account.delete(ACCOUNT_ID);
  await db.subscription.delete(SUBSCRIPTION_ID);
}

export function getUsage(): Promise<Usage | undefined> {
  return db.usage.get(USAGE_ID);
}

export function getSubscription(): Promise<Subscription | undefined> {
  return db.subscription.get(SUBSCRIPTION_ID);
}

export async function isVipActive(now = Date.now()): Promise<boolean> {
  const sub = await getSubscription();
  return sub?.status === "vip" && typeof sub.vipUntil === "number" && sub.vipUntil > now;
}

export async function markVipReceiptSent(): Promise<void> {
  const current = await getSubscription();
  await db.subscription.put({
    id: SUBSCRIPTION_ID,
    status: current?.status === "vip" ? "vip" : "pending",
    vipUntil: current?.vipUntil ?? null,
    receiptSentAt: Date.now(),
  });
}

export async function activateVipSubscription(months = 1, now = Date.now()): Promise<void> {
  const current = await getSubscription();
  const base =
    current?.status === "vip" && typeof current.vipUntil === "number" && current.vipUntil > now
      ? current.vipUntil
      : now;
  await db.subscription.put({
    id: SUBSCRIPTION_ID,
    status: "vip",
    vipUntil: base + months * 30 * 24 * 60 * 60 * 1000,
    receiptSentAt: current?.receiptSentAt ?? null,
  });
}

/** Count one significant action. Returns the updated total. */
export async function bumpUsage(): Promise<number> {
  const now = Date.now();
  const u = (await getUsage()) ?? {
    id: USAGE_ID,
    count: 0,
    firstUsedAt: now,
    lastUsedAt: now,
  };
  u.count += 1;
  u.lastUsedAt = now;
  await db.usage.put(u);
  return u.count;
}

/** True when the free quota is exhausted and no account exists — caller should route to /login. */
export async function needsLogin(): Promise<boolean> {
  const account = await getAccount();
  if (account) return false;
  const u = await getUsage();
  return (u?.count ?? 0) >= FREE_USAGE_LIMIT;
}

export async function needsAiUpgrade(): Promise<boolean> {
  if (await isVipActive()) return false;
  const u = await getUsage();
  return (u?.count ?? 0) >= FREE_USAGE_LIMIT;
}

// ---- Social identity (community reviews & gym feed) ----

export const SOCIAL_ID = "me";

export function getSocial(): Promise<SocialProfile | undefined> {
  return db.social.get(SOCIAL_ID);
}

/** Create (with a fresh userId) or update the public social profile. */
export async function saveSocial(
  patch: Partial<Omit<SocialProfile, "id" | "userId" | "createdAt">>
): Promise<SocialProfile> {
  const existing = await getSocial();
  const profile: SocialProfile = existing
    ? { ...existing, ...patch }
    : {
        id: SOCIAL_ID,
        userId: "u_" + uid().replace(/-/g, "").slice(0, 12),
        username: patch.username ?? "",
        avatarId: patch.avatarId ?? 0,
        skin: patch.skin ?? "#e0a878",
        gender: patch.gender ?? "male",
        createdAt: Date.now(),
      };
  await db.social.put(profile);
  return profile;
}

// ---- Section analytics (for /admin) ----

export async function trackSection(section: string): Promise<void> {
  const row = await db.sectionStats.get(section);
  await db.sectionStats.put({
    section,
    count: (row?.count ?? 0) + 1,
    lastVisit: Date.now(),
  });
}

// ---- Feedback ----

export async function addFeedback(
  f: Omit<Feedback, "id" | "createdAt">
): Promise<number> {
  return db.feedback.add({ ...f, createdAt: Date.now() });
}

// ---- Body analysis ----

export async function addAnalysisMsg(
  m: Omit<AnalysisMsg, "id" | "createdAt">
): Promise<number> {
  return db.analysis.add({ ...m, createdAt: Date.now() });
}
