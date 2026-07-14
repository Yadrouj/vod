"use client";

import { Users } from "lucide-react";
import { useState } from "react";
import { io } from "socket.io-client";
import type { PartyMedia, PartyProfile } from "@/lib/watch-party-types";
import { newPartyProfile, readPartyProfile, savePartyProfile } from "@/lib/watch-party-profile";

export function WatchTogetherInvite({ media }: { media: PartyMedia }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function create(profile?: PartyProfile) {
    const identity = profile ?? newPartyProfile(name, avatarUrl || null);
    savePartyProfile(identity); setBusy(true); setError("");
    const socket = io({ transports: ["websocket", "polling"] });
    socket.emit("room:create", { profile: identity, media }, (result: { ok: boolean; roomId?: string; inviteToken?: string; error?: string }) => {
      if (!result.ok || !result.roomId || !result.inviteToken) { setError(result.error ?? "Could not create room"); setBusy(false); socket.disconnect(); return; }
      window.location.href = `/watch-together/${result.roomId}?invite=${encodeURIComponent(result.inviteToken)}`;
    });
  }

  function start() { const saved = readPartyProfile(); if (saved) create(saved); else setOpen(true); }

  return <>
    <button className="watch-together-trigger" type="button" onClick={start}><Users size={17} /> Watch together</button>
    {open && <div className="party-dialog-backdrop" onClick={() => setOpen(false)}><div className="party-dialog" onClick={(event) => event.stopPropagation()}><span className="label">Your watch-room profile</span><h2>Create a room</h2><input className="search" value={name} onChange={(event) => setName(event.target.value)} placeholder="Display name" autoFocus /><input className="search" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Avatar URL (optional)" />{error && <p className="download-error">{error}</p>}<div className="chips"><button className="play-glow" type="button" disabled={!name.trim() || busy} onClick={() => create()}>{busy ? "Creating…" : "Create invite link"}</button><button className="hover-button" type="button" onClick={() => setOpen(false)}>Cancel</button></div></div></div>}
  </>;
}
