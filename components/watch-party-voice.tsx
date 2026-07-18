"use client";

import { Accessibility, Camera, CameraOff, Headphones, Mic, MicOff, PhoneOff, Radio, RefreshCw, ShieldAlert, ShieldCheck, Users } from "lucide-react";
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
  cameras?: string[];
  error?: string;
};

type CameraResult = { ok: boolean; cameras?: string[]; error?: string };
type VoicePermissionState = "unknown" | "prompt" | "granted" | "denied" | "insecure" | "unsupported";
type VoiceIssue = {
  kind: "denied" | "insecure" | "missing-device" | "busy" | "unsupported" | "connection";
  title: string;
  message: string;
  hint: string;
};

export function WatchPartyVoice({
  socket,
  roomId,
  profile,
  participants,
  mutedLocally,
  cameraAllowed,
  interpreterAllowed,
  interpreterUserId,
}: {
  socket: Socket;
  roomId: string;
  profile: PartyProfile;
  participants: PartyParticipant[];
  mutedLocally: Set<string>;
  cameraAllowed: boolean;
  interpreterAllowed: boolean;
  interpreterUserId: string | null;
}) {
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const remoteAudioRef = useRef(new Map<string, HTMLAudioElement>());
  const remoteVideoStreamsRef = useRef(new Map<string, MediaStream>());
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);
  const cameraEnabledRef = useRef(false);
  const iceServersRef = useRef<RTCIceServer[]>(fallbackIceServers);
  const participantsRef = useRef(participants);
  const mutedLocallyRef = useRef(mutedLocally);
  const [panelOpen, setPanelOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [talking, setTalking] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<VoicePermissionState>(initialVoicePermissionState);
  const [voiceIssue, setVoiceIssue] = useState<VoiceIssue | null>(null);
  const [peerIds, setPeerIds] = useState<Set<string>>(new Set());
  const [activeTalkers, setActiveTalkers] = useState<Set<string>>(new Set());
  const [cameraUsers, setCameraUsers] = useState<Set<string>>(new Set());
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<Map<string, MediaStream>>(new Map());
  participantsRef.current = participants;
  mutedLocallyRef.current = mutedLocally;

  const me = participants.find((participant) => participant.id === profile.id);
  const mutedByHost = Boolean(me?.mutedByHost);
  const interpreterActive = interpreterUserId === profile.id;
  const talkers = participants.filter((participant) => activeTalkers.has(participant.id));
  const visibleCameras = participants
    .filter((participant) => cameraUsers.has(participant.id) && !mutedLocally.has(participant.id))
    .sort((left, right) => Number(right.id === interpreterUserId) - Number(left.id === interpreterUserId));

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
      setCameraUsers((current) => without(current, userId));
    };
    const onTalking = ({ userId, active }: { userId: string; active: boolean }) => {
      setActiveTalkers((current) => active ? new Set(current).add(userId) : without(current, userId));
    };
    const onCamera = ({ userId, active }: { userId: string; active: boolean }) => {
      setCameraUsers((current) => active ? new Set(current).add(userId) : without(current, userId));
      if (!active && userId !== profile.id) removeRemoteVideo(userId);
    };
    const onForceCameraOff = () => {
      stopCamera(false);
      showAppMessage({ title: "Camera paused by the host", message: "Your camera is off. The movie and voice room are still running.", tone: "warning" });
    };

    socket.on("voice:signal", onSignal);
    socket.on("voice:peer-joined", onPeerJoined);
    socket.on("voice:peer-left", onPeerLeft);
    socket.on("voice:talking", onTalking);
    socket.on("voice:camera", onCamera);
    socket.on("voice:camera-force-off", onForceCameraOff);
    return () => {
      socket.off("voice:signal", onSignal);
      socket.off("voice:peer-joined", onPeerJoined);
      socket.off("voice:peer-left", onPeerLeft);
      socket.off("voice:talking", onTalking);
      socket.off("voice:camera", onCamera);
      socket.off("voice:camera-force-off", onForceCameraOff);
      if (joinedRef.current) socket.emit("voice:leave", { roomId });
      joinedRef.current = false;
      for (const peer of peersRef.current.values()) peer.close();
      peersRef.current.clear();
      for (const audio of remoteAudioRef.current.values()) audio.remove();
      remoteAudioRef.current.clear();
      remoteVideoStreamsRef.current.clear();
      for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
      localStreamRef.current = null;
    };
  }, [profile.id, roomId, socket]);

  useEffect(() => {
    let cancelled = false;
    let permissionStatus: PermissionStatus | null = null;
    const updatePermission = () => { if (!cancelled && permissionStatus) setPermissionState(permissionStatus.state); };
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !navigator.permissions?.query) return;
    navigator.permissions.query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        permissionStatus = status;
        updatePermission();
        status.addEventListener("change", updatePermission);
      })
      .catch(() => { if (!cancelled) setPermissionState("unknown"); });
    return () => {
      cancelled = true;
      permissionStatus?.removeEventListener("change", updatePermission);
    };
  }, []);

  useEffect(() => {
    for (const [userId, audio] of remoteAudioRef.current) audio.muted = shouldMute(userId);
  }, [mutedLocally, participants]);

  useEffect(() => {
    if (!mutedByHost || !talking) return;
    stopTalking();
    showAppMessage({ title: "Microphone muted by the host", message: "Push-to-talk is paused, but chat and video are still available.", tone: "warning" });
  }, [mutedByHost, talking]);

  useEffect(() => {
    if (cameraAllowed || !cameraEnabledRef.current) return;
    stopCamera();
    showAppMessage({ title: "Camera permission changed", message: "The host turned off guest camera access for this room.", tone: "warning" });
  }, [cameraAllowed]);

  useEffect(() => {
    if (interpreterAllowed || !interpreterActive) return;
    socket.emit("accessibility:interpreter", { roomId, active: false });
  }, [interpreterActive, interpreterAllowed, roomId, socket]);

  async function joinVoice() {
    if (joining || microphoneReady) return;
    const preflightIssue = mediaPreflightIssue("microphone");
    if (preflightIssue) return reportIssue(preflightIssue);
    setJoining(true);
    setVoiceIssue(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) throw new DOMException("No microphone track was created.", "NotFoundError");
      audioTrack.enabled = false;
      setPermissionState("granted");
      if (!joinedRef.current) await joinMediaSession(stream);
      else {
        localStreamRef.current?.addTrack(audioTrack);
        await replaceTrackForAll("audio", audioTrack);
      }
      setMicrophoneReady(true);
      setPanelOpen(true);
      showAppMessage({ title: "Voice Lounge is ready 🎙️", message: "Hold the button to talk. Your mic stays muted when you let go.", tone: "success" });
    } catch (reason) {
      const issue = describeMediaIssue(reason, "microphone");
      if (issue.kind === "denied") setPermissionState("denied");
      reportIssue(issue);
    } finally {
      setJoining(false);
    }
  }

  async function joinMediaSession(initialStream: MediaStream) {
    if (joinedRef.current) return;
    const iceServers = await loadIceServers();
    iceServersRef.current = iceServers;
    localStreamRef.current = initialStream;
    joinedRef.current = true;
    const result = await emitJoinVoice(socket, roomId);
    if (!result.ok) {
      joinedRef.current = false;
      throw new Error(result.error ?? "The media room is unavailable.");
    }
    const peers = (result.peers ?? []).filter((userId) => userId !== profile.id);
    setPeerIds(new Set([profile.id, ...peers]));
    setActiveTalkers(new Set(result.talking ?? []));
    setCameraUsers(new Set(result.cameras ?? []));
    setJoined(true);
    setPanelOpen(true);
    for (const userId of peers) await makeOffer(userId);
  }

  function leaveVoice() {
    stopTalking();
    stopCamera(false);
    socket.emit("voice:leave", { roomId });
    joinedRef.current = false;
    for (const peer of peersRef.current.values()) peer.close();
    peersRef.current.clear();
    for (const audio of remoteAudioRef.current.values()) audio.remove();
    remoteAudioRef.current.clear();
    remoteVideoStreamsRef.current.clear();
    for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
    localStreamRef.current = null;
    setRemoteVideoStreams(new Map());
    setJoined(false);
    setMicrophoneReady(false);
    setPeerIds(new Set());
    setActiveTalkers(new Set());
    setCameraUsers(new Set());
    setTalking(false);
    showAppMessage({ title: "Media Lounge closed", message: "The synchronized movie keeps playing. Rejoin whenever you want.", tone: "info" });
  }

  function startTalking() {
    if (!joinedRef.current || talking || !microphoneReady) return;
    if (mutedByHost) {
      showAppMessage({ title: "Push-to-talk is muted", message: "The host currently has your room microphone muted.", tone: "warning" });
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

  async function startCamera() {
    if (cameraStarting || cameraEnabledRef.current) return;
    if (!cameraAllowed) {
      showAppMessage({ title: "Camera needs host permission", message: "Ask the room creator to enable Stream camera for you.", tone: "warning" });
      return;
    }
    const preflightIssue = mediaPreflightIssue("camera");
    if (preflightIssue) return reportIssue(preflightIssue);
    setCameraStarting(true);
    try {
      const captured = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 640, max: 960 }, height: { ideal: 360, max: 540 }, frameRate: { ideal: 15, max: 24 }, facingMode: "user" },
      });
      const videoTrack = captured.getVideoTracks()[0];
      if (!videoTrack) throw new DOMException("No camera track was created.", "NotFoundError");
      videoTrack.contentHint = "motion";

      if (!joinedRef.current) await joinMediaSession(new MediaStream([videoTrack]));
      else {
        localStreamRef.current?.addTrack(videoTrack);
        await replaceTrackForAll("video", videoTrack);
      }

      const result = await emitCamera(socket, roomId, true);
      if (!result.ok) throw new Error(result.error ?? "Camera streaming is unavailable.");
      cameraEnabledRef.current = true;
      setCameraEnabled(true);
      setCameraUsers(new Set(result.cameras ?? [profile.id]));
      setPanelOpen(true);
      showAppMessage({ title: "You are on camera 📹", message: "Your preview is live in the room. Tap Camera off whenever you want.", tone: "success" });
    } catch (reason) {
      const track = localStreamRef.current?.getVideoTracks()[0];
      track?.stop();
      if (track) localStreamRef.current?.removeTrack(track);
      await replaceTrackForAll("video", null);
      if (joinedRef.current) socket.emit("voice:camera", { roomId, active: false });
      reportIssue(describeMediaIssue(reason, "camera"));
    } finally {
      setCameraStarting(false);
    }
  }

  function stopCamera(announce = true) {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.stop();
      localStreamRef.current?.removeTrack(track);
    }
    void replaceTrackForAll("video", null);
    if (joinedRef.current && cameraEnabledRef.current) socket.emit("voice:camera", { roomId, active: false });
    cameraEnabledRef.current = false;
    setCameraEnabled(false);
    setCameraUsers((current) => without(current, profile.id));
    if (announce) showAppMessage({ title: "Camera is off", message: "Your seat is back in audio-only mode.", tone: "info" });
  }

  async function toggleInterpreter() {
    if (!cameraEnabledRef.current && !interpreterActive) {
      showAppMessage({ title: "Camera first, signs second", message: "Turn your camera on so the room can see your interpretation.", tone: "warning" });
      return;
    }
    const result = await emitInterpreter(socket, roomId, !interpreterActive);
    if (!result.ok) {
      showAppMessage({ title: "Interpreter seat stayed put", message: result.error ?? "The host has not enabled this permission.", tone: "warning" });
      return;
    }
    showAppMessage(interpreterActive
      ? { title: "Interpreter mode ended", message: "Your camera remains on as a regular room tile.", tone: "info" }
      : { title: "Interpreter pinned", message: "Your signed interpretation is now prioritized over the movie for everyone in the room.", tone: "success" });
  }

  async function replaceTrackForAll(kind: "audio" | "video", track: MediaStreamTrack | null) {
    for (const [userId, peer] of peersRef.current) {
      let sender = mediaSender(peer, kind);
      if (!sender) {
        sender = peer.addTransceiver(kind, { direction: "sendrecv" }).sender;
        await sender.replaceTrack(track);
        await makeOffer(userId, peer);
      } else {
        await sender.replaceTrack(track);
      }
    }
  }

  async function makeOffer(userId: string, providedPeer?: RTCPeerConnection) {
    const peer = providedPeer ?? ensurePeer(userId, true);
    ensureMediaTransceivers(peer);
    await attachLocalTracks(peer);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("voice:signal", { roomId, targetUserId: userId, description: peer.localDescription });
  }

  async function receiveSignal(signal: VoiceSignal) {
    if (!joinedRef.current || !signal.fromUserId || signal.fromUserId === profile.id) return;
    try {
      const peer = ensurePeer(signal.fromUserId, false);
      setPeerIds((current) => new Set(current).add(signal.fromUserId));
      if (signal.description) {
        await peer.setRemoteDescription(signal.description);
        await attachLocalTracks(peer);
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

  function ensurePeer(userId: string, initiator: boolean) {
    const existing = peersRef.current.get(userId);
    if (existing) return existing;
    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
    if (initiator) ensureMediaTransceivers(peer);
    peer.onicecandidate = (event) => {
      if (event.candidate) socket.emit("voice:signal", { roomId, targetUserId: userId, candidate: event.candidate.toJSON() });
    };
    peer.ontrack = (event) => {
      if (event.track.kind === "audio") attachRemoteAudio(userId, event.track);
      if (event.track.kind === "video") attachRemoteVideo(userId, event.track);
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" || peer.connectionState === "closed") closePeer(userId);
    };
    peersRef.current.set(userId, peer);
    return peer;
  }

  function ensureMediaTransceivers(peer: RTCPeerConnection) {
    if (!mediaSender(peer, "audio")) peer.addTransceiver("audio", { direction: "sendrecv" });
    if (!mediaSender(peer, "video")) peer.addTransceiver("video", { direction: "sendrecv" });
  }

  async function attachLocalTracks(peer: RTCPeerConnection) {
    for (const kind of ["audio", "video"] as const) {
      const track = kind === "audio" ? localStreamRef.current?.getAudioTracks()[0] : localStreamRef.current?.getVideoTracks()[0];
      const sender = mediaSender(peer, kind);
      if (sender && sender.track !== (track ?? null)) await sender.replaceTrack(track ?? null);
    }
  }

  function attachRemoteAudio(userId: string, track: MediaStreamTrack) {
    let audio = remoteAudioRef.current.get(userId);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.dataset.voiceUser = userId;
      audioContainerRef.current?.appendChild(audio);
      remoteAudioRef.current.set(userId, audio);
    }
    audio.srcObject = new MediaStream([track]);
    audio.muted = shouldMute(userId);
    void audio.play().catch(() => undefined);
  }

  function attachRemoteVideo(userId: string, track: MediaStreamTrack) {
    const stream = new MediaStream([track]);
    remoteVideoStreamsRef.current.set(userId, stream);
    setRemoteVideoStreams(new Map(remoteVideoStreamsRef.current));
    track.addEventListener("ended", () => removeRemoteVideo(userId), { once: true });
  }

  function removeRemoteVideo(userId: string) {
    remoteVideoStreamsRef.current.delete(userId);
    setRemoteVideoStreams(new Map(remoteVideoStreamsRef.current));
  }

  function closePeer(userId: string) {
    peersRef.current.get(userId)?.close();
    peersRef.current.delete(userId);
    remoteAudioRef.current.get(userId)?.remove();
    remoteAudioRef.current.delete(userId);
    removeRemoteVideo(userId);
    pendingCandidatesRef.current.delete(userId);
  }

  function shouldMute(userId: string) {
    return mutedLocallyRef.current.has(userId) || Boolean(participantsRef.current.find((participant) => participant.id === userId)?.mutedByHost);
  }

  function reportIssue(issue: VoiceIssue) {
    setVoiceIssue(issue);
    showAppMessage({ title: issue.title, message: issue.message, tone: "error" });
  }

  return (
    <>
      {visibleCameras.length > 0 && (
        <div className={`party-camera-dock has-${Math.min(visibleCameras.length, 4)} ${interpreterUserId ? "has-interpreter" : ""}`} aria-label="Room cameras">
          {visibleCameras.slice(0, 4).map((participant) => {
            const local = participant.id === profile.id;
            const stream = local ? localStreamRef.current : remoteVideoStreams.get(participant.id) ?? null;
            const interpreter = participant.id === interpreterUserId;
            return (
              <article className={`party-camera-tile ${activeTalkers.has(participant.id) ? "is-speaking" : ""} ${interpreter ? "is-interpreter" : ""}`} key={participant.id}>
                {stream?.getVideoTracks().length ? <StreamVideo stream={stream} mirrored={local} /> : <div className="party-camera-waiting">{participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : <span>{participant.name.slice(0, 1)}</span>}<small>Connecting camera…</small></div>}
                <div className="party-camera-label"><span>{participant.name}</span>{interpreter ? <small>Sign interpreter</small> : local ? <small>You</small> : null}</div>
                {local && <button type="button" onClick={() => stopCamera()} aria-label="Turn camera off"><CameraOff size={14} /></button>}
              </article>
            );
          })}
        </div>
      )}

      <div className={`party-voice ${panelOpen ? "is-open" : ""} ${talking ? "is-talking" : ""}`}>
        {talkers.length > 0 && (
          <div className="party-voice-speakers">
            {talkers.slice(0, 3).map((participant) => <span key={participant.id} title={`${participant.name} is talking`}>{participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : participant.name.slice(0, 1)}<i /></span>)}
          </div>
        )}
        <button className="party-voice-toggle" type="button" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelOpen}>
          <Radio size={17} />
          <span><strong>Media Lounge</strong><small>{joined ? `${Math.max(peerIds.size, 1)} online` : "Voice + camera"}</small></span>
        </button>
        {panelOpen && (
          <div className="party-voice-panel">
            <div className="party-voice-copy"><Headphones size={19} /><span><strong>Room voice & camera</strong><small>Both start only after you choose them.</small></span></div>
            {voiceIssue && <div className={`party-voice-permission is-${voiceIssue.kind}`} role="alert"><ShieldAlert size={18} /><div><strong>{voiceIssue.title}</strong><p>{voiceIssue.message}</p><small>{voiceIssue.hint}</small></div></div>}
            {!voiceIssue && <div className="party-voice-privacy"><ShieldCheck size={14} /><span>{permissionState === "granted" ? "Microphone permission is ready" : "Camera and microphone are always opt-in"}</span></div>}

            {!microphoneReady ? (
              <button className="party-voice-join" type="button" disabled={joining} onClick={() => void joinVoice()}>{voiceIssue ? <RefreshCw size={17} /> : <Mic size={17} />}{joining ? "Connecting…" : voiceIssue ? "Try microphone again" : "Join voice"}</button>
            ) : (
              <button className="party-voice-ptt" type="button" disabled={mutedByHost} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); startTalking(); }} onPointerUp={stopTalking} onPointerCancel={stopTalking} onLostPointerCapture={stopTalking} onKeyDown={(event) => { if (!event.repeat && (event.key === " " || event.key === "Enter")) { event.preventDefault(); startTalking(); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") stopTalking(); }}>
                {talking ? <Mic size={22} /> : mutedByHost ? <MicOff size={22} /> : <Mic size={22} />}<span>{mutedByHost ? "Muted by host" : talking ? "Talking… let go to mute" : "Hold to talk"}</span>
              </button>
            )}

            <button className={`party-camera-toggle ${cameraEnabled ? "is-live" : ""}`} type="button" disabled={cameraStarting || !cameraAllowed} onClick={() => cameraEnabled ? stopCamera() : void startCamera()}>
              {cameraEnabled ? <CameraOff size={17} /> : <Camera size={17} />}<span>{cameraStarting ? "Starting camera…" : cameraEnabled ? "Camera off" : cameraAllowed ? "Turn camera on" : "Camera disabled by host"}</span>
            </button>

            <button className={`party-interpreter-toggle ${interpreterActive ? "is-live" : ""}`} type="button" disabled={!interpreterAllowed} onClick={() => void toggleInterpreter()}>
              <Accessibility size={17} /><span>{interpreterActive ? "Stop sign interpreter" : interpreterAllowed ? "Pin me as sign interpreter" : "Interpreter permission required"}</span>
            </button>

            {joined && <div className="party-voice-meta"><Users size={15} /><span>{Math.max(peerIds.size, 1)} in lounge</span><button type="button" onClick={leaveVoice}><PhoneOff size={15} /> Leave</button></div>}
          </div>
        )}
        <div className="party-voice-audio" ref={audioContainerRef} aria-hidden="true" />
      </div>
    </>
  );
}

function StreamVideo({ stream, mirrored }: { stream: MediaStream; mirrored: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    return () => { if (video.srcObject === stream) video.srcObject = null; };
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className={mirrored ? "is-mirrored" : ""} />;
}

function mediaSender(peer: RTCPeerConnection, kind: "audio" | "video") {
  return peer.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === kind || transceiver.sender.track?.kind === kind)?.sender;
}

function without(source: Set<string>, value: string) {
  const next = new Set(source);
  next.delete(value);
  return next;
}

function mediaPreflightIssue(kind: "microphone" | "camera"): VoiceIssue | null {
  if (!window.isSecureContext) return { kind: "insecure", title: "A secure page is required", message: `The browser only opens a ${kind} on HTTPS or localhost.`, hint: "Open the HTTPS version of SarvNema and try again." };
  if (!navigator.mediaDevices?.getUserMedia) return { kind: "unsupported", title: `${kind === "camera" ? "Camera" : "Voice"} is not supported here`, message: "This browser or in-app webview cannot access media devices.", hint: "Open the invite in Chrome, Safari, Edge, or Firefox." };
  return null;
}

function initialVoicePermissionState(): VoicePermissionState {
  if (typeof window === "undefined") return "unknown";
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  return "unknown";
}

function describeMediaIssue(reason: unknown, device: "microphone" | "camera"): VoiceIssue {
  const error = reason instanceof DOMException || reason instanceof Error ? reason : null;
  const name = error?.name ?? "";
  const label = device === "camera" ? "camera" : "microphone";
  if (name === "NotAllowedError" || name === "SecurityError") return { kind: "denied", title: `${device === "camera" ? "Camera" : "Microphone"} access is blocked`, message: `SarvNema cannot use your ${label} until access is allowed for this site.`, hint: `Tap the lock/site icon beside the address → ${device === "camera" ? "Camera" : "Microphone"} → Allow, then reload the room.` };
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return { kind: "missing-device", title: `No ${label} was found`, message: `The browser cannot find an available ${label} on this device.`, hint: `Connect or enable a ${label}, then try again.` };
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return { kind: "busy", title: `The ${label} is busy`, message: `Another app or browser tab may be using the ${label}.`, hint: "Close the other call or recorder, then try again." };
  if (name === "OverconstrainedError") return { kind: "busy", title: `This ${label} setup did not work`, message: `The selected ${label} cannot use the requested settings.`, hint: `Switch your default ${label} in browser settings and try again.` };
  return { kind: "connection", title: `${device === "camera" ? "Camera" : "Voice"} could not connect`, message: error?.message?.trim() || "The media room did not answer in time.", hint: "Check your connection and try again. A strict network may require the configured TURN server." };
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
    const timer = window.setTimeout(() => resolve({ ok: false, error: "Media connection timed out." }), 10_000);
    socket.emit("voice:join", { roomId }, (result: VoiceJoinResult) => { window.clearTimeout(timer); resolve(result); });
  });
}

function emitCamera(socket: Socket, roomId: string, active: boolean) {
  return new Promise<CameraResult>((resolve) => {
    const timer = window.setTimeout(() => resolve({ ok: false, error: "Camera permission timed out." }), 8_000);
    socket.emit("voice:camera", { roomId, active }, (result: CameraResult) => { window.clearTimeout(timer); resolve(result); });
  });
}

function emitInterpreter(socket: Socket, roomId: string, active: boolean) {
  return new Promise<{ ok: boolean; userId?: string | null; error?: string }>((resolve) => {
    const timer = window.setTimeout(() => resolve({ ok: false, error: "Interpreter request timed out." }), 8_000);
    socket.emit("accessibility:interpreter", { roomId, active }, (result: { ok: boolean; userId?: string | null; error?: string }) => {
      window.clearTimeout(timer);
      resolve(result);
    });
  });
}
