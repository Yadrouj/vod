import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export interface ContactMessage {
  id: string;
  kind: "problem" | "message";
  source: "profile" | "gym" | "store" | "pharmacy" | "drugstore";
  placeId: string | null;
  placeName: string | null;
  placePhone: string | null;
  title: string;
  description: string;
  contactName: string;
  contactPhone: string;
  userId: string | null;
  userEmail: string | null;
  status: "new" | "read" | "replied" | "closed";
  adminReply: string | null;
  createdAt: number;
  updatedAt: number;
}

interface MessageStore {
  messages: ContactMessage[];
}

const DATA_DIR = path.join(process.cwd(), ".social-data");
const FILE = path.join(DATA_DIR, "messages.json");

function uid(): string {
  return `msg_${randomBytes(12).toString("hex")}`;
}

async function readStore(): Promise<MessageStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as MessageStore;
  } catch {
    return { messages: [] };
  }
}

async function writeStore(store: MessageStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listMessages() {
  const store = await readStore();
  return [...store.messages].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addMessage(input: Omit<ContactMessage, "id" | "status" | "adminReply" | "createdAt" | "updatedAt">) {
  const now = Date.now();
  const message: ContactMessage = {
    ...input,
    id: uid(),
    status: "new",
    adminReply: null,
    createdAt: now,
    updatedAt: now,
  };
  const store = await readStore();
  store.messages.push(message);
  await writeStore(store);
  return message;
}

export async function updateMessage(input: {
  id: string;
  status?: ContactMessage["status"];
  adminReply?: string | null;
}) {
  const store = await readStore();
  const message = store.messages.find((m) => m.id === input.id);
  if (!message) return { error: "missing" as const };
  if (input.status) message.status = input.status;
  if (input.adminReply !== undefined) message.adminReply = input.adminReply;
  message.updatedAt = Date.now();
  await writeStore(store);
  return { message };
}
