import { createHmac, randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AudienceSignal } from "./discovery-ranking";

type Ballot = { itemId: string; voter: string; vote: 1 | -1; comment: string; at: number };
const root = path.resolve(process.env.DISCOVERY_DATA_DIR || "data/discovery");
const file = path.join(root, "feedback.json");
let cached: { expires: number; signals: Record<string, AudienceSignal> } | null = null;
let keyPromise: Promise<Buffer> | null = null;

/** The custom Next server can report its bind address behind the HTTPS proxy. */
export function feedbackOriginAllowed(origin: string | null, requestUrl: string, siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://sarvnema.ir") {
  if (!origin) return false;
  try {
    const supplied = new URL(origin);
    const request = new URL(requestUrl);
    if (supplied.origin !== origin || !["http:", "https:"].includes(supplied.protocol)) return false;
    if (origin === request.origin || origin === new URL(siteUrl).origin) return true;
    const loopback = ["localhost", "127.0.0.1", "[::1]"];
    return [...loopback, "0.0.0.0"].includes(request.hostname) && loopback.includes(supplied.hostname) && supplied.protocol === request.protocol && supplied.port === request.port;
  } catch { return false; }
}

async function key() {
  keyPromise ??= (async () => {
    await mkdir(root, { recursive: true });
    const keyFile = path.join(root, "voter-key");
    try { await writeFile(keyFile, randomBytes(32), { flag: "wx", mode: 0o600 }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    const value = await readFile(keyFile);
    if (value.byteLength !== 32) throw new Error("Feedback key unavailable");
    return value;
  })().catch(error => { keyPromise = null; throw error; });
  return keyPromise;
}

async function readBallots(): Promise<Ballot[]> {
  try { return JSON.parse(await readFile(file, "utf8")) as Ballot[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

export function aggregateFeedback(ballots: Ballot[], now = Date.now()) {
  const signals: Record<string, AudienceSignal> = {};
  for (const ballot of ballots) {
    if (ballot.at > now || now - ballot.at > 30 * 86400000) continue;
    const entry = signals[ballot.itemId] ??= { likes: 0, dislikes: 0, comments: 0, updatedAt: 0 };
    if (ballot.vote === 1) entry.likes++; else entry.dislikes++;
    if (ballot.comment.trim()) entry.comments++;
    entry.updatedAt = Math.max(entry.updatedAt, ballot.at);
  }
  return signals;
}

export async function loadAudienceSignals() {
  if (cached && cached.expires > Date.now()) return cached.signals;
  try {
    const signals = aggregateFeedback(await readBallots());
    cached = { expires: Date.now() + 30000, signals };
    return signals;
  } catch { return {}; }
}

export async function recordFeedback(itemId: string, identity: string, vote: 1 | -1, comment: string) {
  const voter = createHmac("sha256", await key()).update(identity).digest("hex");
  // Cross-process lock; contention returns a retryable error instead of losing votes.
  const lock = await open(path.join(root, "write.lock"), "wx");
  const temp = `${file}.${process.pid}.tmp`;
  try {
    const now = Date.now();
    const ballots = (await readBallots()).filter(row => now - row.at < 30 * 86400000 && !(row.itemId === itemId && row.voter === voter)).slice(-4999);
    ballots.push({ itemId, voter, vote, comment, at: now });
    await writeFile(temp, JSON.stringify(ballots), { mode: 0o600 });
    await rename(temp, file);
    cached = null;
  } finally {
    await lock.close();
    await unlink(path.join(root, "write.lock"));
    await unlink(temp).catch(() => {});
  }
}
