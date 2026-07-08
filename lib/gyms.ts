// Tehran gyms (bundled from OpenStreetMap by scripts/build-gyms.mjs).

export interface Gym {
  id: string;
  name: string;
  nameEn: string | null;
  kind: "gym" | "pool" | "sports";
  lat: number;
  lng: number;
  address: string;
  phone: string | null;
  website: string | null;
  instagram?: string | null;
  image?: string | null;
  opening: string | null;
  women: boolean | null;
}

export type StoreKind = "pharmacy" | "supplement" | "sports" | "medical";
/** Stores share the gym record shape (so the map/list/profile components are reused). */
export interface Store extends Omit<Gym, "kind"> {
  kind: StoreKind;
}

export interface LatLng {
  lat: number;
  lng: number;
}

// Tehran centre — default map view before we have the user's location.
export const TEHRAN: LatLng = { lat: 35.6997, lng: 51.418 };
export const TEHRAN_BBOX = { south: 35.55, west: 51.15, north: 35.85, east: 51.6 };

let cache: Gym[] | null = null;
let storeCache: Store[] | null = null;

/** Load & cache the bundled gym dataset (served from /data, SW-cached offline). */
export async function loadGyms(): Promise<Gym[]> {
  if (cache) return cache;
  const res = await fetch("/data/gyms-tehran.json");
  cache = (await res.json()) as Gym[];
  return cache;
}

/** Load & cache the bundled Tehran stores dataset (same shape as gyms). */
export async function loadStores(): Promise<Store[]> {
  if (storeCache) return storeCache;
  const res = await fetch("/data/stores-tehran.json");
  storeCache = (await res.json()) as Store[];
  return storeCache;
}

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Directions deep-link into the Neshan web/app (with origin if we have it). */
export function neshanUrl(g: LatLng, from?: LatLng | null): string {
  if (from)
    return `https://neshan.org/maps/routing/car/${from.lat},${from.lng}/${g.lat},${g.lng}`;
  return `https://neshan.org/maps/@${g.lat},${g.lng},16z`;
}

/** Directions deep-link into Google Maps (uses the device's current location as origin). */
export function googleUrl(g: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}&travelmode=driving`;
}

// ---- Offline map: pre-fetch Tehran tiles so the service worker caches them ----

// Single subdomain so downloaded URLs exactly match what the map requests (→ cache hits).
export const TILE_URL = "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const OFFLINE_ZOOMS = [11, 12, 13, 14];

const lng2x = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

function tehranTileUrls(): string[] {
  const urls: string[] = [];
  const b = TEHRAN_BBOX;
  for (const z of OFFLINE_ZOOMS) {
    const x0 = lng2x(b.west, z);
    const x1 = lng2x(b.east, z);
    const y0 = lat2y(b.north, z);
    const y1 = lat2y(b.south, z);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        urls.push(TILE_URL.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)));
  }
  return urls;
}

/**
 * Download the Tehran basemap for offline use. Fetches every tile (the SW's
 * CacheFirst rule stores them), reporting 0–100 progress. `no-cors` keeps CARTO
 * happy; opaque responses still cache fine.
 */
export async function downloadTehranMap(onProgress: (pct: number) => void): Promise<number> {
  const urls = tehranTileUrls();
  let done = 0;
  const CONC = 6;
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const u = urls[i++];
      try {
        await fetch(u, { mode: "no-cors", cache: "reload" });
      } catch {
        /* ignore individual tile failures */
      }
      done++;
      onProgress(Math.round((done / urls.length) * 100));
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  return urls.length;
}
