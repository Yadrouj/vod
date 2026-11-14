import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(root, process.env.DATE_NIGHT_OUTPUT || '.media-cache/marketing/sarvnema-date-night');
const assets = path.join(output, 'assets');
const plan = JSON.parse(await readFile(path.join(root, 'scripts/marketing/date-night-plan.json'), 'utf8'));
await mkdir(assets, { recursive: true });
const manifest = [];
for (const [index, film] of plan.films.entries()) {
  const target = path.join(assets, index ? 'hail.jpg' : 'odyssey.jpg');
  if (await access(target).then(() => false, () => true)) {
    const response = await fetch(film.imageUrl, { signal: AbortSignal.timeout(45_000) });
    assert.ok(response.ok && /^image\//.test(response.headers.get('content-type') || ''), `Public film artwork: ${film.title}`);
    assert.ok(Number(response.headers.get('content-length') || 0) < 15_000_000, 'Bounded image size');
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.length > 5000 && bytes.length < 15_000_000, 'Expected promotional image size');
    await writeFile(target, bytes);
  }
  manifest.push({ film: film.title, source: film.sourceUrl, image: film.imageUrl, file: path.basename(target) });
  console.log(`ARTWORK ${film.title}`);
}
await copyFile(path.join(root, '.media-cache/marketing/sarvnema-cinematic/assets/together.png'), path.join(assets, 'together.png'));
await writeFile(path.join(output, 'source-manifest.json'), JSON.stringify({ checkedAt: plan.checkedAt, trendEvidence: plan.trendEvidence, claimScope: plan.claimScope, films: manifest, footage: 'Real public promotional stills with original parallax motion; not extracted film/trailer clips.', voice: plan.voice }, null, 2) + '\n');
