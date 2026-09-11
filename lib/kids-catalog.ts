import { loadVodIndex } from "./vod-index";
import { findVodItem } from "./catalog";
import { loadMusicIndex, normalizeMusicTrack } from "./music";
import { playableLinks } from "./link-labels";
import { KIDS_ACTIVITIES, KIDS_MUSIC_SELECTION, KIDS_RESOURCES, KIDS_VIDEO_SELECTION, safeKidsUrl, type KidsItem } from "./kids";

export async function loadKidsCatalog(): Promise<KidsItem[]> {
  const [vod, music] = await Promise.all([loadVodIndex(), loadMusicIndex()]);
  const videos: KidsItem[] = KIDS_VIDEO_SELECTION.flatMap(([id, title, ages, categories, note]) => {
    const found = vod.items.find(item => item.imdbCode === id);
    return found ? [{ id: `vod-${id}`, catalogId: id, title, ages, categories, note, kind: "video" as const, provider: found.source || "آرشیو فیلم سرونما", poster: safeKidsUrl(found.posterUrl || undefined) }] : [];
  });
  const tracks: KidsItem[] = KIDS_MUSIC_SELECTION.flatMap(([id, title]) => {
    const found = music.tracks.find(item => item.id === id);
    return found ? [{ id: `audio-${id}`, catalogId: id, title, ages: ["0-2", "3-5", "6-8", "9-12"] as KidsItem["ages"], categories: ["music", ...(id.includes("0564633") ? [] : ["sleep"])] as KidsItem["categories"], kind: "audio" as const, provider: found.artist.name, poster: safeKidsUrl(found.coverUrl || undefined), note: "پیشنهاد از آرشیو موجود؛ عنوان لالایی تضمین محتوای کودک نیست. متن و نسخهٔ صوتی را کامل بررسی کنید." }] : [];
  });
  return [...KIDS_ACTIVITIES, ...videos, ...tracks, ...KIDS_RESOURCES.filter(item => item.kind === "embed")];
}
export type KidsMediaSource = { url: string; label: string };
export function isKidsPlayableUrl(raw: string) {
  return /\.(?:mp4|m4v|webm|mov)(?:$|[?#])/i.test(raw)
    || /[?&](?:format|mime)=(?:mp4|m4v|webm|mov)(?:[&#]|$)/i.test(raw);
}
export async function kidsMediaSources(id: string): Promise<KidsMediaSource[]> {
  if (id.startsWith("vod-") && KIDS_VIDEO_SELECTION.some(item => `vod-${item[0]}` === id)) {
    const item = await findVodItem(id.slice(4));
    if (!item) return [];
    return playableLinks(item.links, { isSeries: /series/i.test(item.type), title: item.title })
      .filter(link => isKidsPlayableUrl(link.url) && safeKidsUrl(link.url))
      .slice(0, 400).map(link => ({ url: link.url, label: `${link.season ? `فصل ${link.season} / قسمت ${link.episode ?? "؟"} · ` : ""}${link.quality || link.label}` }));
  }
  if (id.startsWith("audio-") && KIDS_MUSIC_SELECTION.some(item => `audio-${item[0]}` === id)) {
    const index = await loadMusicIndex();
    const raw = index.tracks.find(item => item.id === id.slice(6));
    if (!raw) return [];
    return normalizeMusicTrack(raw).sources.filter(s => s.available !== false && safeKidsUrl(s.url) && /\.(mp3|m4a|ogg|wav)(?:$|[?#])/i.test(s.url)).map(s => ({ url: s.url, label: s.label || s.quality || "نسخهٔ صوتی" }));
  }
  return [];
}
