import type { VodItem } from "@/lib/types";
import type { PartyMediaDetails } from "@/lib/watch-party-types";

const castCategories = /actor|actress|cast|star|self/i;

export function watchPartyDetails(item: VodItem): PartyMediaDetails {
  const credits = item.credits ?? [];
  const cast = credits.filter((credit) => castCategories.test(credit.category));
  const selectedCredits = (cast.length ? cast : credits).slice(0, 14);

  return {
    type: item.type,
    year: item.year,
    endYear: item.endYear ?? null,
    imdbRating: item.imdbRating,
    imdbVotes: item.imdbVotes,
    imdbUrl: item.imdbUrl,
    runtimeMinutes: item.runtimeMinutes ?? null,
    overview: item.overview?.slice(0, 700) ?? null,
    tagline: item.tagline?.slice(0, 180) ?? null,
    certificate: item.certificate ?? null,
    genres: (item.genres ?? []).slice(0, 8),
    countries: (item.countries ?? []).slice(0, 5),
    languages: (item.languages ?? []).slice(0, 5),
    credits: selectedCredits.map((credit) => ({
      id: credit.name_id ?? null,
      name: credit.name_text,
      imageUrl: credit.name_image_url ?? null,
      role: credit.category,
    })),
  };
}
