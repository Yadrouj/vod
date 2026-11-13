import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorldBoxOffice } from '../lib/world-box-office.mjs';
const row = (rank, amount) => `<tr><td>${rank}</td><td><a href="/releasegroup/gr${rank}/">Film ${rank}</a></td><td>$${amount}</td><td>-</td><td>-</td><td>$${amount}</td><td>100%</td></tr>`;
const chart = `<h1>2026 Worldwide Box Office</h1>${[1, 2, 3, 4, 5].map(rank => row(rank, 1000 - rank)).join('')}`;
test('worldwide amounts retain currency, metric and unknown domestic figures', () => {
  const report = parseWorldBoxOffice(chart, 2026, '2026-11-13T00:00:00Z');
  assert.equal(report.films.length, 5);
  assert.equal(report.currency, 'USD');
  assert.equal(report.films[0].domesticUsd, null);
  assert.equal(report.films[0].worldwideUsd, 999);
  assert.equal(report.observedAt, '2026-11-13T00:00:00Z');
});
test('wrong year, incomplete tables and changed ranking fail closed', () => {
  assert.throws(() => parseWorldBoxOffice(chart, 2025));
  assert.throws(() => parseWorldBoxOffice('<h1>2026 Worldwide Box Office</h1>', 2026));
  assert.throws(() => parseWorldBoxOffice(chart.replace('$999', '$1'), 2026));
});
