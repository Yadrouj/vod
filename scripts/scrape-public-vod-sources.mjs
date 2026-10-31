import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PUBLIC_VOD_SOURCES, familyMovieItem, htmlMediaItem, publicUrl, robotsAllowed, sourceIdentity, stableMediaKey } from "./public-vod-sources.mjs";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const args = new Set(process.argv.slice(2));
const full = args.has("--full");
const root = path.resolve(process.env.PUBLIC_VOD_WORK_DIR || ".media-cache/public-vod");
const outputFile = path.join(root, "source.json");
const stateFile = path.join(root, "state.json");
const reportFile = path.join(root, "report.json");
const envNumber = (name, fallback) => Math.max(0, Number(process.env[name]) || fallback);
const gap = Math.max(500, envNumber("PUBLIC_VOD_REQUEST_GAP_MS", 900));
const timeout = Math.max(1000, envNumber("PUBLIC_VOD_TIMEOUT_MS", 15000));
const limit = full ? Infinity : envNumber("PUBLIC_VOD_DETAIL_LIMIT", 500);
const deadline = Math.min(Number(process.env.MAINTENANCE_DEADLINE) || Infinity, Date.now() + envNumber("PUBLIC_VOD_BUDGET_MS", full ? 3600000 : 1500000));
const state = await readJson(stateFile, { version: 1, sources: {} });
const previous = await readJson(outputFile, { items: [] });
const items = new Map(previous.items.map(item => [item.id, item]));
const known = new Map();
const ambiguous = new Set();
const report = { startedAt: new Date().toISOString(), full, state: "running", sources: [], titles: 0, links: 0, partial: false };
const selected = new Set(String(process.env.PUBLIC_VOD_SOURCE_IDS || "").split(",").filter(Boolean));
const sources = PUBLIC_VOD_SOURCES.filter(source => !selected.size || selected.has(source.id));
if (selected.size && !sources.length) throw new Error("No requested source IDs match the public source registry");
const nextRequest = new Map();
let checkpointWrite = Promise.resolve();
let inspected = 0;
let stopping = false;
process.once("SIGINT", () => { stopping = true; });
process.once("SIGTERM", () => { stopping = true; });

await mkdir(root, { recursive: true });
const lockFile = path.join(root, "scrape.lock");
let lock;
try { lock = await open(lockFile, "wx"); }
catch (error) {
  if (error.code !== "EEXIST") throw error;
  const previousLock = await readJson(lockFile, {});
  let alive = true;
  try { process.kill(previousLock.pid, 0); } catch (error) { alive = error.code !== "ESRCH"; }
  const stale = Number.isFinite(Date.parse(previousLock.startedAt)) && Date.now() - Date.parse(previousLock.startedAt) > 2 * 60 * 60_000;
  if (alive && !stale) throw new Error("A public source scrape already owns the lock; do not overlap runs");
  await unlink(lockFile);
  lock = await open(lockFile, "wx");
}
await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: report.startedAt }));
try {
await streamVodArchiveItems(process.env.PUBLIC_VOD_CATALOG || "public/data/vod-catalog.json", item => {
  const key = sourceIdentity(item);
  if (known.has(key) && known.get(key)?.id !== item.id) ambiguous.add(key);
  else known.set(key, { id: item.id, imdbCode: /^tt\d+$/.test(item.imdbCode || "") ? item.imdbCode : /^tt\d+$/.test(item.id || "") ? item.id : null });
});
for (const key of ambiguous) known.delete(key);

for (const source of sources) {
  const status = { id: source.id, requestedUrl: source.url, url: source.canonical || source.url, state: "checking", pages: 0, inspected: 0, titles: 0, links: 0, errors: [] };
  report.sources.push(status);
  if (outOfTime()) { status.state = "pending"; report.partial = true; continue; }
  try {
    const base = source.canonical || source.url;
    const robotsResponse = await request(new URL("robots.txt", base), { allow404: true });
    const robots = robotsResponse?.text || "";
    const fetchPage = async (url, options = {}) => {
      if (!robotsAllowed(robots, url)) throw new Error(`robots.txt disallows ${new URL(url).pathname}`);
      return request(url, options);
    };
    if (source.adapter === "familymovie") await family(source, status, fetchPage);
    else if (source.adapter === "wordpress") await wordpress(source, status, fetchPage);
    else await inspectWebsite(source, status, fetchPage);
  } catch (error) {
    status.state = outOfTime() ? "partial" : "unavailable";
    status.errors.push(error.message);
    if (outOfTime()) report.partial = true;
  }
  await checkpoint();
  console.log(JSON.stringify(status));
}
report.state = report.partial ? "partial" : "completed";
report.finishedAt = new Date().toISOString();
await checkpoint();
console.log(JSON.stringify({ ...report, reportFile, outputFile }, null, 2));
} finally {
  await lock.close();
  await unlink(lockFile).catch(() => {});
}

function outOfTime() { return stopping || Date.now() >= deadline; }
async function request(value, { allow404 = false } = {}) {
  const url = publicUrl(String(value));
  if (!url) throw new Error("Unsafe source URL rejected");
  if (outOfTime()) throw new Error("Time budget reached; checkpoint retained");
  const host = new URL(url).hostname;
  const slot = Math.max(Date.now(), nextRequest.get(host) || 0);
  nextRequest.set(host, slot + gap);
  const wait = slot - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  let response, target = url;
  for (let redirects = 0; redirects <= 5; redirects++) {
    response = await fetch(target, { redirect: "manual", headers: { "User-Agent": "SarvNemaCatalogBot/1.0 (+https://sarvnema.ir; public catalog links)" }, signal: AbortSignal.timeout(Math.max(1, Math.min(timeout, deadline - Date.now()))) });
    if (![301,302,303,307,308].includes(response.status)) break;
    const location = response.headers.get("location");
    await response.body?.cancel();
    target = location && publicUrl(location, target);
    if (!target || redirects === 5) throw new Error("Unsafe redirect or redirect limit reached");
  }
  if (allow404 && response.status === 404) return null;
  if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}: ${url}`); }
  if (/^(?:video\/|audio\/|application\/octet-stream)/i.test(response.headers.get("content-type") || "")) {
    await response.body?.cancel(); throw new Error("Expected metadata, not a media response");
  }
  // Only metadata is fetched, never video files or application installers.
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16 * 1024 * 1024) throw new Error("Metadata response exceeds 16 MB");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const text = Buffer.concat(chunks).toString("utf8");
  return { text, url: response.url, headers: response.headers, json: () => JSON.parse(text) };
}
function store(item, status) {
  if (!item) return;
  const previousItem = items.get(item.id);
  const map = new Map((previousItem?.links || []).map(link => [stableMediaKey(link), link]));
  // Replace rotating signed links by stable path rather than accumulating tokens.
  for (const link of item.links) {
    map.set(stableMediaKey(link), link);
  }
  items.set(item.id, { ...previousItem, ...item, links: [...map.values()] });
  status.titles++;
  status.links += item.links.length;
}
async function family(source, status, fetchPage) {
  const saved = state.sources[source.id] ||= { fullOffset: 0, checked: {} };
  let offset = full ? saved.fullOffset || 0 : 0;
  while (!outOfTime() && inspected < limit) {
    const page = (await fetchPage(new URL(`api/media?limit=100&offset=${offset}`, source.url).href)).json();
    if (!Array.isArray(page.items)) throw new Error("Invalid public media list");
    status.total = page.total;
    status.pages++;
    let completedPage = true;
    let cursor = 0;
    await Promise.all(Array.from({ length: 2 }, async () => { while (cursor < page.items.length) {
      if (outOfTime() || inspected >= limit) { completedPage = false; break; }
      const summary = page.items[cursor++];
      const checked = saved.checked[summary.id];
      if (checked?.modified === summary.updatedAt && Date.now() - checked.at < 6 * 60 * 60_000) continue;
      inspected++; status.inspected++;
      try {
        const detail = (await fetchPage(new URL(`api/media/single?id=${encodeURIComponent(summary.id)}`, source.url).href)).json();
        store(familyMovieItem(detail, source, known), status);
        saved.checked[summary.id] = { modified: summary.updatedAt, at: Date.now() };
      } catch (error) { status.errors.push({ id: summary.id, message: error.message }); completedPage = false; }
      if (status.inspected % 20 === 0) { await checkpoint(); console.log(`[public-vod] ${source.id}: ${status.inspected} checked, ${status.titles} titles / ${status.links} links`); }
    } }));
    if (!completedPage) { status.state = "partial"; report.partial = true; break; }
    offset += page.items.length;
    if (full) saved.fullOffset = offset;
    await checkpoint();
    if (!page.hasMore || !page.items.length) { saved.fullOffset = 0; status.state = "completed"; return; }
  }
  if (status.state === "checking") status.state = full ? "partial" : "bounded-refresh";
  if (full && status.state === "partial") report.partial = true;
}
async function wordpress(source, status, fetchPage) {
  const base = source.canonical || source.url;
  const types = (await fetchPage(new URL("wp-json/wp/v2/types", base).href)).json();
  const collections = Object.values(types).filter(type => /^(?:movies|movie|series|serial|posts)$/.test(type.rest_base || "")).map(type => type.rest_base);
  if (!collections.length) throw new Error("No public film/series collections");
  const saved = state.sources[source.id] ||= {};
  for (const collection of collections.filter(value => value !== "posts" || collections.length === 1)) {
    let pageNumber = full ? saved[collection] || 1 : 1;
    let filesSeen = 0;
    while (!outOfTime() && inspected < limit) {
      const url = new URL(`wp-json/wp/v2/${collection}?per_page=25&orderby=modified&order=desc&page=${pageNumber}`, base);
      const result = await fetchPage(url.href);
      const posts = result.json();
      if (!Array.isArray(posts)) throw new Error("Invalid WordPress collection");
      status.total = Number(result.headers.get("x-wp-total")) || posts.length;
      status.pages++;
      let completedPage = true;
      for (const post of posts) {
        if (outOfTime() || inspected >= limit) { completedPage = false; break; }
        if (pageNumber === 1 && filesSeen === 0 && status.inspected >= 3) break;
        const link = publicUrl(post.link, base);
        if (!link || new URL(link).hostname !== new URL(base).hostname) continue;
        inspected++; status.inspected++;
        const html = (await fetchPage(link)).text;
        const item = htmlMediaItem(html, post, source);
        if (item) { store(item, status); filesSeen++; }
      }
      if (!completedPage) { status.state = "partial"; report.partial = true; break; }
      if (pageNumber === 1 && !filesSeen) { status.state = "no-public-downloads"; status.note = "Sampled public title pages have no eligible full-film links; no login, paid player or protected API was used."; break; }
      const pages = Number(result.headers.get("x-wp-totalpages")) || 1;
      if (pageNumber >= pages) { saved[collection] = 1; status.state = "completed"; break; }
      pageNumber++; saved[collection] = pageNumber;
      await checkpoint();
      if (!full) { status.state = "bounded-refresh"; break; }
    }
  }
}
async function inspectWebsite(source, status, fetchPage) {
  const response = await fetchPage(source.url);
  status.pages++;
  const candidates = [...new Set([...response.text.matchAll(/href=["']([^"']+)["']/gi)].map(match => publicUrl(match[1], response.url)).filter(Boolean))]
    .filter(url => new URL(url).hostname === new URL(response.url).hostname && /\/(?:title|movie|series)\/[^/]+/.test(new URL(url).pathname)).slice(0,3);
  for (const link of candidates) {
    const html = (await fetchPage(link)).text;
    const title = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || "";
    status.inspected++;
    store(htmlMediaItem(html, { link, title }, source), status);
  }
  status.state = status.titles ? "public-sample" : source.adapter === "discovery" ? "app-or-search-only" : "no-public-downloads";
  status.note = "Only publicly readable metadata and media URLs are eligible; no accounts or app-only APIs are accessed.";
}
async function checkpoint() {
  checkpointWrite = checkpointWrite.then(writeCheckpoint);
  return checkpointWrite;
}
async function writeCheckpoint() {
  report.titles = items.size;
  report.links = [...items.values()].reduce((sum, item) => sum + item.links.length, 0);
  report.checkedTitles = Object.keys(state.sources.familymovie?.checked || {}).length;
  report.discoveredTitles = report.sources.find(source => source.id === "familymovie")?.total || 0;
  report.phase = report.state === "completed" ? "بررسی منابع عمومی و ثبت نتیجهٔ هر منبع کامل شد" : "بررسی و تازه‌سازی لینک‌های منابع عمومی";
  report.updatedAt = new Date().toISOString();
  await atomic(outputFile, { sourceUrls: PUBLIC_VOD_SOURCES.map(source => source.url), updatedAt: report.updatedAt, totalTitles: items.size, totalLinks: report.links, items: [...items.values()] });
  await atomic(stateFile, state);
  await atomic(reportFile, report);
}
async function atomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value));
  await rename(temporary, file);
}
async function readJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }
