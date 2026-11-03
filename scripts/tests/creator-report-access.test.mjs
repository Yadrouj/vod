import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the production server exposes only the small public report, not creator or music catalogs',()=>{
  const server=readFileSync('watch-party-server.ts','utf8');
  assert.ok(server.includes('pathname?.startsWith("/data/") && pathname !== "/data/creator-music-gaps.json"'));
  const edge=readFileSync('infra/nginx.conf','utf8');
  const exception=edge.indexOf('location = /data/creator-music-gaps.json');
  assert.ok(exception>=0);
  assert.ok(edge.slice(exception).includes('proxy_pass http://sarvnema_app;'));
  assert.match(edge,/location \^~ \/data\/\s*\{\s*return 404;/);
  assert.ok(!edge.includes('location = /data/creator-profiles.json'));
});

test('the exported gaps contain names and cover/store references, not audio URLs',()=>{
  const report=JSON.parse(readFileSync('public/data/creator-music-gaps.json','utf8'));
  let count=0;
  for(const artist of report.artists) for(const recording of artist.missing){
    count++;
    assert.deepEqual(Object.keys(recording).sort(),['album','coverUrl','sourceUrl','title']);
    assert.equal(new URL(recording.sourceUrl).hostname,'music.apple.com');
    assert.ok(!/\.(?:mp3|m4a|flac|wav|mp4)(?:$|\?)/i.test(recording.sourceUrl));
  }
  assert.ok(count>0);
});
