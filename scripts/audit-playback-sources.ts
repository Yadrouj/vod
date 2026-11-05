import { mkdir, opendir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyDownloadBaseToItem } from "../lib/download-settings";
import { applyVerifiedDonyayeLinks } from "../lib/donyaye-link-update-store";
import { applyVerifiedAlternativeSources } from "../lib/alternative-source-store";
import { contentRestriction } from "../lib/content-restrictions.mjs";
import { playableLinks } from "../lib/link-labels";
import type { VodItem } from "../lib/types";
import { addPlaybackSample, probePlaybackMedia } from "./playback-source-audit-lib.mjs";

async function main() {
  const arg = (name: string, fallback: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || fallback;
  const bounded = (name: string, value: number, max: number) => Math.max(1, Math.min(max, Number(arg(name, String(value))) || value));
  const remote = process.argv.includes("--remote");
  const samplesPerHost = bounded("samples", 3, 10), concurrency = bounded("concurrency", 3, 4);
  const maxProbes = bounded("max-probes", 200, 1000), budgetMs = bounded("budget-ms", 240000, 900000);
  const dataDir = path.resolve(process.env.VOD_DATA_DIR || "public/data");
  const output = path.resolve(arg("output", ".media-cache/playback-audit/latest.json"));
  type Sample = { itemId: string; title: string; url: string; season?: number | null; episode?: number | null };
  const hosts = new Map<string, { host: string; links: number; samples: Sample[] }>();
  const bases: Record<string, { links: number; changed: number; samples: Sample[] }> = {};
  const report = { checkedAt: new Date().toISOString(), scope: "All split-title links inspected through current runtime mappings; bounded remote samples, not exhaustive playback verification",
    remote, titles: 0, rawLinks: 0, playbackLinks: 0, mappedLinks: 0, restrictedSkipped: 0, invalidUrls: 0,
    expiredOrNonPlaybackLinks: 0, probes: 0, budgetExhausted: false };
  let progressAt = Date.now();
  const files: string[] = [];
  for await (const entry of await opendir(path.join(dataDir, "titles"))) if (entry.isFile() && entry.name.endsWith(".json")) files.push(entry.name);
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < files.length) {
      const file = files[cursor++];
      const raw = JSON.parse(await readFile(path.join(dataDir, "titles", file), "utf8")) as VodItem;
      report.titles++; report.rawLinks += raw.links?.length || 0;
      if (contentRestriction(raw)) { report.restrictedSkipped++; continue; }
      const mapped = await applyDownloadBaseToItem(raw);
      const item = await applyVerifiedAlternativeSources(await applyVerifiedDonyayeLinks(mapped));
      const links = playableLinks(item.links, { isSeries: /series|episode|show/i.test(item.type), title: item.title, includeAlternateFiles: true });
      report.expiredOrNonPlaybackLinks += Math.max(0, item.links.length - links.length);
      for (const link of links) {
        report.playbackLinks++;
        const sample: Sample = { itemId: item.imdbCode || item.id, title: item.title, url: link.url, season: link.season, episode: link.episode };
        try {
          const host = new URL(link.url).host;
          const bucket = hosts.get(host) || { host, links: 0, samples: [] };
          bucket.links++; addPlaybackSample(bucket.samples, sample, samplesPerHost); hosts.set(host, bucket);
        } catch { report.invalidUrls++; continue; }
        if (link.sourceBaseId) {
          const bucket = bases[link.sourceBaseId] ||= { links: 0, changed: 0, samples: [] };
          bucket.links++;
          if (link.sourceOriginalUrl && link.sourceOriginalUrl !== link.url) { bucket.changed++; report.mappedLinks++; }
          addPlaybackSample(bucket.samples, sample, samplesPerHost);
        }
      }
      if (Date.now() - progressAt > 30000) {
        progressAt = Date.now(); console.log(JSON.stringify({ phase: "inventory", titles: report.titles, total: files.length }));
      }
    }
  }));
  const sorted = [...hosts.values()].sort((a, b) => b.links - a.links);
  console.log(JSON.stringify({ phase: "inventory-complete", ...report, hosts: sorted.length }));
  // Interleave hosts so one large provider does not consume the entire budget.
  const queue = Array.from({ length: samplesPerHost }, (_, index) => sorted.flatMap(host => host.samples[index] ? [{ host: host.host, sample: host.samples[index] }] : [])).flat();
  const checks: { host: string; sample: Sample; check: Awaited<ReturnType<typeof probePlaybackMedia>> }[] = [];
  const deadline = Date.now() + budgetMs; cursor = 0;
  if (remote) await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < queue.length) {
      if (Date.now() >= deadline || report.probes >= maxProbes) { report.budgetExhausted = true; return; }
      const job = queue[cursor++]; report.probes++;
      const check = await probePlaybackMedia(job.sample.url);
      checks.push({ ...job, check });
      if (checks.length % 10 === 0) console.log(JSON.stringify({ phase: "remote-samples", completed: checks.length, total: Math.min(queue.length, maxProbes) }));
    }
  }));
  const states: Record<string, number> = {};
  for (const row of checks) states[row.check.state] = (states[row.check.state] || 0) + 1;
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ ...report, states, bases, hosts: sorted, checks }, null, 2) + "\n");
  await rename(temporary, output);
  console.log(JSON.stringify({ phase: "complete", ...report, hosts: sorted.length, states, output }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
