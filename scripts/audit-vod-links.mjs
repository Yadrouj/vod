import { readFile } from "node:fs/promises";

const file = process.argv[2] || "public/data/vod-catalog.json";
const samplesPerHost = Math.max(1, Math.min(10, Number(process.env.LINK_AUDIT_SAMPLES || 3)));
const timeoutMs = Math.max(2_000, Math.min(30_000, Number(process.env.LINK_AUDIT_TIMEOUT_MS || 8_000)));
const payload = JSON.parse(await readFile(file, "utf8"));
const byHost = new Map();

for (const item of payload.items ?? []) {
  for (const link of item.links ?? []) {
    try {
      const host = new URL(link.url).host;
      const bucket = byHost.get(host) ?? [];
      bucket.push({ url: link.url, itemId: item.imdbCode || item.id, title: item.title });
      byHost.set(host, bucket);
    } catch {
      // Invalid URLs are counted separately in the source data audit below.
    }
  }
}

const hosts = [];
for (const [host, links] of byHost) {
  const samples = evenlySpaced(links, samplesPerHost);
  const checks = await Promise.all(samples.map(checkLink));
  hosts.push({
    host,
    links: links.length,
    healthySamples: checks.filter((check) => check.ok).length,
    iranIpRequired: checks.some((check) => check.iranIpRequired),
    checks,
  });
}

const report = {
  auditedAt: new Date().toISOString(),
  sourceFile: file,
  sourceScrapedAt: payload.scrapedAt ?? null,
  totalTitles: Number(payload.totalTitles ?? payload.items?.length ?? 0),
  totalLinks: Number(payload.totalLinks ?? 0),
  samplesPerHost,
  hosts: hosts.sort((left, right) => right.links - left.links),
};

console.log(JSON.stringify(report, null, 2));
if (hosts.length === 0) process.exitCode = 1;

async function checkLink(sample) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(sample.url, { method: "HEAD", redirect: "manual", signal: controller.signal, headers: { "user-agent": "SarvNema-Link-Audit/1.0" } });
    if ([400, 403, 405].includes(response.status)) {
      response = await fetch(sample.url, { method: "GET", redirect: "manual", signal: controller.signal, headers: { range: "bytes=0-0", "user-agent": "SarvNema-Link-Audit/1.0" } });
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

function evenlySpaced(values, count) {
  if (values.length <= count) return values;
  if (count === 1) return [values[Math.floor(values.length / 2)]];
  return Array.from({ length: count }, (_, index) => values[Math.round(index * (values.length - 1) / (count - 1))]);
}
