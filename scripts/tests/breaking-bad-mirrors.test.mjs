import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseBreakingBadMirrors } from '../refresh-breaking-bad-mirrors.mjs';
import { applyAlternativeSourceUpdates } from '../../lib/alternative-source-links.mjs';

test('publisher season six is season five part two; untrusted hosts are ignored', () => {
  const html = '<div class="dl-season-links"><div class="dl-title-open">فصل ششم زبان دوبله فارسی</div><div class="dl-body"><div class="dl-items"><div class="download-info">قسمت 01</div><a href="https://traffic.upera.tv/1234567-0-720.mp4?ref=test">720</a><a href="https://evil.test/1234567-0-720.mp4">bad</a></div></div></div>';
  const result = parseBreakingBadMirrors(html);
  assert.equal(result.length, 1); assert.equal(result[0].season, 5); assert.equal(result[0].episode, 9);
  assert.equal(result[0].quality, '720p'); assert.equal(result[0].episodeEvidence.sourceSeason, 6);
});

test('all 62 canonical episodes have verified MP4 alternatives in three qualities', async () => {
  const data = JSON.parse(await readFile('lib/data/series-source-links.json', 'utf8'));
  const links = data.items.tt0903747.links;
  assert.equal(links.length, 186);
  assert.equal(new Set(links.map(link => `${link.season}:${link.episode}`)).size, 62);
  assert.equal(Math.max(...links.map(link => link.season)), 5);
  for (const link of links) assert.ok(Number.isFinite(Date.parse(link.verifiedAt)));
  const link = links[0];
  const result = applyAlternativeSourceUpdates({ id: 'tt0903747', links: [{ url: link.url, sourceProvider: 'moviesho', season: null, episode: null }] }, data);
  assert.equal(result.links.filter(item => item.url === link.url).length, 1);
  assert.equal(result.links.find(item => item.url === link.url).episode, 1);
});
