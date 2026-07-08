// Server-only social store — reviews, the gym-photo feed, and uploaded media.
//
// Kept as JSON + image files under a data dir OUTSIDE the app folder (default
// /home/ubuntu/ramagh-data) so it survives redeploys (tar extract only touches the
// app dir). No native deps; writes are serialized through a tiny in-process lock.
// This is the shared backend that makes the "social" features multi-user.

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR =
  process.env.RAMAGH_DATA ||
  (process.platform === "win32"
    ? path.join(process.cwd(), ".social-data")
    : "/home/ubuntu/ramagh-data");
const UP_DIR = path.join(DATA_DIR, "uploads");
const REVIEWS = path.join(DATA_DIR, "reviews.json");
const FEED = path.join(DATA_DIR, "feed.json");
const COACHES = path.join(DATA_DIR, "coaches.json");
const COACH_PROGRAMS = path.join(DATA_DIR, "coach-programs.json");

export interface Review {
  id: string;
  gymId: string;
  userId: string;
  name: string;
  avatarId: number;
  skin: string;
  rating: number; // 1..5
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
  data: Record<string, unknown> | null; // structured payload for activity/program posts
  likes: number;
  createdAt: number;
}

export interface CoachApplication {
  id: string;
  userId: string;
  name: string;
  cred: string;
  city: string;
  phone: string;
  instagram: string;
  email: string;
  bio: string;
  specialties: string;
  photoId: string | null;
  status: "pending" | "approved";
  createdAt: number;
}

export interface CoachProgram {
  id: string;
  userId: string;
  coachName: string;
  title: string;
  kind: "gym" | "diet";
  goal: string;
  level: string;
  days: number;
  description: string;
  status: "pending" | "approved";
  createdAt: number;
}

let chain: Promise<unknown> = Promise.resolve();
/** Serialize all read-modify-write ops to avoid clobbering the JSON files. */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function ensure() {
  await fs.mkdir(UP_DIR, { recursive: true });
}

async function readArr<T>(file: string): Promise<T[]> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; // legitimately empty
    throw e;
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    // Corrupt (but present) file: surface it instead of silently returning [] —
    // otherwise the next write would overwrite the whole store with one record.
    throw new Error(`corrupt store file: ${path.basename(file)}`);
  }
}
async function writeArr<T>(file: string, arr: T[]): Promise<void> {
  await ensure(); // create the data dir on first write (image-less submissions too)
  // Atomic: write a temp file then rename over the target so a crash mid-write can
  // never leave a truncated/corrupt file, and concurrent readers see old-or-new.
  const tmp = `${file}.tmp.${process.pid}.${crypto.randomBytes(4).toString("hex")}`;
  await fs.writeFile(tmp, JSON.stringify(arr), "utf8");
  await fs.rename(tmp, file);
}

const id = () => crypto.randomBytes(9).toString("base64url");

/** Persist a base64 data-URL image; returns an imageId, or null if invalid/too big. */
export async function saveImage(dataUrl: string | null | undefined): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  // Reject oversized payloads BEFORE decoding, so a giant base64 string can't
  // force a huge Buffer allocation (memory-amplification DoS). ~4.5MB base64 ≈ 3MB.
  if (dataUrl.length > 4_600_000) return null;
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 3 * 1024 * 1024) return null; // 3MB cap
  await ensure();
  const ext = m[1].toLowerCase() === "png" ? "png" : m[1].toLowerCase() === "webp" ? "webp" : "jpg";
  const imageId = `${id()}.${ext}`;
  await fs.writeFile(path.join(UP_DIR, imageId), buf);
  return imageId;
}

export async function readImage(imageId: string): Promise<{ buf: Buffer; type: string } | null> {
  if (!/^[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(imageId)) return null; // no path traversal
  try {
    const buf = await fs.readFile(path.join(UP_DIR, imageId));
    const ext = imageId.split(".").pop()!;
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return { buf, type };
  } catch {
    return null;
  }
}

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

// ---- Reviews ----
export async function listReviews(gymId: string): Promise<Review[]> {
  const all = await readArr<Review>(REVIEWS);
  return all.filter((r) => r.gymId === gymId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function gymStats(gymId: string): Promise<{ avg: number; count: number }> {
  const rs = (await readArr<Review>(REVIEWS)).filter((r) => r.gymId === gymId);
  if (!rs.length) return { avg: 0, count: 0 };
  return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length };
}

/** Aggregate stats for many gyms at once (for list badges). */
export async function statsFor(gymIds: string[]): Promise<Record<string, { avg: number; count: number }>> {
  const rs = await readArr<Review>(REVIEWS);
  const out: Record<string, { sum: number; count: number }> = {};
  for (const r of rs) {
    if (!gymIds.includes(r.gymId)) continue;
    (out[r.gymId] ??= { sum: 0, count: 0 });
    out[r.gymId].sum += r.rating;
    out[r.gymId].count += 1;
  }
  const res: Record<string, { avg: number; count: number }> = {};
  for (const [k, v] of Object.entries(out)) res[k] = { avg: v.sum / v.count, count: v.count };
  return res;
}

export async function addReview(input: Partial<Review> & { imageData?: string }): Promise<Review> {
  const imageId = await saveImage(input.imageData);
  return withLock(async () => {
    const all = await readArr<Review>(REVIEWS);
    const review: Review = {
      id: id(),
      gymId: clip(input.gymId, 60),
      userId: clip(input.userId, 60),
      name: clip(input.name, 40) || "کاربر رمق",
      avatarId: Math.max(0, Math.min(9, Number(input.avatarId) || 0)),
      skin: clip(input.skin, 12) || "#e0a878",
      rating: Math.max(1, Math.min(5, Number(input.rating) || 5)),
      text: clip(input.text, 800),
      imageId,
      createdAt: Date.now(),
    };
    all.push(review);
    // keep the store bounded (prune oldest reviews + their images)
    const KEEP = 3000;
    if (all.length > KEEP) {
      const dropped = all.splice(0, all.length - KEEP);
      for (const d of dropped) if (d.imageId) fs.unlink(path.join(UP_DIR, d.imageId)).catch(() => {});
    }
    await writeArr(REVIEWS, all);
    return review;
  });
}

// ---- Feed (daily gym photos) ----
export async function listFeed(limit = 60): Promise<Post[]> {
  const all = await readArr<Post>(FEED);
  return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

const POST_TYPES: PostType[] = ["photo", "activity", "program", "story"];

/** Keep the structured `data` blob small & serializable. */
function safeData(d: unknown): Record<string, unknown> | null {
  if (!d || typeof d !== "object") return null;
  try {
    const s = JSON.stringify(d);
    if (s.length > 4000) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export async function addPost(input: Partial<Post> & { imageData?: string }): Promise<Post> {
  const imageId = await saveImage(input.imageData);
  return withLock(async () => {
    const all = await readArr<Post>(FEED);
    const post: Post = {
      id: id(),
      userId: clip(input.userId, 60),
      name: clip(input.name, 40) || "کاربر رمق",
      avatarId: Math.max(0, Math.min(9, Number(input.avatarId) || 0)),
      skin: clip(input.skin, 12) || "#e0a878",
      type: POST_TYPES.includes(input.type as PostType) ? (input.type as PostType) : "photo",
      gymId: input.gymId ? clip(input.gymId, 60) : null,
      gymName: input.gymName ? clip(input.gymName, 80) : null,
      text: clip(input.text, 500),
      imageId,
      data: safeData(input.data),
      likes: 0,
      createdAt: Date.now(),
    };
    all.unshift(post);
    // keep the store bounded (prune old posts + their images)
    const KEEP = 400;
    if (all.length > KEEP) {
      const dropped = all.splice(KEEP);
      for (const d of dropped) if (d.imageId) fs.unlink(path.join(UP_DIR, d.imageId)).catch(() => {});
    }
    await writeArr(FEED, all);
    return post;
  });
}

export async function likePost(postId: string): Promise<number | null> {
  return withLock(async () => {
    const all = await readArr<Post>(FEED);
    const p = all.find((x) => x.id === postId);
    if (!p) return null;
    p.likes = (p.likes || 0) + 1;
    await writeArr(FEED, all);
    return p.likes;
  });
}

// ---- Coach registration & program submissions ----

export async function addCoachApplication(
  input: Partial<CoachApplication> & { photoData?: string }
): Promise<CoachApplication> {
  const photoId = await saveImage(input.photoData);
  return withLock(async () => {
    const all = await readArr<CoachApplication>(COACHES);
    const app: CoachApplication = {
      id: id(),
      userId: clip(input.userId, 60),
      name: clip(input.name, 60) || "مربی",
      cred: clip(input.cred, 100),
      city: clip(input.city, 40),
      phone: clip(input.phone, 30),
      instagram: clip(input.instagram, 40),
      email: clip(input.email, 80),
      bio: clip(input.bio, 1000),
      specialties: clip(input.specialties, 200),
      photoId,
      status: "pending",
      createdAt: Date.now(),
    };
    all.unshift(app);
    const KEEP = 500;
    if (all.length > KEEP) {
      const dropped = all.splice(KEEP);
      for (const d of dropped) if (d.photoId) fs.unlink(path.join(UP_DIR, d.photoId)).catch(() => {});
    }
    await writeArr(COACHES, all);
    return app;
  });
}

export async function listCoachApplications(): Promise<CoachApplication[]> {
  return (await readArr<CoachApplication>(COACHES)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function addCoachProgram(input: Partial<CoachProgram>): Promise<CoachProgram> {
  return withLock(async () => {
    const all = await readArr<CoachProgram>(COACH_PROGRAMS);
    const prog: CoachProgram = {
      id: id(),
      userId: clip(input.userId, 60),
      coachName: clip(input.coachName, 60) || "مربی",
      title: clip(input.title, 100) || "برنامه",
      kind: input.kind === "diet" ? "diet" : "gym",
      goal: clip(input.goal, 40),
      level: clip(input.level, 40),
      days: Math.max(0, Math.min(7, Number(input.days) || 0)),
      description: clip(input.description, 2000),
      status: "pending",
      createdAt: Date.now(),
    };
    all.unshift(prog);
    if (all.length > 500) all.splice(500);
    await writeArr(COACH_PROGRAMS, all);
    return prog;
  });
}

export async function listCoachPrograms(): Promise<CoachProgram[]> {
  return (await readArr<CoachProgram>(COACH_PROGRAMS)).sort((a, b) => b.createdAt - a.createdAt);
}
