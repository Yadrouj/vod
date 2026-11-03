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
  for(let part=0;part<count;part++){
    const entries=await sitemapEntriesForPart(part);assert.ok(entries.length<=SITEMAP_LIMIT);
    for(const entry of entries) expected.delete(entry.url);
  }
  assert.deepEqual([...expected],[]);
});
