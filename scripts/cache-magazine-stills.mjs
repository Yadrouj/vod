import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { prepareQueue } from './blog-agent.mjs';
import { articleVisuals } from '../lib/magazine-media.ts';
import { sizedImageUrl } from '../lib/image-url.ts';

// Exact archive photos, resize/format only. No AI editing or scene composition.
const directory = 'public/media/magazine/stills';
await mkdir(directory, { recursive: true });
const drafts = await prepareQueue();
const ids = [...new Set(drafts.flatMap(a => a.media.filter(m => m.kind !== 'music').slice(0, 3).map(m => m.id)))];
const images = {};
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < ids.length) {
    const id = ids[next++];
    const title = JSON.parse(await readFile(`public/data/titles/${id}.json`, 'utf8'));
    for (const image of articleVisuals(title).images) {
      const response = await fetch(sizedImageUrl(image.url, 960), { signal: AbortSignal.timeout(20000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`${id}: image HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const hash = createHash('sha256').update(image.url).digest('hex').slice(0, 16);
      const asset = `${id}-${hash}.webp`;
      await sharp(bytes).resize({ width: 960, height: 720, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(`${directory}/${asset}`);
      images[image.url] = { path: `/media/magazine/stills/${asset}`, titleId: id };
    }
    console.log(`Cached original gallery: ${id}`);
  }
}));
await writeFile(`${directory}/manifest.json`, JSON.stringify({ version: 1, images }, null, 2));
console.log(JSON.stringify({ titles: ids.length, uniquePhotos: Object.keys(images).length }));
