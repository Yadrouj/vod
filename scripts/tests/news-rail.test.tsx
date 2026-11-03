import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewsRail } from '../../components/news-rail';
test('landing shows ten dated news cards and links to the magazine news and box office sections', () => {
  const items = Array.from({ length: 11 }, (_, index) => ({ id: String(index), title: `خبر ${index}`, summary: 'خلاصه', source: 'خبرگزاری', url: `https://example.com/news/${index}`, publishedAt: '2026-11-03T07:00:00Z', category: 'release' as const, tags: [] }));
  const html = renderToStaticMarkup(<NewsRail items={items} daily={{ day: '2026-11-03', count: 10, goal: 10, state: 'complete', checkedAt: '2026-11-03T08:00:00Z' }} locale="fa" />);
  assert.equal((html.match(/news-card news-card-/g) ?? []).length, 10);
  assert.ok(html.includes('/mag#daily-news')); assert.ok(html.includes('/mag#iran-box-office'));
  assert.ok(!html.includes('<table')); assert.ok(html.includes('انتخاب روزانه'));
});
