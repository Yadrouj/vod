import { countryFilms, countryName, validCountry, viewerCountry } from "@/lib/country-discovery";
import { loadVodIndex } from "@/lib/vod-index";
import type { VodCatalogIndex } from "@/lib/types";

export const dynamic = "force-dynamic";
const cache = new WeakMap<VodCatalogIndex, Map<string, ReturnType<typeof countryFilms>>>();

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = params.get("country");
  const country = requested ? validCountry(requested) : viewerCountry(request.headers);
  const headers = { "Cache-Control": "private, no-store", "Vary": "*" };
  if (requested && !country) return Response.json({ error: "Invalid country" }, { status: 400, headers });
  if (!country) return Response.json({ country: null, items: [], detected: false }, { headers });
  const index = await loadVodIndex();
  let entries = cache.get(index);
  if (!entries) { entries = new Map(); cache.set(index, entries); }
  let items = entries.get(country);
  if (!items) { items = countryFilms(index.items, country); entries.set(country, items); }
  const locale = params.get("locale") === "en" ? "en" : "fa";
  // Send cards only, never IPs or the full catalog / source download lists.
  return Response.json({ country, name: countryName(country, locale), detected: !requested, items: items.map(item => ({
    id: item.id, imdbCode: item.imdbCode, title: locale === "fa" ? item.persianTitle || item.title : item.title,
    type: item.type, year: item.year, imdbRating: item.imdbRating, genres: item.genres,
    posterUrl: item.posterUrl, backdropUrl: item.backdropUrl, linksCount: item.linksCount, source: item.source,
  })) }, { headers });
}
