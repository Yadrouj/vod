import assert from 'node:assert/strict';
import test from 'node:test';
import { countryAliases, countryName } from '../../lib/country-discovery';

test('SSR country choices use pinned catalog names across different ICU versions', () => {
  const original = Intl.DisplayNames.prototype.of;
  Intl.DisplayNames.prototype.of = function (code: string) {
    if (code === 'KR') return 'Korea';
    if (code === 'TR') return 'Türkiye';
    return original.call(this, code);
  };
  try {
    assert.equal(countryName('KR', 'en'), 'South Korea');
    assert.equal(countryName('KR', 'fa'), 'کره جنوبی');
    assert.equal(countryName('TR', 'en'), 'Turkey');
    assert.equal(countryName('CZ', 'en'), 'Czech Republic');
    assert.ok(countryAliases('KR').includes('south korea'));
  } finally { Intl.DisplayNames.prototype.of = original; }
});
