"use client";

import { Accessibility, Camera, CameraOff, FileAudio, Headphones, Mic, MicOff, Move, PhoneOff, Radio, RefreshCw, ShieldAlert, ShieldCheck, Square, Upload, Users, Volume2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { Socket } from "socket.io-client";
import { showAppMessage } from "@/lib/app-messages";
import type { PartyParticipant, PartyProfile, PartySharedAudio } from "@/lib/watch-party-types";

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
type MusicShareResult = { ok: boolean; sharedAudio?: PartySharedAudio | null; error?: string };
type CameraOffset = { x: number; y: number };
type CameraDrag = CameraOffset & {
  userId: string;
  pointerId: number;
  startX: number;
  startY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};
type NetworkSnapshot = { quality: "solo" | "excellent" | "good" | "weak"; rttMs: number | null; loss: number | null };
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
  isListeningRoom = false,
  localAudioAllowed = false,
  sharedAudio = null,
  controlsVisible = true,
}: {
  socket: Socket;
  roomId: string;
  profile: PartyProfile;
  participants: PartyParticipant[];
  mutedLocally: Set<string>;
  cameraAllowed: boolean;
  interpreterAllowed: boolean;
  interpreterUserId: string | null;
  isListeningRoom?: boolean;
  localAudioAllowed?: boolean;
  sharedAudio?: PartySharedAudio | null;
  controlsVisible?: boolean;
}) {
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const remoteAudioRef = useRef(new Map<string, HTMLAudioElement>());
  const remoteVideoStreamsRef = useRef(new Map<string, MediaStream>());
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const microphoneTrackRef = useRef<MediaStreamTrack | null>(null);
  const localMusicTrackRef = useRef<MediaStreamTrack | null>(null);
  const localMusicAudioRef = useRef<HTMLAudioElement | null>(null);
  const localMusicObjectUrlRef = useRef<string | null>(null);
  const localMusicContextRef = useRef<AudioContext | null>(null);
  const localMusicSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const localMusicSendersRef = useRef(new Map<string, RTCRtpSender>());
  const localMusicActiveRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const cameraDragRef = useRef<CameraDrag | null>(null);
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
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [draggingCameraId, setDraggingCameraId] = useState<string | null>(null);
  const [cameraOffsets, setCameraOffsets] = useState<Record<string, CameraOffset>>({});
  const [network, setNetwork] = useState<NetworkSnapshot>({ quality: "solo", rttMs: null, loss: null });
  const [musicStarting, setMusicStarting] = useState(false);
  const [musicSharing, setMusicSharing] = useState(false);
  const [activeSharedAudio, setActiveSharedAudio] = useState<PartySharedAudio | null>(sharedAudio);
  participantsRef.current = participants;
  mutedLocallyRef.current = mutedLocally;

  const me = participants.find((participant) => participant.id === profile.id);
  const mutedByHost = Boolean(me?.mutedByHost);
  const interpreterActive = interpreterUserId === profile.id;
  const panelVisible = controlsVisible && panelOpen;
  const talkers = participants.filter((participant) => activeTalkers.has(participant.id));
  const visibleCameras = participants
    .filter((participant) => cameraUsers.has(participant.id) && !mutedLocally.has(participant.id))
    .sort((left, right) => Number(right.id === interpreterUserId) - Number(left.id === interpreterUserId));
  const networkLabel = network.quality === "solo" ? "Waiting for peers" : network.quality === "excellent" ? "Excellent network" : network.quality === "good" ? "Good network" : "Weak network";
  const cameraControlLabel = cameraStarting ? "Starting…" : cameraEnabled ? "Camera off" : cameraAllowed ? "Camera" : "Camera locked";
  const interpreterControlLabel = interpreterActive ? "Stop signs" : interpreterAllowed ? "Interpreter" : "Signs locked";

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
    const onMusicShare = ({ sharedAudio: nextSharedAudio }: { sharedAudio: PartySharedAudio | null }) => {
      setActiveSharedAudio(nextSharedAudio ?? null);
    };
    const onForceMusicOff = () => {
      stopLocalMusic(false, false);
      showAppMessage({ title: "Local track stopped by the host", message: "Your browser stream is off; the room soundtrack is paused and ready for the next cue.", tone: "warning" });
    };

    socket.on("voice:signal", onSignal);
    socket.on("voice:peer-joined", onPeerJoined);
    socket.on("voice:peer-left", onPeerLeft);
    socket.on("voice:talking", onTalking);
    socket.on("voice:camera", onCamera);
    socket.on("voice:camera-force-off", onForceCameraOff);
    socket.on("voice:music-share", onMusicShare);
    socket.on("voice:music-share-force-off", onForceMusicOff);
    return () => {
      socket.off("voice:signal", onSignal);
      socket.off("voice:peer-joined", onPeerJoined);
      socket.off("voice:peer-left", onPeerLeft);
      socket.off("voice:talking", onTalking);
      socket.off("voice:camera", onCamera);
      socket.off("voice:camera-force-off", onForceCameraOff);
      socket.off("voice:music-share", onMusicShare);
      socket.off("voice:music-share-force-off", onForceMusicOff);
      if (joinedRef.current) socket.emit("voice:leave", { roomId });
      joinedRef.current = false;
      for (const peer of peersRef.current.values()) peer.close();
      peersRef.current.clear();
      for (const audio of remoteAudioRef.current.values()) audio.remove();
      remoteAudioRef.current.clear();
      remoteVideoStreamsRef.current.clear();
      stopLocalMusic(false, false);
      for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
      localStreamRef.current = null;
      microphoneTrackRef.current = null;
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

  useEffect(() => {
    if (!joined) return;
    let cancelled = false;
    const sample = async () => {
      const next = await measureConnections(peersRef.current);
      if (!cancelled) setNetwork(next);
    };
    void sample();
    const timer = window.setInterval(() => void sample(), 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [joined]);

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
      microphoneTrackRef.current = audioTrack;
      setPermissionState("granted");
      if (!joinedRef.current) await joinMediaSession(stream);
      else {
        if (!localStreamRef.current) localStreamRef.current = new MediaStream();
        localStreamRef.current.addTrack(audioTrack);
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
    stopLocalMusic(false);
    socket.emit("voice:leave", { roomId });
    joinedRef.current = false;
    for (const peer of peersRef.current.values()) peer.close();
    peersRef.current.clear();
    for (const audio of remoteAudioRef.current.values()) audio.remove();
    remoteAudioRef.current.clear();
    remoteVideoStreamsRef.current.clear();
    for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
    localStreamRef.current = null;
    microphoneTrackRef.current = null;
    setRemoteVideoStreams(new Map());
    setJoined(false);
    setMicrophoneReady(false);
    setPeerIds(new Set());
    setActiveTalkers(new Set());
    setCameraUsers(new Set());
    setTalking(false);
    setNetwork({ quality: "solo", rttMs: null, loss: null });
    showAppMessage({ title: "Media Lounge closed", message: "The synchronized movie keeps playing. Rejoin whenever you want.", tone: "info" });
  }

  function startTalking() {
    if (!joinedRef.current || talking || !microphoneReady) return;
    if (mutedByHost) {
      showAppMessage({ title: "Push-to-talk is muted", message: "The host currently has your room microphone muted.", tone: "warning" });
      return;
    }
    const track = microphoneTrackRef.current;
    if (!track) return;
    track.enabled = true;
    setTalking(true);
    setActiveTalkers((current) => new Set(current).add(profile.id));
    socket.emit("voice:talking", { roomId, active: true });
  }

  function stopTalking() {
    const track = microphoneTrackRef.current;
    if (track) track.enabled = false;
    if (!talking) return;
    setTalking(false);
    setActiveTalkers((current) => without(current, profile.id));
    socket.emit("voice:talking", { roomId, active: false });
  }

  async function startLocalMusic(file: File) {
    if (!isListeningRoom || musicStarting || musicSharing) return;
    if (!localAudioAllowed) {
      showAppMessage({ title: "Local music is locked", message: "Ask the room host to enable Share local music for you.", tone: "warning" });
      return;
    }
    if (file.type && !file.type.startsWith("audio/")) {
      showAppMessage({ title: "Choose an audio file", message: "MP3, M4A, WAV, OGG, and other browser-playable audio files work here.", tone: "warning" });
      return;
    }
    setMusicStarting(true);
    setVoiceIssue(null);
    try {
      stopLocalMusic(false);
      const objectUrl = URL.createObjectURL(file);
      const audio = document.createElement("audio");
      audio.src = objectUrl;
      audio.preload = "auto";
      audio.volume = 1;
      const context = new AudioContext();
      const sourceNode = context.createMediaElementSource(audio);
      const destination = context.createMediaStreamDestination();
      sourceNode.connect(destination);
      sourceNode.connect(context.destination);
      await context.resume();
      const track = destination.stream.getAudioTracks()[0];
      if (!track) throw new DOMException("The browser could not capture this audio file.", "NotSupportedError");
      track.contentHint = "music";
      localMusicTrackRef.current = track;
      localMusicAudioRef.current = audio;
      localMusicObjectUrlRef.current = objectUrl;
      localMusicContextRef.current = context;
      localMusicSourceRef.current = sourceNode;
      audio.addEventListener("ended", () => stopLocalMusic(true), { once: true });

      // Start the local preview while this click still has browser user
      // activation. Waiting for WebRTC signaling first can make Safari and
      // mobile Chromium reject the eventual play() call.
      await audio.play();
      if (!joinedRef.current) await joinMediaSession(new MediaStream());
      await replaceLocalMusicTrackForAll(track);
      const result = await emitMusicShare(socket, roomId, true, file.name);
      if (!result.ok) throw new Error(result.error ?? "This local track could not be shared.");
      localMusicActiveRef.current = true;
      setMusicSharing(true);
      setActiveSharedAudio(result.sharedAudio ?? { userId: profile.id, name: profile.name, fileName: file.name, startedAt: Date.now() });
      setPanelOpen(true);
      showAppMessage({ title: "Your local track is live 🎵", message: "It stays in your browser and streams directly to the people in this listening room.", tone: "success" });
    } catch (reason) {
      stopLocalMusic(false);
      const message = reason instanceof Error ? reason.message : "The local track could not be started.";
      showAppMessage({ title: "Local track could not start", message, tone: "error" });
    } finally {
      setMusicStarting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function stopLocalMusic(announce = true, notifyServer = true) {
    const wasActive = localMusicActiveRef.current;
    localMusicActiveRef.current = false;
    if (notifyServer && wasActive && joinedRef.current) socket.emit("voice:music-share", { roomId, active: false });
    void replaceLocalMusicTrackForAll(null);
    localMusicTrackRef.current?.stop();
    localMusicTrackRef.current = null;
    const audio = localMusicAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    localMusicAudioRef.current = null;
    localMusicSourceRef.current?.disconnect();
    localMusicSourceRef.current = null;
    const context = localMusicContextRef.current;
    localMusicContextRef.current = null;
    void context?.close().catch(() => undefined);
    if (localMusicObjectUrlRef.current) URL.revokeObjectURL(localMusicObjectUrlRef.current);
    localMusicObjectUrlRef.current = null;
    setMusicSharing(false);
    if (wasActive && announce) showAppMessage({ title: "Local track ended", message: "The live browser stream is off. Pick another file whenever the next song calls.", tone: "info" });
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

  function startCameraDrag(event: ReactPointerEvent<HTMLButtonElement>, userId: string) {
    event.preventDefault();
    event.stopPropagation();
    const item = event.currentTarget.closest<HTMLElement>(".party-camera-item");
    const stage = event.currentTarget.closest<HTMLElement>(".party-player-stage");
    if (!item || !stage) return;

    const origin = cameraOffsets[userId] ?? { x: 0, y: 0 };
    const itemRect = item.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const safeEdge = 8;
    cameraDragRef.current = {
      userId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: origin.x,
      y: origin.y,
      minX: origin.x + stageRect.left + safeEdge - itemRect.left,
      maxX: origin.x + stageRect.right - safeEdge - itemRect.right,
      minY: origin.y + stageRect.top + safeEdge - itemRect.top,
      maxY: origin.y + stageRect.bottom - safeEdge - itemRect.bottom,
    };
    setSelectedCameraId(userId);
    setDraggingCameraId(userId);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragCamera(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = cameraDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = {
      x: clamp(drag.x + event.clientX - drag.startX, Math.min(drag.minX, drag.maxX), Math.max(drag.minX, drag.maxX)),
      y: clamp(drag.y + event.clientY - drag.startY, Math.min(drag.minY, drag.maxY), Math.max(drag.minY, drag.maxY)),
    };
    setCameraOffsets((current) => ({ ...current, [drag.userId]: next }));
  }

  function finishCameraDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = cameraDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    cameraDragRef.current = null;
    setDraggingCameraId(null);
  }

  function resetCameraPosition(userId: string) {
    setCameraOffsets((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
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

  async function replaceLocalMusicTrackForAll(track: MediaStreamTrack | null) {
    for (const [userId, peer] of peersRef.current) {
      let sender = localMusicSendersRef.current.get(userId);
      let added = false;
      if (track && !sender) {
        sender = peer.addTransceiver("audio", { direction: "sendrecv" }).sender;
        localMusicSendersRef.current.set(userId, sender);
        added = true;
      }
      if (sender && sender.track !== track) await sender.replaceTrack(track);
      if (added) await makeOffer(userId, peer);
    }
  }

  async function makeOffer(userId: string, providedPeer?: RTCPeerConnection) {
    const peer = providedPeer ?? ensurePeer(userId, true);
    ensureMediaTransceivers(peer);
    await attachLocalTracks(peer);
    await attachLocalMusicTrack(peer, userId);
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
        await attachLocalMusicTrack(peer, signal.fromUserId);
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
      const track = kind === "audio" ? microphoneTrackRef.current : localStreamRef.current?.getVideoTracks()[0];
      const sender = mediaSender(peer, kind);
      if (sender && sender.track !== (track ?? null)) await sender.replaceTrack(track ?? null);
    }
  }

  async function attachLocalMusicTrack(peer: RTCPeerConnection, userId: string) {
    const track = localMusicTrackRef.current;
    if (!track) return;
    let sender = localMusicSendersRef.current.get(userId);
    if (!sender) {
      sender = peer.addTransceiver("audio", { direction: "sendrecv" }).sender;
      localMusicSendersRef.current.set(userId, sender);
    }
    if (sender.track !== track) await sender.replaceTrack(track);
  }

  function attachRemoteAudio(userId: string, track: MediaStreamTrack) {
    const audioId = `${userId}:${track.id}`;
    let audio = remoteAudioRef.current.get(audioId);
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.dataset.voiceUser = userId;
      audioContainerRef.current?.appendChild(audio);
      remoteAudioRef.current.set(audioId, audio);
    }
    audio.srcObject = new MediaStream([track]);
    audio.muted = shouldMute(userId);
    void audio.play().catch(() => undefined);
    track.addEventListener("ended", () => {
      remoteAudioRef.current.get(audioId)?.remove();
      remoteAudioRef.current.delete(audioId);
    }, { once: true });
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
    localMusicSendersRef.current.delete(userId);
    for (const [audioId, audio] of remoteAudioRef.current) {
      if (!audioId.startsWith(`${userId}:`)) continue;
      audio.remove();
      remoteAudioRef.current.delete(audioId);
    }
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
        <div className={`party-camera-dock has-${Math.min(visibleCameras.length, 8)} ${visibleCameras.length > 5 ? "is-crowded" : ""} ${interpreterUserId ? "has-interpreter" : ""}`} data-player-ui="true" aria-label="Room cameras">
          {visibleCameras.map((participant) => {
            const local = participant.id === profile.id;
            const stream = local ? localStreamRef.current : remoteVideoStreams.get(participant.id) ?? null;
            const interpreter = participant.id === interpreterUserId;
            const selected = selectedCameraId === participant.id;
            const offset = cameraOffsets[participant.id] ?? { x: 0, y: 0 };
            const cameraStyle = { "--camera-x": `${offset.x}px`, "--camera-y": `${offset.y}px` } as CSSProperties;
            return (
              <div className={`party-camera-item ${selected ? "is-selected" : ""} ${draggingCameraId === participant.id ? "is-dragging" : ""}`} style={cameraStyle} key={participant.id}>
                <article
                  className={`party-camera-tile ${participant.connected ? "is-online" : ""} ${activeTalkers.has(participant.id) ? "is-speaking" : ""} ${interpreter ? "is-interpreter" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${participant.name} camera. Select to move.`}
                  aria-pressed={selected}
                  onClick={() => setSelectedCameraId(participant.id)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCameraId(participant.id); } }}
                >
                  {stream?.getVideoTracks().length ? <StreamVideo stream={stream} mirrored={local} /> : <div className="party-camera-waiting">{participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : <span>{participant.name.slice(0, 1)}</span>}<small>Connecting camera…</small></div>}
                </article>
                {selected && <button className="party-camera-move" type="button" onPointerDown={(event) => startCameraDrag(event, participant.id)} onPointerMove={dragCamera} onPointerUp={finishCameraDrag} onPointerCancel={finishCameraDrag} onLostPointerCapture={finishCameraDrag} onDoubleClick={() => resetCameraPosition(participant.id)} aria-label={`Move ${participant.name} camera`} title="Drag to move · double-click to reset"><Move size={13} /></button>}
                {local && selected && <button className="party-camera-stop" type="button" onClick={() => stopCamera()} aria-label="Turn camera off" title="Turn camera off"><CameraOff size={13} /></button>}
                <span className={`party-camera-network is-${network.quality}`} title={networkLabel} aria-label={networkLabel}>{network.quality === "weak" ? <WifiOff size={10} /> : <Wifi size={10} />}</span>
                <div className="party-camera-caption"><strong>{participant.name}</strong>{interpreter ? <small>Interpreter</small> : local ? <small>You</small> : null}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`party-voice ${panelVisible ? "is-open" : ""} ${talking ? "is-talking" : ""} ${controlsVisible ? "is-hud-visible" : "is-hud-hidden"}`} data-player-ui="true">
        {talkers.length > 0 && (
          <div className="party-voice-speakers">
            {talkers.slice(0, 3).map((participant) => <span key={participant.id} title={`${participant.name} is talking`}>{participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : participant.name.slice(0, 1)}<i /></span>)}
          </div>
        )}
        <button className="party-voice-toggle" type="button" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelVisible}>
          <Radio size={17} />
          <span><strong>Media Lounge</strong><small>{joined ? `${Math.max(peerIds.size, 1)} online` : "Voice + camera"}</small></span>
        </button>
        {panelVisible && (
          <div className="party-voice-panel">
            <div className="party-voice-copy"><Headphones size={19} /><span><strong>Voice & camera</strong><small>Private until you turn them on.</small></span></div>
            {joined && <div className={`party-network-quality is-${network.quality}`}>{network.quality === "weak" ? <WifiOff size={15} /> : <Wifi size={15} />}<span><strong>{networkLabel}</strong><small>{network.rttMs !== null ? `${network.rttMs} ms` : "Direct WebRTC"}{network.loss !== null ? ` · ${network.loss.toFixed(1)}% loss` : ""}</small></span></div>}
            {voiceIssue && <div className={`party-voice-permission is-${voiceIssue.kind}`} role="alert"><ShieldAlert size={18} /><div><strong>{voiceIssue.title}</strong><p>{voiceIssue.message}</p><small>{voiceIssue.hint}</small></div></div>}
            {!voiceIssue && <div className="party-voice-privacy"><ShieldCheck size={14} /><span>{permissionState === "granted" ? "Mic ready" : "Media is opt-in"}</span></div>}

            {!microphoneReady ? (
              <button className="party-voice-join" type="button" disabled={joining} onClick={() => void joinVoice()}>{voiceIssue ? <RefreshCw size={17} /> : <Mic size={17} />}{joining ? "Connecting…" : voiceIssue ? "Try microphone again" : "Join voice"}</button>
            ) : (
              <button className="party-voice-ptt" type="button" disabled={mutedByHost} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); startTalking(); }} onPointerUp={stopTalking} onPointerCancel={stopTalking} onLostPointerCapture={stopTalking} onKeyDown={(event) => { if (!event.repeat && (event.key === " " || event.key === "Enter")) { event.preventDefault(); startTalking(); } }} onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") stopTalking(); }}>
                {talking ? <Mic size={22} /> : mutedByHost ? <MicOff size={22} /> : <Mic size={22} />}<span>{mutedByHost ? "Host muted" : talking ? "Talking · release" : "Hold to talk"}</span>
              </button>
            )}

            <button className={`party-camera-toggle ${cameraEnabled ? "is-live" : ""}`} type="button" disabled={cameraStarting || !cameraAllowed} onClick={() => cameraEnabled ? stopCamera() : void startCamera()} aria-label={cameraControlLabel} title={cameraControlLabel}>
              {cameraEnabled ? <CameraOff size={17} /> : <Camera size={17} />}<span>{cameraControlLabel}</span>
            </button>

            <button className={`party-interpreter-toggle ${interpreterActive ? "is-live" : ""}`} type="button" disabled={!interpreterAllowed} onClick={() => void toggleInterpreter()} aria-label={interpreterControlLabel} title={interpreterControlLabel}>
              <Accessibility size={17} /><span>{interpreterControlLabel}</span>
            </button>

            {isListeningRoom && <div className="party-local-music-share">
              <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void startLocalMusic(file); }} />
              {activeSharedAudio ? <div className={`party-local-music-live ${activeSharedAudio.userId === profile.id ? "is-mine" : ""}`}><Volume2 size={15} /><span><strong>{activeSharedAudio.userId === profile.id ? "Your local track is live" : `${activeSharedAudio.name}'s local track`}</strong><small>{activeSharedAudio.fileName}</small></span>{activeSharedAudio.userId === profile.id && <button type="button" onClick={() => stopLocalMusic()} aria-label="Stop local track" title="Stop local track"><Square size={13} fill="currentColor" /></button>}</div> : <button className="party-local-music-start" type="button" disabled={musicStarting || !localAudioAllowed} onClick={() => fileInputRef.current?.click()} title={localAudioAllowed ? "Share an audio file from this browser" : "Host permission is required"}><FileAudio size={16} /><span>{musicStarting ? "Opening local track…" : localAudioAllowed ? "Play local file" : "Local file locked"}</span><Upload size={13} /></button>}
              {!activeSharedAudio && <small className="party-local-music-note">{localAudioAllowed ? "Stays on your device; it streams live to people in the Media Lounge." : "Ask the host to enable Share local music."}</small>}
            </div>}

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function measureConnections(peers: Map<string, RTCPeerConnection>): Promise<NetworkSnapshot> {
  if (peers.size === 0) return { quality: "solo", rttMs: null, loss: null };
  let connected = 0;
  let highestRtt = 0;
  let packetsLost = 0;
  let packetsReceived = 0;

  await Promise.all([...peers.values()].map(async (peer) => {
    if (peer.connectionState === "connected") connected += 1;
    try {
      const reports = await peer.getStats();
      reports.forEach((report) => {
        const stat = report as RTCStats & {
          state?: string;
          nominated?: boolean;
          selected?: boolean;
          currentRoundTripTime?: number;
          packetsLost?: number;
          packetsReceived?: number;
        };
        if (stat.type === "candidate-pair" && stat.state === "succeeded" && (stat.nominated || stat.selected) && Number.isFinite(stat.currentRoundTripTime)) {
          highestRtt = Math.max(highestRtt, Number(stat.currentRoundTripTime) * 1_000);
        }
        if (stat.type === "inbound-rtp") {
          packetsLost += Math.max(0, Number(stat.packetsLost ?? 0));
          packetsReceived += Math.max(0, Number(stat.packetsReceived ?? 0));
        }
      });
    } catch {
      // A peer can disappear between the interval tick and getStats().
    }
  }));

  const totalPackets = packetsLost + packetsReceived;
  const loss = totalPackets > 0 ? packetsLost / totalPackets * 100 : null;
  const rttMs = highestRtt > 0 ? Math.round(highestRtt) : null;
  const weak = connected < peers.size || (rttMs !== null && rttMs > 350) || (loss !== null && loss > 5);
  const excellent = connected === peers.size && (rttMs === null || rttMs < 130) && (loss === null || loss < 1.5);
  return { quality: weak ? "weak" : excellent ? "excellent" : "good", rttMs, loss };
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

function emitMusicShare(socket: Socket, roomId: string, active: boolean, fileName?: string) {
  return new Promise<MusicShareResult>((resolve) => {
    const timer = window.setTimeout(() => resolve({ ok: false, error: "Local music request timed out." }), 8_000);
    socket.emit("voice:music-share", { roomId, active, fileName }, (result: MusicShareResult) => {
      window.clearTimeout(timer);
      resolve(result);
    });
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
