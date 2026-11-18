import { mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resources = path.join(repo, 'applications/android-common/res');
const scenes = [
  'editorial-cinema-music.webp',
  'festivals.webp',
  'music.webp',
];
await mkdir(path.join(resources, 'drawable-nodpi'), { recursive: true });
await mkdir(path.join(resources, 'font'), { recursive: true });
for (const [index, filename] of scenes.entries()) {
  const destination = path.join(resources, 'drawable-nodpi', `startup_scene_0${index + 1}.webp`);
  await sharp(path.join(repo, 'public/media/magazine', filename))
    .resize(1280, 720, { fit: 'cover' }).webp({ quality: 80 }).toFile(destination);
  console.log(`${path.basename(destination)}: ${(await stat(destination)).size} bytes`);
}
for (const weight of ['black', 'regular']) {
  await copyFile(path.join(repo, 'public/fonts', `alibaba-${weight}.ttf`), path.join(resources, 'font', `alibaba_${weight}.ttf`));
}
