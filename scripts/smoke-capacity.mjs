// Local-only protocol capacity test. Never fetches external movie/music sources.
// The fixture tests Range transport/backpressure, not video codec decoding.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { io } from "socket.io-client";
import { Agent, request as httpRequest } from "node:http";

const port = Number(process.env.CAPACITY_PORT || 3006);
const origin = `http://127.0.0.1:${port}`;
const storage = await mkdtemp(join(tmpdir(), "sarvnema-capacity-"));
const id = randomUUID(), key = randomBytes(24).toString("base64url");
const fixture = Buffer.alloc(4 * 1024 * 1024, 0x5a);
await writeFile(join(storage, `${id}.mp4`), fixture);
await writeFile(join(storage, `${id}.json`), JSON.stringify({ id, accessKey: key, roomId: "capacity", ownerId: "load-test", ownerName: "Load test", title: "Local transport fixture", originalName: "test.mp4", fileName: `${id}.mp4`, mimeType: "video/mp4", mediaKind: "video", bytes: fixture.length, createdAt: Date.now(), expiresAt: Date.now() + 3600000 }));
const server = spawn(process.execPath, ["--import", "tsx", "watch-party-server.ts"], {
  env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production", WATCH_PARTY_MEDIA_DIR: storage, TRUSTED_PROXY_IPS: "127.0.0.1", TRUST_ISOLATED_PROXY: "0" },
  stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
});
let serverLog = "";
server.stdout.on("data", data => { serverLog += data; }); server.stderr.on("data", data => { serverLog += data; });
const sockets = [];
const samples = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const headers = i => ({ "x-real-ip": `198.18.${Math.floor(i / 250)}.${i % 250 + 1}` });
// Attackers cannot borrow the viewers' browser TCP connection pool. Keep them
// separate so a burst doesn't evict/reassign the established media connections.
const mediaAgent = new Agent({ keepAlive: true, maxSockets: 100 });
const burstAgent = new Agent({ keepAlive: true, maxSockets: 180 });
const agentApi = (path, i, extra, agent) => new Promise(resolve => {
  const start = performance.now();
  const fail = error => resolve({ status: 0, ms: performance.now()-start, bytes: 0, headers: new Headers(), body: new Uint8Array(), error: String(error) });
  const req = httpRequest(origin + path, { agent, headers: { ...headers(i), ...extra } }, response => {
    const chunks = [];
    response.on("data", chunk => chunks.push(chunk)); response.on("error", fail);
    response.on("end", () => {
      const body = Buffer.concat(chunks), responseHeaders = new Headers();
      for (const [name, value] of Object.entries(response.headers)) if (value) responseHeaders.set(name, String(value));
      resolve({ status: response.statusCode, ms: performance.now()-start, bytes: body.length, headers: responseHeaders, body });
    });
  });
  req.setTimeout(30000, () => req.destroy(new Error("Request timed out"))); req.on("error", fail); req.end();
});
const api = async (path, i = 0, extra = {}) => {
  const start = performance.now();
  try {
    const response = await fetch(origin + path, { headers: { ...headers(i), ...extra }, signal: AbortSignal.timeout(30000) });
    const body = await response.arrayBuffer();
    return { status: response.status, ms: performance.now() - start, bytes: body.byteLength, headers: response.headers, body };
  } catch (error) { return { status: 0, ms: performance.now()-start, bytes: 0, headers: new Headers(), body: new ArrayBuffer(0), error: `${error}: ${error.cause?.code || error.cause || ""}` }; }
};
const metrics = values => { const times = values.map(value => value.ms).sort((a,b) => a-b); return { requests: values.length, p50Ms: Math.round(times[Math.floor(times.length * .5)] || 0), p95Ms: Math.round(times[Math.floor(times.length * .95)] || 0), statuses: values.reduce((map,value) => (map[value.status] = (map[value.status] || 0) + 1, map), {}) }; };
const ack = (socket, event, data) => new Promise((resolve, reject) => socket.timeout(10000).emit(event, data, (error, result) => error ? reject(error) : result?.ok ? resolve(result) : reject(new Error(`${event}: ${result?.error}`))));
let monitor;
try {
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null) throw new Error(serverLog);
    if (serverLog.includes("ready on")) break;
    if (attempt > 120) throw new Error("Server did not start: " + serverLog);
    await sleep(500);
  }
  monitor = setInterval(() => {
    fetch(origin + "/readyz", { signal: AbortSignal.timeout(5000) }).then(r => r.json()).then(value => samples.push(value)).catch(() => {});
  }, 250);
  const paths = ["/", "/music", "/browse", "/api/suggest?q=breaking", "/api/music/search?q=ebi"];
  const cold = [];
  for (const path of paths) cold.push({ path, ...await api(path) });
  const mixed = await Promise.all(Array.from({ length: 100 }, (_, i) => api(paths[i % paths.length], i)));
  assert.ok(mixed.every(r => r.status === 200), JSON.stringify(metrics(mixed)));
  console.log("MIXED", JSON.stringify(metrics(mixed)));

  await Promise.all(Array.from({ length: 100 }, async (_, i) => {
    const socket = io(origin, { transports: ["websocket"], forceNew: true, reconnection: false, timeout: 10000, extraHeaders: headers(i), autoConnect: false });
    sockets[i] = socket;
    const connected = once(socket, "connect"); socket.connect(); await connected;
  }));
  const rooms = [];
  for (let group = 0; group < 2; group++) {
    const host = sockets[group * 50];
    const room = await ack(host, "room:create", { profile: { id: `viewer-${group * 50}`, name: "Local host" }, media: { itemId: "local-capacity", title: "Local transport fixture", posterUrl: null, source: { url: `${origin}/api/watch-party/personal-media/${id}?key=${key}`, label: "Local fixture", quality: "Test", season: null, episode: null }, sources: [] } });
    rooms.push(room);
    await Promise.all(Array.from({ length: 49 }, (_, j) => ack(sockets[group * 50 + j + 1], "room:join", { roomId: room.roomId, inviteToken: room.inviteToken, profile: { id: `viewer-${group * 50 + j + 1}`, name: "Local viewer" } })));
  }
  const syncTimes = [];
  for (let group = 0; group < 2; group++) {
    const started = performance.now();
    const received = sockets.slice(group * 50, group * 50 + 50).map(socket => once(socket, "playback:state").then(([state]) => { assert.equal(state.paused, false); syncTimes.push(performance.now() - started); }));
    await ack(sockets[group * 50], "playback:command", { roomId: rooms[group].roomId, action: "play", time: 0 });
    await Promise.all(received);
  }
  const media = [];
  const streamStarted = performance.now();
  let burstPromise;
  for (let round = 0; round < 20; round++) {
    if (round === 5) {
      // Attack simulation overlaps active Range readers, not just idle sockets.
      burstPromise = Promise.all(Array.from({ length: 260 }, (_, i) => agentApi(`/?capacity=${i}`, i + 1000, { accept: "text/html" }, burstAgent)));
    }
    const start = performance.now();
    const offset = round * 131072;
    const batch = await Promise.all(Array.from({ length: 100 }, (_, i) => agentApi(`/api/watch-party/personal-media/${id}?key=${key}`, i, { Range: `bytes=${offset}-${offset+131071}` }, mediaAgent)));
    assert.ok(batch.every(r => r.status === 206 && r.bytes === 131072 && new Uint8Array(r.body)[0] === 0x5a), `Range round ${round}: ${JSON.stringify(metrics(batch))}; errors ${JSON.stringify(batch.filter(r=>r.status!==206).map(r=>r.error))}; readiness ${JSON.stringify(samples.at(-1))}`);
    media.push(...batch.map(({ status, ms, bytes }) => ({ status, ms, bytes })));
    await sleep(Math.max(0, 500 - (performance.now() - start)));
  }
  console.log("MEDIA", JSON.stringify({ viewers: 100, durationMs: Math.round(performance.now()-streamStarted), transferredMiB: media.reduce((n,r)=>n+r.bytes,0)/1048576, ...metrics(media) }));
  // Distributed synthetic burst, on this owned local process only. Verify that
  // excess requests are rejected without losing live sockets or health probes.
  const burst = await burstPromise;
  assert.ok(burst.some(r => r.status === 503), "No bounded overload rejection observed");
  assert.ok(burst.every(r => [200, 429, 503].includes(r.status)));
  for (const response of burst.filter(r => r.status !== 200)) assert.ok(response.headers.get("retry-after"));
  const recovered = await api("/", 999);
  assert.equal(recovered.status, 200); assert.ok(sockets.every(socket => socket.connected));
  const head = await fetch(origin + "/readyz", { method: "HEAD" }); assert.equal(head.status, 200);
  const final = await fetch(origin + "/readyz").then(r=>r.json());
  assert.equal(final.requests.media.active, 0); assert.equal(final.requests.pages.queued, 0);
  console.log("RESULT", JSON.stringify({ mixed: metrics(mixed), cold: cold.map(({ path, status, ms, bytes }) => ({ path, status, ms: Math.round(ms), kb: Math.round(bytes/1024) })), media: metrics(media), syncRecipients: syncTimes.length, syncP95Ms: Math.round(syncTimes.sort((a,b)=>a-b)[94]), burst: metrics(burst), recoveryMs: Math.round(recovered.ms), connectedAfterBurst: sockets.filter(s=>s.connected).length, peakRssMb: Math.max(...samples.map(s=>s.memoryMb.rss)), peakQueued: Math.max(...samples.map(s=>s.requests.pages.queued)), finalRequests: final.requests }, null, 2));
} catch (error) {
  console.error("SERVER LOG", serverLog.slice(-5000));
  throw error;
} finally {
  clearInterval(monitor);
  mediaAgent.destroy(); burstAgent.destroy();
  sockets.forEach(socket => socket.disconnect());
  server.kill("SIGTERM");
  if (server.exitCode === null) await Promise.race([once(server, "exit"), sleep(16000).then(() => { if (server.exitCode === null) server.kill("SIGKILL"); })]);
  await rm(storage, { recursive: true, force: true });
}
