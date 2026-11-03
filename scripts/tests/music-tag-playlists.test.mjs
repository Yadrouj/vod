import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMoodPlaylists, collectionTracks, playlistPublishedYear } from '../build-mood-playlists.mjs';

test('every real tag gets a complete playlist including multi-tagged songs', () => {
  const source = (id, moods) => ({ id, kind: 'track', category: moods[0], moods, artist: { slug: id }, sources: [{ provider: 'melodify' }] });
  const tracks = [source('a', ['پاپ', 'Chill', 'Chill']), source('b', ['پاپ']), source('c', ['Rare tag'])];
  const result = buildMoodPlaylists([], new Date('2026-10-02T00:00:00Z'), tracks);
  const playlists = result.playlists.filter(p => p.scope === 'tags');
  assert.equal(playlists.length, 3);
  assert.deepEqual(playlists.find(p => p.title === 'پاپ').trackIds, ['a', 'b']);
  assert.deepEqual(playlists.find(p => p.title === 'Chill').trackIds, ['a']);
  assert.equal(playlists.find(p => p.title === 'Rare tag').selection, 'library-tags');
  assert.deepEqual(playlists.map(p => p.id), buildMoodPlaylists([], new Date('2026-10-03T00:00:00Z'), tracks).playlists.filter(p => p.scope === 'tags').map(p => p.id));
});

const date = new Date('2026-11-03T00:00:00Z');
function song(id, category = 'آهنگ', moods = [], extra = {}) {
  return { id, kind: 'track', title: `Song ${id}`, persianTitle: `آهنگ ${id}`, category, moods,
    artist: { slug: `artist-${Number(id.replace(/\D/g, '')) % 12}` }, coverUrl: `https://example.test/${id}.jpg`,
    publishedAt: null, sources: [{ provider: 'melodify', available: true }], ...extra };
}
const batch = (prefix, category, moods, extra = {}) => Array.from({ length: 24 }, (_, i) => song(`${prefix}-${i}`, category, moods, extra));

test('Iranian mood mixes use actual playable songs without inventing literal car tags', () => {
  const library = [
    ...batch('old', 'پاپ', ['نوستالژی']),
    ...batch('road', 'پاپ', ['مسافرت و جاده', 'مود ماشین']),
    ...batch('remix', 'ریمیکس', ['رقص و پارتی']),
    ...batch('sad', 'آهنگ', [], { title: 'دلتنگم', persianTitle: 'دلتنگم' }),
    ...batch('love', 'پاپ', ['عاشقانه']),
    ...batch('unavailable', 'ریمیکس', ['رقص و پارتی'], { sources: [{ available: false }] }),
    ...batch('foreign', 'Pop', ['Travel & Trip'], { language: 'en' }),
  ];
  const playlists = buildMoodPlaylists([], date, library).playlists.filter(p => p.selection === 'curated-mood');
  assert.equal(playlists.length, 8);
  const byId = new Map(library.map(track => [track.id, track]));
  for (const playlist of playlists) {
    assert.ok(playlist.trackIds.length >= 8 && playlist.trackIds.length <= 40);
    assert.ok(playlist.artistCount >= 4);
    assert.equal(new Set(playlist.trackIds).size, playlist.trackIds.length);
    assert.ok(playlist.trackIds.every(id => byId.has(id) && !id.startsWith('foreign') && !id.startsWith('unavailable')));
    assert.match(playlist.description, /حال‌وهواست، نه برچسب صریح/);
  }
  for (const [mood, prefix] of [['peykan', 'old'], ['peugeot', 'road'], ['shooti', 'remix'], ['sad', 'sad']]) {
    assert.ok(playlists.find(p => p.mood === mood).trackIds.every(id => id.startsWith(prefix)));
  }
  assert.deepEqual(playlists, buildMoodPlaylists([], date, library).playlists.filter(p => p.selection === 'curated-mood'));
});

test('styles require real metadata; title words alone do not establish a genre or sadness', () => {
  const tracks = [
    ...batch('pop', 'پاپ', ['پاپ']),
    ...batch('jazz', 'Jazz', ['Jazz']),
    ...batch('title', 'آهنگ', [], { title: 'Jazz Sadness', persianTitle: 'اشکان' }),
  ];
  const result = buildMoodPlaylists(tracks, date);
  const styles = result.playlists.filter(p => p.selection === 'genre-tags');
  assert.ok(styles.find(p => p.id === 'curated-style-jazz').trackIds.every(id => id.startsWith('jazz')));
  assert.ok(styles.find(p => p.id === 'curated-style-persian-pop').trackIds.every(id => id.startsWith('pop')));
  assert.ok(!result.playlists.some(p => p.id === 'curated-persian-sad'));
});

test('publication years reject missing, malformed, future and archive-arrival dates', () => {
  for (const publishedAt of [null, '', '207', '2026junk', '2026-02-30', '2026-13-01', '2027', '3026']) {
    assert.equal(playlistPublishedYear({ publishedAt, addedAt: '2026-01-01', folder: { year: '2026' }, title: 'Hit 2026' }, 2026), null, String(publishedAt));
  }
  assert.equal(playlistPublishedYear({ publishedAt: '2024' }, 2026), 2024);
  assert.equal(playlistPublishedYear({ publishedAt: '2026-10-03T00:00:00+03:30' }, 2026), 2026);
  assert.equal(playlistPublishedYear({ publishedAt: null, album: { publishedAt: '2023-02-28' } }, 2026), 2023);
  const tracks = [
    ...batch('dated', 'آهنگ', [], { publishedAt: '2025-10-01' }),
    ...batch('imported', 'پاپ', [], { addedAt: '2026-01-01', folder: { year: '2026' } }),
    ...batch('broken', 'آهنگ', [], { publishedAt: '207' }),
  ];
  const playlists = buildMoodPlaylists(tracks, date).playlists.filter(p => p.selection === 'published-year');
  assert.deepEqual(playlists.map(p => p.id), ['curated-year-persian-2025']);
  assert.ok(playlists[0].trackIds.every(id => id.startsWith('dated')));
  assert.match(playlists[0].description, /لزوماً سال نخستین انتشار اثر نیست/);
});

test('collection payload includes imported library IDs without duplicating base catalog IDs', () => {
  const base = song('base-1');
  const imported = batch('library', 'پاپ', ['مسافرت و جاده']);
  const tracks = collectionTracks([base], [{ ...base, title: 'Duplicate' }, ...imported]);
  assert.equal(tracks.length, imported.length + 1);
  assert.equal(tracks[0], base);
  const result = buildMoodPlaylists([base], date, imported);
  const ids = new Set(tracks.map(track => track.id));
  assert.ok(result.playlists.every(p => p.trackIds.every(id => ids.has(id))));
  assert.ok(result.playlists.find(p => p.id === 'curated-persian-road').trackIds.every(id => id.startsWith('library')));
});
