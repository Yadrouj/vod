import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyNews, newsDay } from '../lib/daily-news.mjs';
const now = Date.parse('2026-11-03T02:00:00Z');
const items = (prefix, count = 20, publishedAt = '2026-11-02T12:00:00Z') => Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}`, title: `خبر سینما ${prefix} ${i}`, url: `https://example.com/${prefix}/${i}`, publishedAt }));
test('ten dated new headlines per Tehran day; rerunning does not replace or duplicate the batch', () => {
  const first = buildDailyNews(items('a'), {}, now);
  assert.equal(first.daily.count, 10); assert.equal(first.daily.state, 'complete');
  assert.equal(first.items.length, 10);
  const retry = buildDailyNews([...items('b'), ...items('a')], first, now + 3600000);
  assert.deepEqual(retry.items, first.items); assert.equal(retry.history.length, 1);
  assert.equal(first.items[0].publishedAt, '2026-11-02T12:00:00Z');
});
test('next day excludes previous headlines even through another feed URL', () => {
  const first = buildDailyNews(items('a'), {}, now);
  const mirrored = first.items.map(item => ({ ...item, url: `${item.url}/mirror` }));
  const next = buildDailyNews([...mirrored, ...items('b')], first, now + 86400000);
  assert.equal(next.daily.count, 10); assert.ok(next.history[0].items.every(item => item.id.startsWith('b')));
  assert.equal(next.history.length, 2);
});
test('short batches are explicit and can be topped up, never padded with stale or future news', () => {
  const first = buildDailyNews([...items('a', 3), ...items('old', 10, '2025-01-01'), ...items('future', 10, '2027-01-01')], {}, now);
  assert.equal(first.daily.state, 'partial'); assert.equal(first.daily.count, 3);
  const next = buildDailyNews(items('b'), first, now + 1000);
  assert.equal(next.daily.count, 10); assert.deepEqual(next.items.slice(0, 3), first.items);
});
test('calendar rollover uses Tehran rather than UTC; migration does not reannounce old landing links', () => {
  assert.equal(newsDay(Date.parse('2026-11-02T21:00:00Z')), '2026-11-03');
  const prior = { items: items('a', 5) };
  const result = buildDailyNews([...items('a', 5), ...items('b')], prior, now);
  assert.ok(result.history[0].items.every(item => item.id.startsWith('b')));
});
