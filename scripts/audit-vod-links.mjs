import { opendir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const requestedSource = process.argv[2] || "public/data/titles";
const samplesPerHost = Math.max(1, Math.min(10, Number(process.env.LINK_AUDIT_SAMPLES || 3)));
const timeoutMs = Math.max(2_000, Math.min(30_000, Number(process.env.LINK_AUDIT_TIMEOUT_MS || 8_000)));
const requestConcurrency = Math.max(1, Math.min(20, Number(process.env.LINK_AUDIT_CONCURRENCY || 6)));
const byHost = new Map();
let totalTitles = 0;
let totalLinks = 0;
let invalidUrls = 0;
let browserPlayableRoomLinks = 0;

await scanSource(requestedSource);

const sampleJobs = [...byHost.entries()].flatMap(([host, bucket]) =>
  bucket.samples.map((sample) => ({ host, links: bucket.links, sample })),
);
const checked = await concurrentMap(sampleJobs, requestConcurrency, async (job) => ({ ...job, check: await checkLink(job.sample) }));
const checksByHost = new Map();
for (const item of checked) {
  const value = checksByHost.get(item.host) ?? { host: item.host, links: item.links, checks: [] };
  value.checks.push(item.check);
  checksByHost.set(item.host, value);
}

const hosts = [...checksByHost.values()].map((entry) => ({
  host: entry.host,
  links: entry.links,
  healthySamples: entry.checks.filter((check) => check.ok).length,
  iranIpRequired: entry.checks.some((check) => check.iranIpRequired),
  checks: entry.checks,
})).sort((left, right) => right.links - left.links);

const report = {
  auditedAt: new Date().toISOString(),
  source: requestedSource,
  mode: "all catalogue links inspected; bounded remote samples checked per host",
  totalTitles,
  totalLinks,
  invalidUrls,
  browserPlayableRoomLinks,
  samplesPerHost,
  hosts,
};

console.log(JSON.stringify(report, null, 2));
if (hosts.length === 0 || invalidUrls > 0) process.exitCode = 1;

async function scanSource(source) {
  const info = await stat(source);
  if (info.isDirectory()) {
    const directory = await opendir(source);
    for await (const entry of directory) {
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".json") continue;
      const item = JSON.parse(await readFile(path.join(source, entry.name), "utf8"));
      inspectItem(item);
    }
    return;
  }

  // This fallback remains useful for small fixture catalogs. Production uses
  // split title files so Node never allocates a 600 MB JSON string.
  const payload = JSON.parse(await readFile(source, "utf8"));
  for (const item of payload.items ?? []) inspectItem(item);
}

function inspectItem(item) {
  totalTitles += 1;
  for (const link of item.links ?? []) {
    totalLinks += 1;
    if (/\.(?:mp4|m4v|webm|mov)(?:$|[?#])/i.test(link.url ?? "")) browserPlayableRoomLinks += 1;
    try {
      const host = new URL(link.url).host;
      const bucket = byHost.get(host) ?? { links: 0, samples: [] };
      bucket.links += 1;
      addStableSample(bucket.samples, {
        url: link.url,
        itemId: item.imdbCode || item.id,
        title: item.title,
        score: stableHash(`${item.imdbCode || item.id}|${link.url}`),
      });
      byHost.set(host, bucket);
    } catch {
      invalidUrls += 1;
    }
  }
}

function addStableSample(samples, sample) {
  samples.push(sample);
  samples.sort((left, right) => left.score - right.score);
  if (samples.length > samplesPerHost) samples.length = samplesPerHost;
}

async function checkLink(sample) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(sample.url, { method: "HEAD", redirect: "manual", signal: controller.signal, headers: { "user-agent": "SarvNema-Link-Audit/2.0" } });
    if ([400, 403, 405].includes(response.status)) {
      response = await fetch(sample.url, { method: "GET", redirect: "manual", signal: controller.signal, headers: { range: "bytes=0-0", "user-agent": "SarvNema-Link-Audit/2.0" } });
    }
    const preview = response.status >= 400 ? (await response.text()).slice(0, 2_000) : "";
    return {
      itemId: sample.itemId,
      title: sample.title,
      url: sample.url,
      status: response.status,
      location: response.headers.get("location"),
      ok: (response.status >= 200 && response.status < 400) || response.status === 416,
      iranIpRequired: /(iran|iranian|vpn|proxy|داخلی|ایران)/i.test(preview),
    };
  } catch (error) {
    return { itemId: sample.itemId, title: sample.title, url: sample.url, status: 0, ok: false, iranIpRequired: false, error: error instanceof Error ? error.message : "request-failed" };
  } finally {
    clearTimeout(timer);
  }
}

async function concurrentMap(values, concurrency, worker) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await worker(values[index]);
    }
  }));
  return results;
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
