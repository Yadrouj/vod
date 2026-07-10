import { getAccount, saveSignedInUser, syncSignedInUser } from "./db";

export interface PublicUser {
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
  createdAt: number;
  updatedAt: number;
}

export async function applyAuthPayload(payload: { user: PublicUser; token: string }) {
  await saveSignedInUser(payload);
}

export async function authHeaders(): Promise<HeadersInit> {
  const account = await getAccount();
  return account?.token ? { Authorization: `Bearer ${account.token}` } : {};
}

export async function syncCurrentUser(): Promise<PublicUser | null> {
  const account = await getAccount();
  if (!account?.token) return null;
  const res = await fetch("/api/auth", {
    headers: { Authorization: `Bearer ${account.token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { user: PublicUser };
  await syncSignedInUser(json.user);
  return json.user;
}
