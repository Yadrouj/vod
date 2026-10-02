import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MagazineInline } from '../../components/magazine-inline';

const render = (text: string) => renderToStaticMarkup(React.createElement(MagazineInline, { text }));
test('editorial inline links preserve Persian labels, hashes and quality queries', () => {
  const html = render('برای [پخش همزمان](/watch/tt0903747?season=1&episode=2&together=1) و [دانلود](/tt0903747#downloads).');
  assert.match(html, /href="\/watch\/tt0903747\?season=1&amp;episode=2&amp;together=1"/);
  assert.match(html, /href="\/tt0903747#downloads"/);
  assert.ok(!html.includes('[پخش همزمان]'));
});
test('only the actual Telegram bot becomes an external editorial link', () => {
  const html = render('[بات](https://t.me/Sarvnema_bot) [other](https://example.com)');
  assert.match(html, /rel="noopener noreferrer"/);
  assert.equal((html.match(/<a /g) ?? []).length, 1);
});
test('raw HTML and malformed or redirect-like destinations stay inert text', () => {
  const html = render('<script>alert(1)</script> [bad](javascript:alert) [host](//evil.test) [slash](/\\evil.test)');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<a '));
  assert.ok(html.includes('&lt;script&gt;'));
});
