import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/brand";
import { normalizeVodType } from "@/lib/catalog";
import type { MusicArtist, MusicTrack } from "@/lib/music-types";
import type { VodItem } from "@/lib/types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://sarvnema.ir").replace(/\/$/u, "");

// Keep Persian SEO copy encoded as code points so it remains valid even when a
// Windows terminal/editor opens the source with a legacy code page.
function fa(value: string) {
  return String.fromCodePoint(...value.split("-").map((part) => Number.parseInt(part, 16)));
}

const P = {
  movie: fa("0641-06cc-0644-0645"),
  series: fa("0633-0631-06cc-0627-0644"),
  download: fa("062f-0627-0646-0644-0648-062f"),
  info: fa("0627-0637-0644-0627-0639-0627-062a"),
  online: fa("062a-0645-0627-0634-0627-06cc-0020-0622-0646-0644-0627-06cc-0646"),
  subtitle: fa("0632-06cc-0631-0646-0648-06cc-0633"),
  watchTogether: fa("062a-0645-0627-0634-0627-06cc-0020-0647-0645-0632-0645-0627-0646-0020-0628-0627-0020-062f-0648-0633-062a-0627-0646"),
  watchEpisodes: fa("062a-0645-0627-0634-0627-06cc-0020-0647-0645-0632-0645-0627-0646-0020-0641-0635-0644-0020-0648-0020-0642-0633-0645-062a"),
  listenTogether: fa("0634-0646-06cc-062f-0646-0020-0647-0645-0632-0645-0627-0646-0020-0645-0648-0633-06cc-0642-06cc"),
  linkStatus: fa("0648-0636-0639-06cc-062a-0020-062a-0623-0645-06cc-0646-0020-0644-06cc-0646-06a9"),
  song: fa("0622-0647-0646-06af"),
  musicVideo: fa("0645-0648-0632-06cc-06a9-0020-0648-06cc-062f-06cc-0648"),
  iranianArtist: fa("0647-0646-0631-0645-0646-062f-0020-0627-06cc-0631-0627-0646-06cc"),
  lyrics: fa("0645-062a-0646-0020-0622-0647-0646-06af"),
  album: fa("0622-0644-0628-0648-0645"),
  songs: fa("0622-0647-0646-06af-200c-0647-0627-06cc"),
  downloadSong: fa("062f-0627-0646-0644-0648-062f-0020-0622-0647-0646-06af"),
  newSong: fa("0622-0647-0646-06af-0020-062c-062f-06cc-062f"),
  albums: fa("0622-0644-0628-0648-0645-200c-0647-0627-06cc"),
  bestSongs: fa("0628-0647-062a-0631-06cc-0646-0020-0622-0647-0646-06af-200c-0647-0627-06cc"),
  home: fa("062e-0627-0646-0647"),
  music: fa("0645-0648-0633-06cc-0642-06cc"),
  artists: fa("0647-0646-0631-0645-0646-062f-0627-0646"),
  films: fa("0641-06cc-0644-0645-200c-0647-0627"),
  seriesPlural: fa("0633-0631-06cc-0627-0644-200c-0647-0627"),
};

export function absoluteUrl(pathname: string) {
  return new URL(pathname.startsWith("/") ? pathname : `/${pathname}`, SITE_URL).toString();
}

export function cleanSeoText(value: string | null | undefined, limit = 160) {
  const text = String(value || "").replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

export function uniqueSeoValues(values: (string | null | undefined)[]) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

export function titleMetadata({
  title,
  description,
  pathname,
  image,
  keywords,
  type = "website",
}: {
  title: string;
  description: string;
  pathname: string;
  image?: string | null;
  keywords?: string[];
  type?: "website" | "article";
}): Metadata {
  const canonical = absoluteUrl(pathname);
  const images = image ? [{ url: image, alt: title }] : undefined;
  return {
    title,
    description: cleanSeoText(description, 170),
    keywords: uniqueSeoValues(keywords ?? []),
    alternates: { canonical },
    openGraph: { title, description: cleanSeoText(description, 200), url: canonical, siteName: BRAND_NAME, type, images },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: cleanSeoText(description, 200), images: image ? [image] : undefined },
  };
}

export function vodMetadata(item: VodItem): Metadata {
  const persianTitle = item.persianTitle?.trim();
  const displayTitle = persianTitle && persianTitle !== item.title ? `${persianTitle} | ${item.title}` : item.title;
  const isSeries = normalizeVodType(item.type) === "series";
  const typeLabel = isSeries ? P.series : P.movie;
  const hasFiles = item.links.length > 0;
  const action = hasFiles
    ? `${P.download} ${typeLabel} ${displayTitle} با کیفیت‌های موجود و ${P.online}`
    : `${P.info} ${typeLabel} ${displayTitle} و ${P.linkStatus}`;
  const description = `${action} در ${BRAND_NAME}; اطلاعات IMDb، ژانر، بازیگران، ${P.subtitle}، لینک منبع و امکان ${isSeries ? P.watchEpisodes : P.watchTogether}.`;
  const keywords = uniqueSeoValues([
    `${hasFiles ? P.download : P.info} ${typeLabel} ${persianTitle || item.title}`,
    `${hasFiles ? "download" : "info"} ${item.title}`,
    `${P.online} ${persianTitle || item.title}`,
    `${P.subtitle} ${persianTitle || item.title}`,
    `${typeLabel} ${item.year || ""} ${item.genres?.join(" ") || ""}`,
    ...(item.persianGenres || []),
    ...(item.keywords || []),
    P.watchTogether,
    "watch together فارسی",
  ]);
  return titleMetadata({ title: `${displayTitle}; ${hasFiles ? P.download : P.info} ${typeLabel}`, description, pathname: `/${item.imdbCode}`, image: item.posterUrl || item.backdropUrl, keywords });
}

export function musicMetadata(track: MusicTrack): Metadata {
  const artistNames = track.artists.map((artist) => artist.name).join(", ");
  const title = track.persianTitle || track.title;
  const kindLabel = track.kind === "video" ? P.musicVideo : P.song;
  const description = `${kindLabel} ${title} از ${artistNames || P.iranianArtist}; پخش آنلاین، لینک منبع، اطلاعات ${P.album} و ${P.listenTogether} در ${BRAND_NAME}.`;
  const keywords = uniqueSeoValues([
    `${P.downloadSong} ${title}`,
    `${P.online} ${kindLabel} ${title}`,
    `${track.title} ${artistNames}`,
    `${P.lyrics} ${title}`,
    `${P.album} ${track.album?.title || ""}`,
    ...(track.moods || []),
    "listen together فارسی",
    fa("0634-0646-06cc-062f-0646-0020-0647-0645-0632-0645-0627-0646-0020-0622-0647-0646-06af-0020-0628-0627-0020-062f-0648-0633-062a-0627-0646"),
  ]);
  return titleMetadata({ title: `${title}; ${kindLabel} و پخش آنلاین`, description, pathname: `/music/${track.id}`, image: track.coverUrl, keywords });
}

export function artistMetadata(artist: MusicArtist, trackCount: number): Metadata {
  const name = artist.name;
  const description = `${P.songs} ${name}; پخش آنلاین و ${P.downloadSong}، ${P.albums}، ${P.musicVideo}ها و پلی‌لیست‌های مرتبط در ${BRAND_NAME}. ${trackCount.toLocaleString("fa-IR")} اثر از آرشیو موسیقی.`;
  const keywords = uniqueSeoValues([
    `${P.songs} ${name}`,
    `${P.downloadSong} ${name}`,
    `${P.newSong} ${name}`,
    `${P.albums} ${name}`,
    `${P.musicVideo} ${name}`,
    `${P.bestSongs} ${name}`,
    "شنیدن همزمان موسیقی",
  ]);
  return titleMetadata({ title: `${P.songs} ${name}; ${P.downloadSong} و پخش آنلاین`, description, pathname: `/music/artists/${encodeURIComponent(artist.slug)}`, image: artist.profileImageUrl || artist.coverUrl, keywords });
}

export function breadcrumbJsonLd(items: { name: string; pathname: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.pathname) })),
  };
}

export function vodJsonLd(item: VodItem) {
  const isSeries = normalizeVodType(item.type) === "series";
  const entity: Record<string, unknown> = {
    "@type": isSeries ? "TVSeries" : "Movie",
    "@id": absoluteUrl(`/${item.imdbCode}#title`),
    url: absoluteUrl(`/${item.imdbCode}`),
    name: item.title,
    alternateName: item.persianTitle || undefined,
    description: cleanSeoText(item.persianOverview || item.overview, 500) || undefined,
    image: uniqueSeoValues([item.posterUrl, item.backdropUrl]),
    dateCreated: item.year ? String(item.year) : undefined,
    genre: uniqueSeoValues([...(item.persianGenres || []), ...(item.genres || [])]),
    countryOfOrigin: (item.persianCountries || item.countries || []).map((name) => ({ "@type": "Country", name })),
    actor: (item.credits || []).filter((credit) => /actor|actress|cast/i.test(credit.category)).slice(0, 12).map((credit) => ({ "@type": "Person", name: credit.name_text, image: credit.name_image_url || undefined })),
    director: (item.credits || []).filter((credit) => /director/i.test(credit.category)).slice(0, 3).map((credit) => ({ "@type": "Person", name: credit.name_text })),
    potentialAction: item.links.length ? { "@type": "WatchAction", target: absoluteUrl(`/watch/${item.imdbCode}`) } : undefined,
  };
  if (item.imdbRating && item.imdbVotes) entity.aggregateRating = { "@type": "AggregateRating", ratingValue: item.imdbRating, ratingCount: item.imdbVotes, bestRating: 10, worstRating: 1 };
  return { "@context": "https://schema.org", "@graph": [entity, breadcrumbJsonLd([{ name: P.home, pathname: "/" }, { name: isSeries ? P.seriesPlural : P.films, pathname: `/browse?type=${isSeries ? "series" : "movie"}` }, { name: item.title, pathname: `/${item.imdbCode}` }])] };
}

export function musicJsonLd(track: MusicTrack) {
  const artistNames = track.artists.map((artist) => ({ "@type": "MusicGroup", name: artist.name, url: absoluteUrl(`/music/artists/${encodeURIComponent(artist.slug)}`) }));
  const source = track.sources.find((item) => item.kind === "stream") || track.sources[0];
  const entity: Record<string, unknown> = {
    "@type": track.kind === "video" ? "VideoObject" : "MusicRecording",
    "@id": absoluteUrl(`/music/${track.id}#music`),
    url: absoluteUrl(`/music/${track.id}`),
    name: track.persianTitle || track.title,
    alternateName: track.title,
    description: cleanSeoText(track.description, 500) || `${track.title} از ${track.artists.map((artist) => artist.name).join(", ")}`,
    image: track.coverUrl || undefined,
    uploadDate: track.publishedAt || undefined,
    byArtist: artistNames,
    genre: uniqueSeoValues([track.category, ...(track.moods || [])]),
    contentUrl: source?.url,
    potentialAction: { "@type": "ListenAction", target: absoluteUrl(`/music/${track.id}`) },
  };
  if (track.album) entity.inAlbum = { "@type": "MusicAlbum", name: track.album.title, url: track.album.sourceUrl, image: track.album.coverUrl || undefined };
  return { "@context": "https://schema.org", "@graph": [entity, breadcrumbJsonLd([{ name: P.music, pathname: "/music" }, { name: P.artists, pathname: "/music/artists" }, { name: track.persianTitle || track.title, pathname: `/music/${track.id}` }])] };
}

export function artistJsonLd(artist: MusicArtist, trackCount: number) {
  const entity = {
    "@type": "ProfilePage",
    "@id": absoluteUrl(`/music/artists/${encodeURIComponent(artist.slug)}#profile`),
    url: absoluteUrl(`/music/artists/${encodeURIComponent(artist.slug)}`),
    name: `${P.songs} ${artist.name}`,
    description: cleanSeoText(artist.bio, 500) || `${P.home} ${P.artists} ${artist.name} با ${trackCount.toLocaleString("fa-IR")} ${P.song} و ${P.musicVideo}.`,
    image: uniqueSeoValues([artist.profileImageUrl, artist.coverUrl]),
    mainEntity: { "@type": "MusicGroup", name: artist.name, url: absoluteUrl(`/music/artists/${encodeURIComponent(artist.slug)}`), sameAs: uniqueSeoValues([artist.profileSourceUrl, artist.sourceUrl]) },
  };
  return { "@context": "https://schema.org", "@graph": [entity, breadcrumbJsonLd([{ name: P.music, pathname: "/music" }, { name: P.artists, pathname: "/music/artists" }, { name: artist.name, pathname: `/music/artists/${encodeURIComponent(artist.slug)}` }])] };
}

export function videoJsonLd(item: VodItem, videoUrl: string | null) {
  if (!videoUrl) return null;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: item.title,
    description: cleanSeoText(item.persianOverview || item.overview, 500) || `${P.online} ${item.title}`,
    thumbnailUrl: uniqueSeoValues([item.backdropUrl, item.posterUrl]),
    uploadDate: item.releaseDate || (item.year ? String(item.year) : undefined),
    contentUrl: videoUrl,
    embedUrl: absoluteUrl(`/watch/${item.imdbCode}`),
    duration: item.runtimeMinutes ? `PT${item.runtimeMinutes}M` : undefined,
    isFamilyFriendly: false,
  };
}
