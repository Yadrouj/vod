import { copyFile, mkdir, readFile, stat, statfs, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mergeMeloobitIndex } from './merge-meloobit-source.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

export function validateBatch(vod, music) {
  if (!Array.isArray(vod.items) || !vod.items.length || vod.items.length > 100 || !Array.isArray(music.tracks) || !music.tracks.length || music.tracks.length > 500) throw new Error('Invalid bounded media batch');
  for (const track of music.tracks) if (!track.id || !track.sources.some(s => s.available === true && /^https?:\/\//.test(s.url))) throw new Error('Unverified music source in batch');
}
async function main() {
  const vodFile = 'lib/data/media-refresh-2026-11-13-vod.json';
  const music = JSON.parse(await readFile('lib/data/media-refresh-2026-11-13-music.json', 'utf8'));
  const vod = JSON.parse(await readFile(vodFile, 'utf8'));
  validateBatch(vod, music);
  if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ dryRun: true, vodTitles: vod.items.length, musicCandidates: music.tracks.length })); return; }
  // Scripts below publish to the standard mounted archive. Reject an accidental different mount.
  const dir = path.resolve('public/data');
  if (process.env.VOD_DATA_DIR && path.resolve(process.env.VOD_DATA_DIR) !== dir) throw new Error('Unsupported archive mount');
  await mkdir('data', { recursive: true });
  const lockFile = 'data/media-refresh-2026-11-13.lock';
  const lock = await open(lockFile, 'wx');
  const backup = path.join('data/media-import-backups', `2026-11-13-${Date.now()}`);
  try {
    const files = ['vod-catalog.json', 'music-index.json', 'music-artists.json', 'vod-index.json', 'vod-home.json', 'title-map.json', 'music-landing.json', 'music-home.json', 'music-mood-playlists.json', 'music-mood-tracks.json'];
    const sizes = await Promise.all(files.map(f => stat(path.join(dir, f)).catch(e => { if (e.code === 'ENOENT') return null; throw e; })));
    const disk = await statfs(dir);
    if (disk.bavail * disk.bsize < sizes.reduce((n, s) => n + (s?.size || 0), 0) + 2_000_000_000) throw new Error('Insufficient disk space for backup and atomic replacement');
    await mkdir(backup, { recursive: true });
    for (let i = 0; i < files.length; i++) if (sizes[i]) await copyFile(path.join(dir, files[i]), path.join(backup, files[i]));
    console.log(JSON.stringify({ backup, state: 'backed-up' }));
    await run('scripts/merge-curated-vod-source.mjs', ['public/data/vod-catalog.json', vodFile, 'public/data/vod-catalog.json', path.join(backup, 'video-merge-report.json')]);
    // Merge, never replace, the current live catalogue and its artist profiles.
    const existing = JSON.parse(await readFile(path.join(dir, 'music-index.json'), 'utf8'));
    const next = mergeMeloobitIndex(existing, music);
    await writeJsonAtomic(path.join(dir, 'music-index.json'), next);
    console.log(JSON.stringify({ musicAdded: next.tracks.length - existing.tracks.length, musicTotal: next.tracks.length }));
    // Release the large temporary objects before spawning the compact-index builder.
    existing.tracks = []; existing.artists = []; next.tracks = []; next.artists = [];
    await run('scripts/build-vod-title-files.mjs');
    await run('scripts/build-vod-index.mjs');
    await run('scripts/build-music-landing-index.mjs');
    await writeJsonAtomic(path.join(backup, 'completed.json'), { completedAt: new Date().toISOString(), vodTitles: vod.items.length, musicCandidates: music.tracks.length });
    console.log(JSON.stringify({ completed: true, backup }));
  } finally { await lock.close(); await unlink(lockFile); }
}
async function run(script, args = []) {
  console.log(`Running ${script}`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit', windowsHide: true });
    child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${script}: ${code}`)));
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
