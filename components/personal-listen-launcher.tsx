"use client";

import { Check, Copy, FileUp, Link2, LoaderCircle, Share2, Upload, UsersRound, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { cleanPersonalMediaTitle, inferPersonalMediaKind, isSupportedPersonalMediaFile } from "@/lib/watch-party-personal-media";
import { newPartyProfile, readPartyProfile, savePartyProfile } from "@/lib/watch-party-profile";
import type { PartyMedia, PartyProfile } from "@/lib/watch-party-types";
import { WatchTogetherMark } from "@/components/watch-together-mark";

type Ack = { ok?: boolean; error?: string };
type RoomResult = Ack & { roomId?: string; inviteToken?: string };
type UploadGrant = Ack & { grant?: string; endpoint?: string; maxBytes?: number };

const pendingUrl = "https://example.invalid/sarvnema-personal-pending.mp3";

export function PersonalListenLauncher() {
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [profile, setProfile] = useState<PartyProfile | null>(null);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  function openBuilder() {
    const saved = readPartyProfile();
    setProfile(saved);
    setName(saved?.name ?? "");
    setAvatarUrl(saved?.avatarUrl ?? "");
    setEditingProfile(!saved);
    setFile(null);
    setUrl("");
    setTitle("");
    setVisibility("private");
    setError("");
    setInviteUrl("");
    setCopied(false);
    setOpen(true);
  }

  function closeBuilder() {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setOpen(false);
  }

  function chooseFile(value: File | null) {
    if (!value) return;
    if (!isSupportedPersonalMediaFile(value.name, value.type) || inferPersonalMediaKind(value.name, value.type) !== "audio") {
      setFile(null);
      setError("Choose an audio file such as MP3, M4A, WAV, OGG, or FLAC.");
      return;
    }
    setError("");
    setFile(value);
    setUrl("");
    if (!title.trim()) setTitle(cleanPersonalMediaTitle(value.name.replace(/\.[a-z0-9]{2,8}$/i, ""), "My room track"));
  }

  async function createRoom() {
    if (!file && !url.trim()) {
      setError("Upload your track or paste a direct HTTPS audio link first.");
      return;
    }
    if (url.trim() && file) {
      setError("Choose either an upload or a direct link for this room.");
      return;
    }
    if ((!profile || editingProfile) && !name.trim()) {
      setError("Enter a display name so people know who started the room.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const identity = profile && !editingProfile ? profile : newPartyProfile(name, avatarUrl || null);
      savePartyProfile(identity);
      setProfile(identity);
      const roomMedia: PartyMedia = {
        itemId: `personal-pending:${Date.now()}`,
        title: cleanPersonalMediaTitle(title, file?.name.replace(/\.[a-z0-9]{2,8}$/i, "") || "Personal listening room"),
        posterUrl: null,
        source: { url: pendingUrl, label: "Preparing personal audio", quality: null, season: null, episode: null, origin: "personal-upload" },
        sources: [],
        mediaKind: "audio",
        catalogue: "personal",
        artistName: identity.name,
        details: null,
      };
      const socket = io({ transports: ["websocket", "polling"], timeout: 12_000 });
      socketRef.current = socket;
      const room = await emitAck<RoomResult>(socket, "room:create", { profile: identity, media: roomMedia, visibility });
      if (!room.ok || !room.roomId || !room.inviteToken) throw new Error(room.error ?? "The listening room could not be created.");

      if (file) {
        const grant = await emitAck<UploadGrant>(socket, "personal-media:upload-grant", { roomId: room.roomId, mediaKind: "audio" });
        if (!grant.ok || !grant.grant || !grant.endpoint) throw new Error(grant.error ?? "The room could not prepare the temporary upload.");
        if (typeof grant.maxBytes === "number" && file.size > grant.maxBytes) throw new Error("This audio file is larger than the room upload limit.");
        const form = new FormData();
        form.set("file", file);
        form.set("title", roomMedia.title);
        form.set("mediaKind", "audio");
        const response = await fetch(grant.endpoint, { method: "POST", headers: { "x-party-upload-grant": grant.grant }, body: form });
        const uploaded = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; mediaId?: string };
        if (!response.ok || !uploaded.ok || !uploaded.mediaId) throw new Error(uploaded.error ?? "The temporary upload did not finish.");
        const applied = await emitAck<Ack>(socket, "personal-media:apply-upload", { roomId: room.roomId, mediaId: uploaded.mediaId, mode: "now" });
        if (!applied.ok) throw new Error(applied.error ?? "The room could not start your personal track.");
      } else {
        const linked = await emitAck<Ack>(socket, "personal-media:link", { roomId: room.roomId, url: url.trim(), fields: { title: roomMedia.title, mediaKind: "audio" }, mode: "now" });
        if (!linked.ok) throw new Error(linked.error ?? "That direct audio link could not be used.");
      }

      setInviteUrl(`${window.location.origin}/watch-together/${room.roomId}?invite=${encodeURIComponent(room.inviteToken)}`);
      setCopied(false);
    } catch (reason) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setError(reason instanceof Error ? reason.message : "The listening room could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setError("Copy was blocked by the browser. You can select the link manually.");
    }
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "SarvNema listening room", text: "Join my synchronized listening room.", url: inviteUrl });
        return;
      } catch (reason) {
        if ((reason as { name?: string })?.name === "AbortError") return;
      }
    }
    await copyInvite();
  }

  return (
    <>
      <button className="watch-together-launcher watch-together-inline watch-together-listen personal-listen-launcher" type="button" onClick={openBuilder} aria-haspopup="dialog">
        <span className="watch-together-launcher-icon" aria-hidden="true"><WatchTogetherMark /></span>
        <span className="watch-together-launcher-copy"><strong>Upload &amp; listen together</strong><small>Your file or link · one room</small></span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="watch-builder-backdrop" onClick={closeBuilder}>
          <section className="watch-builder personal-listen-builder" role="dialog" aria-modal="true" aria-labelledby="personal-listen-title" onClick={(event) => event.stopPropagation()}>
            <header className="watch-builder-header">
              <div className="watch-builder-mark"><WatchTogetherMark /></div>
              <div><span className="label">LISTEN TOGETHER</span><h2 id="personal-listen-title">Start with your own music</h2></div>
              <button className="watch-builder-close" type="button" onClick={closeBuilder} aria-label="Close"><X size={19} /></button>
            </header>

            {inviteUrl ? (
              <div className="watch-builder-success">
                <div className="watch-builder-success-icon"><Check size={28} /></div>
                <p>Your personal listening room is ready. Share the link and let the room pick the next beat.</p>
                <div className="watch-builder-link"><Link2 size={17} /><input value={inviteUrl} readOnly aria-label="Invite link" /></div>
                <div className="watch-builder-actions watch-builder-success-actions">
                  <button type="button" className="play-glow" onClick={() => window.location.assign(inviteUrl)}><WatchTogetherMark /> Enter room</button>
                  <button type="button" className="watch-share-button" onClick={shareInvite}><Share2 size={17} /> Share room</button>
                  <button type="button" className="watch-copy-button" onClick={copyInvite}>{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copied" : "Copy link"}</button>
                </div>
              </div>
            ) : (
              <>
                <p className="watch-builder-intro">No catalogue track is required. Upload a personal audio file or paste a direct HTTPS link, then everyone hears the same second together.</p>
                <div className="watch-builder-feature-list"><span><i />Second-perfect sync</span><span><i />Chat &amp; reactions</span><span><i />Voice room ready</span></div>
                <div className="watch-builder-section personal-listen-source">
                  <div className="watch-builder-section-title"><span>Your audio</span><small>temporary room media</small></div>
                  <input ref={fileInputRef} className="personal-listen-file-input" type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac,.weba" onChange={(event) => chooseFile(event.currentTarget.files?.[0] ?? null)} />
                  <button type="button" className="personal-listen-dropzone" onClick={() => fileInputRef.current?.click()} disabled={busy}><Upload size={20} /><span><strong>{file?.name ?? "Choose an audio file"}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · disappears after 3 hours` : "MP3, M4A, WAV, OGG, or FLAC"}</small></span></button>
                  <div className="personal-listen-or"><span>or</span></div>
                  <input className="search" value={url} onChange={(event) => { const nextUrl = event.target.value; setUrl(nextUrl); if (nextUrl.trim()) { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; } setError(""); }} placeholder="Paste a direct HTTPS audio link" inputMode="url" autoComplete="url" />
                  <input className="search" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Track name (optional)" maxLength={120} />
                  <small className="personal-listen-note"><FileUp size={13} /> Uploads are temporary and room-scoped. Only share media you own or are allowed to share.</small>
                </div>
                <div className="watch-builder-section">
                  <div className="watch-builder-section-title"><span>Your profile</span>{profile && !editingProfile && <button type="button" onClick={() => setEditingProfile(true)}>Edit</button>}</div>
                  {profile && !editingProfile ? <div className="watch-builder-profile">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{profile.name.slice(0, 1)}</span>}<strong>{profile.name}</strong><Check size={17} /></div> : <div className="watch-builder-profile-fields"><input className="search" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your display name" autoFocus /><input className="search" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Avatar URL (optional)" inputMode="url" /></div>}
                </div>
                <div className="watch-builder-section watch-builder-access">
                  <div className="watch-builder-section-title"><span>Room access</span></div>
                  <div className="watch-builder-access-options" role="radiogroup" aria-label="Room visibility">
                    <button className={visibility === "private" ? "is-active" : ""} type="button" role="radio" aria-checked={visibility === "private"} onClick={() => setVisibility("private")}><UsersRound size={16} /><span><strong>Private</strong><small>Only people with your invite link can join.</small></span></button>
                    <button className={visibility === "public" ? "is-active" : ""} type="button" role="radio" aria-checked={visibility === "public"} onClick={() => setVisibility("public")}><UsersRound size={16} /><span><strong>Public listening room</strong><small>Show it in the live room directory.</small></span></button>
                  </div>
                </div>
                {error && <p className="watch-builder-error">{error}</p>}
                <div className="watch-builder-actions"><button type="button" className="play-glow" disabled={busy} onClick={() => void createRoom}><UsersRound size={18} /> {busy ? <><LoaderCircle className="personal-listen-spin" size={17} /> Creating room…</> : "Create room & invite"}</button><button type="button" className="hover-button" onClick={closeBuilder}>Cancel</button></div>
              </>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

function emitAck<T extends Ack>(socket: Socket, event: string, payload: Record<string, unknown>) {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => { if (!settled) { settled = true; reject(new Error("The room did not respond. Try again.")); } }, 12_000);
    socket.emit(event, payload, (result: T | undefined) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result ?? ({ ok: false, error: "The room could not finish that action." } as T));
    });
  });
}
