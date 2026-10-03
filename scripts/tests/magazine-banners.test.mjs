import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { firstMonth } from '../../content/magazine/first-month.mjs';

test('all 30 articles have different real WebP banners in 1600×900', async () => {
  const hashes = new Set();
  for (const article of firstMonth) {
    const bytes = await readFile(`public${article.image}`);
    assert.ok(bytes.length < 500_000, article.slug);
    const info = await sharp(bytes).metadata();
    assert.equal(info.format, 'webp');
    assert.equal(info.width, 1600);
    assert.equal(info.height, 900);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(hashes.size, 30);
});

test('mirrored original photos remain small valid images with archive provenance', async () => {
  const manifest = JSON.parse(await readFile('public/media/magazine/stills/manifest.json', 'utf8'));
  assert.ok(Object.keys(manifest.images).length >= 70);
  for (const [source, image] of Object.entries(manifest.images)) {
    assert.ok(source.startsWith('https://'));
    assert.match(image.titleId, /^tt\d+$/);
    assert.match(image.path, /^\/media\/magazine\/stills\/tt\d+-[a-f0-9]{16}\.webp$/);
    const bytes = await readFile(`public${image.path}`);
    const info = await sharp(bytes).metadata();
    assert.equal(info.format, 'webp');
    assert.ok(info.width <= 960 && info.height <= 720);
    assert.ok(bytes.length < 500_000);
  }
});
