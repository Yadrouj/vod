import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import next from "next";
import { Server } from "socket.io";
import { loadVodHomeIndex, loadVodIndex } from "./lib/vod-index";
import type { PartyCapability, PartyChatMessage, PartyMedia, PartyParticipant, PartyPermissions, PartyPlayback, PartyProfile, PartyQueueItem, PartySnapshot } from "./lib/watch-party-types";
import { DEFAULT_PARTY_PERMISSIONS } from "./lib/watch-party-types";

const dev = process.argv.includes("--dev");
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3004);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
const processStartedAt = Date.now();
const MAX_ACTIVE_ROOMS = positiveInteger(process.env.WATCH_PARTY_MAX_ROOMS, 500);
const MAX_ROOM_PARTICIPANTS = positiveInteger(process.env.WATCH_PARTY_MAX_PARTICIPANTS, 50);
const MAX_QUEUE_ITEMS = positiveInteger(process.env.WATCH_PARTY_MAX_QUEUE, 100);
const MAX_VOICE_PARTICIPANTS = positiveInteger(process.env.WATCH_PARTY_MAX_VOICE_PARTICIPANTS, 10);
let ready = false;
let shuttingDown = false;

type Room = {
  id: string;
  inviteToken: string;
  ownerId: string;
  playback: PartyPlayback;
  participants: Map<string, PartyParticipant>;
  sockets: Map<string, string>;
  guestPermissions: PartyPermissions;
  queue: PartyQueueItem[];
  chat: PartyChatMessage[];
  blocked: Set<string>;
  voiceUsers: Set<string>;
  voiceTalking: Set<string>;
  createdAt: number;
  lastActiveAt: number;
};

const rooms = new Map<string, Room>();
const capabilityForAction: Record<string, PartyCapability> = { play: "playback", pause: "playback", seek: "seek", rate: "playback", source: "changeSource", media: "changeMedia" };

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function allowedSocketOrigin(origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) {
  if (!origin || dev) return callback(null, true);
  const configured = (process.env.PUBLIC_APP_URL ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!configured.length || configured.includes(origin)) return callback(null, true);
  callback(new Error("Origin is not allowed."));
}

function allowSocketEvent(socket: { data: Record<string, unknown> }, name: string, limit: number, windowMs: number) {
  const now = Date.now();
  const buckets = (socket.data.eventRateBuckets ??= new Map<string, { count: number; resetAt: number }>()) as Map<string, { count: number; resetAt: number }>;
  let bucket = buckets.get(name);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(name, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function trackSocketRoom(socket: { data: Record<string, unknown> }, roomId: string) {
  const roomIds = (socket.data.partyRoomIds ??= new Set<string>()) as Set<string>;
  roomIds.add(roomId);
}

function cleanProfile(value: Partial<PartyProfile>): PartyProfile {
  return { id: String(value.id || randomUUID()).slice(0, 80), name: String(value.name || "Guest").trim().slice(0, 40) || "Guest", avatarUrl: value.avatarUrl ? String(value.avatarUrl).slice(0, 1000) : null, telegramId: value.telegramId ? String(value.telegramId).slice(0, 80) : null };
}

function currentTime(playback: PartyPlayback, now = Date.now()) {
  return playback.paused ? playback.currentTime : playback.currentTime + Math.max(0, now - playback.updatedAt) / 1000 * playback.playbackRate;
}

function snapshot(room: Room): PartySnapshot {
  return { roomId: room.id, ownerId: room.ownerId, playback: { ...room.playback, currentTime: currentTime(room.playback) }, participants: [...room.participants.values()], guestPermissions: room.guestPermissions, queue: room.queue, chat: room.chat.slice(-100), serverNow: Date.now() };
}

function permitted(room: Room, userId: string, capability: PartyCapability) {
  if (userId === room.ownerId) return true;
  const participant = room.participants.get(userId);
  if (!participant || participant.mutedByHost && (capability === "chat" || capability === "react")) return false;
  return participant.permissions[capability] ?? room.guestPermissions[capability];
}

function roomForSocket(roomId: string, socketId: string) {
  const room = rooms.get(roomId);
  const userId = room?.sockets.get(socketId);
  return room && userId ? { room, userId } : null;
}

async function start() {
await app.prepare();
const httpServer = createServer((request, response) => {
  const pathname = request.url?.split("?", 1)[0];
  if (request.method === "GET" && pathname === "/healthz") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ status: "ok", uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000) }));
    return;
  }
  if (request.method === "GET" && pathname === "/readyz") {
    const status = ready && !shuttingDown ? 200 : 503;
    const memory = process.memoryUsage();
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({
      status: status === 200 ? "ready" : "not-ready",
      rooms: rooms.size,
      memoryMb: { rss: Math.round(memory.rss / 1024 / 1024), heapUsed: Math.round(memory.heapUsed / 1024 / 1024) },
    }));
    return;
  }
  if (!dev && pathname?.startsWith("/data/")) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end("Not found");
    return;
  }
  void handler(request, response);
});
httpServer.keepAliveTimeout = 65_000;
httpServer.headersTimeout = 66_000;
httpServer.requestTimeout = 30_000;

const io = new Server(httpServer, {
  cors: { origin: allowedSocketOrigin, credentials: true },
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 256 * 1024,
  pingInterval: 25_000,
  pingTimeout: 20_000,
  perMessageDeflate: false,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60_000,
    skipMiddlewares: true,
  },
});

io.use((socket, nextMiddleware) => {
  if (shuttingDown) return nextMiddleware(new Error("Server is restarting."));
  nextMiddleware();
});

io.on("connection", (socket) => {
  socket.on("room:create", (payload: { profile: PartyProfile; media: PartyMedia }, ack) => {
    if (!allowSocketEvent(socket, "room:create", 3, 60_000)) return ack?.({ ok: false, error: "Too many room requests." });
    if (rooms.size >= MAX_ACTIVE_ROOMS) return ack?.({ ok: false, error: "Room capacity is temporarily full." });
    const profile = cleanProfile(payload?.profile ?? {});
    if (!payload?.media?.source?.url) return ack?.({ ok: false, error: "A playable source is required." });
    const id = randomBytes(5).toString("base64url");
    const inviteToken = randomBytes(18).toString("base64url");
    const participant: PartyParticipant = { ...profile, role: "host", connected: true, mutedByHost: false, joinedAt: Date.now(), permissions: {} };
    const room: Room = { id, inviteToken, ownerId: profile.id, playback: { media: payload.media, currentTime: 0, paused: true, playbackRate: 1, updatedAt: Date.now(), revision: 1 }, participants: new Map([[profile.id, participant]]), sockets: new Map([[socket.id, profile.id]]), guestPermissions: { ...DEFAULT_PARTY_PERMISSIONS }, queue: [], chat: [], blocked: new Set(), voiceUsers: new Set(), voiceTalking: new Set(), createdAt: Date.now(), lastActiveAt: Date.now() };
    rooms.set(id, room); socket.join(id); trackSocketRoom(socket, id);
    ack?.({ ok: true, roomId: id, inviteToken, snapshot: snapshot(room) });
  });

  socket.on("room:join", (payload: { roomId: string; inviteToken: string; profile: PartyProfile }, ack) => {
    if (!allowSocketEvent(socket, "room:join", 10, 60_000)) return ack?.({ ok: false, error: "Too many join attempts." });
    const room = rooms.get(payload?.roomId);
    const profile = cleanProfile(payload?.profile ?? {});
    if (!room || room.inviteToken !== payload?.inviteToken) return ack?.({ ok: false, error: "Room or invite link is invalid." });
    if (room.blocked.has(profile.id)) return ack?.({ ok: false, error: "You are blocked from this room." });
    const previous = room.participants.get(profile.id);
    const connectedCount = [...room.participants.values()].filter((participant) => participant.connected).length;
    if (!previous?.connected && connectedCount >= MAX_ROOM_PARTICIPANTS) return ack?.({ ok: false, error: "This room is full." });
    room.participants.set(profile.id, { ...profile, role: profile.id === room.ownerId ? "host" : "guest", connected: true, mutedByHost: previous?.mutedByHost ?? false, joinedAt: previous?.joinedAt ?? Date.now(), permissions: previous?.permissions ?? {} });
    room.sockets.set(socket.id, profile.id); room.lastActiveAt = Date.now(); socket.join(room.id); trackSocketRoom(socket, room.id);
    io.to(room.id).emit("room:snapshot", snapshot(room));
    ack?.({ ok: true, snapshot: snapshot(room) });
  });

  socket.on("voice:join", ({ roomId }: { roomId: string }, ack) => {
    if (!allowSocketEvent(socket, "voice:join", 8, 60_000)) return ack?.({ ok: false, error: "Too many voice join attempts." });
    const found = roomForSocket(roomId, socket.id);
    if (!found) return ack?.({ ok: false, error: "Join the watch room before voice." });
    const peers = [...found.room.voiceUsers].filter((userId) => userId !== found.userId);
    if (!found.room.voiceUsers.has(found.userId) && found.room.voiceUsers.size >= MAX_VOICE_PARTICIPANTS) {
      return ack?.({ ok: false, error: "Voice Lounge is full. The microphones formed a union." });
    }
    found.room.voiceUsers.add(found.userId);
    found.room.lastActiveAt = Date.now();
    socket.to(roomId).emit("voice:peer-joined", { userId: found.userId });
    ack?.({ ok: true, peers, talking: [...found.room.voiceTalking] });
  });

  socket.on("voice:leave", ({ roomId }: { roomId: string }) => {
    const found = roomForSocket(roomId, socket.id);
    if (!found) return;
    found.room.voiceUsers.delete(found.userId);
    found.room.voiceTalking.delete(found.userId);
    socket.to(roomId).emit("voice:talking", { userId: found.userId, active: false });
    socket.to(roomId).emit("voice:peer-left", { userId: found.userId });
  });

  socket.on("voice:signal", (payload: { roomId: string; targetUserId: string; description?: unknown; candidate?: unknown }) => {
    if (!allowSocketEvent(socket, "voice:signal", 360, 60_000)) return;
    const found = roomForSocket(payload?.roomId, socket.id);
    const targetUserId = String(payload?.targetUserId ?? "").slice(0, 80);
    if (!found || !targetUserId || targetUserId === found.userId || !found.room.voiceUsers.has(found.userId) || !found.room.voiceUsers.has(targetUserId)) return;
    const signal = {
      fromUserId: found.userId,
      description: payload.description && typeof payload.description === "object" ? payload.description : undefined,
      candidate: payload.candidate && typeof payload.candidate === "object" ? payload.candidate : undefined,
    };
    for (const [targetSocketId, userId] of found.room.sockets) {
      if (userId === targetUserId) io.to(targetSocketId).emit("voice:signal", signal);
    }
  });

  socket.on("voice:talking", ({ roomId, active }: { roomId: string; active: boolean }) => {
    if (!allowSocketEvent(socket, "voice:talking", 30, 10_000)) return;
    const found = roomForSocket(roomId, socket.id);
    const participant = found?.room.participants.get(found.userId);
    if (!found || !participant || participant.mutedByHost || !found.room.voiceUsers.has(found.userId)) return;
    if (active) found.room.voiceTalking.add(found.userId);
    else found.room.voiceTalking.delete(found.userId);
    io.to(roomId).emit("voice:talking", { userId: found.userId, active: Boolean(active) });
  });

  socket.on("sync:request", ({ roomId, clientSentAt }: { roomId: string; clientSentAt?: number }) => {
    if (!allowSocketEvent(socket, "sync:request", 30, 10_000)) return;
    const found = roomForSocket(roomId, socket.id);
    if (!found) return;
    const serverNow = Date.now();
    socket.emit("playback:state", {
      ...found.room.playback,
      currentTime: currentTime(found.room.playback, serverNow),
      serverNow,
      clientSentAt: Number.isFinite(clientSentAt) ? clientSentAt : undefined,
    });
  });

  socket.on("playback:command", ({ roomId, action, time, rate, source, media }: { roomId: string; action: string; time?: number; rate?: number; source?: PartyMedia["source"]; media?: PartyMedia }, ack) => {
    if (!allowSocketEvent(socket, "playback:command", 40, 10_000)) return ack?.({ ok: false, error: "Playback commands are arriving too quickly." });
    const found = roomForSocket(roomId, socket.id); if (!found) return;
    const capability = capabilityForAction[action]; if (!capability || !permitted(found.room, found.userId, capability)) return ack?.({ ok: false, error: "Permission denied." });
    const now = Date.now(); const playback = found.room.playback; playback.currentTime = currentTime(playback, now); playback.updatedAt = now;
    if (action === "play") playback.paused = false;
    if (action === "pause") playback.paused = true;
    if (action === "seek" && Number.isFinite(time)) playback.currentTime = Math.max(0, Number(time));
    if (action === "rate" && Number.isFinite(rate)) playback.playbackRate = Math.max(.25, Math.min(3, Number(rate)));
    if (action === "source" && source?.url) { playback.media.source = source; playback.currentTime = Number.isFinite(time) ? Number(time) : 0; }
    if (action === "media" && media?.source?.url) { playback.media = media; playback.currentTime = 0; playback.paused = true; }
    playback.revision++;
    found.room.lastActiveAt = now;
    io.to(roomId).emit("playback:state", {
      ...playback,
      currentTime: currentTime(playback, now),
      serverNow: now,
      action,
      originUserId: found.userId,
    });
    ack?.({ ok: true });
  });

  socket.on("queue:add", ({ roomId, media }: { roomId: string; media: PartyMedia }, ack) => { const found = roomForSocket(roomId, socket.id); if (!found || !permitted(found.room, found.userId, "queue") || !media?.source?.url) return ack?.({ ok: false, error: "Permission denied." }); if (!allowSocketEvent(socket, "queue:add", 20, 60_000)) return ack?.({ ok: false, error: "Queue requests are arriving too quickly." }); if (found.room.queue.length >= MAX_QUEUE_ITEMS) return ack?.({ ok: false, error: "The room queue is full." }); const item: PartyQueueItem = { ...media, queueId: randomUUID(), addedBy: found.userId, addedAt: Date.now() }; found.room.queue.push(item); io.to(roomId).emit("queue:update", found.room.queue); ack?.({ ok: true }); });
  socket.on("queue:remove", ({ roomId, queueId }: { roomId: string; queueId: string }) => { const found = roomForSocket(roomId, socket.id); if (!found || !permitted(found.room, found.userId, "queue")) return; found.room.queue = found.room.queue.filter((item) => item.queueId !== queueId); io.to(roomId).emit("queue:update", found.room.queue); });
  socket.on("queue:play", ({ roomId, queueId }: { roomId: string; queueId: string }) => { const found = roomForSocket(roomId, socket.id); if (!found || !permitted(found.room, found.userId, "changeMedia")) return; const item = found.room.queue.find((entry) => entry.queueId === queueId); if (!item) return; const serverNow = Date.now(); found.room.playback = { media: item, currentTime: 0, paused: true, playbackRate: 1, updatedAt: serverNow, revision: found.room.playback.revision + 1 }; found.room.queue = found.room.queue.filter((entry) => entry.queueId !== queueId); io.to(roomId).emit("queue:update", found.room.queue); io.to(roomId).emit("playback:state", { ...found.room.playback, serverNow, action: "media", originUserId: found.userId }); });

  socket.on("chat:send", ({ roomId, text }: { roomId: string; text: string }) => { if (!allowSocketEvent(socket, "chat:send", 12, 10_000)) return; const found = roomForSocket(roomId, socket.id); if (!found || !permitted(found.room, found.userId, "chat")) return; const participant = found.room.participants.get(found.userId)!; const clean = String(text || "").trim().slice(0, 600); if (!clean) return; const message: PartyChatMessage = { id: randomUUID(), userId: found.userId, name: participant.name, avatarUrl: participant.avatarUrl, text: clean, createdAt: Date.now() }; found.room.chat.push(message); found.room.chat = found.room.chat.slice(-100); io.to(roomId).emit("chat:message", message); });
  socket.on("reaction:send", ({ roomId, emoji }: { roomId: string; emoji: string }) => { if (!allowSocketEvent(socket, "reaction:send", 20, 10_000)) return; const found = roomForSocket(roomId, socket.id); if (!found || !permitted(found.room, found.userId, "react")) return; const participant = found.room.participants.get(found.userId)!; const allowed = ["❤️", "😂", "👏", "🔥", "😮", "😢"]; if (!allowed.includes(emoji)) return; io.to(roomId).emit("reaction", { id: randomUUID(), userId: found.userId, name: participant.name, avatarUrl: participant.avatarUrl, emoji, createdAt: Date.now() }); });

  socket.on("permissions:global", ({ roomId, permissions }: { roomId: string; permissions: Partial<PartyPermissions> }) => { const found = roomForSocket(roomId, socket.id); if (!found || found.userId !== found.room.ownerId) return; found.room.guestPermissions = { ...found.room.guestPermissions, ...permissions }; io.to(roomId).emit("room:snapshot", snapshot(found.room)); });
  socket.on("permissions:user", ({ roomId, userId, permissions }: { roomId: string; userId: string; permissions: Partial<PartyPermissions> }) => { const found = roomForSocket(roomId, socket.id); if (!found || found.userId !== found.room.ownerId) return; const participant = found.room.participants.get(userId); if (!participant) return; participant.permissions = { ...participant.permissions, ...permissions }; io.to(roomId).emit("room:snapshot", snapshot(found.room)); });
  socket.on("moderation", ({ roomId, userId, action }: { roomId: string; userId: string; action: "kick" | "block" | "mute" | "unmute" }) => {
    const found = roomForSocket(roomId, socket.id);
    if (!found || found.userId !== found.room.ownerId || userId === found.room.ownerId) return;
    const participant = found.room.participants.get(userId);
    if (!participant) return;
    if (action === "mute" || action === "unmute") participant.mutedByHost = action === "mute";
    if (action === "mute") {
      found.room.voiceTalking.delete(userId);
      io.to(roomId).emit("voice:talking", { userId, active: false });
    }
    if (action === "block") found.room.blocked.add(userId);
    if (action === "kick" || action === "block") {
      found.room.voiceUsers.delete(userId);
      found.room.voiceTalking.delete(userId);
      io.to(roomId).emit("voice:peer-left", { userId });
      for (const [socketId, id] of found.room.sockets) if (id === userId) {
        io.to(socketId).emit("room:removed", { blocked: action === "block" });
        io.sockets.sockets.get(socketId)?.leave(roomId);
        found.room.sockets.delete(socketId);
      }
      participant.connected = false;
    }
    io.to(roomId).emit("room:snapshot", snapshot(found.room));
  });

  socket.on("disconnect", () => {
    const roomIds = socket.data.partyRoomIds as Set<string> | undefined;
    for (const roomId of roomIds ?? []) {
      const room = rooms.get(roomId);
      if (!room) continue;
      const userId = room.sockets.get(socket.id);
      if (!userId) continue;
      room.sockets.delete(socket.id);
      const stillConnected = [...room.sockets.values()].includes(userId);
      const participant = room.participants.get(userId);
      if (participant) participant.connected = stillConnected;
      if (!stillConnected && room.voiceUsers.delete(userId)) {
        room.voiceTalking.delete(userId);
        io.to(roomId).emit("voice:talking", { userId, active: false });
        io.to(roomId).emit("voice:peer-left", { userId });
      }
      room.lastActiveAt = Date.now();
      io.to(room.id).emit("room:snapshot", snapshot(room));
    }
  });
});

setInterval(() => { const cutoff = Date.now() - 12 * 60 * 60 * 1000; for (const [id, room] of rooms) if (room.lastActiveAt < cutoff && ![...room.participants.values()].some((participant) => participant.connected)) rooms.delete(id); }, 60_000).unref();

// Load the two compact indexes before accepting production traffic. This avoids
// making the first real search request pay the JSON read/parse cost.
await Promise.all([loadVodHomeIndex(), loadVodIndex()]);
ready = true;

httpServer.listen(port, hostname, () => {
  console.log(`SarvNema with Watch Together ready on http://${hostname}:${port}`);
});

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  ready = false;
  console.log(`${signal} received; draining connections.`);

  const forceExit = setTimeout(() => process.exit(1), 15_000);
  forceExit.unref();
  io.close(() => {
    httpServer.close(() => {
      clearTimeout(forceExit);
      process.exit(0);
    });
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
