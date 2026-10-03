import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Conversion only: all artwork and logo compositing is produced by imagegen.
const manifest = JSON.parse(await readFile(process.argv[2], 'utf8'));
const output = path.resolve('public/media/magazine/articles');
await mkdir(output, { recursive: true });
const hashes = new Set();
for (const { slug, filename } of manifest) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid slug');
  const buffer = await sharp(filename).resize(1600, 900, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
  const hash = createHash('sha256').update(buffer).digest('hex');
  if (hashes.has(hash)) throw new Error(`Duplicate artwork: ${slug}`);
  hashes.add(hash);
  await writeFile(path.join(output, `${slug}.webp`), buffer);
  console.log(`${slug}: ${buffer.length} bytes`);
}
