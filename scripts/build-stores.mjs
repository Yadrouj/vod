// Scrape Tehran sports/supplement/pharmacy stores from OpenStreetMap (Overpass)
// into public/data/stores-tehran.json — same shape as the gyms dataset so the
// store UI can reuse the gym profile/list components.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "public", "data", "stores-tehran.json");

const BBOX = "35.55,51.15,35.85,51.60";
const QUERY = `[out:json][timeout:120];
(
  node["shop"="sports"](${BBOX});
  way["shop"="sports"](${BBOX});
  node["shop"="nutrition_supplements"](${BBOX});
  way["shop"="nutrition_supplements"](${BBOX});
  node["shop"="chemist"](${BBOX});
  way["shop"="chemist"](${BBOX});
  node["amenity"="pharmacy"](${BBOX});
  way["amenity"="pharmacy"](${BBOX});
  node["shop"="medical_supply"](${BBOX});
);
out center tags;`;

const ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
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
          "-X", "POST", "--data-urlencode", `data=${QUERY}`, url,
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

function kindOf(tags) {
  if (tags.amenity === "pharmacy" || tags.shop === "chemist") return "pharmacy";
  if (tags.shop === "nutrition_supplements") return "supplement";
  if (tags.shop === "medical_supply") return "medical";
  return "sports";
}

function addressOf(tags) {
  return (
    [tags["addr:street"], tags["addr:housenumber"], tags["addr:neighbourhood"] || tags["addr:suburb"], tags["addr:city"]]
      .filter(Boolean)
      .join("، ") ||
    tags["addr:full"] ||
    ""
  );
}
const normPhone = (t) => (t.phone || t["contact:phone"] || t["contact:mobile"] || "").split(";")[0].trim();

async function main() {
  const elements = await fetchOverpass();
  const seen = new Set();
  const stores = [];
  for (const el of elements) {
    const tags = el.tags || {};
    const name = (tags.name || tags["name:fa"] || tags["name:en"] || "").trim();
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const key = name + "|" + lat.toFixed(4) + "|" + lng.toFixed(4);
    if (seen.has(key)) continue;
    seen.add(key);
    stores.push({
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
      image: tags.image || null,
      opening: tags.opening_hours || null,
      women: null,
    });
  }
  stores.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  await fs.writeFile(OUT, JSON.stringify(stores), "utf8");
  console.log(`wrote ${stores.length} stores | pharmacy:${stores.filter((s) => s.kind === "pharmacy").length} supplement:${stores.filter((s) => s.kind === "supplement").length} sports:${stores.filter((s) => s.kind === "sports").length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
