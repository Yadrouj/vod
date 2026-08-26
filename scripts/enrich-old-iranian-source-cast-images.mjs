import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const valueOf = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const INPUT_FILE = valueOf("--input", path.join(".media-cache", "vod-sync", "old-iranian-metadata-final-review4.json"));
const OUT_FILE = valueOf("--out", path.join(".media-cache", "vod-sync", "old-iranian-metadata-final-review5.json"));
const CACHE_FILE = valueOf("--cache", path.join(".media-cache", "vod-sync", "old-iranian-source-cast-cache.json"));
const DELAY_MS = Math.max(150, Number(valueOf("--delay-ms", "300")) || 300);
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const HUMAN_QID = "Q5";
const USER_AGENT = "SarvNemaCatalogBot/1.0 (classic Iranian cinema cast portraits; contact@sarvnema.ir)";

let requestCount = 0;

async function main() {
  const [payload, cache] = await Promise.all([
    readJson(INPUT_FILE),
    readJson(CACHE_FILE, { people: {} }),
  ]);
  cache.people ??= {};

  let attempted = 0;
  let resolved = 0;
  const items = [];
  for (const item of payload.items ?? []) {
    if (item.matchType !== "source-verified" || !Array.isArray(item.credits)) {
      items.push(item);
      continue;
    }
    const credits = [];
    for (const credit of item.credits) {
      if (credit.name_image_url || !credit.name_text || isAmbiguousStageName(credit.name_text)) {
        credits.push(credit);
        continue;
      }
      attempted += 1;
      const person = await resolvePerson(credit.name_text, cache.people);
      if (person?.imageUrl) resolved += 1;
      credits.push(person?.imageUrl ? {
        ...credit,
        name_id: `wd-${person.id}`,
        name_text: person.name,
        name_image_url: person.imageUrl,
      } : credit);
    }
    items.push({ ...item, credits });
  }

  const matched = items.filter((item) => item.status === "matched");
  const output = {
    ...payload,
    generatedAt: new Date().toISOString(),
    sourceCastPortraitsAttempted: attempted,
    sourceCastPortraitsResolved: resolved,
    titlesWithCastImages: matched.filter((item) => item.credits?.some((credit) => credit.name_image_url)).length,
    items,
  };
  await Promise.all([save(OUT_FILE, output), save(CACHE_FILE, cache)]);
  console.log(JSON.stringify({ outFile: OUT_FILE, attempted, resolved, titlesWithCastImages: output.titlesWithCastImages }, null, 2));
}

async function resolvePerson(name, cache) {
  const key = normalize(name);
  if (!key) return null;
  if (Object.hasOwn(cache, key)) return cache[key];

  const search = await wikidata({ action: "wbsearchentities", search: name, language: "fa", type: "item", limit: "8" });
  const entities = await getEntities((search.search ?? []).map((result) => result.id));
  const exactMatches = Object.values(entities)
    .filter((entity) => isHuman(entity))
    .filter((entity) => hasExactName(entity, key))
    .filter((entity) => firstString(entity, "P18"));

  // A portrait is only accepted when the source name identifies one person.
  const candidate = exactMatches.length === 1 ? exactMatches[0] : null;
  const value = candidate ? {
    id: candidate.id,
    name: label(candidate, "fa") ?? label(candidate, "en") ?? name,
    imageUrl: commonsImage(firstString(candidate, "P18"), 320),
  } : null;
  cache[key] = value;
  return value;
}

async function getEntities(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const payload = await wikidata({
    action: "wbgetentities",
    ids: unique.join("|"),
    props: "labels|aliases|claims",
    languages: "fa|en",
  });
  return Object.fromEntries(Object.entries(payload.entities ?? {}).filter(([, entity]) => !entity.missing));
}

function isHuman(entity) {
  return entityIds(entity, "P31").includes(HUMAN_QID);
}

function hasExactName(entity, target) {
  const names = [
    label(entity, "fa"),
    label(entity, "en"),
    ...aliases(entity, "fa"),
    ...aliases(entity, "en"),
  ];
  return names.some((value) => normalize(value) === target);
}

async function wikidata(params) {
  const url = new URL(WIKIDATA_API);
  for (const [key, value] of Object.entries({ format: "json", origin: "*", ...params })) {
    url.searchParams.set(key, value);
  }
  requestCount += 1;
  if (requestCount > 1) await sleep(DELAY_MS);
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Wikidata returned HTTP ${response.status}`);
  return response.json();
}

function claims(entity, property) {
  return entity?.claims?.[property] ?? [];
}

function firstString(entity, property) {
  return claims(entity, property)
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .find((value) => typeof value === "string") ?? null;
}

function entityIds(entity, property) {
  return claims(entity, property)
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter((id) => typeof id === "string");
}

function label(entity, language) {
  return entity?.labels?.[language]?.value ?? null;
}

function aliases(entity, language) {
  return entity?.aliases?.[language]?.map((entry) => entry.value).filter(Boolean) ?? [];
}

function commonsImage(fileName, width) {
  return fileName ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}` : null;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[يى]/gu, "ی")
    .replace(/ك/gu, "ک")
    .replace(/[\u200c\s]/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function isAmbiguousStageName(value) {
  // A single given/stage name such as «سارا» or «دیانا» is frequently shared
  // by unrelated people in Wikidata. Never put a portrait on it without a
  // source-side person identifier, even when the search API happens to return
  // one exact label.
  return String(value ?? "").replace(/\u200c/gu, "").trim().split(/\s+/u).filter(Boolean).length < 2;
}

async function readJson(file, fallback = undefined) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

async function save(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
