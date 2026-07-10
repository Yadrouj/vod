"use client";

// Reactive reads from IndexedDB. `useLiveQuery` returns `undefined` while loading,
// then re-renders automatically whenever the underlying data changes.

import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  getAccount,
  getDietPlan,
  getDietProfile,
  getProgram,
  getSessions,
  getSettings,
  getSocial,
  getSubscription,
  getUsage,
  needsLogin,
  needsAiUpgrade,
  bumpUsage,
} from "./db";
import type { Account, Program, Session, Settings, SocialProfile, Subscription, Usage } from "./types";
import type { DietProfile } from "./nutrition";
import type { DietPlan } from "./foods";

export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings, []);
}

export function useProgram(): Program | undefined {
  return useLiveQuery(getProgram, []);
}

export function useSessions(): Session[] | undefined {
  return useLiveQuery(getSessions, []);
}

export function useDietProfile(): DietProfile | undefined {
  return useLiveQuery(getDietProfile, []);
}

export function useDietPlan(): DietPlan | undefined {
  return useLiveQuery(getDietPlan, []);
}

export function useFeedbackList() {
  return useLiveQuery(
    () => db.feedback.orderBy("createdAt").reverse().toArray(),
    []
  );
}

export function useAnalysisThread() {
  return useLiveQuery(() => db.analysis.orderBy("createdAt").toArray(), []);
}

export function useSectionStats() {
  return useLiveQuery(() => db.sectionStats.toArray(), []);
}

export function useAccount(): Account | null | undefined {
  // undefined = loading, null = no account
  return useLiveQuery(async () => (await getAccount()) ?? null, []);
}

export function useUsage(): Usage | undefined {
  return useLiveQuery(getUsage, []);
}

export function useSubscription(): Subscription | null | undefined {
  return useLiveQuery(async () => (await getSubscription()) ?? null, []);
}

export function useSocial(): SocialProfile | null | undefined {
  // undefined = loading, null = not set up yet
  return useLiveQuery(async () => (await getSocial()) ?? null, []);
}

/**
 * Usage gate for significant actions (saving a workout, generating a diet,
 * applying a plan, sending an AI message). If the free quota is exhausted and
 * there's no account, sends the user to /login and returns false. Otherwise
 * counts the action and returns true.
 */
export async function gateAction(navigate: (url: string) => void): Promise<boolean> {
  if (await needsLogin()) {
    navigate("/login");
    return false;
  }
  await bumpUsage();
  return true;
}

export async function gateAiFeature(navigate: (url: string) => void): Promise<boolean> {
  if (await needsAiUpgrade()) {
    navigate("/upgrade?feature=ai");
    return false;
  }
  await bumpUsage();
  return true;
}
