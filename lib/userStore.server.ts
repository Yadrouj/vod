import { promises as fs } from "node:fs";
import path from "node:path";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: "user" | "admin";
  restricted: boolean;
  adminMessage: string | null;
  adminMessageAt: number | null;
  vipStatus: "none" | "pending" | "vip";
  vipUntil: number | null;
  receiptSentAt: number | null;
  sessions: string[];
  createdAt: number;
  updatedAt: number;
}

interface UserStore {
  users: StoredUser[];
}

const DATA_DIR = path.join(process.cwd(), ".social-data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function uid(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const passwordHash = pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("hex");
  return { salt, passwordHash };
}

function verifyPassword(password: string, user: StoredUser): boolean {
  const { passwordHash } = hashPassword(password, user.salt);
  const a = Buffer.from(passwordHash, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readStore(): Promise<UserStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(USERS_FILE, "utf8")) as UserStore;
  } catch {
    return { users: [] };
  }
}

async function writeStore(store: UserStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function publicUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    restricted: user.restricted,
    adminMessage: user.adminMessage,
    adminMessageAt: user.adminMessageAt,
    vipStatus: user.vipStatus,
    vipUntil: user.vipUntil,
    receiptSentAt: user.receiptSentAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function listUsers() {
  const store = await readStore();
  return store.users.map(publicUser).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createUser(input: { name: string; email: string; password: string }) {
  const store = await readStore();
  const email = input.email.trim().toLowerCase();
  if (store.users.some((u) => u.email === email)) {
    return { error: "exists" as const };
  }
  const now = Date.now();
  const { salt, passwordHash } = hashPassword(input.password);
  const user: StoredUser = {
    id: uid("usr"),
    email,
    name: input.name.trim(),
    passwordHash,
    salt,
    role: store.users.length === 0 ? "admin" : "user",
    restricted: false,
    adminMessage: null,
    adminMessageAt: null,
    vipStatus: "none",
    vipUntil: null,
    receiptSentAt: null,
    sessions: [],
    createdAt: now,
    updatedAt: now,
  };
  const token = uid("ses");
  user.sessions.push(token);
  store.users.push(user);
  await writeStore(store);
  return { user: publicUser(user), token };
}

export async function adminCreateUser(input: {
  name: string;
  email: string;
  password: string;
  vipStatus?: "none" | "pending" | "vip";
}) {
  const store = await readStore();
  const email = input.email.trim().toLowerCase();
  if (store.users.some((u) => u.email === email)) return { error: "exists" as const };
  const now = Date.now();
  const { salt, passwordHash } = hashPassword(input.password);
  const vipStatus = input.vipStatus ?? "none";
  const user: StoredUser = {
    id: uid("usr"),
    email,
    name: input.name.trim(),
    passwordHash,
    salt,
    role: "user",
    restricted: false,
    adminMessage: null,
    adminMessageAt: null,
    vipStatus,
    vipUntil: vipStatus === "vip" ? now + 30 * 24 * 60 * 60 * 1000 : null,
    receiptSentAt: null,
    sessions: [],
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(user);
  await writeStore(store);
  return { user: publicUser(user) };
}

export async function signInUser(emailInput: string, password: string) {
  const store = await readStore();
  const email = emailInput.trim().toLowerCase();
  const user = store.users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user)) return { error: "invalid" as const };
  if (user.restricted) return { error: "restricted" as const, user: publicUser(user) };
  const token = uid("ses");
  user.sessions = [...user.sessions.slice(-4), token];
  user.updatedAt = Date.now();
  await writeStore(store);
  return { user: publicUser(user), token };
}

export async function getUserByToken(token: string | null) {
  if (!token) return null;
  const store = await readStore();
  const user = store.users.find((u) => u.sessions.includes(token));
  return user ?? null;
}

export async function markReceipt(token: string | null) {
  const store = await readStore();
  const user = token ? store.users.find((u) => u.sessions.includes(token)) : null;
  if (!user) return null;
  user.vipStatus = user.vipStatus === "vip" ? "vip" : "pending";
  user.receiptSentAt = Date.now();
  user.updatedAt = Date.now();
  await writeStore(store);
  return publicUser(user);
}

export async function adminUpdateUser(input: {
  userId: string;
  action:
    | "restrict"
    | "unrestrict"
    | "delete"
    | "message"
    | "activateVip"
    | "setGeneral"
    | "edit"
    | "resetPassword";
  message?: string;
  name?: string;
  email?: string;
}) {
  const store = await readStore();
  const user = store.users.find((u) => u.id === input.userId);
  if (!user) return { error: "missing" as const };
  const now = Date.now();
  let tempPassword: string | undefined;
  if (input.action === "restrict") user.restricted = true;
  if (input.action === "unrestrict") user.restricted = false;
  if (input.action === "delete") {
    store.users = store.users.filter((u) => u.id !== input.userId);
    await writeStore(store);
    return { deleted: true as const };
  }
  if (input.action === "message") {
    user.adminMessage = input.message?.trim() || null;
    user.adminMessageAt = user.adminMessage ? now : null;
  }
  if (input.action === "activateVip") {
    const base = user.vipStatus === "vip" && user.vipUntil && user.vipUntil > now ? user.vipUntil : now;
    user.vipStatus = "vip";
    user.vipUntil = base + 30 * 24 * 60 * 60 * 1000;
  }
  if (input.action === "setGeneral") {
    user.vipStatus = "none";
    user.vipUntil = null;
  }
  if (input.action === "edit") {
    const nextEmail = input.email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== user.email) {
      if (store.users.some((u) => u.id !== user.id && u.email === nextEmail)) {
        return { error: "exists" as const };
      }
      user.email = nextEmail;
    }
    if (input.name?.trim()) user.name = input.name.trim();
  }
  if (input.action === "resetPassword") {
    tempPassword = `Ramagh${Math.floor(100000 + Math.random() * 900000)}`;
    const next = hashPassword(tempPassword);
    user.salt = next.salt;
    user.passwordHash = next.passwordHash;
    user.sessions = [];
  }
  user.updatedAt = now;
  await writeStore(store);
  return { user: publicUser(user), tempPassword };
}
