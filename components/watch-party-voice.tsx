"use client";

import { Headphones, Mic, MicOff, PhoneOff, Radio, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { showAppMessage } from "@/lib/app-messages";
import type { PartyParticipant, PartyProfile } from "@/lib/watch-party-types";

type VoiceSignal = {
  fromUserId: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type VoiceJoinResult = {
  ok: boolean;
  peers?: string[];
  talking?: string[];
  error?: string;
};

export function WatchPartyVoice({
  socket,
  roomId,
  profile,
  participants,
  mutedLocally,
}: {
  socket: Socket;
  roomId: string;
  profile: PartyProfile;
  participants: PartyParticipant[];
  mutedLocally: Set<string>;
}) {
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const remoteAudioRef = useRef(new Map<string, HTMLAudioElement>());
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);
  const iceServersRef = useRef<RTCIceServer[]>(fallbackIceServers);
  const participantsRef = useRef(participants);
  const mutedLocallyRef = useRef(mutedLocally);
  const [panelOpen, setPanelOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [talking, setTalking] = useState(false);
  const [peerIds, setPeerIds] = useState<Set<string>>(new Set());
  const [activeTalkers, setActiveTalkers] = useState<Set<string>>(new Set());
  participantsRef.current = participants;
  mutedLocallyRef.current = mutedLocally;

  const me = participants.find((participant) => participant.id === profile.id);
  const mutedByHost = Boolean(me?.mutedByHost);
  const talkers = participants.filter((participant) => activeTalkers.has(participant.id));

  useEffect(() => {
    const onSignal = (signal: VoiceSignal) => { void receiveSignal(signal); };
    const onPeerJoined = ({ userId }: { userId: string }) => {
      if (!joinedRef.current || !userId || userId === profile.id) return;
      setPeerIds((current) => new Set(current).add(userId));
    };
    const onPeerLeft = ({ userId }: { userId: string }) => {
      closePeer(userId);
      setPeerIds((current) => without(current, userId));
      setActiveTalkers((current) => without(current, userId));
    };
    const onTalking = ({ userId, active }: { userId: string; active: boolean }) => {
      setActiveTalkers((current) => active ? new Set(current).add(userId) : without(current, userId));
    };
    socket.on("voice:signal", onSignal);
    socket.on("voice:peer-joined", onPeerJoined);
    socket.on("voice:peer-left", onPeerLeft);
    socket.on("voice:talking", onTalking);
    return () => {
      socket.off("voice:signal", onSignal);
      socket.off("voice:peer-joined", onPeerJoined);
      socket.off("voice:peer-left", onPeerLeft);
      socket.off("voice:talking", onTalking);
      if (joinedRef.current) socket.emit("voice:leave", { roomId });
      joinedRef.current = false;
      for (const peer of peersRef.current.values()) peer.close();
      peersRef.current.clear();
      for (const audio of remoteAudioRef.current.values()) audio.remove();
      remoteAudioRef.current.clear();
      for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
      localStreamRef.current = null;
    };
  }, [profile.id, roomId, socket]);

  useEffect(() => {
    for (const [userId, audio] of remoteAudioRef.current) audio.muted = shouldMute(userId);
  }, [mutedLocally, participants]);

  useEffect(() => {
    if (!mutedByHost || !talking) return;
    stopTalking();
    showAppMessage({
      title: "میکروفن رفت روی حالت نینجا 🤫",
      message: "میزبان فعلاً صدایت را mute کرده؛ نگران نباش، هنوز چت سر جایش است.",
      tone: "warning",
    });
  }, [mutedByHost, talking]);

  async function joinVoice() {
    if (joinedRef.current || joining) return;
    setJoining(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Voice requires HTTPS or localhost.");
      const [stream, iceServers] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        }),
        loadIceServers(),
      ]);
      iceServersRef.current = iceServers;
      for (const track of stream.getAudioTracks()) track.enabled = false;
      localStreamRef.current = stream;
      joinedRef.current = true;

      const result = await emitJoinVoice(socket, roomId);
      if (!result.ok) throw new Error(result.error ?? "Voice room is unavailable.");
      const peers = (result.peers ?? []).filter((userId) => userId !== profile.id);
      setPeerIds(new Set([profile.id, ...peers]));
      setActiveTalkers(new Set(result.talking ?? []));
      setJoined(true);
      setPanelOpen(true);
      for (const userId of peers) await makeOffer(userId);
      showAppMessage({
        title: "وارد Voice Lounge شدی 🎙️",
        message: "دکمه را نگه دار و حرف بزن؛ فقط لطفاً پادکست سه‌ساعته شروع نکن 😄",
        tone: "success",
      });
    } catch (reason) {
      joinedRef.current = false;
      for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
      localStreamRef.current = null;
      showAppMessage({
        title: "میکروفن یکم قهر کرده 🫠",
        message: reason instanceof Error ? reason.message : "اجازه میکروفن را بررسی کن و دوباره بزن.",
        tone: "error",
      });
    } finally {
      setJoining(false);
    }
  }

  function leaveVoice() {
    stopTalking();
    socket.emit("voice:leave", { roomId });
    joinedRef.current = false;
    for (const peer of peersRef.current.values()) peer.close();
    peersRef.current.clear();
    for (const audio of remoteAudioRef.current.values()) audio.remove();
    remoteAudioRef.current.clear();
    for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
    localStreamRef.current = null;
    setJoined(false);
    setPeerIds(new Set());
    setActiveTalkers(new Set());
    setTalking(false);
    showAppMessage({ title: "از ویس بیرون آمدی 👋", message: "فیلم هنوز پخش می‌شود؛ درام فقط داخل خود فیلم باشد.", tone: "info" });
  }

  function startTalking() {
    if (!joinedRef.current || talking) return;
    if (mutedByHost) {
      showAppMessage({ title: "فعلاً نوبت سکوت است 🤐", message: "میزبان میکروفنت را mute کرده.", tone: "warning" });
      return;
    }
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = true;
    setTalking(true);
    setActiveTalkers((current) => new Set(current).add(profile.id));
    socket.emit("voice:talking", { roomId, active: true });
  }

  function stopTalking() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = false;
    if (!talking) return;
    setTalking(false);
    setActiveTalkers((current) => without(current, profile.id));
    socket.emit("voice:talking", { roomId, active: false });
  }

  async function makeOffer(userId: string) {
    const peer = ensurePeer(userId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("voice:signal", { roomId, targetUserId: userId, description: peer.localDescription });
  }

  async function receiveSignal(signal: VoiceSignal) {
    if (!joinedRef.current || !signal.fromUserId || signal.fromUserId === profile.id) return;
    try {
      const peer = ensurePeer(signal.fromUserId);
      setPeerIds((current) => new Set(current).add(signal.fromUserId));
      if (signal.description) {
        await peer.setRemoteDescription(signal.description);
        const pending = pendingCandidatesRef.current.get(signal.fromUserId) ?? [];
        for (const candidate of pending) await peer.addIceCandidate(candidate);
        pendingCandidatesRef.current.delete(signal.fromUserId);
        if (signal.description.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("voice:signal", { roomId, targetUserId: signal.fromUserId, description: peer.localDescription });
        }
      } else if (signal.candidate) {
        if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate);
        else pendingCandidatesRef.current.set(signal.fromUserId, [...(pendingCandidatesRef.current.get(signal.fromUserId) ?? []), signal.candidate]);
      }
    } catch {
      closePeer(signal.fromUserId);
    }
  }

  function ensurePeer(userId: string) {
    const existing = peersRef.current.get(userId);
    if (existing) return existing;
    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
    for (const track of localStreamRef.current?.getTracks() ?? []) peer.addTrack(track, localStreamRef.current!);
    peer.onicecandidate = (event) => {
      if (event.candidate) socket.emit("voice:signal", { roomId, targetUserId: userId, candidate: event.candidate.toJSON() });
    };
    peer.ontrack = (event) => {
      let audio = remoteAudioRef.current.get(userId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.dataset.voiceUser = userId;
        audioContainerRef.current?.appendChild(audio);
        remoteAudioRef.current.set(userId, audio);
      }
      audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      audio.muted = shouldMute(userId);
      void audio.play().catch(() => undefined);
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" || peer.connectionState === "closed") closePeer(userId);
    };
    peersRef.current.set(userId, peer);
    return peer;
  }

  function closePeer(userId: string) {
    peersRef.current.get(userId)?.close();
    peersRef.current.delete(userId);
    remoteAudioRef.current.get(userId)?.remove();
    remoteAudioRef.current.delete(userId);
    pendingCandidatesRef.current.delete(userId);
  }

  function shouldMute(userId: string) {
    return mutedLocallyRef.current.has(userId) || Boolean(participantsRef.current.find((participant) => participant.id === userId)?.mutedByHost);
  }

  return (
    <div className={`party-voice ${panelOpen ? "is-open" : ""} ${talking ? "is-talking" : ""}`}>
      {talkers.length > 0 && (
        <div className="party-voice-speakers">
          {talkers.slice(0, 3).map((participant) => (
            <span key={participant.id} title={`${participant.name} is talking`}>
              {participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : participant.name.slice(0, 1)}
              <i />
            </span>
          ))}
        </div>
      )}
      <button className="party-voice-toggle" type="button" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelOpen}>
        <Radio size={17} />
        <span><strong>Voice Lounge</strong><small>{joined ? `${Math.max(peerIds.size, 1)} online` : "Push to talk"}</small></span>
      </button>
      {panelOpen && (
        <div className="party-voice-panel">
          {!joined ? (
            <>
              <div className="party-voice-copy"><Headphones size={19} /><span><strong>Join the room voice</strong><small>Mic starts muted. No surprise concerts.</small></span></div>
              <button className="party-voice-join" type="button" disabled={joining} onClick={joinVoice}><Mic size={17} />{joining ? "Connecting…" : "Join voice"}</button>
            </>
          ) : (
            <>
              <button
                className="party-voice-ptt"
                type="button"
                disabled={mutedByHost}
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); startTalking(); }}
                onPointerUp={stopTalking}
                onPointerCancel={stopTalking}
                onLostPointerCapture={stopTalking}
                onKeyDown={(event) => { if (!event.repeat && (event.key === " " || event.key === "Enter")) { event.preventDefault(); startTalking(); } }}
                onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") stopTalking(); }}
              >
                {talking ? <Mic size={22} /> : mutedByHost ? <MicOff size={22} /> : <Mic size={22} />}
                <span>{mutedByHost ? "Muted by host" : talking ? "Talking… let go to mute" : "Hold to talk"}</span>
              </button>
              <div className="party-voice-meta"><Users size={15} /><span>{Math.max(peerIds.size, 1)} in voice</span><button type="button" onClick={leaveVoice}><PhoneOff size={15} /> Leave</button></div>
            </>
          )}
        </div>
      )}
      <div className="party-voice-audio" ref={audioContainerRef} aria-hidden="true" />
    </div>
  );
}

function without(source: Set<string>, value: string) {
  const next = new Set(source);
  next.delete(value);
  return next;
}

const fallbackIceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

async function loadIceServers() {
  try {
    const response = await fetch("/api/watch-party/ice-config");
    if (!response.ok) return fallbackIceServers;
    const data = await response.json() as { iceServers?: RTCIceServer[] };
    return Array.isArray(data.iceServers) && data.iceServers.length ? data.iceServers : fallbackIceServers;
  } catch {
    return fallbackIceServers;
  }
}

function emitJoinVoice(socket: Socket, roomId: string) {
  return new Promise<VoiceJoinResult>((resolve) => {
    const timer = window.setTimeout(() => resolve({ ok: false, error: "Voice connection timed out." }), 10_000);
    socket.emit("voice:join", { roomId }, (result: VoiceJoinResult) => {
      window.clearTimeout(timer);
      resolve(result);
    });
  });
}
