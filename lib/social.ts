"use client";

// Client helpers for the community layer: image compression + typed API calls
// against the server store (/api/social/*).

import { faDigits } from "./i18n";
import type { SocialProfile } from "./types";

export interface Review {
  id: string;
  gymId: string;
  userId: string;
  name: string;
  avatarId: number;
  skin: string;
  rating: number;
  text: string;
  imageId: string | null;
  createdAt: number;
}

export type PostType = "photo" | "activity" | "program" | "story";

export interface Post {
  id: string;
  userId: string;
  name: string;
  avatarId: number;
  skin: string;
  type: PostType;
  gymId: string | null;
  gymName: string | null;
  text: string;
  imageId: string | null;
  data: Record<string, unknown> | null;
  likes: number;
  createdAt: number;
}

export interface CoachApplication {
  id: string;
  name: string;
  cred: string;
  city: string;
  phone: string;
  instagram: string;
  email: string;
  bio: string;
  specialties: string;
  photoId: string | null;
  status: string;
  createdAt: number;
}

export interface CoachProgram {
  id: string;
  coachName: string;
  title: string;
  kind: "gym" | "diet";
  goal: string;
  level: string;
  days: number;
  description: string;
  status: string;
  createdAt: number;
}

export const mediaUrl = (imageId: string | null) =>
  imageId ? `/api/social/media/${imageId}` : null;

/** Resize + compress an image File to a JPEG data URL (keeps the store small). */
export function compressImage(file: File, maxDim = 960, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

/** Denormalized author fields attached to every post/review. */
export function authorOf(s: SocialProfile) {
  return { userId: s.userId, name: s.username, avatarId: s.avatarId, skin: s.skin };
}

// ---- Feed ----
export async function fetchFeed(): Promise<Post[]> {
  const r = await fetch("/api/social/feed", { cache: "no-store" });
  const j = await r.json();
  return j.posts ?? [];
}

export async function createPost(payload: {
  author: ReturnType<typeof authorOf>;
  type: PostType;
  text: string;
  gymId?: string | null;
  gymName?: string | null;
  imageData?: string | null;
  data?: Record<string, unknown> | null;
}): Promise<Post | null> {
  const r = await fetch("/api/social/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload.author,
      type: payload.type,
      text: payload.text,
      gymId: payload.gymId,
      gymName: payload.gymName,
      imageData: payload.imageData,
      data: payload.data,
    }),
  });
  if (!r.ok) return null;
  return (await r.json()).post ?? null;
}

// ---- Coach registration ----
export async function registerCoach(payload: Record<string, unknown>): Promise<boolean> {
  const r = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.ok;
}

export async function submitCoachProgram(payload: Record<string, unknown>): Promise<boolean> {
  const r = await fetch("/api/coach/program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.ok;
}

export async function fetchCoachData(): Promise<{ applications: CoachApplication[]; programs: CoachProgram[] }> {
  const r = await fetch("/api/coach", { cache: "no-store" });
  if (!r.ok) return { applications: [], programs: [] };
  return r.json();
}

export async function likePost(postId: string): Promise<number | null> {
  const r = await fetch("/api/social/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId }),
  });
  if (!r.ok) return null;
  return (await r.json()).likes ?? null;
}

// ---- Reviews ----
export async function fetchReviews(gymId: string): Promise<{ reviews: Review[]; avg: number; count: number }> {
  const r = await fetch(`/api/social/reviews?gym=${encodeURIComponent(gymId)}`, { cache: "no-store" });
  if (!r.ok) return { reviews: [], avg: 0, count: 0 };
  return r.json();
}

export async function fetchStats(gymIds: string[]): Promise<Record<string, { avg: number; count: number }>> {
  if (!gymIds.length) return {};
  const r = await fetch(`/api/social/reviews?gyms=${gymIds.map(encodeURIComponent).join(",")}`, { cache: "no-store" });
  if (!r.ok) return {};
  return (await r.json()).stats ?? {};
}

export async function createReview(payload: {
  author: ReturnType<typeof authorOf>;
  gymId: string;
  rating: number;
  text: string;
  imageData?: string | null;
}): Promise<Review | null> {
  const r = await fetch("/api/social/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload.author, gymId: payload.gymId, rating: payload.rating, text: payload.text, imageData: payload.imageData }),
  });
  if (!r.ok) return null;
  return (await r.json()).review ?? null;
}

/** Localized "x minutes/hours/days ago". */
export function timeAgo(ts: number, lang: "fa" | "en"): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  const u: [number, string, string][] = [
    [86400, "روز", "d"],
    [3600, "ساعت", "h"],
    [60, "دقیقه", "m"],
    [1, "ثانیه", "s"],
  ];
  for (const [sec, fa, en] of u) {
    if (s >= sec) {
      const v = Math.floor(s / sec);
      return lang === "fa" ? `${faDigits(v)} ${fa} پیش` : `${v}${en} ago`;
    }
  }
  return lang === "fa" ? "همین حالا" : "now";
}
