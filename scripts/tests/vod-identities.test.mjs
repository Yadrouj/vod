import assert from 'node:assert/strict';
import test from 'node:test';
import { compatibleVodIdentity, createVodIdentityRegistry, dedupeVodCards, mergeVodDuplicateItems, planVodIdentities, vodIdentityDescriptor, vodIdentityEvidence } from '../../lib/vod-identity.mjs';

const page = 'https://publisher.test/show/east-of-eden/';
const file = (name, extra = {}) => ({ url: `https://cdn.test/${name}.mkv`, group: 'SoftSub', quality: '720p', season: 1, episode: 1, sourceProvider: 'publisher', ...extra });
const item = (id, changes = {}) => ({ id, imdbCode: id, title: 'East of Eden', originalTitle: null, type: 'tvSeries', year: 2026,
  sourcePageUrl: page, links: [], groups: [], qualities: [], genres: [], countries: [], languages: [], ...changes });
const describe = vodIdentityDescriptor;
const plan = items => planVodIdentities(items.map(describe));

test('same title is never sufficient: distinguish years, films/series, different IMDb/TMDB IDs and generic source pages', () => {
  const base = item('f2my-east', { sourcePageUrl: 'https://publisher.test/a' });
  assert.equal(vodIdentityEvidence(describe(base), describe(item('familymovie-east', { sourcePageUrl: 'https://publisher.test/b' }))), null);
  for (const changes of [{ type: 'movie' }, { year: 1955 }, { year: null }]) assert.equal(vodIdentityEvidence(describe(base), describe(item('other', changes))), null);
  assert.equal(vodIdentityEvidence(describe(item('tt1234567')), describe(item('tt7654321'))), null);
  assert.equal(vodIdentityEvidence(describe(item('tt1234567')), describe(item('familymovie-east', { imdbUrl: 'https://www.imdb.com/title/tt7654321/' }))), null);
  assert.equal(vodIdentityEvidence(describe(item('tt1234567', { imdbUrl: 'https://www.imdb.com/title/tt7654321/' })), describe(item('familymovie-east'))), null);
  assert.equal(vodIdentityEvidence(describe(item('one', { tmdbId: 1, tmdbType: 'tv' })), describe(item('two', { tmdbId: 2, tmdbType: 'tv' }))), null);
  assert.equal(vodIdentityEvidence(describe(item('one', { tmdbId: 1 })), describe(item('two', { tmdbId: 2 }))), null);
  for (const sourcePageUrl of ['https://publisher.test/', 'https://publisher.test/category/series/', 'https://publisher.test/donyaye_serial_all_archive.html']) {
    assert.equal(vodIdentityEvidence(describe(item('one', { sourcePageUrl })), describe(item('two', { sourcePageUrl }))), null);
  }
  assert.equal(vodIdentityEvidence(describe(item('one', { sourcePageUrl: 'https://familymovie.tr/?movie=one' })), describe(item('two', { sourcePageUrl: 'https://familymovie.tr/?movie=two' }))), null);
});

test('publisher evidence unifies a translated/original title without merging the 1955 movie', () => {
  const rich = item('f2my-east', { links: [file('a'), file('b')] });
  const partial = item('familymovie-east', { title: 'شرق بهشت', originalTitle: 'East of Eden', links: [file('a')] });
  const result = plan([rich, partial, item('tt0048028', { type: 'movie', year: 1955 })]);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].canonicalId, rich.id);
  assert.equal(result.groups[0].linksCount, 2);
  assert.equal(result.groups[0].evidence[0].kind, 'publisher-page');
  const registry = createVodIdentityRegistry(result);
  assert.equal(registry.canonicalId(partial.id), rich.id);
  assert.equal(registry.canonicalId('tt0048028'), 'tt0048028');
});

test('a shared exact episode file is proof, but trailers and differing opaque query parameters are not', () => {
  const a = item('a', { sourcePageUrl: null, links: [file('episode')] });
  const b = item('b', { sourcePageUrl: null, links: [file('episode')] });
  assert.equal(vodIdentityEvidence(describe(a), describe(b)).kind, 'exact-media');
  assert.equal(vodIdentityEvidence(describe({ ...a, links: [file('trailer', { mediaKind: 'trailer' })] }), describe({ ...b, links: [file('trailer', { mediaKind: 'trailer' })] })), null);
  assert.equal(vodIdentityEvidence(describe({ ...a, links: [file('x', { url: 'https://cdn.test/x.mkv?version=1' })] }), describe({ ...b, links: [file('x', { url: 'https://cdn.test/x.mkv?version=2' })] })), null);
});

test('an unidentified bridge cannot collapse two conflicting IMDb identities', () => {
  const result = plan([item('tt1234567'), item('unidentified'), item('tt7654321')]);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].memberIds.length, 2);
  assert.ok(!result.groups[0].memberIds.includes('tt7654321'));
  assert.equal(compatibleVodIdentity(describe(item('tt1234567')), describe(item('tt7654321'))), false);
});

test('IMDb wins over link count, otherwise preserve a previously published canonical ID', () => {
  const records = [item('f2my-east', { links: [file('a'), file('b')] }), item('familymovie-east')];
  const first = plan(records);
  const next = planVodIdentities([...records.map(describe), describe(item('familymovie-east', { links: Array.from({ length: 10 }, (_, index) => file(`more-${index}`)) }))], first);
  assert.equal(next.groups[0].canonicalId, 'f2my-east');
  const upgraded = planVodIdentities([...records.map(describe), describe(item('tt1234567'))], first);
  assert.equal(upgraded.groups[0].canonicalId, 'tt1234567');
});

test('merge retains every quality, episode, subtitle and provenance without mutating inputs', () => {
  const main = item('f2my-east', { persianTitle: 'شرق بهشت', persianOverview: 'دانلود فیلم دانلود فیلم دانلود سریال',
    links: [file('episode', { subtitles: [{ url: 'https://cdn.test/fa.vtt', language: 'fa' }] })] });
  const donor = item('familymovie-east', { persianOverview: 'داستان دو خانواده در کالیفرنیا.', sourcePageUrl: 'https://other.test/east',
    links: [file('episode', { subtitleUrl: 'https://cdn.test/en.vtt', subtitles: [{ url: 'https://cdn.test/en.vtt', language: 'en' }] }), file('ep2', { episode: 2, quality: '1080p', group: 'Dubbed' })],
    unavailableDownloadLinks: [{ url: 'https://cdn.test/rejected.mkv' }], sourceLinkHistory: [{ url: 'https://cdn.test/old.mkv' }] });
  const before = structuredClone([main, donor]);
  const merged = mergeVodDuplicateItems(main, donor);
  assert.equal(merged.id, main.id);
  assert.equal(merged.links.length, 2);
  assert.equal(merged.links[0].subtitles.length, 2);
  assert.equal(merged.links[0].subtitleUrl, donor.links[0].subtitleUrl);
  assert.equal(merged.persianOverview, donor.persianOverview);
  assert.ok(merged.curatedSourcePages.includes(donor.sourcePageUrl));
  assert.ok(merged.qualities.includes('1080p'));
  assert.equal(merged.unavailableDownloadLinks.length, 1);
  assert.equal(merged.sourceLinkHistory.length, 1);
  assert.deepEqual([main, donor], before);
});

test('only known rotating FamilyMovie signatures collapse, and the later expiry wins', () => {
  const signed = expiry => file('episode', { sourceProvider: 'familymovie', url: `https://cdn.test/x.mkv?md5=token-${expiry}&expires=${expiry}` });
  const merged = mergeVodDuplicateItems(item('a', { links: [signed(1)] }), item('b', { links: [signed(9999999999)] }));
  assert.equal(merged.links.length, 1);
  assert.match(merged.links[0].url, /9999999999/);
  assert.equal(mergeVodDuplicateItems(merged, item('b', { links: [signed(1)] })).links[0].url, merged.links[0].url);
});

test('a duplicate cannot resurrect an explicitly rejected HTML/404 source', () => {
  const url = 'https://cdn.test/rejected.mkv';
  const base = item('a', { unavailableDownloadLinks: [{ url, verification: { status: 404 } }] });
  assert.equal(mergeVodDuplicateItems(base, item('b', { links: [file('x', { url })] })).links.length, 0);
});

test('same-ID repeated archive records become one card with unioned counts, qualities and stable IDs', () => {
  const a = item('tt1234567', { links: [file('one')], qualities: ['720p'] });
  const b = item('tt1234567', { links: [file('two')], qualities: ['1080p'] });
  const registry = createVodIdentityRegistry(plan([a, b]));
  const cards = [a, b].map(record => ({ ...record, linksCount: record.links.length }));
  const result = dedupeVodCards(cards, registry);
  assert.equal(result.length, 1);
  assert.equal(result[0].linksCount, 2);
  assert.deepEqual(new Set(result[0].qualities), new Set(['720p', '1080p']));
  assert.deepEqual(dedupeVodCards(result, registry), result);
  assert.equal('links' in result[0], true, 'helper preserves its input shape; index producers supply compact cards');
});
