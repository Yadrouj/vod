"use client";

import { newPartyProfile, readPartyProfile, savePartyProfile } from "@/lib/watch-party-profile";
import type { PlaylistOwner } from "@/lib/community-playlist-types";

export function getMusicCommunityProfile(): PlaylistOwner {
  const profile = readPartyProfile() ?? newPartyProfile("شنوندهٔ سرونما", null);
  if (!readPartyProfile()) savePartyProfile(profile);
  return { id: profile.id, name: profile.name, avatarUrl: profile.avatarUrl };
}

export async function postPlaylistAction(body: Record<string, unknown>) {
  const response = await fetch("/api/music/playlists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Playlist action failed.");
  return payload;
}
