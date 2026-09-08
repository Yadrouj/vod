import type { VodCard } from "./types";

export function validCountry(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code) || ["XX", "ZZ", "EU", "UN"].includes(code)) return null;
  try { return new Intl.DisplayNames(["en"], { type: "region", fallback: "none" }).of(code) ? code : null; } catch { return null; }
}

export function countryName(code: string, locale = "fa") {
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code; } catch { return code; }
}

export function countryAliases(code: string) {
  const extra: Record<string, string[]> = { US: ["United States", "USA", "آمریکا"], GB: ["United Kingdom", "UK", "انگلیس"], TR: ["Turkey", "Türkiye"], CZ: ["Czech Republic"], KR: ["South Korea", "کره جنوبی"], IN: ["هندوستان"], AE: ["امارات"], TW: ["Taiwan"], PS: ["Occupied Palestinian Territory", "Palestine", "فلسطین"] };
  return [code, countryName(code, "en"), countryName(code, "fa"), ...(extra[code] ?? [])].map(value => value.toLowerCase());
}

export function countryFilms(items: VodCard[], country: string, limit = 12) {
  const aliases = new Set(countryAliases(country));
  const seen = new Set<string>();
  return items.filter(item => {
    if (item.type !== "movie" || !(item.posterUrl || item.backdropUrl)) return false;
    const id = item.imdbCode || item.id;
    if (seen.has(id) || ![...item.countries, ...(item.persianCountries ?? [])].some(value => aliases.has(value.toLowerCase()))) return false;
    seen.add(id); return true;
  }).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.imdbRating ?? 0) - (a.imdbRating ?? 0)).slice(0, limit);
}

/** Only an explicitly trusted, overwriting deployment proxy may supply this. */
export function viewerCountry(headers: Headers) {
  return process.env.TRUST_VIEWER_CONNECTION_HEADERS === "1" && process.env.VIEWER_COUNTRY_HEADER
    ? validCountry(headers.get(process.env.VIEWER_COUNTRY_HEADER)) : null;
}
