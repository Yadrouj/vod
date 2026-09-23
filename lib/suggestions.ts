import { normalizeVodType } from "@/lib/catalog";
import type { VodCard, VodItem } from "@/lib/types";
import { discoveryScores, withTrendRatings, type DiscoverySignals } from "./discovery-ranking";

export function similarTitles(item: VodItem, items: VodCard[], signals: DiscoverySignals = {}) {
  const discoveryScore = discoveryScores(signals);
  const genres = new Set((item.genres ?? []).map((genre) => genre.toLowerCase()));
  const countries = new Set((item.countries ?? []).map((country) => country.toLowerCase()));
  const type = normalizeVodType(item.type);
  const sourceTitle = `${item.title} ${item.originalTitle ?? ""}`.toLowerCase();
  const franchiseTokens = franchiseFamily(sourceTitle);

  return withTrendRatings(items, signals)
    .filter((candidate) => candidate.imdbCode !== item.imdbCode && candidate.linksCount > 0)
    .map((candidate) => {
      const sharedGenres = candidate.genres.filter((genre) => genres.has(genre.toLowerCase())).length;
      const sharedCountries = candidate.countries.filter((country) => countries.has(country.toLowerCase())).length;
      const candidateTitle = candidate.title.toLowerCase();
      const sharedTitleTokens = titleTokens(sourceTitle).filter((token) => candidateTitle.includes(token)).length;
      const franchiseBoost = franchiseTokens.some((token) => candidateTitle.includes(token)) ? 90 : 0;
      const sequelBoost = sequelRelation(sourceTitle, candidateTitle) ? 54 : 0;
      const typeBoost = candidate.type === type ? 10 : 0;
      const score = franchiseBoost + sequelBoost + sharedTitleTokens * 28 + sharedGenres * 24 + sharedCountries * 6 + typeBoost +
        discoveryScore(candidate);
      return { candidate, score, relevant: sharedGenres > 0 || sharedTitleTokens > 0 || franchiseBoost > 0 };
    })
    .filter(({ relevant }) => relevant)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map(({ candidate }) => candidate);
}

function titleTokens(value: string) {
  return value.split(/[^a-z0-9]+/i).filter((token) => token.length > 3 && !["the", "and", "film", "movie", "series"].includes(token));
}

function franchiseFamily(title: string) {
  const families = [
    ["breaking bad", "better call saul", "el camino"],
    ["avengers", "iron man", "thor", "captain america", "hulk", "guardians of the galaxy"],
    ["star wars", "mandalorian", "andor", "obi-wan"],
    ["game of thrones", "house of the dragon"],
    ["lord of the rings", "hobbit"],
    ["harry potter", "fantastic beasts"],
  ];
  return families.find((family) => family.some((entry) => title.includes(entry))) ?? [];
}

function sequelRelation(source: string, candidate: string) {
  const words = (value: string) => value.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter(word => word && !["the", "a", "an"].includes(word));
  const sourceWords = words(source);
  const candidateWords = words(candidate);
  const [shorter, longer] = sourceWords.length < candidateWords.length ? [sourceWords, candidateWords] : [candidateWords, sourceWords];
  // One shared stem (Breaking / Breaking Bad) is not evidence of a sequel.
  return shorter.length >= 2 && shorter.every((word, index) => longer[index] === word);
}
