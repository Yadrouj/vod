import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseDailyDraft, parseManuscript, selectMedia, validateArticle, prepareQueue, runBlogAgent } from '../blog-agent.mjs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { enrichEditorial } from '../lib/magazine-editorial.mjs';

test('Tehran publisher publishes one queued article per date with late recovery', () => {
  const drafts = [{ slug: 'first' }, { slug: 'second' }];
  const state = { publishedDates: {}, publishedSlugs: {} };
  assert.equal(chooseDailyDraft(drafts, state, new Date('2026-10-03T05:29:00Z')), null);
  assert.equal(chooseDailyDraft(drafts, state, new Date('2026-10-03T05:30:00Z')).slug, 'first');
  state.publishedDates['2026-10-03'] = 'first'; state.publishedSlugs.first = '2026-10-03T05:30:00Z';
  assert.equal(chooseDailyDraft(drafts, state, new Date('2026-10-03T16:00:00Z')), null);
  assert.equal(chooseDailyDraft(drafts, state, new Date('2026-10-04T16:00:00Z')).slug, 'second');
});

test('incomplete and undersized drafts are rejected instead of being publicly exposed', () => {
  assert.throws(() => parseManuscript('intro\n\n## incomplete'), /complete/);
  assert.throws(() => validateArticle({ slug: 'example', intro: 'short', sections: [], faqs: [], media: [] }), /words/);
});

test('catalog selection excludes unavailable titles and removes SEO spam from summaries', () => {
  const media = selectMedia({ selectors: ['House'] }, { items: [{ title: 'House', imdbCode: 'tt1', linksCount: 1, type: 'series', overview: 'A doctor solves difficult cases.', persianOverview: 'دانلود فیلم دانلود سریال بدون سانسور' }] }, { tracks: [] }, { items: [] }, {});
  assert.equal(media[0].description, 'A doctor solves difficult cases.');
  assert.equal(media[0].together, '/watch/tt1?together=1');
  assert.equal(selectMedia({ selectors: ['Missing'] }, { items: [] }, { tracks: [] }, {}, {}).length, 0);
});

test('all thirty complete original manuscripts have realistic article lengths and distinct headings', async () => {
  const drafts = await prepareQueue();
  assert.equal(drafts.length, 30);
  assert.equal(new Set(drafts.map(d => d.slug)).size, 30);
  for (const draft of drafts) {
    assert.ok(draft.wordCount >= 850 && draft.wordCount <= 1500, draft.slug);
    assert.equal(draft.publishedAt, '');
    assert.ok(draft.sections.length >= 6);
    assert.equal(new Set(draft.sections.map(s => s.title)).size, draft.sections.length);
    assert.ok(draft.sources.every(s => s.url.startsWith('https://')));
    assert.match(draft.sections.at(-1).paragraphs.join(' '), /https:\/\/t\.me\/Sarvnema_bot/);
    assert.ok(draft.libraryLinks.every(l => l.href.startsWith('/') && !l.href.startsWith('//')));
    assert.ok(draft.image.endsWith('-branded.webp'));
  }
});

test('context links use only selected catalog IDs and real nonempty playlists', () => {
  const result = enrichEditorial({ category: 'music', slug: 'focus-chill-music-playlist', selectors: ['music-tags'] }, { intro: 'intro', sections: [{ id: 'one', title: 'one', paragraphs: ['body'] }] }, [{ title: 'آهنگ', detail: '/music/known', play: '/music/known', download: '/music/known#downloads', together: '/music/known?together=1' }], { playlists: [{ id: 'chill-real', title: 'Chill', scope: 'tags', trackIds: ['known'] }, { id: 'empty', title: 'Chill', scope: 'tags', trackIds: [] }] });
  assert.ok(result.libraryLinks.some(l => l.href === '/music/collections/chill-real'));
  assert.ok(!result.libraryLinks.some(l => l.href.includes('empty')));
  assert.match(result.sections[0].paragraphs.join(' '), /\[آهنگ\]\(\/music\/known\)/);
});

test('explicit revisions preserve original dates, do not publish the next draft and are idempotent', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-revision-'));
  const options = { stateDir: path.join(root, 'state'), dataDir: path.join(root, 'data'), publish: true, indexing: false };
  const file = path.join(options.dataDir, 'magazine.json');
  try {
    await runBlogAgent({ ...options, bootstrap: true, now: new Date('2026-10-03T00:00:00Z') });
    const original = JSON.parse(await readFile(file, 'utf8'));
    // Simulate an old, published cover.
    original.articles[0].image = '/media/magazine/old.webp';
    const { writeFile } = await import('node:fs/promises');
    await writeFile(file, JSON.stringify(original));
    await runBlogAgent({ ...options, revisePublished: true, now: new Date('2026-10-04T10:00:00Z') });
    const revised = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(revised.articles.length, 1);
    assert.equal(revised.articles[0].publishedAt, original.articles[0].publishedAt);
    assert.equal(revised.articles[0].modifiedAt, '2026-10-04T10:00:00.000Z');
    assert.ok(revised.articles[0].image.endsWith('-branded.webp'));
    const unchanged = await readFile(file, 'utf8');
    await runBlogAgent({ ...options, revisePublished: true, now: new Date('2026-10-04T11:00:00Z') });
    assert.equal(await readFile(file, 'utf8'), unchanged);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('stale trends are never claimed as today’s trends and episode buttons open the exact new episode', () => {
  const now = new Date('2026-10-03T10:00:00Z');
  const title = { imdbCode: 'tt1', title: 'Example', persianTitle: 'دانلود سریال نمونه', type: 'series', linksCount: 2 };
  const vod = { items: [title] };
  const trending = { charts: { series: { observedAt: '2026-09-01T10:00:00Z', items: [{ rank: 1, card: title }] } } };
  assert.deepEqual(selectMedia({ selectors: ['trends'] }, vod, {}, {}, trending, now), []);
  const media = selectMedia({ selectors: ['updates'] }, vod, {}, { items: [{ imdbCode: 'tt1', status: 'available', kind: 'episode', season: 6, episode: 3, eventAt: '2026-10-02T10:00:00Z', qualities: ['720p'] }] }, {}, now);
  assert.equal(media[0].title, 'نمونه');
  assert.equal(media[0].play, '/watch/tt1?season=6&episode=3');
  assert.equal(media[0].together, '/watch/tt1?season=6&episode=3&together=1');
  assert.match(media[0].description, /فصل 6، قسمت 3/);
});

test('bootstrap, restart and catch-up keep exactly one public article per Tehran date', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sarvnema-blog-'));
  const options = { stateDir: path.join(root, 'state'), dataDir: path.join(root, 'data'), publish: true, indexing: false };
  try {
    let result = await runBlogAgent({ ...options, bootstrap: true, now: new Date('2026-10-03T00:00:00Z') });
    assert.equal(result.published, 1);
    result = await runBlogAgent({ ...options, bootstrap: true, now: new Date('2026-10-03T10:00:00Z') });
    assert.equal(result.published, 1);
    // Simulate private checkpoint loss; the public snapshot is authoritative.
    await rm(options.stateDir, { recursive: true, force: true });
    result = await runBlogAgent({ ...options, now: new Date('2026-10-03T13:00:00Z') });
    assert.equal(result.published, 1);
    result = await runBlogAgent({ ...options, now: new Date('2026-10-04T10:00:00Z') });
    assert.equal(result.published, 2);
    const index = JSON.parse(await readFile(path.join(options.dataDir, 'magazine.json'), 'utf8'));
    assert.equal(index.articles.length, 2);
    assert.ok(index.articles.every(a => !('manuscript' in a) && !('selectors' in a) && a.publishedAt));
    result = await runBlogAgent({ ...options, validate: true, now: new Date('2026-10-05T10:00:00Z') });
    assert.equal(result.published, 2, 'validate never publishes, even when publish was requested');
  } finally { await rm(root, { recursive: true, force: true }); }
});
