export type SubtitleLanguage = 'fa' | 'en';
export type SubtitleContext = { year?: number | null; type?: string; season?: number | null; episode?: number | null; imdbCode?: string; aliases?: string[] };

export function subtitleLanguage(value: string | null | undefined): SubtitleLanguage | null {
  const text = String(value || '').trim().toLowerCase();
  if (/^(?:fa|fas|per)(?:[-_][a-z]{2})?$/.test(text) || /farsi|persian|فارسی|پارسی/.test(text)) return 'fa';
  if (/^(?:en|eng)(?:[-_][a-z]{2})?$/.test(text) || /english|انگلیسی/.test(text)) return 'en';
  return null;
}

export function subtitleFileLanguage(name: string): SubtitleLanguage | 'other' | null {
  let text = name; try { text = decodeURIComponent(name); } catch { /* Preserve filenames with literal percent signs. */ }
  const parts = text.split(/[?#]/)[0].split(/[\\/]/);
  const stem = (parts.pop() || '').replace(/\.(?:srt|vtt|ass|ssa|txt|zip)$/i, '');
  const suffix = /(?:^|[._ -])((?:fa|en)[-_][a-z]{2}|fa|fas|per|farsi|persian|en|eng|english)(?:[._ -](?:sdh|hi|cc|forced))?$/i.exec(stem)?.[1];
  if (suffix) return subtitleLanguage(suffix);
  for (const folder of parts) { const language = /^(?:fa|fas|per|farsi|persian|en|eng|english)$/i.test(folder) ? subtitleLanguage(folder) : null; if (language) return language; }
  const other = /^(?:fr|fra|fre|french|es|spa|spanish|de|deu|ger|german|ar|ara|arabic|ru|rus|russian|tr|tur|turkish|it|ita|italian|ko|kor|korean|ja|jpn|japanese|pt|por|portuguese|zh|chi|chinese)$/i;
  const last = stem.split(/[._ -]/).at(-1) || '';
  return other.test(last) || parts.some(folder => other.test(folder)) ? 'other' : null;
}

const ordinalWords = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
const normalized = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function subtitleTitleIdentity(value: string) {
  const year = /\(((?:19|20)\d{2})\)/.exec(value)?.[1];
  let name = value.replace(/\s*\((?:19|20)\d{2}\)\s*/g, ' ').replace(/\s+subtitles?\s*$/i, '').trim();
  let season: number | null = null;
  const ordinal = new RegExp(`(?:\\s*[-–—:]\\s*|\\s+)(${ordinalWords.join('|')}|\\d+(?:st|nd|rd|th)?)\\s+season\\s*$`, 'i').exec(name);
  const numeric = /(?:\s*[-–—:]\s*|\s+)season\s*(\d+)\s*$/i.exec(name);
  if (ordinal) { season = ordinalWords.indexOf(ordinal[1].toLowerCase()) + 1 || parseInt(ordinal[1]); name = name.slice(0, ordinal.index); }
  else if (numeric) { season = Number(numeric[1]); name = name.slice(0, numeric.index); }
  return { name: normalized(name), year: year ? Number(year) : null, season };
}

export function exactSubtitleTitle(candidate: string, title: string, context: SubtitleContext = {}) {
  const found = subtitleTitleIdentity(candidate), expected = subtitleTitleIdentity(title);
  const names = [expected.name, ...(context.aliases || []).map(alias => subtitleTitleIdentity(alias).name)];
  if (!expected.name || !names.includes(found.name)) return false;
  const series = /series|show|episode/i.test(context.type || '') || context.season != null;
  if (series) return context.season == null || found.season === context.season;
  if (!context.type && context.year == null && expected.year == null) return true;
  if (found.season !== null) return false;
  const year = context.year ?? expected.year;
  return year == null || found.year === year;
}

export function subtitleEpisodeIdentity(value: string): { season: number | null; episode: number | null } {
  let text = value; try { text = decodeURIComponent(value); } catch { /* Keep original names. */ }
  const pair = /(?:^|[^a-z\d])(?:s(?:eason)?[ ._-]*0*(\d+)[ ._-]*(?:e(?:p(?:isode)?)?[ ._-]*0*(\d+))|0*(\d{1,2})x0*(\d{1,3}))(?=$|[^\d])/i.exec(text);
  if (pair) return { season: Number(pair[1] || pair[3]), episode: Number(pair[2] || pair[4]) };
  const season = /(?:^|[^a-z\d])s(?:eason)?[ ._-]*0*(\d+)(?!\d)/i.exec(text)?.[1];
  const episode = /(?:^|[^a-z\d])e(?:p(?:isode)?)?[ ._-]*0*(\d+)(?!\d)/i.exec(text)?.[1];
  return { season: season ? Number(season) : null, episode: episode ? Number(episode) : null };
}

export function subtitleReleaseMatches(releases: string[], context: SubtitleContext) {
  if (!context.season && !context.episode) return true;
  if (!releases.length) return true; // A title-matched pack is validated again when unpacked.
  return releases.some(release => {
    const identity = subtitleEpisodeIdentity(release);
    return (!identity.season || !context.season || identity.season === context.season)
      && (!identity.episode || !context.episode || identity.episode === context.episode);
  });
}
