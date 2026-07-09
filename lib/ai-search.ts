import type { VodCard } from "./types";

export type AiSearchResult = {
  item: VodCard;
  score: number;
  reasons: string[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "best",
  "find",
  "for",
  "give",
  "good",
  "i",
  "in",
  "is",
  "like",
  "me",
  "movie",
  "movies",
  "of",
  "on",
  "or",
  "series",
  "show",
  "shows",
  "the",
  "to",
  "with",
]);

const GENRE_ALIASES: Record<string, string[]> = {
  action: ["action"],
  adventure: ["adventure"],
  animation: ["animation"],
  anime: ["animation"],
  cartoon: ["animation"],
  comedy: ["comedy"],
  funny: ["comedy"],
  crime: ["crime"],
  detective: ["crime", "mystery"],
  documentary: ["documentary"],
  doc: ["documentary"],
  drama: ["drama"],
  family: ["family"],
  kids: ["family", "animation"],
  horror: ["horror"],
  scary: ["horror"],
  mystery: ["mystery"],
  romance: ["romance"],
  romantic: ["romance"],
  sci: ["sci-fi"],
  scifi: ["sci-fi"],
  science: ["sci-fi"],
  thriller: ["thriller"],
  war: ["war"],
  western: ["western"],
};

const MOOD_ALIASES: Record<string, string[]> = {
  dark: ["crime", "drama", "thriller", "mystery"],
  luxury: ["drama", "crime", "thriller"],
  mind: ["mystery", "sci-fi", "thriller"],
  smart: ["mystery", "sci-fi", "drama"],
  tense: ["thriller", "crime", "drama"],
  emotional: ["drama", "romance"],
  epic: ["adventure", "action", "drama"],
  cozy: ["comedy", "family", "romance"],
};

type Intent = {
  tokens: string[];
  genres: Set<string>;
  type: "movie" | "series" | null;
  minScore: number;
  afterYear: number | null;
  beforeYear: number | null;
  maxRuntime: number | null;
  minRuntime: number | null;
};

export function aiSearch(items: VodCard[], query: string, limit = 10): AiSearchResult[] {
  const intent = parseIntent(query);
  if (!intent.tokens.length && !intent.genres.size && !intent.type) return [];

  return items
    .map((item) => scoreItem(item, intent))
    .filter((result) => result.score > 0 && (result.item.imdbRating ?? 0) >= intent.minScore)
    .sort((a, b) => b.score - a.score || (b.item.imdbRating ?? 0) - (a.item.imdbRating ?? 0))
    .slice(0, limit);
}

function parseIntent(query: string): Intent {
  const lower = query.toLowerCase();
  const tokens = lower
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  const genres = new Set<string>();

  for (const token of tokens) {
    for (const genre of GENRE_ALIASES[token] ?? []) genres.add(genre);
    for (const genre of MOOD_ALIASES[token] ?? []) genres.add(genre);
  }

  const type = /\b(series|show|episode|season)\b/i.test(query)
    ? "series"
    : /\b(movie|film|cinema)\b/i.test(query)
      ? "movie"
      : null;
  const scoreMatch =
    lower.match(/(?:above|over|more than|>\s*)\s*(?:imdb|score|rating)?\s*(\d(?:\.\d)?)/) ??
    lower.match(/(?:imdb|score|rating)\s*(?:above|over|more than|>\s*)?\s*(\d(?:\.\d)?)/);
  const minScore = scoreMatch ? Number(scoreMatch[1]) : /\b(best|top|high)\b/.test(lower) ? 7.5 : 0;
  const afterYear = Number(lower.match(/(?:after|since|from)\s+(19\d{2}|20\d{2})/)?.[1] ?? 0) || null;
  const beforeYear = Number(lower.match(/(?:before|until)\s+(19\d{2}|20\d{2})/)?.[1] ?? 0) || null;
  const maxRuntime = /\b(short|quick|under 90|less than 90)\b/.test(lower) ? 95 : null;
  const minRuntime = /\b(long|epic)\b/.test(lower) ? 120 : null;
  if (/\b(new|recent|latest)\b/.test(lower) && !afterYear) {
    return { tokens, genres, type, minScore, afterYear: 2020, beforeYear, maxRuntime, minRuntime };
  }

  return { tokens, genres, type, minScore, afterYear, beforeYear, maxRuntime, minRuntime };
}

function scoreItem(item: VodCard, intent: Intent): AiSearchResult {
  let score = 0;
  const reasons: string[] = [];
  const title = item.title.toLowerCase();
  const genres = item.genres.map((genre) => genre.toLowerCase());
  const overview = item.overview?.toLowerCase() ?? "";
  const countries = item.countries.join(" ").toLowerCase();
  const languages = item.languages.join(" ").toLowerCase();

  for (const token of intent.tokens) {
    if (title.includes(token)) score += 18;
    if (overview.includes(token)) score += 6;
    if (countries.includes(token) || languages.includes(token)) score += 8;
  }

  const matchedGenres = Array.from(intent.genres).filter((genre) => genres.includes(genre));
  if (matchedGenres.length) {
    score += matchedGenres.length * 22;
    reasons.push(`Matches ${matchedGenres.slice(0, 3).join(" / ")}`);
  }

  if (intent.type && item.type === intent.type) {
    score += 18;
    reasons.push(intent.type === "series" ? "Series format" : "Movie format");
  }

  if (intent.afterYear && (item.year ?? 0) >= intent.afterYear) {
    score += 12;
    reasons.push(`After ${intent.afterYear}`);
  }

  if (intent.beforeYear && (item.year ?? 9999) <= intent.beforeYear) {
    score += 12;
    reasons.push(`Before ${intent.beforeYear}`);
  }

  if (intent.maxRuntime && item.runtimeMinutes && item.runtimeMinutes <= intent.maxRuntime) {
    score += 10;
    reasons.push(`Under ${intent.maxRuntime}m`);
  }

  if (intent.minRuntime && item.runtimeMinutes && item.runtimeMinutes >= intent.minRuntime) {
    score += 10;
    reasons.push(`${item.runtimeMinutes}m runtime`);
  }

  if ((item.imdbRating ?? 0) >= 8) {
    score += (item.imdbRating ?? 0) * 3;
    reasons.push(`IMDb ${(item.imdbRating ?? 0).toFixed(1)}`);
  }

  score += Math.min(14, Math.log10((item.imdbVotes ?? 0) + 1) * 2);
  if (!reasons.length && item.genres.length) reasons.push(item.genres.slice(0, 2).join(" / "));
  if (item.year) reasons.push(String(item.year));

  return {
    item,
    score: Math.round(score),
    reasons: reasons.slice(0, 3),
  };
}
