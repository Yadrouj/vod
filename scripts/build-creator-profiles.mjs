import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { directors, singers } from '../content/creators/selections.mjs';
import { findRecordingMatch, identityKey, matchingArtistSlugs } from '../lib/creator-identities.mjs';
import { mergeMelodifyCatalog } from '../lib/music-library-merge.ts';
import { writeJsonAtomic } from './atomic-json.mjs';

const dataDir = process.env.VOD_DATA_DIR || 'public/data';
const read = name => readFile(path.join(dataDir, name), 'utf8').then(JSON.parse);
export const creatorSlug = name => identityKey(name).replaceAll(' ', '-');

export async function buildCreatorProfiles({refreshArchive = false} = {}) {
  const existing = refreshArchive ? await read('creator-profiles.json') : null;
  const research = existing ? {researchedAt:existing.researchedAt,profiles:[...existing.directors,...existing.singers]} : JSON.parse(await readFile('.media-cache/creator-research/verified-profiles.json', 'utf8'));
  if (research.profiles.length !== 200) throw new Error('Research must contain all 200 verified identities');
  const [people, catalog, map, base, library] = await Promise.all([
    read('vod-people.json'), read('vod-index.json'), read('title-map.json'), read('music-artists.json'),
    read('melodify-library.json').catch(() => null),
  ]);
  const music = library ? mergeMelodifyCatalog(base, library) : base;
  const cards = new Map(catalog.items.map(card => [card.imdbCode, card]));
  const peopleValues = Object.values(people.people);
  const byTrackId = new Map(music.tracks.map(track => [track.id, track]));
  const output = [];
  for (const row of research.profiles) {
    const selected = (row.kind === 'director' ? directors : singers).find(item => item.wiki === row.wiki);
    if (!selected || !row.wikidataId || !row.biographyEn || !row.sources.length) throw new Error(`Missing verified identity/biography: ${row.wiki}`);
    const profile = { ...row, ...selected, slug: creatorSlug(selected.name), recordings: undefined };
    if (row.kind === 'director') {
      const names = new Set([row.name, row.nameFa, ...row.aliases].map(identityKey));
      const matches = peopleValues.filter(person => person.id === row.imdbId || person.id === `wd-${row.wikidataId}` || names.has(identityKey(person.name)));
      profile.id = matches.find(person => person.id === row.imdbId)?.id || matches[0]?.id || row.imdbId || `wd-${row.wikidataId}`;
      profile.personIds = [...new Set([profile.id, ...matches.map(person => person.id), row.imdbId, `wd-${row.wikidataId}`].filter(Boolean))];
      profile.works = [...new Map(matches.flatMap(person => person.items).map(card => [card.imdbCode, cards.get(card.imdbCode) || card])).values()]
        .sort((a,b) => (b.year || 0) - (a.year || 0) || (b.imdbRating || 0) - (a.imdbRating || 0));
      profile.directedIds = [];
      // A person-level "Director" tag does not make every acting credit a directed film.
      for (const work of profile.works) {
        const file = map[work.imdbCode] || map[work.id];
        if (!file) continue;
        const safeFile = path.resolve(dataDir, 'titles', `${file}.json`);
        const relative = path.relative(path.resolve(dataDir, 'titles'), safeFile);
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unsafe title-map path');
        const title = JSON.parse(await readFile(safeFile, 'utf8'));
        if ((title.credits || []).some(credit => /^directors?$/i.test(credit.category) && profile.personIds.includes(credit.name_id))) profile.directedIds.push(work.imdbCode);
      }
      profile.sources = [...new Map([...row.sources, ...(row.imdbId ? [{ label: 'IMDb filmography', url: `https://www.imdb.com/name/${row.imdbId}/` }] : [])].map(source=>[source.url,source])).values()];
    } else {
      profile.artistSlugs = matchingArtistSlugs(music.artists, profile);
      const ids = new Set(profile.artistSlugs.flatMap(slug => music.artistTrackIds?.[slug] || music.artists.find(artist => artist.slug === slug)?.trackIds || []));
      const tracks = [...ids].map(id => byTrackId.get(id)).filter(Boolean);
      profile.archiveTrackCount = tracks.length;
      profile.recordings = row.recordings.map(recording => ({ ...recording,
        archiveTrackId: findRecordingMatch(recording, tracks, [row.name, row.nameFa, ...row.aliases])?.id || null }));
    }
    output.push(profile);
  }
  const payload = { version: 1, researchedAt: research.researchedAt, peopleUpdatedAt: people.generatedAt,
    musicUpdatedAt: music.updatedAt, selection: 'Independent, unranked editorial collections; not an official BFI, IMDb or music-chart ranking.',
    directors: output.filter(profile => profile.kind === 'director'), singers: output.filter(profile => profile.kind === 'singer') };
  if (new Set(payload.directors.map(profile => profile.id)).size !== 100 || new Set(payload.singers.map(profile => profile.slug)).size !== 100) throw new Error('Duplicate identity');
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const payload = await buildCreatorProfiles({refreshArchive:process.argv.includes('--refresh-archive')});
  await writeJsonAtomic(path.join(dataDir, 'creator-profiles.json'), payload);
  await writeJsonAtomic(path.join(dataDir,'creator-music-gaps.json'),{researchedAt:payload.researchedAt,musicUpdatedAt:payload.musicUpdatedAt,
    note:'Selected verified recordings not matched to this SarvNema archive snapshot. Metadata and cover references only; no audio or download link.',
    artists:payload.singers.map(profile=>({name:profile.name,nameFa:profile.nameFa,profile:`/music/artists/${profile.slug}`,
      missing:profile.recordings.filter(recording=>!recording.archiveTrackId).map(({title,album,coverUrl,sourceUrl})=>({title,album,coverUrl,sourceUrl}))})).filter(profile=>profile.missing.length)});
  console.log(JSON.stringify({ directors: payload.directors.length, singers: payload.singers.length,
    relatedTitles: payload.directors.reduce((sum, p) => sum + p.works.length, 0), directedTitles: payload.directors.reduce((sum, p) => sum + p.directedIds.length, 0),
    relatedTracks: payload.singers.reduce((sum, p) => sum + p.archiveTrackCount, 0),
    externalRecordings: payload.singers.reduce((sum, p) => sum + p.recordings.length, 0),
    missingRecordings: payload.singers.reduce((sum, p) => sum + p.recordings.filter(recording => !recording.archiveTrackId).length, 0) }));
}
