import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { directors, singers, recordingArtistIds } from '../content/creators/selections.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';
import { identityKey } from '../lib/creator-identities.mjs';

const root = '.media-cache/creator-research';
const userAgent = 'SarvNemaCreatorProfiles/1.0 (https://sarvnema.ir/mag/about)';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const key = text => createHash('sha256').update(text).digest('hex');
async function json(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: AbortSignal.timeout(35000) });
    if ([429, 502, 503, 504].includes(response.status) && attempt < 2) { await sleep(4000 * (attempt + 1)); continue; }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${new URL(url).hostname}`);
    return response.json();
  }
}
async function cached(name, request) {
  const file = `${root}/${key(name)}.json`;
  try { if (Date.now() - (await stat(file)).mtimeMs < 30 * 86400000) return JSON.parse(await readFile(file, 'utf8')); } catch {}
  const result = await request();
  await writeJsonAtomic(file, result);
  return result;
}
const profiles = [];
let cursor = 0, done = 0;
const selected = [...directors, ...singers];
const failures = [];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (cursor < selected.length) {
    const selection = selected[cursor++];
    try {
      const summary = await cached(`summary:${selection.wiki}`, () => json(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(selection.wiki)}`));
      if (!summary.wikibase_item || summary.type === 'disambiguation') throw new Error('Ambiguous or missing person identity');
      const entity = await cached(`entity:${summary.wikibase_item}`, async () => {
        const result = await json(`https://www.wikidata.org/wiki/Special:EntityData/${summary.wikibase_item}.json`);
        return result.entities[summary.wikibase_item];
      });
      const claims = property => (entity.claims[property] || []).filter(claim => claim.rank !== 'deprecated').map(claim => claim.mainsnak?.datavalue?.value).filter(Boolean);
      if (!claims('P31').some(value => value.id === 'Q5')) throw new Error('Identity is not an individual human');
      profiles.push({ ...selection, wikidataId: entity.id, imdbId: claims('P345').find(value => /^nm\d+$/.test(value)) || null,
        appleArtistId: recordingArtistIds[selection.wiki] || claims('P2850')[0] || null, birthDate: claims('P569')[0]?.time?.replace(/^\+/, '').slice(0,10) || null,
        deathDate: claims('P570')[0]?.time?.replace(/^\+/, '').slice(0,10) || null,
        description: entity.descriptions?.en?.value || summary.description || '',
        biographyEn: summary.extract || '', biographySourceUrl: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(summary.titles?.canonical || selection.wiki)}${summary.revision ? `&oldid=${summary.revision}` : ''}`,
        commonsFile: claims('P18')[0] || null,
        imageUrl: summary.thumbnail?.source || summary.originalimage?.source || null,
        imageSourceUrl: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(selection.wiki)}`,
        sources: [{ label: 'Wikipedia', url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(selection.wiki)}` },
          { label: 'Wikidata · CC0', url: `https://www.wikidata.org/wiki/${entity.id}` },
          ...claims('P856').filter(url => /^https:\/\//.test(url)).slice(0,1).map(url => ({ label: 'Official website', url }))],
        researchedAt: new Date().toISOString(), recordings: [] });
      done++;
      if (done % 20 === 0) console.log(JSON.stringify({ phase: 'verified-identities', completed: done, total: selected.length }));
    } catch (error) { failures.push({ wiki: selection.wiki, error: error.message }); console.error(JSON.stringify(failures.at(-1))); }
    await sleep(350);
  }
}));
if (failures.length) { await writeJsonAtomic(`${root}/identity-failures.json`, failures); throw new Error(`${failures.length} identities need review; not publishing incomplete collections`); }

// Commons file-level attribution is distinct from the biography's text license.
// Do not silently reuse a Wikipedia fair-use portrait under a CC text license.
const plain = text => String(text || '').replace(/<[^>]*>/g, '').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();
for (let offset = 0; offset < profiles.length; offset += 20) {
  const batch = profiles.slice(offset, offset + 20);
  const files = batch.filter(profile => profile.commonsFile).map(profile => `File:${profile.commonsFile}`);
  const result = files.length ? await cached(`commons-credits:${files.join('|')}`, async () => {
    await sleep(1100);
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    for (const [name,value] of Object.entries({action:'query',format:'json',titles:files.join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'400'})) url.searchParams.set(name,value);
    return json(url.href);
  }) : {};
  const pages = Object.values(result.query?.pages || {});
  for (const profile of batch) {
    const image = pages.find(page => page.title?.replaceAll('_',' ') === `File:${profile.commonsFile}`.replaceAll('_',' '))?.imageinfo?.[0];
    const metadata = image?.extmetadata;
    const license = plain(metadata?.LicenseShortName?.value);
    if (image && /^(?:CC0\b|CC\b|Public domain|PD\b|Copyrighted free use)/i.test(license)) {
      profile.imageUrl = image.thumburl || image.url;
      profile.imageSourceUrl = image.descriptionurl;
      profile.imageCredit = {artist:plain(metadata.Artist?.value),license,licenseUrl:metadata.LicenseUrl?.value || image.descriptionurl};
    } else {
      profile.imageUrl = null;
      profile.imageCredit = null;
    }
  }
  console.log(JSON.stringify({phase:'portrait-licenses',completed:Math.min(offset+20,profiles.length),total:200}));
}

// Apple documents ~20 search requests/minute. Cache responses and issue at most
// one new request per 3.2 seconds; never download or publish preview audio.
const singersToResearch = profiles.filter(profile => profile.kind === 'singer');
let recordingsDone = 0;
for (const profile of singersToResearch) {
  const aliases = new Set([profile.name, profile.nameFa, ...profile.aliases].map(identityKey));
  let response = await cached(`apple-songs-v1:${profile.wiki}`, async () => {
    await sleep(3200);
    const url = new URL(profile.appleArtistId ? 'https://itunes.apple.com/lookup' : 'https://itunes.apple.com/search');
    const parameters = profile.appleArtistId ? {id: profile.appleArtistId, entity:'song',limit:'80',country:'US'} : { term: profile.name, entity: 'song', media: 'music', attribute: 'artistTerm', limit: '80', country: 'US' };
    for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);
    return json(url.href);
  });
  if (profile.appleArtistId && !(response.results || []).some(recording => recording.kind === 'song' && String(recording.artistId) === String(profile.appleArtistId))) {
    response = await cached(`apple-songs-by-id:${profile.appleArtistId}`, async () => {
      await sleep(3200);
      return json(`https://itunes.apple.com/lookup?id=${encodeURIComponent(profile.appleArtistId)}&entity=song&limit=80&country=US`);
    });
  }
  const seen = new Set();
  profile.recordings = (response.results || []).filter(recording => {
    if (recording.kind !== 'song' || !recording.artworkUrl100 || !recording.trackViewUrl) return false;
    // Never attach a soundalike, tribute band or unrelated short-name artist.
    const matches = profile.appleArtistId ? String(recording.artistId) === String(profile.appleArtistId) : aliases.has(identityKey(recording.artistName));
    if (!matches || seen.has(identityKey(recording.trackName))) return false;
    seen.add(identityKey(recording.trackName));
    return true;
  }).slice(0, 12).map(recording => ({ title: recording.trackName, album: recording.collectionName || null,
    coverUrl: recording.artworkUrl100.replace(/100x100bb/, '400x400bb'), sourceUrl: recording.trackViewUrl,
    artistName: recording.artistName, artistId: String(recording.artistId), releasedAt: recording.releaseDate || null }));
  recordingsDone++;
  console.log(JSON.stringify({ phase: 'recordings', completed: recordingsDone, total: 100, artist: profile.name, verified: profile.recordings.length }));
}
profiles.sort((left, right) => selected.findIndex(row => row.wiki === left.wiki) - selected.findIndex(row => row.wiki === right.wiki));
await writeJsonAtomic(`${root}/verified-profiles.json`, { version: 1, researchedAt: new Date().toISOString(), profiles });
console.log(JSON.stringify({ phase: 'complete', directors: profiles.filter(p => p.kind === 'director').length, singers: singersToResearch.length,
  recordings: singersToResearch.reduce((sum, profile) => sum + profile.recordings.length, 0), singersWithoutExternalRecordings: singersToResearch.filter(p => !p.recordings.length).map(p => p.name) }));
