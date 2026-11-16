import assert from 'node:assert/strict';
import test from 'node:test';
import { ARTIST_PAGE, buildBundle, checkAudio, parseArtistPage, parseReleasePage, publicAudioUrl } from '../import-tiarin-susan-roshan.mjs';

const page = 'https://tiarin.ir/album/17873/';
const audio = 'https://dl.tiarin.ir/FRE/2025/2/Susan%20Roshan//01%20Tange%20Ghoroob.mp3';
const cover = 'https://tiarin.ir/wp-content/uploads/2025/02/Hamkelasi-Susan-Roshan.jpg';
const release = { url: page, publishedAt: '2000-09-01T00:00:00.000Z' };
const item = (overrides = '', source = audio, performer = 'Susan Roshan') => `<li data-title="Tange Ghoroob" data-artist="${performer}" data-image="${cover}" data-album="Hamkelasi - Persian Music" ${overrides}><span data-type="audio/mpeg" data-src="${source}"></span></li>`;
const html = items => `<title>آلبوم موسیقی همکلاسی از سوزان روشن (Susan Roshan) تیارین</title>${items}`;

test('artist crawl is restricted to exact artist cards and bounded same-artist pagination', () => {
  const card = performer => `<article><a href="${page}">Album</a><li class="index-ar">${performer}</li><li>8 Tracks - 2000-9-1</li></article>`;
  const result = parseArtistPage(card('Susan Roshan') + card('سوسن') + '<a rel="next" href="https://tiarin.ir/artist/susan-roshan/page/2/">Next</a>');
  assert.deepEqual(result.releases, [release]);
  assert.equal(result.nextPage, `${ARTIST_PAGE}page/2/`);
  assert.equal(parseArtistPage('<a rel="next" href="https://other.test/page/2/">Next</a>').nextPage, null);
  assert.equal(parseArtistPage(card('سوسن')).releases.length, 0);
});

test('public player sources are deduplicated, original double slashes are retained, VIP and other singers are excluded', () => {
  const candidates = parseReleasePage(html(item() + item() + item('data-prem="1"') + item('', 'https://tiarin.ir/vip-dl/?filename=song.mp3') + item('', audio, 'سوسن')), release);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].audio, audio);
  assert.equal(candidates[0].title, 'Tange Ghoroob');
  assert.equal(candidates[0].persianTitle, 'تنگ غروب');
  assert.equal(candidates[0].albumTitle, 'همکلاسی');
  assert.equal(candidates[0].publishedAt, release.publishedAt);
  for (const url of ['http://dl.tiarin.ir/FRE/song.mp3', 'https://dl.tiarin.ir/VIP/song.mp3', 'https://dl.tiarin.ir/FRE/song.mp3?token=x', 'https://dl.tiarin.ir.evil.test/FRE/song.mp3', 'https://user:pass@dl.tiarin.ir/FRE/song.mp3']) assert.equal(publicAudioUrl(url), null);
});

test('audio checks need actual MP3 bytes, not an HTML login page or a successful HEAD', async () => {
  let cancelled = false;
  const fetcher = async (url, options) => {
    assert.equal(url, audio);
    assert.equal(options.headers.Range, 'bytes=0-1023');
    assert.equal(options.redirect, 'error');
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([73, 68, 51, 3])); }, cancel() { cancelled = true; } }), { status: 206, headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': 'bytes 0-3/9999' } });
  };
  assert.equal((await checkAudio(audio, fetcher)).available, true);
  assert.ok(cancelled);
  assert.equal((await checkAudio(audio, async () => new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }))).available, false);
  assert.equal((await checkAudio(audio, async () => new Response('not audio', { headers: { 'Content-Type': 'audio/mpeg' } }))).available, false);
  assert.equal((await checkAudio(audio, async () => { throw new Error('offline'); })).available, false);
  await checkAudio('https://tiarin.ir/vip-dl/?filename=song.mp3', async () => assert.fail('Must not request a private endpoint'));
});

test('reruns preserve existing artist and song IDs, arrival dates and exact artist identities', () => {
  const candidates = parseReleasePage(html(item()), release);
  const observedAt = '2026-11-16T00:00:00.000Z';
  const profile = { name: 'سوزان روشن', slug: 'سوزان-روشن', aliases: [], trackIds: ['canonical'], categories: ['پاپ'] };
  const existing = { id: 'canonical', artist: profile, artists: [profile], title: 'Tange Ghoroob', persianTitle: 'تنگ غروب', addedAt: '2025-01-01T00:00:00.000Z', sources: [] };
  const archive = { artists: [profile], tracks: [existing] };
  const result = buildBundle(candidates, archive, { tracks: [] }, observedAt);
  assert.equal(result.tracks[0].id, 'canonical');
  assert.equal(result.tracks[0].artist.slug, profile.slug);
  assert.equal(result.tracks[0].addedAt, existing.addedAt);
  assert.deepEqual(result.newTrackIds, []);
  assert.ok(result.artists[0].aliases.includes('susan-roshan'));
  const empty = { tracks: [], artists: [] };
  const first = buildBundle(candidates, empty, { tracks: [] }, observedAt);
  const second = buildBundle(candidates, empty, first, '2026-11-17T00:00:00.000Z');
  assert.equal(second.tracks[0].id, first.tracks[0].id);
  assert.equal(second.tracks[0].addedAt, first.tracks[0].addedAt);
  const namesake = { ...profile, name: 'سوسن', slug: 'سوسن', aliases: ['susan'] };
  assert.notEqual(buildBundle(candidates, { artists: [namesake], tracks: [{ ...existing, artist: namesake, artists: [namesake] }] }, { tracks: [] }, observedAt).tracks[0].id, 'canonical');
});
