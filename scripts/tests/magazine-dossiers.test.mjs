import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { reviewSelections } from '../../content/magazine/dossiers/review-selections.mjs';
import { biographySelections } from '../../content/magazine/dossiers/biography-selections.mjs';
import { biographyInsights } from '../../content/magazine/dossiers/biography-insights.mjs';
import { validateDossier } from '../build-magazine-dossiers.mjs';

const index = JSON.parse(await readFile('public/data/magazine-dossiers.json', 'utf8'));
const original = JSON.parse(await readFile('public/data/magazine.json', 'utf8'));

test('sixty distinct complete dossiers preserve the existing thirty-article magazine', async () => {
  assert.equal(index.articles.length, 60);
  assert.equal(original.articles.length, 30);
  assert.equal(reviewSelections.length, 30);
  assert.equal(biographySelections.length, 30);
  assert.equal(Object.keys(biographyInsights).length, 30);
  assert.equal(new Set([...original.articles, ...index.articles].map(a => a.slug)).size, 90);
  assert.equal(new Set(index.articles.map(a => a.image)).size, 60, 'Each subject has a distinct real cover');
  for (const a of index.articles) {
    assert.deepEqual(validateDossier(a), a, a.slug);
    assert.ok(a.seriesGuide ? a.wordCount >= 3000 : a.wordCount >= 850 && a.wordCount <= 1500, a.slug);
    assert.ok(a.readingMinutes >= 5);
    assert.ok(Date.parse(a.publishedAt) <= Date.now());
    assert.equal(a.faqs.length, 2);
    assert.ok(/^https:\/\//.test(a.image) || /^\/media\/moviesho\/tt\d+\/[^/]+\.jpg$/.test(a.image), 'Real archive cover, including existing mirrored stills');
    if (a.image.startsWith('/')) await access(`public${a.image}`);
    assert.ok(a.sources.every(s => /^https:\/\//.test(s.url)));
    assert.ok(a.relatedSlugs.every(slug => slug !== a.slug && index.articles.some(b => b.slug === slug)));
    assert.ok(a.libraryLinks.every(l => l.href.startsWith('/') && !l.href.startsWith('//')));
    assert.ok(!JSON.stringify(a).includes('undefined'));
  }
});

test('reviews use high-rated recent archive identities and explicitly optional spoilers', () => {
  const reviews = index.articles.filter(a => a.category === 'reviews');
  assert.equal(reviews.length, 30);
  assert.equal(reviews.filter(a => a.media[0].kind === 'series').length, 15);
  for (const a of reviews) {
    assert.equal(a.dossier.kind, 'review');
    assert.ok(a.dossier.rating >= 7.5 && a.dossier.votes > 10000);
    assert.ok(a.media[0].year >= 2025);
    assert.equal(a.media[0].id, a.dossier.subjectId);
    assert.equal(a.media[0].play, `/watch/${a.dossier.subjectId}`);
    assert.ok(a.sections.some(s => s.spoiler));
    assert.ok(a.critics.every(c => a.sources.some(s => s.url === c.url) && c.scope && c.name));
    assert.match(a.dossier.selectionNote, /رتبهٔ زندهٔ MovieMeter نیست/);
    assert.ok(!a.description.includes('[spoiler]'));
  }
  assert.match(reviews.find(a => a.slug === 'review-pluribus').critics[0].scope, /هفت/);
  assert.match(reviews.find(a => a.slug === 'review-when-life-gives-you-tangerines').critics[0].scope, /چهار/);
});

test('biographies link only real works, and a one-work local profile is not fabricated into a complete filmography', async () => {
  const people = JSON.parse(await readFile('public/data/vod-people.json', 'utf8'));
  const bios = index.articles.filter(a => a.category === 'legends');
  assert.equal(bios.length, 30);
  for (const a of bios) {
    const person = people.people[a.dossier.subjectId];
    assert.ok(person, a.slug);
    assert.ok(a.libraryLinks.some(l => l.href === `/person/${person.id}`));
    assert.equal(new Set(a.filmography.map(w => w.id)).size, a.filmography.length);
    assert.ok(a.filmography.every(w => person.items.some(i => i.imdbCode === w.id)));
    assert.ok(a.media.every(m => a.filmography.some(w => w.id === m.id)));
    assert.ok(a.filmography.every((w, i, all) => !i || (all[i - 1].year ?? 9999) <= (w.year ?? 9999)));
  }
  assert.equal(bios.find(a => a.slug === 'life-leila-hatami').filmography.length, 1);
});

test('publication rejects missing attribution, short prose and missing spoiler controls', () => {
  const a = index.articles.find(a => a.category === 'reviews');
  assert.throws(() => validateDossier({ ...a, critics: [{ ...a.critics[0], url: 'https://unlisted.example/review' }] }), /unattributed/);
  assert.throws(() => validateDossier({ ...a, sections: a.sections.map(s => ({ ...s, spoiler: false })) }), /spoiler/);
  assert.throws(() => validateDossier({ ...a, intro: '', sections: a.sections.map(s => ({ ...s, paragraphs: ['short'] })) }), /words/);
  assert.throws(() => validateDossier({ ...a, sources: [{ title: 'unsafe', url: 'http://example.test' }, ...a.sources] }), /Unsafe/);
});

test('spoiler disclosure hides even its title and excludes the body from search snippets', async () => {
  const source = await readFile('components/magazine-spoiler.tsx', 'utf8');
  const article = await readFile('components/magazine-article.tsx', 'utf8');
  const summary = source.match(/<summary>([\s\S]*?)<\/summary>/)[1];
  assert.ok(!summary.includes('{title}'));
  assert.ok(!/<details[^>]*\sopen[\s=>]/.test(source));
  assert.match(source, /data-nosnippet/);
  assert.match(article, /s\.spoiler \? 'تحلیل داستان · خطر اسپویل' : s\.title/);
  assert.ok(!source.includes('use client'), 'No JS dependency for disclosure');
});
