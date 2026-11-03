import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { playlistPublishedYear } from '../build-mood-playlists.mjs';

const read = async name => JSON.parse(await readFile(new URL(`../../public/data/${name}`, import.meta.url), 'utf8'));
const [index, compact, library] = await Promise.all([
  read('music-mood-playlists.json'), read('music-mood-tracks.json'), read('melodify-library.json'),
]);
const compactById = new Map(compact.tracks.map(track => [track.id, track]));
const libraryById = new Map(library.tracks.map(track => [track.id, track]));

test('published collections resolve every track, including library songs in curated mixes', () => {
  assert.equal(new Set(index.playlists.map(playlist => playlist.id)).size, index.playlists.length);
  assert.equal(index.uniqueTracks, new Set(index.playlists.flatMap(playlist => playlist.trackIds)).size);
  for (const playlist of index.playlists) {
    for (const id of playlist.trackIds) {
      assert.ok(playlist.selection === 'library-tags' ? libraryById.has(id) || compactById.has(id) : compactById.has(id), `${playlist.id}: ${id}`);
    }
  }
  const moods = index.playlists.filter(playlist => playlist.selection === 'curated-mood');
  assert.equal(moods.length, 8);
  assert.ok(moods.some(playlist => playlist.trackIds.some(id => libraryById.has(id))));
  assert.ok(moods.every(playlist => playlist.trackIds.length >= 8 && playlist.trackIds.length <= 40));
});

test('published year collections match only real publication metadata', () => {
  const years = index.playlists.filter(playlist => playlist.selection === 'published-year');
  assert.ok(years.length > 0);
  const currentYear = new Date(index.updatedAt).getUTCFullYear();
  for (const playlist of years) {
    for (const id of playlist.trackIds) assert.equal(playlistPublishedYear(compactById.get(id), currentYear), Number(playlist.mood));
  }
});

test('curation preserves every literal library tag as a separate complete collection', () => {
  const expected = new Map();
  for (const track of library.tracks.filter(track => track.kind === 'track' && track.sources.some(source => source.provider === 'melodify' && source.available !== false))) {
    for (const tag of new Set([track.category, ...(track.moods ?? [])].map(value => String(value ?? '').trim()).filter(Boolean))) {
      if (!expected.has(tag)) expected.set(tag, new Set());
      expected.get(tag).add(track.id);
    }
  }
  const tagged = index.playlists.filter(playlist => playlist.scope === 'tags' && playlist.selection === 'library-tags');
  assert.equal(tagged.length, expected.size);
  for (const playlist of tagged) assert.deepEqual(new Set(playlist.trackIds), expected.get(playlist.title));
});
