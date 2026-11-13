import { readFile } from 'node:fs/promises';
import { writeJsonAtomic } from './atomic-json.mjs';
// Persist only this verified batch, not three gigabyte-scale rebuilt LFS snapshots.
const vod = JSON.parse(await readFile('.media-cache/refresh-2026-11-13/source.json', 'utf8'));
const music = JSON.parse(await readFile('.media-cache/music/meloobit-source.json', 'utf8'));
await writeJsonAtomic('lib/data/media-refresh-2026-11-13-vod.json', vod);
await writeJsonAtomic('lib/data/media-refresh-2026-11-13-music.json', { version: 1, tracks: music.tracks.filter(t => t.sources.some(s => s.available === true)) });
console.log(JSON.stringify({ vodTitles: vod.items.length, musicTracks: music.tracks.length }));
