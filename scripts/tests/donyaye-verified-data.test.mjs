import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { applyDonyayeLinkUpdates, resolveDonyayeDownloadUrl, validDonyayeUpdate } from '../../lib/donyaye-link-updates.mjs';

const updates = JSON.parse(await readFile('lib/data/donyaye-link-updates.json', 'utf8'));
test('the bundled repair snapshot has 171 validated additions and preserves copyright restrictions', () => {
  assert.equal(updates.version, 1);
  assert.ok(!updates.items.tt33184638);
  let additions = 0;
  for (const [id, patch] of Object.entries(updates.items)) {
    for (const link of patch.links) { assert.equal(validDonyayeUpdate(link, id), true); additions++; }
    for (const row of patch.replacements) assert.equal(validDonyayeUpdate(row.link, id), true);
  }
  assert.ok(additions >= 171);
});

test('both exact corrupted production URLs resolve to the verified original servers', () => {
  const patch = updates.items.tt1155056;
  assert.equal(patch.replacements.length, 2);
  for (const row of patch.replacements) {
    assert.equal(new URL(row.fromUrl).hostname, 'dls3.aparatchi-dlcenter.top');
    assert.equal(resolveDonyayeDownloadUrl(row.fromUrl, updates), row.link.url);
    const expected = row.link.quality === '1080p' ? 'dls4.varzeshha3-uploader.top' : 'dls7.varzeshha3-uploader.top';
    assert.equal(new URL(row.link.url).hostname, expected);
  }
});

test('the bundled quarantine affects exactly 24 stored sources without deleting raw title data', async () => {
  const now = Date.parse(updates.checkedAt) + 1000;
  let removed = 0;
  for (const id of Object.keys(updates.items)) {
    const raw = JSON.parse(await readFile(`public/data/titles/${id}.json`, 'utf8'));
    const before = JSON.stringify(raw);
    const result = applyDonyayeLinkUpdates(raw, updates, now);
    const active = new Set(result.links.map(link => link.url));
    removed += raw.links.filter(link => !active.has(link.url)).length;
    assert.equal(JSON.stringify(raw), before);
  }
  assert.equal(removed, 24);
});

test('nightly sync verifies source changes and keeps dry-run repairs out of live data', async () => {
  const script = await readFile('scripts/sync-vod-catalog.mjs', 'utf8');
  assert.ok(script.includes('"scripts/refresh-donyaye-links.mjs"'));
  assert.ok(script.includes('path.join(DRY_RUN ? runDir : DATA_DIR, "donyaye-link-updates.json")'));
  assert.ok(script.includes('partial: Boolean(seriesSource?.feedWarning)'));
});
