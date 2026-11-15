import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWeekendV2Plan } from './weekend-v2-plan.mjs';
import { buildWeekendV3Plan } from './weekend-v3-plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const v3 = process.argv.includes('--v3');
const edition = v3 ? 'v3' : 'v2';
const output = path.resolve(root, (v3 ? process.env.WEEKEND_V3_OUTPUT : process.env.WEEKEND_V2_OUTPUT) || `.media-cache/marketing/sarvnema-weekend-${edition}`);
const originals = path.resolve(root, '.media-cache/marketing/sarvnema-weekend');
await mkdir(path.join(output, 'assets'), { recursive: true }); await mkdir(path.join(output, 'fonts'), { recursive: true });
for (const name of ['family', 'couple']) await copyFile(path.join(originals, 'assets', `${name}.png`), path.join(output, 'assets', `${name}.png`));
await copyFile(path.join(root, 'scripts/marketing/weekend-image-prompts.json'), path.join(output, 'image-prompts.json'));
const provided = process.env.ALIBABA_FONT_DIR || 'C:/Users/yadro/Downloads/Telegram Desktop/ProjectCompass/.output/public/fonts';
const files = { black: 'alibaba-black.woff2-41970917.ttf', bold: 'alibaba-bold.woff2-bbb24413.ttf', regular: 'alibaba-regular.woff2-5d2979c4.ttf' };
const fonts = {};
for (const [weight, name] of Object.entries(files)) {
  const target = path.join(output, 'fonts', `${weight}.ttf`);
  if (!await access(target).then(() => true, () => false)) await copyFile(path.join(provided, name), target);
  const bytes = await readFile(target); assert.equal(bytes.subarray(0, 4).toString('hex'), '00010000', 'Provided Alibaba font must be a genuine TrueType font');
  fonts[weight] = { file: `fonts/${weight}.ttf`, sha256: createHash('sha256').update(bytes).digest('hex'), source: 'User-provided Alibaba font; local ad render only, not redistributed in the website or Git' };
}
const plan = (v3 ? buildWeekendV3Plan : buildWeekendV2Plan)(JSON.parse(await readFile(path.join(root, 'scripts/marketing/weekend-plan.json'), 'utf8')));
await writeFile(path.join(output, 'render-plan.json'), JSON.stringify(plan, null, 2) + '\n');
const source = JSON.parse(await readFile(path.join(originals, 'source-manifest.json'), 'utf8'));
await writeFile(path.join(output, 'source-manifest.json'), JSON.stringify({ ...source, fonts, narration: plan.voice, fontRedistribution: false }, null, 2) + '\n');
console.log(`PREPARED WEEKEND ${edition.toUpperCase()}: supplied Alibaba fonts, selected artwork, Eleven v4 Jessica plan`);
