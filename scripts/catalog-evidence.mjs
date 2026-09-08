/** Never resolve a legacy Persian title by a translated name alone. */
export function legacyMismatch(item, extra = item) {
  const year = Number(item.id?.match(/^old-iranian-(\d{4})\d{3}$/)?.[1]);
  if (!year) return null;
  if (extra.year && Math.abs(Number(extra.year) - (year + 621)) > 2) return "year-conflict";
  if (extra.countries?.length && !extra.countries.some(country => /^iran$|ایران/i.test(country))) return "country-conflict";
  return null;
}

export function quarantineLegacyMetadata(item, originalName) {
  const reason = legacyMismatch(item);
  if (!reason) return item;
  const year = Number(item.id.match(/^old-iranian-(\d{4})/)[1]);
  return {
    ...item, title: originalName || item.persianTitle || item.title, originalTitle: null,
    persianTitle: originalName || item.persianTitle, persianYear: year, year: year + 621,
    countries: ["Iran"], persianCountries: ["ایران"], languages: ["Persian"], persianLanguages: ["فارسی"],
    genres: ["Iranian Cinema", "Classic"], persianGenres: ["فیلم قدیمی ایرانی"],
    imdbUrl: null, imdbExternalCode: null, wikidataId: null, wikidataUrl: null,
    imdbRating: null, imdbVotes: null, metascore: null, certificate: null, releaseDate: null,
    posterUrl: null, backdropUrl: null, runtimeMinutes: null, overview: null, persianOverview: null, persianDescription: null,
    imdbImages: [], imdbVideos: [], credits: [], companies: [], keywords: [], metadataSources: [],
    metadataReview: { status: "needs-review", reason },
  };
}
