// Scrape Tehran gyms/fitness centres from OpenStreetMap (Overpass API) into a
// bundled dataset: public/data/gyms-tehran.json. OSM data is free & open (ODbL) —
// we attribute it in the UI. Re-run anytime to refresh.
//
// Prices are NOT in OSM (and Google/Neshan don't expose gym membership prices via
// any public API), so we ship name/address/phone/website/coords + route deep-links.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "public", "data", "gyms-tehran.json");

// Tehran bounding box (south,west,north,east)
const BBOX = "35.55,51.15,35.85,51.60";
const QUERY = `[out:json][timeout:120];
(
  node["leisure"="fitness_centre"](${BBOX});
  way["leisure"="fitness_centre"](${BBOX});
  node["sport"="fitness"](${BBOX});
  way["sport"="fitness"](${BBOX});
  node["leisure"="sports_centre"](${BBOX});
  way["leisure"="sports_centre"](${BBOX});
);
out center tags;`;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchOverpass() {
  for (const url of ENDPOINTS) {
    try {
      const { stdout } = await execFileP(
        "curl",
        [
          "-s", "--max-time", "150",
          "-A", "Mozilla/5.0 (compatible; RamaghGymBuilder/1.0; +https://ramagh.app)",
          "-H", "Accept: application/json",
          "-X", "POST",
          "--data-urlencode", `data=${QUERY}`,
          url,
        ],
        { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
      );
      const j = JSON.parse(stdout);
      if (Array.isArray(j.elements) && j.elements.length) return j.elements;
    } catch (e) {
      console.warn("endpoint failed:", url, e.message?.slice(0, 60));
    }
  }
  throw new Error("all Overpass endpoints failed");
}

/** Classify by tags into a coarse Persian category. */
function kindOf(tags) {
  const sport = (tags.sport || "").toLowerCase();
  if (tags.leisure === "fitness_centre" || sport.includes("fitness")) return "gym";
  if (sport.includes("swimming") || /استخر|pool/i.test(tags.name || "")) return "pool";
  if (tags.leisure === "sports_centre") return "sports";
  return "gym";
}

function addressOf(tags) {
  const parts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:neighbourhood"] || tags["addr:suburb"] || tags["addr:district"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.join("، ") || tags["addr:full"] || "";
}

function normPhone(tags) {
  const p = tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "";
  return p.split(";")[0].trim();
}

function main() {
  return fetchOverpass().then(async (elements) => {
    const seen = new Set();
    const gyms = [];
    for (const el of elements) {
      const tags = el.tags || {};
      const name = (tags.name || tags["name:fa"] || tags["name:en"] || "").trim();
      if (!name) continue; // skip unnamed
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat == null || lng == null) continue;
      const key = name + "|" + lat.toFixed(4) + "|" + lng.toFixed(4);
      if (seen.has(key)) continue;
      seen.add(key);
      gyms.push({
        id: `${el.type}${el.id}`,
        name,
        nameEn: tags["name:en"] || null,
        kind: kindOf(tags),
        lat: +lat.toFixed(6),
        lng: +lng.toFixed(6),
        address: addressOf(tags),
        phone: normPhone(tags) || null,
        website: tags.website || tags["contact:website"] || null,
        instagram: (tags["contact:instagram"] || tags.instagram || "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?]/)[0] || null,
        image: tags.image || tags["wikimedia_commons"] || null,
        opening: tags.opening_hours || null,
        women: tags["female"] === "yes" || /بانوان|زنان|women/i.test(name) || null,
      });
    }
    gyms.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    await fs.writeFile(OUT, JSON.stringify(gyms), "utf8");
    console.log(`wrote ${gyms.length} gyms -> ${path.relative(process.cwd(), OUT)}`);
    console.log("with phone:", gyms.filter((g) => g.phone).length, "| website:", gyms.filter((g) => g.website).length);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
