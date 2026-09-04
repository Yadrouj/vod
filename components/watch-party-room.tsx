"use client";

import Link from "next/link";
import { Captions, Check, Clock3, Copy, Disc3, ExternalLink, FileUp, Film, Globe2, Link2, LoaderCircle, Maximize2, MessageCircle, Minimize2, Pause, Play, Send, Settings, Share2, SmilePlus, Star, Upload, Users, Video, Volume2, X } from "lucide-react";
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
import { inferPersonalMediaKind, isSupportedPersonalMediaFile, type PersonalMediaFields, type PersonalMediaKind, type PersonalMediaMode } from "@/lib/watch-party-personal-media";

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
  { id: "changeMedia", label: "Change movie" }, { id: "queue", label: "Manage queue" }, { id: "addPersonalMedia", label: "Add personal media" }, { id: "chat", label: "Chat" }, { id: "react", label: "Reactions" },
  { id: "subtitles", label: "Change room subtitles" }, { id: "camera", label: "Stream camera" },
  { id: "liveCaptions", label: "Share live captions" }, { id: "interpreter", label: "Sign interpreter" }, { id: "shareLocalAudio", label: "Share local music" },
];
const REACTION_EMOJIS = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDC4F", "\uD83D\uDD25", "\uD83D\uDE2E", "\uD83D\uDE22"];

export function WatchPartyRoom({ roomId }: { roomId: string }) {
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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
  const hudTimerRef = useRef<number | null>(null);
  const hudSuppressedUntilRef = useRef(0);
  const stageChatLogRef = useRef<HTMLDivElement>(null);
  const failedSourceUrlsRef = useRef<Set<string>>(new Set());
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
  const [roomSocket, setRoomSocket] = useState<Socket | null>(null);
  const [hudVisible, setHudVisible] = useState(true);
  const [stagePanel, setStagePanel] = useState<"chat" | "reactions" | null>(null);
  const [stageFullscreen, setStageFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const personalFileInputRef = useRef<HTMLInputElement>(null);
  const [personalMediaOpen, setPersonalMediaOpen] = useState(false);
  const [personalMediaTab, setPersonalMediaTab] = useState<"upload" | "link">("upload");
  const [personalFile, setPersonalFile] = useState<File | null>(null);
  const [personalUrl, setPersonalUrl] = useState("");
  const [personalTitle, setPersonalTitle] = useState("");
  const [personalKind, setPersonalKind] = useState<PersonalMediaKind>("video");
  const [personalSeason, setPersonalSeason] = useState("");
  const [personalEpisode, setPersonalEpisode] = useState("");
  const [personalMediaBusy, setPersonalMediaBusy] = useState(false);
  const [personalMediaError, setPersonalMediaError] = useState("");
  const [mediaIssue, setMediaIssue] = useState("");

  const me = snapshot?.participants.find((participant) => participant.id === profile?.id);
  const isHost = snapshot?.ownerId === profile?.id;
  const can = (capability: PartyCapability) => Boolean(isHost || (me && (me.permissions[capability] ?? snapshot?.guestPermissions[capability])));

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = readPartyProfile(); if (saved) setProfile(saved);
      setInviteToken(new URLSearchParams(window.location.search).get("invite") ?? ""); setInviteLoaded(true);
      try { const muted = new Set<string>(JSON.parse(localStorage.getItem("sarvnema_party_muted") ?? "[]")); mutedRef.current = muted; setMutedLocally(muted); } catch {}
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateFullscreenState = () => {
      const active = document.fullscreenElement === stageRef.current;
      setStageFullscreen(active);
      setHudVisible(true);
      if (hudTimerRef.current !== null) window.clearTimeout(hudTimerRef.current);
      if (active) hudTimerRef.current = window.setTimeout(() => setHudVisible(false), 4_500);
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      if (hudTimerRef.current !== null) window.clearTimeout(hudTimerRef.current);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("party-cinema-lock", pseudoFullscreen);
    const exitPseudoFullscreen = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPseudoFullscreen(false);
    };
    if (pseudoFullscreen) window.addEventListener("keydown", exitPseudoFullscreen);
    return () => {
      window.removeEventListener("keydown", exitPseudoFullscreen);
      document.body.classList.remove("party-cinema-lock");
    };
  }, [pseudoFullscreen]);

  useEffect(() => {
    if (stagePanel !== "chat") return;
    const frame = window.requestAnimationFrame(() => {
      const log = stageChatLogRef.current;
      if (log) log.scrollTop = log.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chat, stagePanel]);

  useEffect(() => {
    if (!profile) return;
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
      const video = state.media.mediaKind === "audio" ? audioRef.current : videoRef.current;
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
    socket.on("connect", () => { setRoomSocket(socket); socket.emit("room:join", { roomId, inviteToken, profile }, (result: { ok: boolean; snapshot?: PartySnapshot; error?: string }) => { if (!result.ok || !result.snapshot) { setError(result.error ?? "Could not join room"); return; } setSnapshot(result.snapshot); setChat(result.snapshot.chat); setConnected(true); applyPlayback({ ...result.snapshot.playback, serverNow: result.snapshot.serverNow }); }); });
    socket.on("disconnect", () => setRoomSocket((current) => current === socket ? null : current));
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
    if (!query.trim()) {
      const emptyTimer = window.setTimeout(() => setResults([]), 0);
      return () => window.clearTimeout(emptyTimer);
    }
    const endpoint = snapshot?.playback.media.catalogue === "music" ? "/api/music/search" : "/api/suggest";
    const timer = window.setTimeout(() => fetch(`${endpoint}?q=${encodeURIComponent(query)}`).then((response) => response.json()).then((data) => setResults(data.items ?? [])).catch(() => setResults([])), 250);
    return () => window.clearTimeout(timer);
  }, [query, snapshot?.playback.media.catalogue]);

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
  function resumeWhenReady(event: React.SyntheticEvent<HTMLMediaElement>) {
    const video = event.currentTarget;
    const state = latestPlayback.current;
    if (!state) return;
    video.playbackRate = state.playbackRate;
    if (state.paused) video.pause();
    else video.play().catch(() => undefined);
  }
  function handleLoadedMetadata(event: React.SyntheticEvent<HTMLMediaElement>) {
    const player = event.currentTarget;
    failedSourceUrlsRef.current.delete(player.currentSrc || player.getAttribute("src") || "");
    setMediaIssue("");
    setPlayerDuration(player.duration || 0);
    const state = pendingPlayback.current ?? playback;
    latestPlayback.current = state;
    const next = Math.max(0, expectedPosition(state));
    remoteSeekInFlight.current = Math.abs(player.currentTime - next) > .05;
    player.currentTime = next;
    player.playbackRate = state.playbackRate;
    if (state.paused) player.pause();
    else player.play().catch(() => undefined);
  }
  function handleMediaError(event: React.SyntheticEvent<HTMLMediaElement>) {
    const media = snapshot?.playback.media;
    if (!media) return;
    const failedUrl = event.currentTarget.getAttribute("src") || media.source.url;
    if (failedSourceUrlsRef.current.has(failedUrl)) return;
    failedSourceUrlsRef.current.add(failedUrl);
    const nextSource = media.sources.find((source) => source.url !== failedUrl && !failedSourceUrlsRef.current.has(source.url));
    if (nextSource && can("changeSource")) {
      setMediaIssue(`Source unavailable. Switching everyone to ${nextSource.label}…`);
      command("source", { source: nextSource, time: Math.max(0, event.currentTarget.currentTime || expectedPosition()) });
      return;
    }
    setMediaIssue(nextSource ? "This source is unavailable. The host can switch the room source." : "No browser-playable source is currently available for this title.");
  }
  function finishRemoteSeek(event: React.SyntheticEvent<HTMLMediaElement>) {
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
  function clearHudTimer() {
    if (hudTimerRef.current === null) return;
    window.clearTimeout(hudTimerRef.current);
    hudTimerRef.current = null;
  }
  function revealHud(delay = 3_600) {
    clearHudTimer();
    setHudVisible(true);
    if (stagePanel || settingsOpen || subtitlesOpen) return;
    hudTimerRef.current = window.setTimeout(() => {
      setHudVisible(false);
      hudTimerRef.current = null;
    }, delay);
  }
  function hideHud() {
    clearHudTimer();
    hudSuppressedUntilRef.current = Date.now() + 650;
    setHudVisible(false);
    setStagePanel(null);
    setSettingsOpen(false);
    setSubtitlesOpen(false);
  }
  function handleStageClick(event: React.MouseEvent<HTMLDivElement>) {
    if (isStageUiTarget(event.target)) return;
    if (hudVisible) hideHud();
    else revealHud(4_200);
  }
  function handleStagePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || Date.now() < hudSuppressedUntilRef.current) return;
    revealHud();
  }
  function toggleStagePanel(panel: "chat" | "reactions") {
    clearHudTimer();
    setHudVisible(true);
    setSettingsOpen(false);
    setSubtitlesOpen(false);
    setStagePanel((current) => current === panel ? null : panel);
  }
  async function toggleStageFullscreen() {
    const stage = stageRef.current;
    if (!stage) return;
    clearHudTimer();
    setHudVisible(true);
    if (pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }
    if (document.fullscreenElement === stage) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    try {
      await stage.requestFullscreen();
    } catch {
      setPseudoFullscreen(true);
    }
  }
  function sendChat(event: React.FormEvent) { event.preventDefault(); if (!chatText.trim()) return; socketRef.current?.emit("chat:send", { roomId, text: chatText }); setChatText(""); }
  function react(emoji: string) { socketRef.current?.emit("reaction:send", { roomId, emoji }); }
  function changeSubtitle(selection: SubtitleSelection) {
    socketRef.current?.emit("subtitle:command", { roomId, selection }, (result: { ok: boolean; error?: string }) => {
      if (!result?.ok) showAppMessage({ title: "Subtitle stayed put", message: result?.error ?? "The room could not change this subtitle.", tone: "warning" });
    });
  }
  function saveIdentity() { const value = newPartyProfile(name, avatar || null); savePartyProfile(value); setProfile(value); }
  function muteLocal(userId: string) { const next = new Set(mutedRef.current); if (next.has(userId)) next.delete(userId); else next.add(userId); mutedRef.current = next; setMutedLocally(next); localStorage.setItem("sarvnema_party_muted", JSON.stringify([...next])); }
  async function loadMedia(itemId: string) {
    const catalogue = snapshot?.playback.media.catalogue === "music" ? "music" : "title";
    const response = await fetch(`/api/watch-party/${catalogue}/${encodeURIComponent(itemId)}`);
    if (!response.ok) return null;
    return response.json() as Promise<PartyMedia>;
  }
  async function queueMedia(itemId: string, playNow = false) { const media = await loadMedia(itemId); if (!media) return; socketRef.current?.emit(playNow ? "playback:command" : "queue:add", playNow ? { roomId, action: "media", media } : { roomId, media }); setQuery(""); setResults([]); }
  function personalFields() {
    const normalizeNumber = (value: string) => {
      const number = Number(value);
      return Number.isInteger(number) && number > 0 ? number : null;
    };
    return { title: personalTitle.trim(), mediaKind: personalKind, season: normalizeNumber(personalSeason), episode: normalizeNumber(personalEpisode) };
  }
  function resetPersonalMediaForm() {
    setPersonalFile(null);
    setPersonalUrl("");
    setPersonalTitle("");
    setPersonalSeason("");
    setPersonalEpisode("");
    setPersonalMediaError("");
    if (personalFileInputRef.current) personalFileInputRef.current.value = "";
  }
  function choosePersonalFile(file: File | null) {
    if (!file) return;
    const kind = inferPersonalMediaKind(file.name, file.type);
    if (!kind || !isSupportedPersonalMediaFile(file.name, file.type)) {
      setPersonalFile(null);
      setPersonalMediaError("Choose a browser-playable audio or video file (MP3, M4A, WAV, OGG, MP4, WebM, or OGV).");
      return;
    }
    setPersonalMediaError("");
    setPersonalFile(file);
    setPersonalKind(kind);
    if (!personalTitle.trim()) setPersonalTitle(file.name.replace(/\.[a-z0-9]{2,8}$/i, ""));
  }
  async function addPersonalMedia(mode: PersonalMediaMode) {
    const socket = socketRef.current;
    if (!socket || !connected) {
      setPersonalMediaError("The room is still connecting. Try again in a moment.");
      return;
    }
    if (!can("addPersonalMedia")) {
      setPersonalMediaError("Ask the host to enable Add personal media in room permissions.");
      return;
    }
    if (mode === "now" && !can("changeMedia")) {
      setPersonalMediaError("You can queue your media, but the host controls what plays now.");
      return;
    }
    setPersonalMediaBusy(true);
    setPersonalMediaError("");
    try {
      if (personalMediaTab === "link") {
        if (!personalUrl.trim()) throw new Error("Paste a public HTTPS media link first.");
        const result = await emitPersonalLink(socket, roomId, { url: personalUrl, fields: personalFields(), mode });
        if (!result.ok) throw new Error(result.error ?? "The room could not use that link.");
      } else {
        const file = personalFile;
        if (!file) throw new Error("Choose an audio or video file first.");
        const kind = inferPersonalMediaKind(file.name, file.type);
        if (!kind) throw new Error("That file is not browser-playable.");
        const grant = await emitPersonalUploadGrant(socket, roomId, kind);
        if (!grant.ok || !grant.grant || !grant.endpoint) throw new Error(grant.error ?? "The room could not prepare a temporary upload.");
        if (typeof grant.maxBytes === "number" && file.size > grant.maxBytes) {
          throw new Error(`This file is larger than the room's ${kind === "audio" ? "audio" : "video"} upload limit.`);
        }
        const form = new FormData();
        form.set("file", file);
        form.set("title", personalTitle.trim());
        form.set("mediaKind", kind);
        form.set("season", personalSeason.trim());
        form.set("episode", personalEpisode.trim());
        const response = await fetch(grant.endpoint, { method: "POST", headers: { "x-party-upload-grant": grant.grant }, body: form });
        const uploaded = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; mediaId?: string };
        if (!response.ok || !uploaded.ok || !uploaded.mediaId) throw new Error(uploaded.error ?? "The temporary upload did not finish.");
        const result = await emitPersonalUploadApply(socket, roomId, uploaded.mediaId, mode);
        if (!result.ok) throw new Error(result.error ?? "The room could not use that temporary upload.");
      }
      const action = mode === "now" ? "is now ready for everyone" : "joined the room queue";
      showAppMessage({ title: "Personal media added", message: `Your temporary media ${action}. It automatically disappears in 3 hours.`, tone: "success" });
      resetPersonalMediaForm();
      setPersonalMediaOpen(false);
    } catch (reason) {
      setPersonalMediaError(reason instanceof Error ? reason.message : "The room media could not be added.");
    } finally {
      setPersonalMediaBusy(false);
    }
  }
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
  const isListeningRoom = playback.media.mediaKind === "audio";
  const cinemaFullscreen = stageFullscreen || pseudoFullscreen;
  const roomChat = chat.filter((message) => !mutedLocally.has(message.userId));
  const latestChat = roomChat.at(-1);
  const queueTitle = isListeningRoom ? "Listen queue" : "Watch queue";
  const queueDescription = isListeningRoom ? "Add tracks, personal audio, or a direct media link for everyone." : "Search, add, or switch movies, episodes, and personal media for everyone.";
  return <div className={`party-layout ${isListeningRoom ? "party-theme-music" : "party-theme-cinema"}`}>
    <Link className="party-sarvnema-corner" href="/" aria-label="Back to SarvNema" title="SarvNema">
      <img src={BRAND_MARK} alt="" />
    </Link>
    <section className="party-main">
      <header className="party-header">
        <div className="party-header-brand">
          <span className="party-header-mark"><WatchTogetherMark /></span>
          <div><span className="label">{isListeningRoom ? "Listen together" : "Watch together"} · {connected ? "Live" : "Connecting"}</span><h1>{playback.media.title}</h1></div>
        </div>
        <div className="chips party-header-actions">
          <button className="chip party-share-primary" type="button" onClick={shareInvite}><Share2 size={15} /> <span>Share room</span></button>
          <button className="chip party-copy-action" type="button" onClick={copyInvite}>{inviteCopied ? <Check size={15} /> : <Copy size={15} />} <span>{inviteCopied ? "Copied" : "Copy link"}</span></button>
          <button className="chip party-people-action" type="button" onClick={() => setPeopleOpen((value) => !value)} aria-expanded={peopleOpen}><Users size={15} /> <span>{snapshot.participants.filter((item) => item.connected).length}</span></button>
        </div>
      </header>
      <div
        className={`party-player-stage ${isListeningRoom ? "party-listening-stage" : ""} ${hudVisible ? "is-hud-visible" : "is-hud-hidden"} ${cinemaFullscreen ? "is-cinema-fullscreen" : ""} ${pseudoFullscreen ? "is-pseudo-fullscreen" : ""} ${stagePanel ? `has-${stagePanel}-panel` : ""}`}
        ref={stageRef}
        onClick={handleStageClick}
        onPointerMove={handleStagePointerMove}
        onPointerDownCapture={(event) => { if (isStageUiTarget(event.target)) revealHud(); }}
      >
        {isListeningRoom ? (
          <>
            <audio ref={audioRef} key={playback.media.source.url} src={playback.media.source.url} preload="auto" onLoadedMetadata={handleLoadedMetadata} onError={handleMediaError} onTimeUpdate={(event) => { if (scrubTimeRef.current === null) setPlayerTime(event.currentTarget.currentTime); }} onSeeked={finishRemoteSeek} onCanPlay={resumeWhenReady} />
            <div className="party-listening-art" style={playback.media.posterUrl ? { backgroundImage: `url(${playback.media.posterUrl})` } : undefined} aria-hidden="true"><div>{playback.media.posterUrl ? <img src={playback.media.posterUrl} alt="" /> : <Disc3 size={84} />}</div></div>
            <div className="party-listening-copy" data-player-ui="true"><span>LISTEN TOGETHER · LIVE SYNC</span><h2>{playback.media.title}</h2><p>{playback.media.artistName || playback.media.details?.credits?.map((credit) => credit.name).join(" · ") || "Shared music room"}</p><small>{snapshot.participants.filter((item) => item.connected).length} people in the room · {playback.paused ? "paused" : "playing together"}</small></div>
            <div className="party-listening-wave" aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ "--wave": `${28 + (index * 19) % 72}%`, "--delay": `${index * -0.07}s` } as React.CSSProperties} />)}</div>
          </>
        ) : <video ref={videoRef} key={playback.media.source.url} src={playback.media.source.url} poster={playback.media.posterUrl ?? undefined} playsInline preload="auto" onLoadedMetadata={handleLoadedMetadata} onError={handleMediaError} onTimeUpdate={(event) => { if (scrubTimeRef.current === null) setPlayerTime(event.currentTarget.currentTime); }} onSeeked={finishRemoteSeek} onCanPlay={resumeWhenReady} />}
        {mediaIssue && <div className="party-media-issue" data-player-ui="true"><LoaderCircle size={18} /><span>{mediaIssue}</span></div>}
        <div className="party-cinema-shade" aria-hidden="true" />
        <div className="party-reaction-layer">{reactions.map((reaction, index) => <div className="party-floating-reaction" key={reaction.id} style={{ left: `${12 + (index * 17) % 72}%` }}>{reaction.avatarUrl ? <img src={reaction.avatarUrl} alt="" /> : <span>{reaction.name.slice(0, 1)}</span>}<b>{reaction.emoji}</b><small>{reaction.name}</small></div>)}</div>
        {roomSocket && !isListeningRoom && <WatchPartyAccessibility controlsVisible={hudVisible} socket={roomSocket} roomId={roomId} participants={snapshot.participants} canCaption={can("liveCaptions")} onOpenMovieSubtitles={() => { clearHudTimer(); setHudVisible(true); setStagePanel(null); setSubtitlesOpen(true); setSettingsOpen(false); }} />}
        {roomSocket && <WatchPartyVoice controlsVisible={hudVisible} socket={roomSocket} roomId={roomId} profile={profile} participants={snapshot.participants} mutedLocally={mutedLocally} cameraAllowed={can("camera")} interpreterAllowed={can("interpreter")} interpreterUserId={snapshot.interpreterUserId} isListeningRoom={isListeningRoom} localAudioAllowed={can("shareLocalAudio")} sharedAudio={snapshot.sharedAudio ?? null} />}

        {latestChat && stagePanel !== "chat" && (
          <button className="party-chat-peek" type="button" data-player-ui="true" onClick={() => toggleStagePanel("chat")}>
            <span>{latestChat.avatarUrl ? <img src={latestChat.avatarUrl} alt="" /> : latestChat.name.slice(0, 1)}</span>
            <span><strong>{latestChat.name}</strong><small>{latestChat.text}</small></span>
          </button>
        )}

        {stagePanel === "chat" && (
          <section className="party-stage-chat-panel" data-player-ui="true" aria-label="Room chat">
            <header>
              <div><MessageCircle size={17} /><span><strong>Room chat</strong><small>{snapshot.participants.filter((item) => item.connected).length} watching</small></span></div>
              <button type="button" onClick={() => { setStagePanel(null); revealHud(); }} aria-label="Close chat"><X size={16} /></button>
            </header>
            <div className="party-stage-chat-log" ref={stageChatLogRef}>
              {roomChat.length > 0 ? roomChat.slice(-30).map((message) => (
                <div className={message.userId === profile.id ? "is-me" : ""} key={message.id}>
                  <strong>{message.name}</strong><p>{message.text}</p>
                </div>
              )) : <p className="party-stage-chat-empty">No messages yet. Someone has to break the cinematic silence.</p>}
            </div>
            <form onSubmit={sendChat}>
              <input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Message the room…" disabled={!can("chat")} aria-label="Message the room" />
              <button type="submit" disabled={!can("chat") || !chatText.trim()} aria-label="Send message"><Send size={16} /></button>
            </form>
          </section>
        )}

        {stagePanel === "reactions" && (
          <div className="party-stage-reaction-tray" data-player-ui="true" aria-label="Send a reaction">
            {REACTION_EMOJIS.map((emoji) => <button key={emoji} type="button" disabled={!can("react")} onClick={() => { react(emoji); revealHud(); }}>{emoji}</button>)}
          </div>
        )}

        <div className="party-controls" data-player-ui="true">
          <button type="button" disabled={!can("playback")} onClick={() => command(playback.paused ? "play" : "pause", { time: (isListeningRoom ? audioRef.current : videoRef.current)?.currentTime })} aria-label={playback.paused ? "Play" : "Pause"}>{playback.paused ? <Play /> : <Pause />}</button>
          <input className="party-seek-control" dir="ltr" type="range" min="0" max={playerDuration || 0} value={Math.min(scrubTime ?? playerTime, playerDuration || 0)} disabled={!can("seek")} aria-label="Playback position" onChange={(event) => previewSeek(Number(event.target.value))} onPointerUp={commitSeek} onPointerCancel={() => { scrubTimeRef.current = null; setScrubTime(null); }} onKeyUp={commitSeek} onBlur={commitSeek} />
          {!isListeningRoom && <button className={subtitlesOpen ? "is-active" : ""} type="button" onClick={() => { clearHudTimer(); setHudVisible(true); setStagePanel(null); setSubtitlesOpen((value) => !value); setSettingsOpen(false); }} aria-label="Subtitles" title="Subtitles"><Captions /></button>}
          <button className={stagePanel === "reactions" ? "is-active" : ""} type="button" onClick={() => toggleStagePanel("reactions")} aria-label="Reactions" title="Reactions" aria-expanded={stagePanel === "reactions"}><SmilePlus /></button>
          <button className={stagePanel === "chat" ? "is-active" : ""} type="button" onClick={() => toggleStagePanel("chat")} aria-label="Room chat" title="Room chat" aria-expanded={stagePanel === "chat"}><MessageCircle />{roomChat.length > 0 && <small>{Math.min(roomChat.length, 99)}</small>}</button>
          <button className={settingsOpen ? "is-active" : ""} type="button" onClick={() => { clearHudTimer(); setHudVisible(true); setStagePanel(null); setSettingsOpen((value) => !value); setSubtitlesOpen(false); }} aria-label="Playback settings" title="Playback settings"><Settings /></button>
          <button type="button" onClick={() => void toggleStageFullscreen()} aria-label={cinemaFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={cinemaFullscreen ? "Exit fullscreen" : "Fullscreen"}>{cinemaFullscreen ? <Minimize2 /> : <Maximize2 />}</button>
        </div>
        {settingsOpen && <div className="party-player-settings" data-player-ui="true"><label>{isListeningRoom ? "Audio source" : "Source"}<select className="select" value={playback.media.source.url} disabled={!can("changeSource")} onChange={(event) => { const source = playback.media.sources.find((item) => item.url === event.target.value); if (source) command("source", { source, time: (isListeningRoom ? audioRef.current : videoRef.current)?.currentTime }); }}>{playback.media.sources.map((source) => <option value={source.url} key={source.url}>{source.label}</option>)}</select></label><label>Speed<select className="select" value={playback.playbackRate} disabled={!can("playback")} onChange={(event) => command("rate", { rate: Number(event.target.value) })}>{[.5,.75,1,1.25,1.5,2].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}</select></label></div>}
        {!isListeningRoom && <PlayerSubtitles videoRef={videoRef} itemId={playback.media.itemId} title={playback.media.title} sourceKey={playback.media.source.url} sourceLabel={playback.media.source.label} sourceSubtitleUrl={playback.media.source.subtitleUrl ?? null} open={subtitlesOpen} onClose={() => setSubtitlesOpen(false)} selection={snapshot.subtitle} onSelectionChange={changeSubtitle} canChange={can("subtitles")} shared />}
      </div>
      <section className="party-queue">
        <div className="section-head"><div><h2>{queueTitle}</h2><p className="muted">{queueDescription}</p></div></div>
        <section className={`party-personal-media ${personalMediaOpen ? "is-open" : ""}`} aria-label="Personal room media">
          <header>
            <div><span><FileUp size={17} /> Your media, room-safe</span><small>Upload a browser-playable file or paste a direct HTTPS link. Temporary uploads disappear after 3 hours.</small></div>
            <button type="button" className="party-personal-media-toggle" aria-expanded={personalMediaOpen} onClick={() => { setPersonalMediaOpen((value) => !value); setPersonalMediaError(""); }}>
              {personalMediaOpen ? "Close" : "Add personal media"}
            </button>
          </header>
          {personalMediaOpen && (
            <div className="party-personal-media-form">
              <div className="party-personal-media-tabs" role="tablist" aria-label="Personal media source">
                <button type="button" role="tab" aria-selected={personalMediaTab === "upload"} className={personalMediaTab === "upload" ? "is-active" : ""} onClick={() => { setPersonalMediaTab("upload"); setPersonalMediaError(""); }}><Upload size={15} /> Upload file</button>
                <button type="button" role="tab" aria-selected={personalMediaTab === "link"} className={personalMediaTab === "link" ? "is-active" : ""} onClick={() => { setPersonalMediaTab("link"); setPersonalMediaError(""); }}><Link2 size={15} /> Paste link</button>
              </div>
              {personalMediaTab === "upload" ? (
                <>
                  <input ref={personalFileInputRef} className="party-personal-file-input" type="file" accept="audio/*,video/*,.mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.flac,.mp4,.m4v,.webm,.ogv" onChange={(event) => choosePersonalFile(event.currentTarget.files?.[0] ?? null)} />
                  <button type="button" className="party-personal-dropzone" onClick={() => personalFileInputRef.current?.click()} disabled={!can("addPersonalMedia") || personalMediaBusy}>
                    {personalFile ? (personalKind === "audio" ? <Volume2 size={22} /> : <Video size={22} />) : <Upload size={22} />}
                    <span><strong>{personalFile?.name ?? "Choose a file from this device"}</strong><small>{personalFile ? `${Math.max(.1, personalFile.size / 1024 / 1024).toFixed(1)} MB · ${personalKind}` : "MP3, M4A, WAV, OGG, MP4, WebM, or OGV"}</small></span>
                  </button>
                </>
              ) : (
                <label className="party-personal-field"><span>Direct HTTPS media link</span><input className="search" value={personalUrl} onChange={(event) => setPersonalUrl(event.target.value)} placeholder="https://example.com/shared-track.mp3" inputMode="url" autoComplete="url" /></label>
              )}
              <div className="party-personal-fields">
                <label className="party-personal-field"><span>Title <i>optional</i></span><input className="search" value={personalTitle} onChange={(event) => setPersonalTitle(event.target.value)} placeholder="Give the room a useful name" maxLength={120} /></label>
                <label className="party-personal-field"><span>Type</span><select className="select" value={personalKind} onChange={(event) => setPersonalKind(event.target.value as PersonalMediaKind)}><option value="audio">Audio</option><option value="video">Video / episode</option></select></label>
                {personalKind === "video" && <><label className="party-personal-field party-personal-coordinate"><span>Season <i>optional</i></span><input className="search" value={personalSeason} onChange={(event) => setPersonalSeason(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="S" /></label><label className="party-personal-field party-personal-coordinate"><span>Episode <i>optional</i></span><input className="search" value={personalEpisode} onChange={(event) => setPersonalEpisode(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="E" /></label></>}
              </div>
              {personalMediaError && <p className="party-personal-media-error">{personalMediaError}</p>}
              <div className="party-personal-media-actions">
                <button type="button" className="party-personal-queue" disabled={!can("addPersonalMedia") || personalMediaBusy} onClick={() => void addPersonalMedia("queue")}>{personalMediaBusy ? <LoaderCircle className="is-spinning" size={16} /> : <FileUp size={16} />} Add to queue</button>
                <button type="button" className="party-personal-play" disabled={!can("addPersonalMedia") || !can("changeMedia") || personalMediaBusy} onClick={() => void addPersonalMedia("now")}>{personalMediaBusy ? <LoaderCircle className="is-spinning" size={16} /> : <Play size={16} fill="currentColor" />} Play for everyone</button>
                <button type="button" className="party-personal-reset" disabled={personalMediaBusy} onClick={resetPersonalMediaForm}>Reset</button>
              </div>
              {!can("addPersonalMedia") && <p className="party-personal-media-note">The host can enable this under Room &amp; chat → Guest permissions.</p>}
            </div>
          )}
        </section>
        <div className="party-media-search"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isListeningRoom ? "Search music…" : "Search movie or series…"} />{results.length > 0 && <div className="party-search-results">{results.map((item) => <div key={item.imdbCode}><span><strong>{item.title}</strong><small>{item.year ?? ""} · IMDb {item.imdbRating ?? "-"}</small></span><button disabled={!can("queue")} onClick={() => queueMedia(item.imdbCode)}>Queue</button><button disabled={!can("changeMedia")} onClick={() => queueMedia(item.imdbCode, true)}>Play now</button></div>)}</div>}</div>
        <div className="party-queue-list">{snapshot.queue.map((item) => <article key={item.queueId}><strong>{item.title}</strong><span>{item.source.label}{item.source.season && item.source.episode ? ` · S${item.source.season}E${item.source.episode}` : ""}</span><div><button disabled={!can("changeMedia")} onClick={() => socketRef.current?.emit("queue:play", { roomId, queueId: item.queueId })}>Play</button><button disabled={!can("queue")} onClick={() => socketRef.current?.emit("queue:remove", { roomId, queueId: item.queueId })}>Remove</button></div></article>)}</div>
      </section>
      <PartyTitleDetails media={playback.media} />
    </section>
    <button className={`party-mobile-scrim ${peopleOpen ? "is-open" : ""}`} type="button" aria-label="Close room panel" onClick={() => setPeopleOpen(false)} />
    <aside className={`party-sidebar ${peopleOpen ? "is-open" : ""}`}>
      <div className="party-tabs"><Users size={17} /><span>Room & chat</span><MessageCircle size={17} /><button className="party-sidebar-close" type="button" onClick={() => setPeopleOpen(false)} aria-label="Close room panel"><X size={18} /></button></div>
      <section className="party-people"><h3>Participants</h3>{snapshot.participants.map((participant) => <Participant key={participant.id} participant={participant} isHost={Boolean(isHost)} mutedLocally={mutedLocally.has(participant.id)} meId={profile.id} guestPermissions={snapshot.guestPermissions} sharingLocalAudio={snapshot.sharedAudio?.userId === participant.id} onMuteLocal={() => muteLocal(participant.id)} onPermission={(permission, value) => socketRef.current?.emit("permissions:user", { roomId, userId: participant.id, permissions: { [permission]: value } })} onModerate={(action) => socketRef.current?.emit("moderation", { roomId, userId: participant.id, action })} />)}{isHost && <details className="party-global-permissions"><summary>Guest permissions</summary>{CAPABILITIES.map(({ id, label }) => <label key={id}><input type="checkbox" checked={snapshot.guestPermissions[id]} onChange={(event) => socketRef.current?.emit("permissions:global", { roomId, permissions: { [id]: event.target.checked } })} />{label}</label>)}</details>}</section>
      <section className="party-chat"><div className="party-chat-log">{roomChat.map((message) => <div key={message.id}><strong>{message.name}</strong><p>{message.text}</p></div>)}</div><form onSubmit={sendChat}><input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Message room…" disabled={!can("chat")} /><button disabled={!can("chat")}>Send</button></form></section>
    </aside>
  </div>;
}

type PartyEventAck = { ok?: boolean; error?: string };
type PersonalUploadGrantAck = PartyEventAck & { grant?: string; endpoint?: string; expiresAt?: number; maxBytes?: number };

function emitPartyAck<T extends PartyEventAck>(socket: Socket, event: string, payload: Record<string, unknown>) {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: "The room did not respond. Check your connection and try again." } as T);
    }, 12_000);
    socket.emit(event, payload, (result: T | undefined) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result ?? ({ ok: false, error: "The room could not finish that action." } as T));
    });
  });
}

function emitPersonalUploadGrant(socket: Socket, roomId: string, mediaKind: PersonalMediaKind) {
  return emitPartyAck<PersonalUploadGrantAck>(socket, "personal-media:upload-grant", { roomId, mediaKind });
}

function emitPersonalLink(socket: Socket, roomId: string, payload: { url: string; fields: PersonalMediaFields; mode: PersonalMediaMode }) {
  return emitPartyAck<PartyEventAck>(socket, "personal-media:link", { roomId, ...payload });
}

function emitPersonalUploadApply(socket: Socket, roomId: string, mediaId: string, mode: PersonalMediaMode) {
  return emitPartyAck<PartyEventAck>(socket, "personal-media:apply-upload", { roomId, mediaId, mode });
}

function PartyTitleDetails({ media }: { media: PartyMedia }) {
  const isMusic = media.catalogue === "music";
  const isPersonal = media.catalogue === "personal";
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
        <p className="party-title-overview">{details?.overview ?? (isPersonal ? "This room-only media is available for a limited time." : "Open the full title page for story, cast, subtitles, and every available source.")}</p>

        <div className="party-title-stats">
          <span><Star size={16} /><small>IMDb</small><strong>{details?.imdbRating?.toFixed(1) ?? "—"}</strong>{details?.imdbVotes ? <em>{formatCompact(details.imdbVotes)} votes</em> : null}</span>
          <span><Clock3 size={16} /><small>Runtime</small><strong>{details?.runtimeMinutes ? `${details.runtimeMinutes}m` : "—"}</strong></span>
          <span><Globe2 size={16} /><small>Origin</small><strong>{details?.countries?.slice(0, 2).join(" / ") || "—"}</strong></span>
          <span><Film size={16} /><small>Playing</small><strong>{media.source.quality || media.source.label || "Auto"}</strong></span>
        </div>

        {(details?.genres.length ?? 0) > 0 && <div className="party-title-genres">{details?.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>}
        {(details?.languages.length ?? 0) > 0 && <p className="party-title-languages"><strong>Languages</strong> {details?.languages.join(" · ")}</p>}

        {!isPersonal && <div className="party-title-actions">
          <Link href={isMusic ? `/music/${encodeURIComponent(media.itemId)}` : `/${encodeURIComponent(media.itemId)}`}>{isMusic ? "Open track page" : "Full title details"} <ExternalLink size={14} /></Link>
          {details?.imdbUrl && <a href={details.imdbUrl} target="_blank" rel="noreferrer">Open IMDb <ExternalLink size={14} /></a>}
        </div>}
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

function isStageUiTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, input, select, textarea, form, a, [role='button'], [data-player-ui='true'], .party-accessibility, .party-voice, .party-camera-dock, .subtitle-panel, .party-player-settings"));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function Participant({ participant, isHost, mutedLocally, meId, guestPermissions, sharingLocalAudio, onMuteLocal, onPermission, onModerate }: { participant: PartyParticipant; isHost: boolean; mutedLocally: boolean; meId: string; guestPermissions: PartyPermissions; sharingLocalAudio: boolean; onMuteLocal: () => void; onPermission: (permission: PartyCapability, value: boolean) => void; onModerate: (action: "kick" | "block" | "mute" | "unmute" | "cameraOff" | "audioOff") => void }) {
  return <details className="party-person"><summary>{participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : <span>{participant.name.slice(0, 1)}</span>}<b>{participant.name}</b><small>{participant.role}{participant.connected ? " · online" : " · offline"}</small></summary>{participant.id !== meId && <div className="party-person-actions"><button onClick={onMuteLocal}>{mutedLocally ? "Unhide locally" : "Mute locally"}</button>{isHost && participant.role !== "host" && <><button onClick={() => onModerate(participant.mutedByHost ? "unmute" : "mute")}>{participant.mutedByHost ? "Unmute room" : "Mute room"}</button><button onClick={() => onModerate("cameraOff")}>Stop camera</button>{sharingLocalAudio && <button onClick={() => onModerate("audioOff")}>Stop local music</button>}<button onClick={() => onModerate("kick")}>Kick</button><button onClick={() => onModerate("block")}>Block</button><div className="party-person-permissions">{CAPABILITIES.map(({ id, label }) => <label key={id}><input type="checkbox" checked={participant.permissions[id] ?? guestPermissions[id]} onChange={(event) => onPermission(id, event.target.checked)} />{label}</label>)}</div></>}</div>}</details>;
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
