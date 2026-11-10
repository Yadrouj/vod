import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHostedCatalog, hostedPlaylists } from '../import-hosted-music.mjs';

const row = { path: 'ABBA/Album/01.mp3', title: 'Money, Money, Money', artists: ['ABBA'], genres: ['Pop'], album: 'Greatest Songs', kind: 'track', coverPath: '.sarvnema/covers/84e3d61d9ca2703e5a2380a993ef54ef.jpg' };
test('stable IDs, original tags, verified files, no invented release dates or credentials', () => {
  const input = { tracks: [row, row, { ...row, path: 'unknown.mp3', needsReview: true }, { ...row, path: '../unsafe.mp3' }] };
  const index = buildHostedCatalog(input, [], '2026-11-10T00:00:00Z', new Set([row.path]));
  assert.equal(index.tracks.length, 1);
  assert.equal(index.tracks[0].publishedAt, null);
  assert.equal(index.tracks[0].category, 'موسیقی خارجی');
  assert.equal(index.tracks[0].id, buildHostedCatalog(input).tracks[0].id);
  assert.ok(index.tracks[0].sources[0].url.startsWith('https://music.sarvnema.ir/files/'));
  assert.equal(JSON.stringify(index).includes('Bearer'), false);
  assert.equal(hostedPlaylists(index).playlists.length, 0);
});
test('Persian archive folders are not labelled foreign', () => {
  const index = buildHostedCatalog({ tracks: [{ ...row, folderArtist: 'Farhad' }] });
  assert.equal(index.tracks[0].category, 'موسیقی قدیمی فارسی');
});

test('verified MP3 playback comes first, ALAC original is retained, IDs remain stable', () => {
  const input = { tracks: [{ ...row, codec: 'alac' }] };
  const first = buildHostedCatalog(input);
  const id = first.tracks[0].id;
  const compatible = { [id]: { path: `.sarvnema/compatible/${id}.mp3`, sourcePath: row.path, codec: 'mp3' } };
  const result = buildHostedCatalog(input, [], '2026-11-10T00:00:00Z', null, compatible);
  assert.equal(result.tracks[0].id, id);
  assert.equal(result.tracks[0].sources[0].quality, 'MP3 · 320 kbps');
  assert.equal(result.tracks[0].sources[1].kind, 'download');
  assert.equal(result.tracks[0].sources[1].url, first.tracks[0].sources[0].url);
  compatible[id].sourcePath = 'another/recording.m4a';
  assert.equal(buildHostedCatalog(input, [], '', null, compatible).tracks[0].sources.length, 1);
});
