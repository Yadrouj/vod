import { io } from "socket.io-client";

const origin = (process.argv[2] || process.env.LOAD_BASE_URL || "http://127.0.0.1:3004").replace(/\/$/, "");
const host = io(origin, { transports: ["websocket"], forceNew: true, timeout: 8_000, autoConnect: false });
const guest = io(origin, { transports: ["websocket"], forceNew: true, timeout: 8_000, autoConnect: false });

try {
  const connected = Promise.all([waitForEvent(host, "connect"), waitForEvent(guest, "connect")]);
  host.connect();
  guest.connect();
  await connected;

  const created = await emitWithAck(host, "room:create", {
    profile: { id: "smoke-host", name: "Smoke Host", avatarUrl: null, telegramId: null },
    media: {
      itemId: "tt-smoke",
      title: "Smoke Test",
      posterUrl: null,
      source: { url: "https://example.com/video.mp4", label: "1080p", quality: "1080p", season: null, episode: null },
      sources: [],
    },
  });
  if (!created?.ok) throw new Error(created?.error || "room:create failed");

  const joined = await emitWithAck(guest, "room:join", {
    roomId: created.roomId,
    inviteToken: created.inviteToken,
    profile: { id: "smoke-guest", name: "Smoke Guest", avatarUrl: null, telegramId: null },
  });
  if (!joined?.ok) throw new Error(joined?.error || "room:join failed");

  const statePromise = waitForEvent(guest, "playback:state", (state) => state?.action === "seek");
  const command = await emitWithAck(host, "playback:command", {
    roomId: created.roomId,
    action: "seek",
    time: 42,
  });
  if (!command?.ok) throw new Error(command?.error || "playback:command failed");
  const state = await statePromise;
  if (Math.abs(Number(state.currentTime) - 42) > 0.5) throw new Error(`sync drift is too high: ${state.currentTime}`);

  const hostVoice = await emitWithAck(host, "voice:join", { roomId: created.roomId });
  if (!hostVoice?.ok || hostVoice.peers?.length) throw new Error("host voice:join failed");
  const guestVoice = await emitWithAck(guest, "voice:join", { roomId: created.roomId });
  if (!guestVoice?.ok || !guestVoice.peers?.includes("smoke-host")) throw new Error("guest did not discover host voice peer");

  const signalPromise = waitForEvent(host, "voice:signal", (signal) => signal?.fromUserId === "smoke-guest");
  guest.emit("voice:signal", {
    roomId: created.roomId,
    targetUserId: "smoke-host",
    description: { type: "offer", sdp: "smoke-sdp" },
  });
  const signal = await signalPromise;
  if (signal.description?.sdp !== "smoke-sdp") throw new Error("voice signal was not forwarded");

  const talkingPromise = waitForEvent(host, "voice:talking", (value) => value?.userId === "smoke-guest" && value?.active === true);
  guest.emit("voice:talking", { roomId: created.roomId, active: true });
  await talkingPromise;

  const leftPromise = waitForEvent(host, "voice:peer-left", (value) => value?.userId === "smoke-guest");
  guest.emit("voice:leave", { roomId: created.roomId });
  await leftPromise;

  console.log(JSON.stringify({ ok: true, roomId: created.roomId, syncedTime: state.currentTime, voiceSignaling: true, pushToTalkState: true }, null, 2));
} finally {
  host.disconnect();
  guest.disconnect();
}

function emitWithAck(socket, event, payload, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} acknowledgement timed out`)), timeoutMs);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

function waitForEvent(socket, event, predicate = () => true, timeoutMs = 8_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`${event} timed out`));
    }, timeoutMs);
    function listener(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    }
    socket.on(event, listener);
  });
}
