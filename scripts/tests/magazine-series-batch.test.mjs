import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { seriesBatchOne } from '../../content/magazine/dossiers/series-batch-one.mjs';
import { parseManuscript, countWords } from '../blog-agent.mjs';

test('all ten manuscripts have 3000 prose words independently of generated panels and headings', async () => {
  const articles = JSON.parse(await readFile('public/data/magazine-dossiers.json', 'utf8')).articles;
  assert.equal(Object.keys(seriesBatchOne).length, 10);
  for (const slug of Object.keys(seriesBatchOne)) {
    const manuscript = parseManuscript(await readFile(`content/magazine/dossiers/reviews/${slug.slice(7)}.md`, 'utf8'));
    const rawText = [manuscript.intro, ...manuscript.sections.flatMap(row => row.paragraphs)].join(' ');
    const text = rawText.replace(/\[([^\]]+)\]\([^\s)]+\)/gu, '$1');
    assert.ok(countWords(text) >= 3000, slug);
    assert.ok(manuscript.sections.some(row => row.title.startsWith('[spoiler] ')), slug);
    const article = articles.find(row => row.slug === slug);
    assert.ok(article.seriesGuide?.cast.length >= 3, slug);
    assert.ok(article.seriesGuide.episodes.length && article.seriesGuide.ratedCount > 0, slug);
    const sources = new Set(article.sources.map(source => source.url));
    for (const row of article.seriesGuide.episodes) {
      assert.ok(row.rating === null || (Number.isFinite(row.rating) && row.rating >= 1 && row.rating <= 10));
      assert.ok(sources.has(row.sourceUrl), `${slug}: missing rating citation`);
    }
    for (const match of rawText.matchAll(/\]\((https:\/\/[^\s)]+)\)/gu)) assert.ok(sources.has(match[1]), `${slug}: unregistered external link`);
  }
});

test('unverified episode scores stay null rather than inheriting the series rating', async () => {
  const articles = JSON.parse(await readFile('public/data/magazine-dossiers.json', 'utf8')).articles;
  const guide = articles.find(article => article.slug === 'review-mobland').seriesGuide;
  assert.equal(guide.episodes.find(row => row.season === 2 && row.episode === 10).rating, null);
});
