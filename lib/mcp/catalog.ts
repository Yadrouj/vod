import { searchBotCatalog, parseBotSearchParams } from '../bot-catalog';
import { searchBotMusic, parseBotMusicSearchParams } from '../bot-music-catalog';
import { findVodItem, normalizeVodType } from '../catalog';
import { findMusicTrack, loadMusicIndex, loadMusicHomeIndex } from '../music';
import { loadVodIndex } from '../vod-index';
import { MCP_SITE } from './plans';

export async function mcpSearch(query: string, type: 'all' | 'movie' | 'series', limit: number, page: number) {
  const result = await searchBotCatalog(parseBotSearchParams(new URLSearchParams({ q: query, type, limit: String(limit), page: String(page), sort: 'relevance' })), MCP_SITE);
  return { query: result.query, matchedQuery: result.matchedQuery, corrections: result.corrections, pagination: result.pagination,
    items: result.items.map(item => ({ id: item.imdbCode || item.id, title: item.title, type: item.type, year: item.year, url: `${MCP_SITE}/${encodeURIComponent(item.imdbCode || item.id)}`, ...(process.env.MCP_LICENSED_RATINGS === '1' ? { imdbRating: item.imdbRating } : {}) })) };
}
export async function mcpMusicSearch(query: string, limit: number, page: number) {
  const result = await searchBotMusic(parseBotMusicSearchParams(new URLSearchParams({ q: query, limit: String(limit), page: String(page) })), MCP_SITE);
  return { query: result.query, matchedQuery: result.matchedQuery, corrections: result.corrections, pagination: result.pagination,
    items: result.items.map(item => ({ id: item.id, title: item.title, kind: item.kind, artists: item.artists, url: item.urls.detail })) };
}
export async function mcpTitle(id: string) {
  const item = await findVodItem(id); if (!item) return { found: false };
  const key = item.imdbCode || item.id;
  const episodes = new Map<string, { season: number; episode: number; qualities: string[]; url: string }>();
  for (const link of item.links) {
    if (!link.season || !link.episode) continue;
    const name = `${link.season}:${link.episode}`;
    const entry = episodes.get(name) || { season: link.season, episode: link.episode, qualities: [], url: `${MCP_SITE}/watch/${encodeURIComponent(key)}?season=${link.season}&episode=${link.episode}` };
    if (link.quality && !entry.qualities.includes(link.quality)) entry.qualities.push(link.quality);
    episodes.set(name, entry);
  }
  return { found: true, id: key, title: item.persianTitle || item.title, originalTitle: item.title, type: normalizeVodType(item.type), year: item.year,
    url: `${MCP_SITE}/${encodeURIComponent(key)}`, watchUrl: `${MCP_SITE}/watch/${encodeURIComponent(key)}`, downloadPageUrl: `${MCP_SITE}/${encodeURIComponent(key)}#downloads`,
    episodeCount: episodes.size, episodes: [...episodes.values()].sort((a, b) => a.season - b.season || a.episode - b.episode).slice(0, 50),
    ...(process.env.MCP_LICENSED_RATINGS === '1' ? { imdbRating: item.imdbRating } : {}) };
}
export async function mcpTrack(id: string) {
  const track = findMusicTrack(await loadMusicIndex(), id);
  return track ? { found: true, id: track.id, title: track.persianTitle || track.title, artists: track.artists.map(a => a.name), kind: track.kind, url: `${MCP_SITE}/music/${encodeURIComponent(track.id)}` } : { found: false };
}
export async function mcpArchiveStats() {
  const [vod, music] = await Promise.all([loadVodIndex(), loadMusicHomeIndex()]);
  const series = vod.items.filter(item => normalizeVodType(item.type) === 'series').length;
  return { service: 'SarvNema', description: 'موتور جستجوی فیلم، سریال و موسیقی', films: vod.items.length - series, series, music: music.archiveStats.tracks, musicVideos: music.archiveStats.videos, updatedAt: vod.generatedAt, website: MCP_SITE };
}
