import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateBatch } from '../apply-media-refresh-2026-11-13.mjs';
import { mergeMeloobitIndex } from '../merge-meloobit-source.mjs';
test('packaged data is bounded and only contains available music sources', async () => {
  const vod = JSON.parse(await readFile('lib/data/media-refresh-2026-11-13-vod.json', 'utf8'));
  const music = JSON.parse(await readFile('lib/data/media-refresh-2026-11-13-music.json', 'utf8'));
  assert.doesNotThrow(() => validateBatch(vod, music));
  assert.throws(() => validateBatch({ items: [] }, music));
  assert.throws(() => validateBatch(vod, { tracks: [{ id: 'invalid', sources: [] }] }));
});
test('music merge retains previous entries and is idempotent', async () => {
  const source = JSON.parse(await readFile('lib/data/media-refresh-2026-11-13-music.json', 'utf8'));
  const old = { ...source.tracks[0], id: 'keep-original', matchKey: 'unique-original-identity', title: 'Keep original', persianTitle: 'Keep original' };
  const index = { version: 1, tracks: [old], artists: [] };
  const first = mergeMeloobitIndex(index, source);
  const again = mergeMeloobitIndex(first, source);
  assert.ok(again.tracks.some(t => t.id === old.id));
  assert.equal(again.tracks.length, first.tracks.length);
});
