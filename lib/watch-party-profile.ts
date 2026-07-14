import type { PartyProfile } from "./watch-party-types";

const KEY = "sarvnema_party_profile";

export function readPartyProfile(): PartyProfile | null {
  if (typeof window === "undefined") return null;
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as PartyProfile | null; return value?.id && value?.name ? value : null; } catch { return null; }
}

export function savePartyProfile(profile: PartyProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
  document.cookie = `sarvnema_party_profile=${encodeURIComponent(JSON.stringify(profile))}; path=/; max-age=31536000; SameSite=Lax`;
}

export function newPartyProfile(name: string, avatarUrl: string | null): PartyProfile {
  return { id: crypto.randomUUID(), name: name.trim().slice(0, 40) || "Guest", avatarUrl: avatarUrl?.trim() || null };
}
