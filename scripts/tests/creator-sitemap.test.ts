import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sitemapPartCount,sitemapEntriesForPart,SITEMAP_LIMIT} from '../../lib/site-sitemap';
import {SITE_URL} from '../../lib/seo';
import type {CreatorProfiles} from '../../lib/creator-profile-types';

test('the main sitemap includes both hubs and all 200 canonical creator profiles, including zero-track singers',{timeout:180000},async()=>{
  const data=JSON.parse(readFileSync('public/data/creator-profiles.json','utf8')) as CreatorProfiles;
  const expected=new Set([
    `${SITE_URL}/people/directors`,`${SITE_URL}/music/artists/top-100`,
    ...data.directors.map(profile=>`${SITE_URL}/person/${profile.id}`),
    ...data.singers.map(profile=>`${SITE_URL}/music/artists/${encodeURIComponent(profile.slug)}`),
  ]);
  assert.equal(expected.size,202);
  const count=await sitemapPartCount();assert.ok(count>0 && count<20);
  const allUrls = new Set<string>();
  for(let part=0;part<count;part++){
    const entries=await sitemapEntriesForPart(part);assert.ok(entries.length<=SITEMAP_LIMIT);
    assert.ok(entries.length > 0, 'index cannot advertise an empty part');
    for(const entry of entries) {
      assert.ok(!allUrls.has(entry.url), 'parts must not overlap');
      assert.ok(!new URL(entry.url).pathname.startsWith('/mag'), 'magazine is independently indexed');
      allUrls.add(entry.url);
      for (const image of entry.images || []) {
        const parsed = new URL(image);
        assert.ok(['http:', 'https:'].includes(parsed.protocol), 'images must be absolute HTTP URLs');
      }
      if (entry.lastModified) assert.ok(new Date(entry.lastModified).getUTCFullYear() >= 1970);
      expected.delete(entry.url);
    }
  }
  assert.equal(count, Math.ceil(allUrls.size / SITEMAP_LIMIT));
  assert.deepEqual(await sitemapEntriesForPart(count), []);
  assert.deepEqual(await sitemapEntriesForPart(-1), []);
  assert.deepEqual([...expected],[]);
});
