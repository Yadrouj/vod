import fs from "node:fs/promises";
import path from "node:path";
import { isGenericSourceTitle, persianTitleOrFallback } from "../lib/title-display";

// Read-only by default. Keep the complete unresolved list so it can be enriched
// from verified metadata rather than manufacturing translations from plot text.
async function main() {
const input = path.resolve(process.env.VOD_DATA_DIR || "public/data", "vod-index.json");
const index = JSON.parse(await fs.readFile(input, "utf8"));
const labels: Record<string, number> = {};
type AuditRecord = { imdbCode: string; originalTitle: string; previousTitle: string; persianTitle: string | null; sourcePageUrl?: string };
const repaired: AuditRecord[] = [];
const unresolved: AuditRecord[] = [];
for (const item of index.items) {
  const label = item.persianTitle?.trim();
  if (!label || !isGenericSourceTitle(label)) continue;
  labels[label] = (labels[label] || 0) + 1;
  const resolved = persianTitleOrFallback(item);
  const record = { imdbCode: item.imdbCode, originalTitle: item.title, previousTitle: label, persianTitle: resolved, sourcePageUrl: item.sourcePageUrl };
  (resolved ? repaired : unresolved).push(record);
}
const report = { generatedAt: new Date().toISOString(), scanned: index.items.length, invalid: repaired.length + unresolved.length, recovered: repaired.length, originalTitleFallback: unresolved.length, labels, repaired, unresolved };
const out = path.resolve(".media-cache/vod-sync/title-label-audit.json");
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ scanned: report.scanned, invalid: report.invalid, recovered: report.recovered, originalTitleFallback: report.originalTitleFallback, labels, report: out }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
