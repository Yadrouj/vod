// Shared by the maintenance worker and UI; no server-only imports here.
export const isTrailer = video => /trailer|teaser|preview|تریلر|تیزر/i.test(video?.name ?? '');

export function videoUrlExpired(value, now = Date.now()) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return true;
    const params = new Map([...url.searchParams].map(([key, val]) => [key.toLowerCase(), val]));
    const expires = params.get('expires') ?? params.get('exp');
    if (expires && Number.isFinite(Number(expires))) return Number(expires) * 1000 <= now + 60_000;
    const signedAt = params.get('x-amz-date'), lifetime = params.get('x-amz-expires');
    if (signedAt && lifetime && /^\d{8}T\d{6}Z$/.test(signedAt)) {
      const date = signedAt.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z');
      return Date.parse(date) + Number(lifetime) * 1000 <= now + 60_000;
    }
    return false;
  } catch { return true; }
}

export function hasPlayableTrailer(video, now = Date.now()) {
  return isTrailer(video) && (video.playback_urls ?? []).some(file => !videoUrlExpired(file.url, now)
    && (/\.(mp4|m4v|webm)(?:$|[?#])/i.test(file.url) || /^(video\/)?(mp4|webm)$/i.test(file.mime_type ?? '')));
}

export function imdbTrailerPage(item) {
  const video = item.imdbVideos?.find(v => isTrailer(v) && /^vi\d+$/.test(v.video_id ?? ''));
  if (video) return `https://www.imdb.com/video/${video.video_id}/`;
  return /^tt\d{5,12}$/.test(item.imdbCode ?? '') ? `https://www.imdb.com/title/${item.imdbCode}/videogallery/` : null;
}

export function selectTrailerTargets(cards, charts = {}, now = Date.now(), limit = 100) {
  const chart = charts.movie;
  const age = now - Date.parse(chart?.observedAt ?? '');
  const current = chart?.sourceUrl === 'https://www.imdb.com/chart/moviemeter/' && age >= 0 && age < 7 * 86400_000;
  const ranks = new Map(current ? (chart.items ?? []).filter(x => Number.isInteger(x.rank) && x.rank >= 1 && x.rank <= 100).map(x => [x.card?.imdbCode, x.rank]) : []);
  const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Tehran' }).format(now));
  const unique = new Map();
  for (const card of cards) {
    if (!/^tt\d{5,12}$/.test(card.imdbCode ?? '') || !/^(movie|film|tvmovie)$/i.test(card.type ?? '')) continue;
    if (!ranks.has(card.imdbCode) && !(card.year >= year - 2 && card.year <= year && card.imdbVotes >= 1000)) continue;
    const old = unique.get(card.imdbCode);
    if (!old || (card.imdbVotes ?? 0) > (old.imdbVotes ?? 0)) unique.set(card.imdbCode, card);
  }
  return [...unique.values()].sort((a, b) => (ranks.get(a.imdbCode) ?? 1000) - (ranks.get(b.imdbCode) ?? 1000)
    || b.year - a.year || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0) || (b.imdbRating ?? 0) - (a.imdbRating ?? 0)
    || a.imdbCode.localeCompare(b.imdbCode)).slice(0, limit).map(card => ({
      imdbCode: card.imdbCode, title: card.title, year: card.year,
      selection: ranks.has(card.imdbCode) ? 'recent-imdb-chart' : 'recent-catalog-vote-count',
      ...(ranks.has(card.imdbCode) ? { rank: ranks.get(card.imdbCode), observedAt: chart.observedAt } : {}),
    }));
}

export function normalizeImdbVideos(videos) {
  const safe = value => {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password
      && /(^|\.)(media-imdb\.com|media-amazon\.com|imdb\.com)$/.test(u.hostname) ? u.href : null; } catch { return null; }
  };
  return (Array.isArray(videos) ? videos : []).filter(v => v && typeof v === 'object').flatMap(v => {
    const video_id = v.video_id ?? v.id;
    const name = typeof v.name === 'string' ? v.name : v.name?.value ?? v.title ?? '';
    if (!/^vi\d+$/.test(video_id ?? '') || !isTrailer({ name })) return [];
    const files = v.playback_urls ?? v.playbackURLs;
    return [{ video_id, name, thumbnail_url: safe(v.thumbnail_url ?? v.thumbnail?.url),
      runtime_seconds: v.runtime_seconds ?? v.runtime?.value ?? null,
      playback_urls: (Array.isArray(files) ? files : []).filter(file => file && typeof file === 'object').flatMap(file => {
        const url = safe(file.url); return url ? [{ url, quality: file.quality ?? file.displayName?.value ?? file.definition ?? null,
          mime_type: file.mime_type ?? file.mimeType ?? null }] : [];
      }) }];
  }).slice(0, 4);
}

export function parseImdbTitleTrailers(html, imdbCode) {
  const next = html.match(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!next) return [];
  const page = JSON.parse(next).props?.pageProps;
  const title = page?.aboveTheFoldData;
  if (title?.id !== imdbCode) throw new Error('IMDb response belongs to a different title');
  return normalizeImdbVideos((title.primaryVideos?.edges ?? []).map(edge => edge.node));
}

export function parseImdbVideoPlayback(html, video, imdbCode) {
  const raw = html.match(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) return video;
  const data = JSON.parse(raw).props?.pageProps?.videoPlaybackData?.video;
  if (!data || data.id !== video.video_id || (data.primaryTitle?.id && data.primaryTitle.id !== imdbCode)) throw new Error('IMDb video identity mismatch');
  return normalizeImdbVideos([{ ...data, video_id: video.video_id, name: video.name }])[0] ?? video;
}
