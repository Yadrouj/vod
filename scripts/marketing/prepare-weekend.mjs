import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(root, process.env.WEEKEND_OUTPUT || '.media-cache/marketing/sarvnema-weekend');
const prompts = JSON.parse(await readFile(path.join(root, 'scripts/marketing/weekend-image-prompts.json'), 'utf8'));
await mkdir(path.join(output, 'assets'), { recursive: true });
const images = [];
for (const name of ['family', 'couple']) {
  const target = path.join(output, 'assets', `${name}.png`);
  const source = process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (source) {
    assert.ok(!await access(target).then(() => true, () => false), 'Keep existing selected artwork; use a new output directory for another version');
    await copyFile(path.resolve(source), target);
  }
  const bytes = await readFile(target);
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG', 'Use the original generated PNG, not a placeholder');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.ok(width >= 900 && height >= 1400, 'Portrait artwork large enough for the Reel');
  images.push({ name, file: `assets/${name}.png`, width, height, sha256: createHash('sha256').update(bytes).digest('hex'), synthetic: true, fictionalModels: true });
}
await writeFile(path.join(output, 'image-prompts.json'), JSON.stringify(prompts, null, 2) + '\n');
await writeFile(path.join(output, 'source-manifest.json'), JSON.stringify({ mode: 'built-in image_gen', images, promptSet: 'image-prompts.json', realCustomers: false, externalFilmFootage: false, externalMusicSamples: false, note: 'Original fictional lifestyle images. The two-screen sequence is a conceptual feature illustration, not a recording of actual customers or a fabricated customer testimonial.' }, null, 2) + '\n');
console.log(JSON.stringify({ output, images }, null, 2));
