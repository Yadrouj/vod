import { unzipSync } from 'fflate';
import { decodeSubtitleBytes } from './subtitle-format';
import { subtitleEpisodeIdentity, subtitleFileLanguage, type SubtitleLanguage } from './subtitle-matching';

export const MAX_SUBTITLE_BYTES = 2 * 1024 * 1024;
const EXTENSION = /\.(?:vtt|srt|ass|ssa|txt)$/i;
type Options = { language?: SubtitleLanguage | null; season?: number | null; episode?: number | null };

export function selectSubtitleFile(entries: [string, Uint8Array][], options: Options = {}) {
  const candidates = entries.filter(([name, bytes]) => {
    if (!EXTENSION.test(name) || /(?:^|\/)__MACOSX\/|(?:^|\/)\./.test(name) || !bytes.length || bytes.length > MAX_SUBTITLE_BYTES) return false;
    const lang = subtitleFileLanguage(name);
    if (lang === 'other' || options.language && lang && lang !== options.language) return false;
    const identity = subtitleEpisodeIdentity(name);
    return (!options.season || !identity.season || options.season === identity.season)
      && (!options.episode || !identity.episode || options.episode === identity.episode);
  });
  const episodeMatches = candidates.filter(([name]) => {
    const identity = subtitleEpisodeIdentity(name);
    return options.episode != null && identity.episode === options.episode;
  });
  // Never take the first/largest file from a complete-season archive. If filenames
  // do not identify the requested episode, an ambiguous pack needs another release.
  const pool = episodeMatches.length ? episodeMatches : candidates;
  if (options.episode && !episodeMatches.length && pool.length > 1) throw new Error('The package does not identify the requested episode. Choose another subtitle.');
  const score = ([name]: [string, Uint8Array]) => (subtitleFileLanguage(name) === options.language ? 30 : 0)
    + (/\.vtt$/i.test(name) ? 10 : /\.srt$/i.test(name) ? 8 : 4) - (/sample|commentary|forced/i.test(name) ? 20 : 0);
  const selected = [...pool].sort((a, b) => score(b) - score(a))[0];
  if (!selected) throw new Error('No Persian or English subtitle matches the selected episode and language.');
  const [fileName, bytes] = selected;
  if (options.language === 'en') {
    const text = decodeSubtitleBytes(bytes).replace(/<[^>]*>/g, '');
    const arabic = text.match(/[\u0600-\u06ff]/g)?.length || 0;
    if (arabic > Math.max(30, (text.match(/[a-z]/gi)?.length || 0) * .15)) throw new Error('This subtitle is not English.');
  }
  return { fileName, bytes };
}

export function unpackSubtitle(bytes: Uint8Array, fileName: string, options: Options = {}, contentType = '') {
  if (bytes.byteLength > 4 * 1024 * 1024) throw new Error('Subtitle package is too large.');
  if (contentType.includes('zip') || /\.zip$/i.test(fileName) || bytes[0] === 0x50 && bytes[1] === 0x4b) {
    let total = 0, count = 0;
    const files = unzipSync(bytes, { filter: file => {
      if (!EXTENSION.test(file.name) || file.originalSize < 1 || file.originalSize > MAX_SUBTITLE_BYTES) return false;
      total += file.originalSize; count++;
      if (total > 16 * 1024 * 1024 || count > 100) throw new Error('The subtitle archive contains too many or oversized files.');
      return true;
    } });
    return selectSubtitleFile(Object.entries(files), options);
  }
  return selectSubtitleFile([[fileName, bytes]], options);
}
