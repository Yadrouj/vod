import assert from 'node:assert/strict';
import test from 'node:test';
import { artistMetadata, titleMetadata, vodJsonLd, vodMetadata } from '../../lib/seo';
import { artistFaqs, musicFaqs, personIntroduction, personMetadata, personJsonLd, vodFaqs } from '../../lib/entity-seo';
import { personIdentity } from '../../lib/person-names';
import { CATALOG_HUBS, hubForBrowse, PRIMARY_SECTIONS } from '../../lib/site-navigation';
import robots from '../../app/robots';
import { siteJsonLd } from '../../lib/landing-seo';
import { HTML_METADATA_BOTS } from '../../lib/crawler-policy';
import type { MusicArtist, MusicTrack } from '../../lib/music-types';
import type { VodItem, VodPerson } from '../../lib/types';

const movie: VodItem = { id: 'tt5491994', imdbCode: 'tt5491994', title: 'Planet Earth II', persianTitle: 'دانلود', type: 'series',
  year: 2016, imdbUrl: null, imdbRating: 9.4, imdbVotes: 1000, groups: [], qualities: [], links: [], posterUrl: '/poster.jpg',
  persianOverview: 'مستندی دربارهٔ حیات وحش و زیستگاه‌های زمین.' };
const person: VodPerson = { id: 'nm0000134', name: 'Robert De Niro', categories: ['Stars', 'Director'], imageUrl: null, items: [] };
const artist: MusicArtist = { name: 'ابی', slug: 'ebi', sourceUrl: '', trackIds: [], categories: [], coverUrl: null };
const track = { id: 'test', title: 'Song', persianTitle: 'آهنگ نمونه', artists: [artist], kind: 'track', sources: [], category: 'پاپ' } as unknown as MusicTrack;

test('actor identity is sourced, bilingual and never invents missing Persian names', () => {
  assert.equal(personIdentity(person).nameFa, 'رابرت دنیرو');
  assert.match(String(personMetadata(person).title), /رابرت دنیرو.*Robert De Niro/);
  assert.match(personIntroduction(person), /بازیگر/);
  assert.equal(personIdentity({ id: 'missing', name: 'Unknown Person' }).nameFa, 'Unknown Person');
  const graph = personJsonLd(person)['@graph'][0];
  assert.equal(graph['@type'], 'ProfilePage');
});
test('film metadata rejects generic provider labels and includes both names, year and kind', () => {
  const metadata = vodMetadata(movie);
  assert.match(String(metadata.title), /سیاره زمین ۲.*Planet Earth II.*2016/);
  assert.doesNotMatch(String(metadata.title), /دانلود/);
  assert.equal(metadata.alternates?.canonical, 'https://sarvnema.ir/tt5491994');
  assert.match(String(metadata.description), /مستندی/);
  const entity = vodJsonLd(movie)['@graph'][0] as Record<string, unknown>;
  assert.equal(entity.name, 'سیاره زمین ۲');
  assert.deepEqual(entity.image, ['https://sarvnema.ir/poster.jpg']);
});
test('FAQ availability is truthful for missing releases, archive seasons and copyright restrictions', () => {
  assert.match(vodFaqs(movie).map(f => f.answer).join(' '), /هنوز لینک فایل مستقیمی/);
  const released = { ...movie, links: [{ url: 'https://example.com/episode.mp4', season: 1, episode: 1, quality: '720p' }] } as VodItem;
  assert.match(vodFaqs(released).map(f => f.answer).join(' '), /۷۲۰|720/);
  const restricted = { ...released, id: 'tt33184638', imdbCode: 'tt33184638', title: 'Paris Has Fallen' };
  assert.match(vodFaqs(restricted).map(f => f.answer).join(' '), /حق نشر/);
  assert.equal((vodJsonLd(restricted)['@graph'][0] as Record<string, unknown>).potentialAction, undefined);
  assert.equal(artistFaqs(artist, 0)[0].answer.includes('۰'), true);
  assert.match(musicFaqs(track)[1].answer, /در دسترس/);
});
test('musician titles have verified original names and unavailable artists do not promise files', () => {
  const metadata = artistMetadata(artist, 12, 'Ebi');
  assert.match(String(metadata.title), /ابی.*Ebi.*آهنگ/);
  assert.match(String(artistMetadata(artist, 0, 'Ebi').description), /هنوز/);
  assert.deepEqual(titleMetadata({ title: 'سرونما | موتور جستجو', description: 'دربارهٔ سایت', pathname: '/' }).title, { absolute: 'سرونما | موتور جستجو' });
});
test('header, schema and clean category canonical targets stay aligned', () => {
  assert.equal(hubForBrowse({ type: 'series' })?.href, '/series');
  assert.equal(hubForBrowse({ q: 'house', type: 'series' }), undefined);
  assert.equal(hubForBrowse({ section: 'animation' })?.href, '/animation');
  assert.equal(new Set(Object.values(CATALOG_HUBS).map(h => h.href)).size, 5);
  const schema = siteJsonLd()['@graph'].find(node => node['@type'] === 'SiteNavigationElement');
  assert.deepEqual(schema?.name, PRIMARY_SECTIONS.map(item => item.label));
  assert.ok(PRIMARY_SECTIONS.every(item => item.href.startsWith('/') && !item.href.includes('?')));
});
test('AI search crawler groups never accidentally bypass private route exclusions', () => {
  const rules = robots().rules;
  assert.ok(Array.isArray(rules));
  for (const rule of rules) {
    assert.ok(rule.disallow?.includes('/api/'));
    assert.ok(rule.disallow?.includes('/admin/'));
  }
});
test('AI metadata blocking preserves social previews without slowing ordinary browser streaming', () => {
  for (const agent of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'PerplexityBot', 'Twitterbot', 'Slackbot', 'Bingbot', 'Mediapartners-Google']) assert.ok(HTML_METADATA_BOTS.test(agent), agent);
  assert.equal(HTML_METADATA_BOTS.test('Mozilla/5.0 Chrome/142 Safari/537.36'), false);
});
