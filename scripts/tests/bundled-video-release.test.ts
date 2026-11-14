import assert from 'node:assert/strict';
import test from 'node:test';
import { applyVideoReleaseIndex, mergeVideoRelease, type VideoReleaseBundle } from '../../lib/bundled-video-release';
import type { VodCard, VodCatalogIndex, VodItem, VodLink } from '../../lib/types';
import { isAwaitingTitleLinks } from '../../lib/title-availability';

const observedAt = new Date().toISOString();
const link = (url: string, extra = {}): VodLink => ({ url, label: '1080p', quality: '1080p', size: null, release: null, group: 'SoftSub', ...extra });
const item = (id: string, links: VodLink[] = []): VodItem => ({ id, imdbCode: id, imdbUrl: null, title: 'A real film', type: 'movie', year: 2026, imdbVotes: 100, imdbRating: 8, links, groups: [], qualities: [] });
const bundle = (items: VodItem[]): VideoReleaseBundle => ({ observedAt, items, newTitleIds: items.map(item => item.id) });
const card = (id: string): VodCard => ({ id, imdbCode: id, title: 'A real film', type: 'movie', year: 2026, imdbRating: 8, imdbVotes: 100, countries: [], languages: [], genres: [], qualities: [], groups: [], linksCount: 0, posterUrl: null, backdropUrl: null, overview: null, runtimeMinutes: null });

test('bundled refresh keeps every old provider and trusted metadata, adds only matching identity', () => {
  const base = { ...item('tt1234567', [link('https://old.test/film.mkv')]), persianTitle: 'نام معتبر', credits: [{ name_text: 'Actor', category: 'actor' }] };
  const before = structuredClone(base);
  const update = { ...item(base.id, [link('https://new.test/film.mp4')]), imdbRating: 2, persianTitle: 'دانلود', sourcePageUrl: 'https://publisher.test/film/' };
  const result = mergeVideoRelease(base, base.id, bundle([update]))!;
  assert.equal(result.title, base.title); assert.equal(result.imdbRating, 8); assert.equal(result.persianTitle, 'نام معتبر');
  assert.equal(result.links.length, 2); assert.deepEqual(result.credits, base.credits); assert.deepEqual(base, before);
  assert.equal(mergeVideoRelease(base, base.id, bundle([item('tt7654321')])), base);
});

test('new title detail is available without changing the mounted title map', () => {
  const update = item('familymovie-a1', [link('https://publisher.test/new.mp4')]);
  const result = mergeVideoRelease(null, update.id, bundle([update]));
  assert.equal(result?.id, update.id); assert.equal(result?.links.length, 1);
});

test('rotating FamilyMovie signatures refresh one file; newer live signatures always win', () => {
  const signed = (seconds: number) => link(`https://cdn.test/Film.mkv?md5=signature&expires=${seconds}`, { sourceProvider: 'familymovie' });
  const time = Math.floor(Date.now() / 1000);
  const base = item('tt1234567', [signed(time + 3600)]);
  const fresh = item(base.id, [signed(time + 7200)]);
  const updated = mergeVideoRelease(base, base.id, bundle([fresh]))!;
  assert.equal(updated.links.length, 1); assert.equal(updated.links[0].url, fresh.links[0].url);
  assert.equal(mergeVideoRelease(updated, updated.id, bundle([base]))?.links[0].url, fresh.links[0].url);
  assert.equal(mergeVideoRelease(base, base.id, bundle([item(base.id, [signed(time - 60)])]))?.links.length, 1);
});

test('takedowns and explicitly rejected HTML/404 sources cannot be resurrected', () => {
  assert.equal(mergeVideoRelease(null, 'tt33184638', bundle([item('tt33184638', [link('https://cdn.test/banned.mp4')])])), null);
  const base = { ...item('tt1234567'), unavailableDownloadLinks: [{ url: 'https://cdn.test/bad.mp4', verification: { status: 404 } }] };
  assert.equal(mergeVideoRelease(base, base.id, bundle([item(base.id, [link('https://cdn.test/bad.mp4')])]))?.links.length, 0);
});

test('index additions contain compact cards, not thousands of direct links', () => {
  const base = { items: [card('tt1234567')], totalTitles: 1, totalLinks: 0, generatedAt: '2026-01-01', filters: {}, sections: [] } as unknown as VodCatalogIndex;
  const update = item('tt7654321', [link('https://cdn.test/new.mp4')]);
  const result = applyVideoReleaseIndex(base, bundle([update]));
  assert.equal(result.totalTitles, 2); assert.equal(result.items[1].linksCount, 1); assert.equal('links' in result.items[1], false);
  assert.equal(applyVideoReleaseIndex(result, bundle([update])).totalTitles, 2);
  assert.equal(base.items.length, 1);
  assert.equal(applyVideoReleaseIndex(base, bundle([update]), false).totalTitles, 1);
});

test('trailer-only refresh remains coming-soon; full release removes that state', () => {
  const base = { items: [{ ...card('tt1234567'), groups: ['Trailer'], linksCount: 1 }], totalTitles: 1, totalLinks: 1, generatedAt: '2026-01-01', filters: {}, sections: [] } as unknown as VodCatalogIndex;
  const trailer = item('tt1234567', [link('https://cdn.test/trailer.mp4', { mediaKind: 'trailer', group: 'Trailer' })]);
  assert.equal(isAwaitingTitleLinks(applyVideoReleaseIndex(base, bundle([trailer])).items[0]), true);
  const full = item('tt1234567', [link('https://cdn.test/full.mp4')]);
  assert.equal(isAwaitingTitleLinks(applyVideoReleaseIndex(base, bundle([full])).items[0]), false);
});
