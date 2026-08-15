export function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"');
}

export function cleanText(value = "") {
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function normalizeComparable(value) {
  return String(value ?? "")
    .toLocaleLowerCase()
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function slugify(value) {
  return normalizeComparable(value).replace(/\s+/g, "-");
}

export function hasPersian(value) {
  return /[\u0600-\u06ff]/u.test(String(value));
}

export function uniqueBy(items, identity) {
  const seen = new Set();
  return items.filter((item) => {
    const key = identity(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function englishArtistFromDescription(value) {
  const text = cleanText(value);
  const canonicalMatch = text.match(/(?:Download\s+(?:New|Old)\s+Music(?:\s+Video)?|Download\s+Music)\s+(.+?)\s+(?:\u2013|\u2014|-)\s+(.+?)(?:\s+With\s+Text|\s+On\s+Music|$)/i);
  const match = text.match(/(?:Download\s+(?:New|Old)\s+Music(?:\s+Video)?|Download\s+Music)\s+(.+?)\s+(?:–|â€“|-)\s+(.+?)(?:\s+With\s+Text|\s+On\s+Music|$)/i);
  return canonicalMatch?.[1]?.trim() ?? match?.[1]?.trim() ?? "";
}

function splitCredits(value) {
  return uniqueBy(
    String(value)
      .replace(/\b(?:feat(?:uring)?|ft\.?|with)\b/gi, "|")
      .split(/\s*(?:&|\||,|\bx\b|\band\b)\s*/i)
      .map((item) => item.trim())
      .filter((item) => item.length > 1 && item.length < 90),
    (item) => slugify(item),
  );
}

function isLikelyArtistName(value) {
  const name = cleanText(value);
  if (!name || name.length > 70) return false;
  if (/(?:\u062f\u0627\u0646\u0644\u0648\u062f|\u0622\u0647\u0646\u06af|\u0627\u0647\u0646\u06af|\u0645\u0648\u0632\u06cc\u06a9|\u0645\u0648\u0633\u06cc\u0642\u06cc|\u0631\u06cc\u0645\u06cc\u06a9\u0633|\u062a\u0631\u0646\u062f|\u0648\u06cc\u062f\u06cc\u0648|\u0634\u0627\u062f|\u063a\u0645\u06af\u06cc\u0646|\u0642\u062f\u06cc\u0645\u06cc)/u.test(name)) return false;
  return !/(?:دانلود|آهنگ|موزیک|موسیقی|ریمیکس|ترند|ویدیو|شاد|غمگین|قدیمی|new music|video)/i.test(name);
}

/**
 * The music sites tend to output each artist twice (Persian and Latin tags),
 * and occasionally append category tags. The English release credit is the
 * stable identity; Persian tags are retained only as the display label.
 */
export function canonicalizeTrackArtists(track, fallbackUrl = "") {
  const raw = uniqueBy(
    [...(track.artists ?? []), track.artist].filter(Boolean).map((artist) => ({
      name: cleanText(artist.name),
      slug: slugify(artist.slug || artist.name),
      sourceUrl: artist.sourceUrl || fallbackUrl,
      aliases: artist.aliases ?? [],
    })).filter((artist) => artist.name && artist.slug),
    (artist) => `${artist.slug}:${artist.name}`,
  );
  const credits = splitCredits(englishArtistFromDescription(track.description) || track.englishArtist || "");
  const persian = raw.filter((artist) => hasPersian(artist.name) && isLikelyArtistName(artist.name));
  const latin = raw.filter((artist) => !hasPersian(artist.name) && isLikelyArtistName(artist.name));

  let artists;
  if (credits.length) {
    artists = credits.map((credit, index) => {
      const slug = slugify(credit);
      const latinMatch = latin.find((artist) => artist.slug === slug || normalizeComparable(artist.name) === normalizeComparable(credit));
      const persianMatch = persian[index] ?? persian.find((artist) => artist.aliases?.some((alias) => slugify(alias) === slug));
      const preferred = persianMatch ?? latinMatch;
      return {
        slug,
        name: preferred?.name ?? credit,
        sourceUrl: preferred?.sourceUrl ?? latinMatch?.sourceUrl ?? fallbackUrl,
        aliases: uniqueBy([
          ...(preferred?.aliases ?? []),
          ...(latinMatch?.aliases ?? []),
          preferred?.slug,
          latinMatch?.slug,
        ].filter(Boolean), (alias) => slugify(alias)).filter((alias) => slugify(alias) !== slug),
      };
    });
  } else {
    const fallback = raw.filter((artist) => isLikelyArtistName(artist.name));
    artists = fallback.length ? fallback.slice(0, 3) : [{ name: "هنرمند نامشخص", slug: "unknown-artist", sourceUrl: fallbackUrl, aliases: [] }];
  }

  artists = uniqueBy(artists, (artist) => artist.slug);
  return { ...track, artist: artists[0], artists };
}

export function buildArtists(tracks) {
  const artists = new Map();
  for (const track of tracks) {
    for (const ref of track.artists ?? []) {
      const current = artists.get(ref.slug) ?? { ...ref, aliases: new Set(), coverUrl: null, profileImageUrl: null, profileSourceUrl: ref.sourceUrl, trackIds: [], categories: new Set() };
      current.trackIds.push(track.id);
      current.categories.add(track.category);
      for (const alias of ref.aliases ?? []) current.aliases.add(alias);
      if (!current.coverUrl && track.coverUrl) current.coverUrl = track.coverUrl;
      if (!current.profileImageUrl && track.coverUrl) current.profileImageUrl = track.coverUrl;
      if (!current.profileSourceUrl && ref.sourceUrl) current.profileSourceUrl = ref.sourceUrl;
      artists.set(ref.slug, current);
    }
  }
  return [...artists.values()]
    .map((artist) => ({
      ...artist,
      aliases: [...artist.aliases].filter((alias) => slugify(alias) !== artist.slug),
      trackIds: [...new Set(artist.trackIds)],
      categories: [...artist.categories].sort((left, right) => left.localeCompare(right, "fa")),
    }))
    .sort((left, right) => right.trackIds.length - left.trackIds.length || left.name.localeCompare(right.name, "fa"));
}
