import assert from 'node:assert/strict';
import test from 'node:test';
import { profileUpdateUnchanged, searchBotProfile } from '../telegram-search-profile.mjs';

test('unchanged channel metadata is idempotent, not a false permission failure', () => {
  for (const [method, field] of [['setChatTitle', 'title'], ['setChatDescription', 'description']]) {
    assert.equal(profileUpdateUnchanged(method, { error_code: 400, description: `Bad Request: chat ${field} is not modified` }), true);
  }
  assert.equal(profileUpdateUnchanged('sendMessage', { error_code: 400, description: 'Bad Request: chat description is not modified' }), false);
  assert.equal(profileUpdateUnchanged('setChatTitle', { error_code: 400, description: 'Bad Request: not enough rights' }), false);
  assert.equal(profileUpdateUnchanged('setChatDescription', { error_code: 429, description: 'Too Many Requests' }), false);
});

test('search branding includes actual inventory within Telegram limits', () => {
  const profile = searchBotProfile({ totals: { titles: 43000, movies: 39000, series: 4000 } }, { totals: { tracks: 156683 } });
  assert.ok(profile.name.length <= 64);
  assert.ok(profile.short_description.length <= 120);
  assert.ok(profile.description.length <= 512);
  assert.ok(profile.channelDescription.length <= 255);
  assert.match(profile.description, /۱۵۶٬۶۸۳/);
  assert.match(profile.intro, /موتور جستجوی/);
});
