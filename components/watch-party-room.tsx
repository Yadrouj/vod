"use client";

import Link from "next/link";
import { Captions, Check, Clock3, Copy, Expand, ExternalLink, Film, Globe2, MessageCircle, Pause, Play, Settings, Share2, Star, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { PartyCapability, PartyChatMessage, PartyMedia, PartyParticipant, PartyPermissions, PartyProfile, PartyQueueItem, PartyReaction, PartySnapshot } from "@/lib/watch-party-types";
import { newPartyProfile, readPartyProfile, savePartyProfile } from "@/lib/watch-party-profile";
import { WatchPartyVoice } from "@/components/watch-party-voice";
import { WatchPartyAccessibility } from "@/components/watch-party-accessibility";
import { PlayerSubtitles } from "@/components/player-subtitles";
import { WatchTogetherMark } from "@/components/watch-together-mark";
import { BRAND_MARK } from "@/lib/brand";
import { sizedImageUrl } from "@/lib/image-url";
import { showAppMessage } from "@/lib/app-messages";
import type { SubtitleSelection } from "@/lib/subtitle-types";

type SearchItem = { title: string; imdbCode: string; year: number | null; type: string; posterUrl: string | null; imdbRating: number | null };
type PlaybackState = PartySnapshot["playback"] & {
  serverNow?: number;
  clientSentAt?: number;
  action?: string;
  originUserId?: string;
};

declare global { interface Window { onTelegramPartyAuth?: (user: Record<string, unknown>) => void } }

const CAPABILITIES: { id: PartyCapability; label: string }[] = [
  { id: "playback", label: "Play / pause" }, { id: "seek", label: "Seek" }, { id: "changeSource", label: "Change source" },
  { id: "changeMedia", label: "Change movie" }, { id: "queue", label: "Manage queue" }, { id: "chat", label: "Chat" }, { id: "react", label: "Reactions" },
  { id: "subtitles", label: "Change room subtitles" }, { id: "camera", label: "Stream camera" },
  { id: "liveCaptions", label: "Share live captions" }, { id: "interpreter", label: "Sign interpreter" },
];

export function WatchPartyRoom({ roomId }: { roomId: string }) {
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mutedRef = useRef<Set<string>>(new Set());
  const pendingPlayback = useRef<PlaybackState | null>(null);
  const latestPlayback = useRef<PlaybackState | null>(null);
  const lastAppliedRevision = useRef(0);
  const remoteSeekInFlight = useRef(false);
  const seekCatchupRevision = useRef(-1);
  const serverClockOffset = useRef(0);
  const hasServerClockOffset = useRef(false);
  const rateCorrectionTimer = useRef<number | null>(null);
  const scrubTimeRef = useRef<number | null>(null);
  const [profile, setProfile] = useState<PartyProfile | null>(null);
  const [snapshot, setSnapshot] = useState<PartySnapshot | null>(null);
  const [name, setName] = useState(""); const [avatar, setAvatar] = useState("");
  const [error, setError] = useState(""); const [connected, setConnected] = useState(false);
  const [chatText, setChatText] = useState(""); const [chat, setChat] = useState<PartyChatMessage[]>([]);
  const [reactions, setReactions] = useState<PartyReaction[]>([]);
  const [query, setQuery] = useState(""); const [results, setResults] = useState<SearchItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false); const [peopleOpen, setPeopleOpen] = useState(true);
  const [subtitlesOpen, setSubtitlesOpen] = useState(false);
  const [mutedLocally, setMutedLocally] = useState<Set<string>>(new Set());
  const [inviteToken, setInviteToken] = useState("");
  const [inviteLoaded, setInviteLoaded] = useState(false);
  const [playerTime, setPlayerTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const me = snapshot?.participants.find((participant) => participant.id === profile?.id);
  const isHost = snapshot?.ownerId === profile?.id;
  const can = (capability: PartyCapability) => Boolean(isHost || (me && (me.permissions[capability] ?? snapshot?.guestPermissions[capability])));

  useEffect(() => {
    const saved = readPartyProfile(); if (saved) setProfile(saved);
    setInviteToken(new URLSearchParams(window.location.search).get("invite") ?? ""); setInviteLoaded(true);
    try { const muted = new Set<string>(JSON.parse(localStorage.getItem("sarvnema_party_muted") ?? "[]")); mutedRef.current = muted; setMutedLocally(muted); } catch {}
  }, []);

  useEffect(() => {
    if (!profile || !inviteToken) return;
    const socket = io({ transports: ["websocket", "polling"] }); socketRef.current = socket;
    const applyPlayback = (state: PlaybackState) => {
      if (state.revision < lastAppliedRevision.current) return;
      const receivedAt = Date.now();
      if (Number.isFinite(state.clientSentAt) && Number.isFinite(state.serverNow)) {
        const sentAt = Number(state.clientSentAt);
        const midpoint = sentAt + Math.max(0, receivedAt - sentAt) / 2;
        serverClockOffset.current = Number(state.serverNow) - midpoint;
        hasServerClockOffset.current = true;
      }
      const previousRevision = lastAppliedRevision.current;
      lastAppliedRevision.current = Math.max(previousRevision, state.revision);
      pendingPlayback.current = state;
      latestPlayback.current = state;
      setSnapshot((current) => current ? { ...current, playback: state } : current);
      const video = videoRef.current;
      if (!video || video.readyState < 1 || video.getAttribute("src") !== state.media.source.url) return;

      const estimatedServerNow = hasServerClockOffset.current ? receivedAt + serverClockOffset.current : Number(state.serverNow ?? receivedAt);
      const elapsed = state.paused ? 0 : Math.max(0, estimatedServerNow - Number(state.serverNow ?? estimatedServerNow)) / 1000 * state.playbackRate;
      const rawExpected = Math.max(0, state.currentTime + elapsed);
      const maxTime = Number.isFinite(video.duration) && video.duration > 0 ? Math.max(0, video.duration - .05) : rawExpected;
      const expected = Math.min(rawExpected, maxTime);
      const drift = video.currentTime - expected;
      const revisionChanged = state.revision > previousRevision;
      const authoritativeSeek = state.action === "seek" || state.action === "source" || state.action === "media";
      const hardSeek = previousRevision === 0 || authoritativeSeek || Math.abs(drift) > .9 || (state.paused && Math.abs(drift) > .25);

      if (rateCorrectionTimer.current !== null) {
        window.clearTimeout(rateCorrectionTimer.current);
        rateCorrectionTimer.current = null;
      }
      if (remoteSeekInFlight.current && !revisionChanged && !authoritativeSeek) {
        if (state.paused) video.pause();
        return;
      }

      if (hardSeek) {
        const requiresSeek = Math.abs(video.currentTime - expected) > .05;
        remoteSeekInFlight.current = requiresSeek;
        video.playbackRate = state.playbackRate;
        if (requiresSeek) video.currentTime = expected;
        setPlayerTime(expected);
      } else if (!state.paused && Math.abs(drift) > .18) {
        const correction = Math.max(.95, Math.min(1.05, 1 - drift * .04));
        video.playbackRate = state.playbackRate * correction;
        rateCorrectionTimer.current = window.setTimeout(() => {
          if (videoRef.current && latestPlayback.current?.revision === state.revision) videoRef.current.playbackRate = state.playbackRate;
          rateCorrectionTimer.current = null;
        }, 1200);
      } else {
        video.playbackRate = state.playbackRate;
      }

      if (state.paused) video.pause();
      else video.play().catch(() => undefined);
    };
    socket.on("connect", () => socket.emit("room:join", { roomId, inviteToken, profile }, (result: { ok: boolean; snapshot?: PartySnapshot; error?: string }) => { if (!result.ok || !result.snapshot) { setError(result.error ?? "Could not join room"); return; } setSnapshot(result.snapshot); setChat(result.snapshot.chat); setConnected(true); applyPlayback({ ...result.snapshot.playback, serverNow: result.snapshot.serverNow }); }));
    socket.on("room:snapshot", (value: PartySnapshot) => { setSnapshot(value); setChat(value.chat); applyPlayback({ ...value.playback, serverNow: value.serverNow }); });
    socket.on("playback:state", applyPlayback);
    socket.on("subtitle:state", (subtitle: SubtitleSelection) => setSnapshot((current) => current ? { ...current, subtitle } : current));
    socket.on("accessibility:interpreter", ({ userId }: { userId: string | null }) => setSnapshot((current) => current ? { ...current, interpreterUserId: userId } : current));
    socket.on("queue:update", (queue: PartyQueueItem[]) => setSnapshot((current) => current ? { ...current, queue } : current));
    socket.on("chat:message", (message: PartyChatMessage) => { if (!mutedRef.current.has(message.userId)) setChat((current) => [...current, message].slice(-100)); });
    socket.on("reaction", (reaction: PartyReaction) => { if (mutedRef.current.has(reaction.userId)) return; setReactions((current) => [...current, reaction]); window.setTimeout(() => setReactions((current) => current.filter((item) => item.id !== reaction.id)), 4200); });
    socket.on("room:removed", ({ blocked }: { blocked: boolean }) => { setError(blocked ? "You were blocked from this room." : "You were removed from this room."); setConnected(false); });
    const requestSync = () => socket.emit("sync:request", { roomId, clientSentAt: Date.now() });
    const timer = window.setInterval(requestSync, 1000);
    requestSync();
    return () => { window.clearInterval(timer); if (rateCorrectionTimer.current !== null) window.clearTimeout(rateCorrectionTimer.current); socket.disconnect(); socketRef.current = null; };
  }, [profile, roomId, inviteToken]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = window.setTimeout(() => fetch(`/api/suggest?q=${encodeURIComponent(query)}`).then((response) => response.json()).then((data) => setResults(data.items ?? [])).catch(() => setResults([])), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (profile) return;
    fetch("/api/watch-party/telegram/config").then((response) => response.json()).then(({ botUsername }) => {
      if (!botUsername) return; const target = document.getElementById("telegram-party-login"); if (!target) return;
      window.onTelegramPartyAuth = (user) => fetch("/api/watch-party/telegram/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(user) }).then((response) => response.json()).then((data) => { if (data.profile) { savePartyProfile(data.profile); setProfile(data.profile); } });
      const script = document.createElement("script"); script.src = "https://telegram.org/js/telegram-widget.js?22"; script.async = true; script.setAttribute("data-telegram-login", botUsername); script.setAttribute("data-size", "large"); script.setAttribute("data-userpic", "true"); script.setAttribute("data-request-access", "write"); script.setAttribute("data-onauth", "onTelegramPartyAuth(user)"); target.replaceChildren(script);
    }).catch(() => undefined);
  }, [profile]);

  function command(action: string, extra: Record<string, unknown> = {}) { socketRef.current?.emit("playback:command", { roomId, action, ...extra }); }
  function expectedPosition(state: PlaybackState | null = latestPlayback.current) {
    if (!state) return 0;
    const nowAtServer = hasServerClockOffset.current ? Date.now() + serverClockOffset.current : Number(state.serverNow ?? state.updatedAt);
    return state.paused ? state.currentTime : state.currentTime + Math.max(0, nowAtServer - Number(state.serverNow ?? state.updatedAt)) / 1000 * state.playbackRate;
  }
  function resumeWhenReady(event: React.SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const state = latestPlayback.current;
    if (!state) return;
    video.playbackRate = state.playbackRate;
    if (state.paused) video.pause();
    else video.play().catch(() => undefined);
  }
  function finishRemoteSeek(event: React.SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const state = latestPlayback.current;
    if (!state) return;
    const target = Math.max(0, expectedPosition(state));
    const maxTime = Number.isFinite(video.duration) && video.duration > 0 ? Math.max(0, video.duration - .05) : target;
    const catchupTarget = Math.min(target, maxTime);
    if (remoteSeekInFlight.current && !state.paused && seekCatchupRevision.current !== state.revision && Math.abs(video.currentTime - catchupTarget) > .65) {
      seekCatchupRevision.current = state.revision;
      video.currentTime = catchupTarget;
      video.play().catch(() => undefined);
      return;
    }
    remoteSeekInFlight.current = false;
    resumeWhenReady(event);
  }
  function previewSeek(next: number) { scrubTimeRef.current = next; setScrubTime(next); }
  function commitSeek() {
    const next = scrubTimeRef.current;
    if (next === null || !can("seek")) return;
    scrubTimeRef.current = null;
    setScrubTime(null);
    command("seek", { time: next });
  }
  function sendChat(event: React.FormEvent) { event.preventDefault(); if (!chatText.trim()) return; socketRef.current?.emit("chat:send", { roomId, text: chatText }); setChatText(""); }
  function react(emoji: string) { socketRef.current?.emit("reaction:send", { roomId, emoji }); }
  function changeSubtitle(selection: SubtitleSelection) {
    socketRef.current?.emit("subtitle:command", { roomId, selection }, (result: { ok: boolean; error?: string }) => {
      if (!result?.ok) showAppMessage({ title: "Subtitle stayed put", message: result?.error ?? "The room could not change this subtitle.", tone: "warning" });
    });
  }
  function saveIdentity() { const value = newPartyProfile(name, avatar || null); savePartyProfile(value); setProfile(value); }
  function muteLocal(userId: string) { const next = new Set(mutedRef.current); next.has(userId) ? next.delete(userId) : next.add(userId); mutedRef.current = next; setMutedLocally(next); localStorage.setItem("sarvnema_party_muted", JSON.stringify([...next])); }
  async function loadMedia(itemId: string) { const response = await fetch(`/api/watch-party/title/${encodeURIComponent(itemId)}`); if (!response.ok) return null; return response.json() as Promise<PartyMedia>; }
  async function queueMedia(itemId: string, playNow = false) { const media = await loadMedia(itemId); if (!media) return; socketRef.current?.emit(playNow ? "playback:command" : "queue:add", playNow ? { roomId, action: "media", media } : { roomId, media }); setQuery(""); setResults([]); }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setInviteCopied(true);
      showAppMessage({ title: "لینک رفت توی کلیپ‌بورد ✨", message: "حالا بفرست برای رفیقات؛ تنهایی فیلم دیدن دیگه بهانه نیست.", tone: "success" });
    } catch {
      showAppMessage({ title: "کلیپ‌بورد همکاری نکرد 😅", message: "لینک را از نوار آدرس کپی کن؛ پلن B همیشه زنده است.", tone: "warning" });
    }
  }
  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({ title: playbackTitle(), text: "Join my synchronized watch room on SarvNema.", url: window.location.href });
        return;
      } catch (reason) {
        if ((reason as { name?: string })?.name === "AbortError") return;
      }
    }
    await copyInvite();
  }
  function playbackTitle() { return snapshot?.playback.media.title ?? "SarvNema Watch Together"; }

  if (!inviteLoaded) return <PartyMessage title="Opening invite…" text="Checking the room link." />;
  if (!inviteToken) return <PartyMessage title="Invalid invite" text="This room link does not contain an invite token." />;
  if (!profile) return (
    <div className="party-entry party-entry-join">
      <div className="party-entry-card">
        <div className="party-entry-brand">
          <span><WatchTogetherMark /></span>
          <div><small>SARVNEMA ROOMS</small><strong>Watch Together</strong></div>
        </div>
        <div className="party-entry-copy">
          <span className="label">YOU&apos;RE INVITED</span>
          <h1>Join the room</h1>
          <p>Pick the name your friends will see. Your profile stays on this device for the next movie night.</p>
        </div>
        <div className="party-entry-presence" aria-hidden="true">
          <span>Y</span><span>S</span><span>+</span><small>Ready when you are</small>
        </div>
        <label className="party-entry-field">
          <span>Display name</span>
          <input className="search" value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" autoFocus />
        </label>
        <label className="party-entry-field">
          <span>Avatar URL <i>optional</i></span>
          <input className="search" value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="Paste a profile image link" inputMode="url" />
        </label>
        <button className="play-glow party-entry-submit" type="button" disabled={!name.trim()} onClick={saveIdentity}>
          <WatchTogetherMark /> Enter room
        </button>
        <div className="party-entry-divider"><span>or continue with Telegram</span></div>
        <div id="telegram-party-login" />
      </div>
    </div>
  );
  if (error) return <PartyMessage title="Room unavailable" text={error} />;
  if (!snapshot) return <PartyMessage title="Joining room…" text="Connecting to the synchronized session." />;

  const playback = snapshot.playback;
  return <div className="party-layout">
    <Link className="party-sarvnema-corner" href="/" aria-label="Back to SarvNema" title="SarvNema">
      <img src={BRAND_MARK} alt="" />
    </Link>
    <section className="party-main">
      <header className="party-header">
        <div className="party-header-brand">
          <span className="party-header-mark"><WatchTogetherMark /></span>
          <div><span className="label">Watch together · {connected ? "Live" : "Connecting"}</span><h1>{playback.media.title}</h1></div>
        </div>
        <div className="chips party-header-actions">
          <button className="chip party-share-primary" type="button" onClick={shareInvite}><Share2 size={15} /> <span>Share room</span></button>
          <button className="chip party-copy-action" type="button" onClick={copyInvite}>{inviteCopied ? <Check size={15} /> : <Copy size={15} />} <span>{inviteCopied ? "Copied" : "Copy link"}</span></button>
          <button className="chip party-people-action" type="button" onClick={() => setPeopleOpen((value) => !value)} aria-expanded={peopleOpen}><Users size={15} /> <span>{snapshot.participants.filter((item) => item.connected).length}</span></button>
        </div>
      </header>
      <div className="party-player-stage" ref={stageRef}>
        <video ref={videoRef} key={playback.media.source.url} src={playback.media.source.url} poster={playback.media.posterUrl ?? undefined} playsInline preload="auto" onLoadedMetadata={(event) => { setPlayerDuration(event.currentTarget.duration || 0); const state = pendingPlayback.current ?? playback; latestPlayback.current = state; const next = Math.max(0, expectedPosition(state)); remoteSeekInFlight.current = Math.abs(event.currentTarget.currentTime - next) > .05; event.currentTarget.currentTime = next; event.currentTarget.playbackRate = state.playbackRate; if (state.paused) event.currentTarget.pause(); else event.currentTarget.play().catch(() => undefined); }} onTimeUpdate={(event) => { if (scrubTimeRef.current === null) setPlayerTime(event.currentTarget.currentTime); }} onSeeked={finishRemoteSeek} onCanPlay={resumeWhenReady} />
        <div className="party-reaction-layer">{reactions.map((reaction, index) => <div className="party-floating-reaction" key={reaction.id} style={{ left: `${12 + (index * 17) % 72}%` }}>{reaction.avatarUrl ? <img src={reaction.avatarUrl} alt="" /> : <span>{reaction.name.slice(0, 1)}</span>}<b>{reaction.emoji}</b><small>{reaction.name}</small></div>)}</div>
        {socketRef.current && <WatchPartyAccessibility socket={socketRef.current} roomId={roomId} profile={profile} participants={snapshot.participants} canCaption={can("liveCaptions")} onOpenMovieSubtitles={() => { setSubtitlesOpen(true); setSettingsOpen(false); }} />}
        {socketRef.current && <WatchPartyVoice socket={socketRef.current} roomId={roomId} profile={profile} participants={snapshot.participants} mutedLocally={mutedLocally} cameraAllowed={can("camera")} interpreterAllowed={can("interpreter")} interpreterUserId={snapshot.interpreterUserId} />}
        <div className="party-controls"><button type="button" disabled={!can("playback")} onClick={() => command(playback.paused ? "play" : "pause", { time: videoRef.current?.currentTime })}>{playback.paused ? <Play /> : <Pause />}</button><input type="range" min="0" max={playerDuration || 0} value={Math.min(scrubTime ?? playerTime, playerDuration || 0)} disabled={!can("seek")} onChange={(event) => previewSeek(Number(event.target.value))} onPointerUp={commitSeek} onPointerCancel={() => { scrubTimeRef.current = null; setScrubTime(null); }} onKeyUp={commitSeek} onBlur={commitSeek} /><button className={subtitlesOpen ? "is-active" : ""} type="button" onClick={() => { setSubtitlesOpen((value) => !value); setSettingsOpen(false); }} aria-label="Subtitles"><Captions /></button><button className={settingsOpen ? "is-active" : ""} type="button" onClick={() => { setSettingsOpen((value) => !value); setSubtitlesOpen(false); }}><Settings /></button><button type="button" onClick={() => stageRef.current?.requestFullscreen()}><Expand /></button></div>
        {settingsOpen && <div className="party-player-settings"><label>Source<select className="select" value={playback.media.source.url} disabled={!can("changeSource")} onChange={(event) => { const source = playback.media.sources.find((item) => item.url === event.target.value); if (source) command("source", { source, time: videoRef.current?.currentTime }); }}>{playback.media.sources.map((source) => <option value={source.url} key={source.url}>{source.label}</option>)}</select></label><label>Speed<select className="select" value={playback.playbackRate} disabled={!can("playback")} onChange={(event) => command("rate", { rate: Number(event.target.value) })}>{[.5,.75,1,1.25,1.5,2].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}</select></label></div>}
        <PlayerSubtitles videoRef={videoRef} itemId={playback.media.itemId} title={playback.media.title} sourceKey={playback.media.source.url} sourceLabel={playback.media.source.label} open={subtitlesOpen} onClose={() => setSubtitlesOpen(false)} selection={snapshot.subtitle} onSelectionChange={changeSubtitle} canChange={can("subtitles")} shared />
      </div>
      <div className="party-reactions">{["❤️", "😂", "👏", "🔥", "😮", "😢"].map((emoji) => <button key={emoji} type="button" disabled={!can("react")} onClick={() => react(emoji)}>{emoji}</button>)}</div>
      <section className="party-queue"><div className="section-head"><div><h2>Watch queue</h2><p className="muted">Search, add, or switch movies for everyone.</p></div></div><div className="party-media-search"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movie or series…" />{results.length > 0 && <div className="party-search-results">{results.map((item) => <div key={item.imdbCode}><span><strong>{item.title}</strong><small>{item.year ?? ""} · IMDb {item.imdbRating ?? "-"}</small></span><button disabled={!can("queue")} onClick={() => queueMedia(item.imdbCode)}>Queue</button><button disabled={!can("changeMedia")} onClick={() => queueMedia(item.imdbCode, true)}>Play now</button></div>)}</div>}</div><div className="party-queue-list">{snapshot.queue.map((item) => <article key={item.queueId}><strong>{item.title}</strong><span>{item.source.label}</span><div><button disabled={!can("changeMedia")} onClick={() => socketRef.current?.emit("queue:play", { roomId, queueId: item.queueId })}>Play</button><button disabled={!can("queue")} onClick={() => socketRef.current?.emit("queue:remove", { roomId, queueId: item.queueId })}>Remove</button></div></article>)}</div></section>
      <PartyTitleDetails media={playback.media} />
    </section>
    <button className={`party-mobile-scrim ${peopleOpen ? "is-open" : ""}`} type="button" aria-label="Close room panel" onClick={() => setPeopleOpen(false)} />
    <aside className={`party-sidebar ${peopleOpen ? "is-open" : ""}`}>
      <div className="party-tabs"><Users size={17} /><span>Room & chat</span><MessageCircle size={17} /><button className="party-sidebar-close" type="button" onClick={() => setPeopleOpen(false)} aria-label="Close room panel"><X size={18} /></button></div>
      <section className="party-people"><h3>Participants</h3>{snapshot.participants.map((participant) => <Participant key={participant.id} participant={participant} isHost={Boolean(isHost)} mutedLocally={mutedLocally.has(participant.id)} meId={profile.id} guestPermissions={snapshot.guestPermissions} onMuteLocal={() => muteLocal(participant.id)} onPermission={(permission, value) => socketRef.current?.emit("permissions:user", { roomId, userId: participant.id, permissions: { [permission]: value } })} onModerate={(action) => socketRef.current?.emit("moderation", { roomId, userId: participant.id, action })} />)}{isHost && <details className="party-global-permissions"><summary>Guest permissions</summary>{CAPABILITIES.map(({ id, label }) => <label key={id}><input type="checkbox" checked={snapshot.guestPermissions[id]} onChange={(event) => socketRef.current?.emit("permissions:global", { roomId, permissions: { [id]: event.target.checked } })} />{label}</label>)}</details>}</section>
      <section className="party-chat"><div className="party-chat-log">{chat.filter((message) => !mutedLocally.has(message.userId)).map((message) => <div key={message.id}><strong>{message.name}</strong><p>{message.text}</p></div>)}</div><form onSubmit={sendChat}><input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Message room…" disabled={!can("chat")} /><button disabled={!can("chat")}>Send</button></form></section>
    </aside>
  </div>;
}

function PartyTitleDetails({ media }: { media: PartyMedia }) {
  const details = media.details;
  const year = details?.year
    ? details.endYear && details.endYear !== details.year
      ? `${details.year}–${details.endYear}`
      : String(details.year)
    : null;
  const meta = [details?.type, year, details?.certificate].filter(Boolean);

  return (
    <section className="party-title-details" aria-labelledby="party-title-details-heading">
      <div className="party-title-art" aria-hidden="true">
        {media.posterUrl ? <img src={sizedImageUrl(media.posterUrl, 720) ?? media.posterUrl} alt="" loading="lazy" /> : <Film size={36} />}
      </div>
      <div className="party-title-copy">
        <span className="label">NOW PLAYING · TITLE FILE</span>
        <h2 id="party-title-details-heading">{media.title}</h2>
        {meta.length > 0 && <p className="party-title-kicker">{meta.join(" · ")}</p>}
        {details?.tagline && <blockquote>{details.tagline}</blockquote>}
        <p className="party-title-overview">{details?.overview ?? "Open the full title page for story, cast, subtitles, and every available source."}</p>

        <div className="party-title-stats">
          <span><Star size={16} /><small>IMDb</small><strong>{details?.imdbRating?.toFixed(1) ?? "—"}</strong>{details?.imdbVotes ? <em>{formatCompact(details.imdbVotes)} votes</em> : null}</span>
          <span><Clock3 size={16} /><small>Runtime</small><strong>{details?.runtimeMinutes ? `${details.runtimeMinutes}m` : "—"}</strong></span>
          <span><Globe2 size={16} /><small>Origin</small><strong>{details?.countries?.slice(0, 2).join(" / ") || "—"}</strong></span>
          <span><Film size={16} /><small>Playing</small><strong>{media.source.quality || media.source.label || "Auto"}</strong></span>
        </div>

        {(details?.genres.length ?? 0) > 0 && <div className="party-title-genres">{details?.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>}
        {(details?.languages.length ?? 0) > 0 && <p className="party-title-languages"><strong>Languages</strong> {details?.languages.join(" · ")}</p>}

        <div className="party-title-actions">
          <Link href={`/${encodeURIComponent(media.itemId)}`}>Full title details <ExternalLink size={14} /></Link>
          {details?.imdbUrl && <a href={details.imdbUrl} target="_blank" rel="noreferrer">Open IMDb <ExternalLink size={14} /></a>}
        </div>
      </div>

      {(details?.credits.length ?? 0) > 0 && (
        <div className="party-cast-block">
          <div><span className="label">CAST</span><strong>Faces in this title</strong></div>
          <div className="party-cast-rail">
            {details?.credits.map((credit) => (
              <Link className="party-cast-card" href={credit.id ? `/person/${encodeURIComponent(credit.id)}` : `/${encodeURIComponent(media.itemId)}`} key={`${credit.id ?? credit.name}-${credit.role}`}>
                {credit.imageUrl ? <img src={sizedImageUrl(credit.imageUrl, 180) ?? credit.imageUrl} alt="" loading="lazy" /> : <span>{credit.name.slice(0, 1)}</span>}
                <strong>{credit.name}</strong>
                <small>{credit.role}</small>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function Participant({ participant, isHost, mutedLocally, meId, guestPermissions, onMuteLocal, onPermission, onModerate }: { participant: PartyParticipant; isHost: boolean; mutedLocally: boolean; meId: string; guestPermissions: PartyPermissions; onMuteLocal: () => void; onPermission: (permission: PartyCapability, value: boolean) => void; onModerate: (action: "kick" | "block" | "mute" | "unmute" | "cameraOff") => void }) {
  return <details className="party-person"><summary>{participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : <span>{participant.name.slice(0, 1)}</span>}<b>{participant.name}</b><small>{participant.role}{participant.connected ? " · online" : " · offline"}</small></summary>{participant.id !== meId && <div className="party-person-actions"><button onClick={onMuteLocal}>{mutedLocally ? "Unhide locally" : "Mute locally"}</button>{isHost && participant.role !== "host" && <><button onClick={() => onModerate(participant.mutedByHost ? "unmute" : "mute")}>{participant.mutedByHost ? "Unmute room" : "Mute room"}</button><button onClick={() => onModerate("cameraOff")}>Stop camera</button><button onClick={() => onModerate("kick")}>Kick</button><button onClick={() => onModerate("block")}>Block</button><div className="party-person-permissions">{CAPABILITIES.map(({ id, label }) => <label key={id}><input type="checkbox" checked={participant.permissions[id] ?? guestPermissions[id]} onChange={(event) => onPermission(id, event.target.checked)} />{label}</label>)}</div></>}</div>}</details>;
}

function PartyMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="party-entry">
      <div className="party-entry-card party-entry-status">
        <span className="party-entry-status-mark"><WatchTogetherMark /></span>
        <span className="party-entry-loader" aria-hidden="true" />
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
