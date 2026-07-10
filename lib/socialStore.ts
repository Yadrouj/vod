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
const COACH_CHATS = path.join(DATA_DIR, "coach-chats.json");
const COACH_PRIVATE_REQUESTS = path.join(DATA_DIR, "coach-private-requests.json");
const COACH_FOLLOWS = path.join(DATA_DIR, "coach-follows.json");

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

export interface LeaderboardRow {
  userId: string;
  name: string;
  avatarId: number;
  skin: string;
  score: number;
  posts: number;
  likes: number;
  stories: number;
  lastPostAt: number;
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

export interface CoachPrivatePlan {
  title: string;
  kind: "gym" | "diet";
  days: number;
  description: string;
}

export interface CoachAttachment {
  id: string;
  name: string;
  type: "image" | "pdf";
  url: string;
}

export type PrivatePlanStatus = "requested" | "offered" | "paid";

export interface CoachPrivateRequest {
  id: string;
  source: "private" | "direct";
  trainerId: string;
  userId: string;
  customerName: string;
  coachName: string;
  kind: "gym" | "diet";
  goal: string;
  notes: string;
  budget: string;
  offerTitle: string;
  offerDescription: string;
  offerDays: number;
  priceToman: number;
  status: PrivatePlanStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CoachChatMessage {
  id: string;
  requestId: string;
  userId: string;
  customerName: string;
  coachName: string;
  role: "customer" | "coach";
  text: string;
  privatePlan: CoachPrivatePlan | null;
  attachments: CoachAttachment[];
  createdAt: number;
}

export interface CoachFollow {
  trainerId: string;
  userId: string;
  createdAt: number;
}

export interface CoachFollowStats {
  trainerId: string;
  followers: number;
  followed: boolean;
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

export async function saveAttachment(input: {
  dataUrl?: string | null;
  name?: string;
}): Promise<CoachAttachment | null> {
  const dataUrl = input.dataUrl;
  if (!dataUrl || typeof dataUrl !== "string" || dataUrl.length > 8_000_000) return null;
  const m = /^data:(image\/(?:jpeg|jpg|png|webp)|application\/pdf);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 5 * 1024 * 1024) return null;
  await ensure();
  const ext = mime === "application/pdf" ? "pdf" : mime.endsWith("png") ? "png" : mime.endsWith("webp") ? "webp" : "jpg";
  const fileId = `${id()}.${ext}`;
  await fs.writeFile(path.join(UP_DIR, fileId), buf);
  return {
    id: fileId,
    name: clip(input.name, 120) || (ext === "pdf" ? "attachment.pdf" : "image.jpg"),
    type: ext === "pdf" ? "pdf" : "image",
    url: `/api/social/media/${fileId}`,
  };
}

export async function readImage(imageId: string): Promise<{ buf: Buffer; type: string } | null> {
  if (!/^[A-Za-z0-9_-]+\.(jpg|png|webp|pdf)$/.test(imageId)) return null; // no path traversal
  try {
    const buf = await fs.readFile(path.join(UP_DIR, imageId));
    const ext = imageId.split(".").pop()!;
    const type = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
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

export async function addSystemPost(input: Partial<Post>): Promise<Post> {
  return withLock(async () => {
    const all = await readArr<Post>(FEED);
    const post: Post = {
      id: id(),
      userId: clip(input.userId, 60) || `mock_${id()}`,
      name: clip(input.name, 40) || "کاربر رمق",
      avatarId: Math.max(0, Math.min(9, Number(input.avatarId) || 0)),
      skin: clip(input.skin, 12) || "#e0a878",
      type: POST_TYPES.includes(input.type as PostType) ? (input.type as PostType) : "story",
      gymId: input.gymId ? clip(input.gymId, 60) : null,
      gymName: input.gymName ? clip(input.gymName, 80) : null,
      text: clip(input.text, 500),
      imageId: null,
      data: safeData(input.data),
      likes: Math.max(0, Math.min(9999, Number(input.likes) || 0)),
      createdAt: Number(input.createdAt) || Date.now(),
    };
    all.unshift(post);
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

export async function listLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  const all = await readArr<Post>(FEED);
  const rows = new Map<string, LeaderboardRow>();
  const typePoints: Record<PostType, number> = {
    story: 5,
    photo: 6,
    activity: 10,
    program: 8,
  };

  for (const post of all) {
    const row =
      rows.get(post.userId) ??
      {
        userId: post.userId,
        name: post.name,
        avatarId: post.avatarId,
        skin: post.skin,
        score: 0,
        posts: 0,
        likes: 0,
        stories: 0,
        lastPostAt: 0,
      };
    row.name = post.name || row.name;
    row.avatarId = post.avatarId;
    row.skin = post.skin;
    row.posts += 1;
    row.likes += post.likes || 0;
    row.stories += post.type === "story" ? 1 : 0;
    row.score += typePoints[post.type] + (post.likes || 0) * 2;
    row.lastPostAt = Math.max(row.lastPostAt, post.createdAt);
    rows.set(post.userId, row);
  }

  return [...rows.values()]
    .sort((a, b) => b.score - a.score || b.lastPostAt - a.lastPostAt)
    .slice(0, limit);
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

// ---- Coach follows ----

export async function coachFollowStats(trainerId: string, userId?: string): Promise<CoachFollowStats> {
  const safeTrainer = clip(trainerId, 60);
  const safeUser = userId ? clip(userId, 60) : "";
  const all = await readArr<CoachFollow>(COACH_FOLLOWS);
  return {
    trainerId: safeTrainer,
    followers: all.filter((follow) => follow.trainerId === safeTrainer).length,
    followed: Boolean(safeUser && all.some((follow) => follow.trainerId === safeTrainer && follow.userId === safeUser)),
  };
}

export async function listCoachFollows(userId: string): Promise<CoachFollow[]> {
  const safeUser = clip(userId, 60);
  if (!safeUser) return [];
  const all = await readArr<CoachFollow>(COACH_FOLLOWS);
  return all
    .filter((follow) => follow.userId === safeUser)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function setCoachFollow(input: {
  trainerId: string;
  userId: string;
  follow: boolean;
}): Promise<CoachFollowStats> {
  return withLock(async () => {
    const all = await readArr<CoachFollow>(COACH_FOLLOWS);
    const trainerId = clip(input.trainerId, 60);
    const userId = clip(input.userId, 60);
    if (!trainerId || !userId) throw new Error("missing follow fields");

    const next = all.filter((follow) => !(follow.trainerId === trainerId && follow.userId === userId));
    if (input.follow) next.unshift({ trainerId, userId, createdAt: Date.now() });
    if (next.length > 5000) next.splice(5000);
    await writeArr(COACH_FOLLOWS, next);

    return {
      trainerId,
      followers: next.filter((follow) => follow.trainerId === trainerId).length,
      followed: input.follow,
    };
  });
}

// ---- Coach private-plan requests ----

export async function listCoachPrivateRequests(userId?: string): Promise<CoachPrivateRequest[]> {
  const safeUser = userId ? clip(userId, 60) : null;
  const all = await readArr<CoachPrivateRequest>(COACH_PRIVATE_REQUESTS);
  return all
    .filter((request) => !safeUser || request.userId === safeUser)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function addCoachPrivateRequest(input: Partial<CoachPrivateRequest>): Promise<CoachPrivateRequest> {
  return withLock(async () => {
    const all = await readArr<CoachPrivateRequest>(COACH_PRIVATE_REQUESTS);
    const now = Date.now();
    const request: CoachPrivateRequest = {
      id: id(),
      source: "private",
      trainerId: clip(input.trainerId, 60),
      userId: clip(input.userId, 60),
      customerName: clip(input.customerName, 60) || "Customer",
      coachName: clip(input.coachName, 60) || "Coach",
      kind: input.kind === "diet" ? "diet" : "gym",
      goal: clip(input.goal, 120),
      notes: clip(input.notes, 1500),
      budget: clip(input.budget, 80),
      offerTitle: "",
      offerDescription: "",
      offerDays: 0,
      priceToman: 0,
      status: "requested",
      createdAt: now,
      updatedAt: now,
    };
    if (!request.userId || !request.goal) throw new Error("missing private request fields");
    all.unshift(request);
    if (all.length > 1000) all.splice(1000);
    await writeArr(COACH_PRIVATE_REQUESTS, all);
    return request;
  });
}

export async function getOrCreateDirectCoachRequest(input: {
  trainerId: string;
  userId: string;
  customerName: string;
  coachName: string;
}): Promise<CoachPrivateRequest> {
  return withLock(async () => {
    const all = await readArr<CoachPrivateRequest>(COACH_PRIVATE_REQUESTS);
    const trainerId = clip(input.trainerId, 60);
    const userId = clip(input.userId, 60);
    const existing = all.find((request) => request.source === "direct" && request.trainerId === trainerId && request.userId === userId);
    if (existing) return existing;

    const now = Date.now();
    const request: CoachPrivateRequest = {
      id: id(),
      source: "direct",
      trainerId,
      userId,
      customerName: clip(input.customerName, 60) || "Customer",
      coachName: clip(input.coachName, 60) || "Coach",
      kind: "gym",
      goal: `Direct chat with ${clip(input.coachName, 60) || "Coach"}`,
      notes: "",
      budget: "",
      offerTitle: "Direct coach chat",
      offerDescription: "Free direct chat thread",
      offerDays: 0,
      priceToman: 0,
      status: "paid",
      createdAt: now,
      updatedAt: now,
    };
    if (!request.userId || !request.trainerId) throw new Error("missing direct chat fields");
    all.unshift(request);
    if (all.length > 1000) all.splice(1000);
    await writeArr(COACH_PRIVATE_REQUESTS, all);
    return request;
  });
}

export async function updateCoachPrivateRequest(
  requestId: string,
  patch: Partial<CoachPrivateRequest>
): Promise<CoachPrivateRequest | null> {
  return withLock(async () => {
    const all = await readArr<CoachPrivateRequest>(COACH_PRIVATE_REQUESTS);
    const request = all.find((item) => item.id === requestId);
    if (!request) return null;
    if (patch.trainerId != null) request.trainerId = clip(patch.trainerId, 60);
    if (patch.coachName != null) request.coachName = clip(patch.coachName, 60) || request.coachName;
    if (patch.offerTitle != null) request.offerTitle = clip(patch.offerTitle, 100);
    if (patch.offerDescription != null) request.offerDescription = clip(patch.offerDescription, 2500);
    if (patch.offerDays != null) request.offerDays = Math.max(0, Math.min(7, Number(patch.offerDays) || 0));
    if (patch.priceToman != null) request.priceToman = Math.max(0, Math.min(999_000_000, Number(patch.priceToman) || 0));
    if (patch.status === "offered" || patch.status === "paid") request.status = patch.status;
    request.updatedAt = Date.now();
    await writeArr(COACH_PRIVATE_REQUESTS, all);
    return request;
  });
}

// ---- Coach private chats ----

function safePlan(input: unknown): CoachPrivatePlan | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Partial<CoachPrivatePlan>;
  const description = clip(p.description, 2500);
  if (!description) return null;
  return {
    title: clip(p.title, 100) || "Private plan",
    kind: p.kind === "diet" ? "diet" : "gym",
    days: Math.max(0, Math.min(7, Number(p.days) || 0)),
    description,
  };
}

export async function listCoachChat(userId: string, requestId?: string): Promise<CoachChatMessage[]> {
  const safeUser = clip(userId, 60);
  const safeRequest = requestId ? clip(requestId, 60) : null;
  const all = await readArr<CoachChatMessage>(COACH_CHATS);
  return all
    .filter((m) => m.userId === safeUser && (!safeRequest || m.requestId === safeRequest))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-80);
}

async function attachmentsFrom(input: unknown): Promise<CoachAttachment[]> {
  if (!Array.isArray(input)) return [];
  const saved: CoachAttachment[] = [];
  for (const item of input.slice(0, 4)) {
    const att = await saveAttachment(item as { dataUrl?: string | null; name?: string });
    if (att) saved.push(att);
  }
  return saved;
}

export async function addCoachChatMessage(
  input: Partial<CoachChatMessage> & { attachmentsData?: { dataUrl?: string; name?: string }[] }
): Promise<CoachChatMessage> {
  const attachments = await attachmentsFrom(input.attachmentsData);
  return withLock(async () => {
    const [all, requests] = await Promise.all([
      readArr<CoachChatMessage>(COACH_CHATS),
      readArr<CoachPrivateRequest>(COACH_PRIVATE_REQUESTS),
    ]);
    const role = input.role === "coach" ? "coach" : "customer";
    const requestId = clip(input.requestId, 60);
    const request = requests.find((item) => item.id === requestId);
    if (!request || request.status !== "paid") throw new Error("private plan is not paid");
    const message: CoachChatMessage = {
      id: id(),
      requestId,
      userId: request.userId,
      customerName: request.customerName,
      coachName: clip(input.coachName, 60) || request.coachName,
      role,
      text: clip(input.text, 1500),
      privatePlan: role === "coach" ? safePlan(input.privatePlan) : null,
      attachments,
      createdAt: Date.now(),
    };
    if (!message.userId || (!message.text && !message.privatePlan && !message.attachments.length)) {
      throw new Error("empty coach chat message");
    }
    all.push(message);
    if (all.length > 2000) all.splice(0, all.length - 2000);
    await writeArr(COACH_CHATS, all);
    return message;
  });
}
