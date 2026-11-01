import { createReadStream } from "node:fs";
import { readFile, writeFile, rename, stat } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import readline from "node:readline";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeTitle } from "./moviesho-source-lib.mjs";

function sourceName(value) {
  // Filenames routinely omit accents and apostrophes, or spell '&' as 'and'.
  // This is punctuation normalization, not partial/fuzzy title matching.
  return normalizeTitle(String(value || "").normalize("NFKD").replace(/\p{M}/gu, "").replace(/['’‘ʼ\u0060]/g, "").replace(/&/g, " and "));
}

// Use full names, release years and title types, never fuzzy search results.
// A same-name remake or a missing movie year must remain unresolved.
export async function exactImdbIdentities(lines, requests) {
  const targets = new Map();
  const matches = requests.map(() => new Map());
  requests.forEach((request, index) => {
    if (request.kind === "movie" && !Number.isInteger(request.year)) return;
    const name = sourceName(request.title);
    if (name) targets.set(name, [...(targets.get(name) || []), index]);
  });
  for await (const line of lines) {
    const [id, type, primaryTitle, originalTitle, adult, startYear] = line.split("\t");
    if (!/^tt\d+$/.test(id) || adult === "1") continue;
    const kind = /^(?:tvSeries|tvMiniSeries)$/.test(type) ? "series" : /^(?:movie|tvMovie)$/.test(type) ? "movie" : null;
    if (!kind) continue;
    const year = /^\d{4}$/.test(startYear) ? Number(startYear) : null;
    for (const name of new Set([sourceName(primaryTitle), sourceName(originalTitle)])) {
      for (const index of targets.get(name) || []) {
        const request = requests[index];
        if (kind !== request.kind || (request.year != null && request.year !== year)) continue;
        matches[index].set(id, { id, imdbCode: id, title: primaryTitle, originalTitle, type, year });
      }
    }
  }
  const identities = new Map();
  const unresolved = [];
  requests.forEach((request, index) => {
    const candidates = [...matches[index].values()];
    if (candidates.length === 1) {
      const candidate = candidates[0];
      const previous = identities.get(candidate.id);
      identities.set(candidate.id, { ...candidate, sourceTitleAliases: [...new Set([...(previous?.sourceTitleAliases || []), request.title])] });
    }
    else unresolved.push({ ...request, reason: candidates.length ? "ambiguous-exact-title" : request.kind === "movie" && !request.year ? "missing-release-year" : "no-exact-title-year-type", candidates: candidates.map(candidate => candidate.id) });
  });
  return { identities: [...identities.values()], resolvedRequests: requests.length - unresolved.length, unresolved };
}

async function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) throw new Error("Usage: imdb-exact-source-identities.mjs unresolved-report.json output.json [title.basics.tsv.gz]");
  const dataset = process.argv[4] || ".media-cache/imdb/title.basics.tsv.gz";
  const source = JSON.parse(await readFile(input, "utf8"));
  const requests = source.unresolved || [];
  const rows = readline.createInterface({ input: createReadStream(dataset).pipe(createGunzip()), crlfDelay: Infinity });
  const result = await exactImdbIdentities(rows, requests);
  const payload = { version: 1, source: "https://datasets.imdbws.com/title.basics.tsv.gz", datasetModifiedAt: (await stat(dataset)).mtime.toISOString(), checkedAt: new Date().toISOString(), requested: requests.length, ...result };
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(payload, null, 2));
  await rename(temporary, output);
  console.log(JSON.stringify({ output, requested: requests.length, resolved: result.resolvedRequests, identities: result.identities.length, unresolved: result.unresolved.length }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error); process.exitCode = 1; });
