import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareQueue } from './blog-agent.mjs';

const directory = path.resolve('.media-cache/magazine-references');
await mkdir(directory, { recursive: true });
const drafts = await prepareQueue();
const editorialPlan = JSON.parse(await readFile('content/magazine/image-plan.json', 'utf8'));
const plan = [];
for (const article of drafts) {
  const media = article.media.find(m => m.kind !== 'music');
  let title;
  if (media) try { title = JSON.parse(await readFile(`public/data/titles/${media.id}.json`, 'utf8')); } catch {}
  const selected = editorialPlan.find(p => p.slug === article.slug);
  const candidates = selected ? (selected.reference ? [selected.reference.sourceUrl] : []) : title ? [...(title.imdbImages ?? []).filter(i => i.width > i.height && i.width >= 1000).map(i => i.url), title.backdropUrl, title.posterUrl].filter(Boolean) : [];
  let reference;
  for (const url of [...new Set(candidates)].slice(0, 3)) {
    try {
      const source = url.startsWith('/') ? await readFile(path.join('public', url)) : await download(url);
      const filename = path.join(directory, `${article.slug}.jpg`);
      await writeFile(filename, source);
      reference = { filename, sourceUrl: url, titleId: media.id, title: title.title };
      break;
    } catch (error) { console.warn(`${article.slug}: ${error.message}`); }
  }
  plan.push({ slug: article.slug, title: article.title, category: article.category, reference });
}
await writeFile(path.join(directory, 'plan.json'), JSON.stringify(plan, null, 2));
console.log(JSON.stringify(plan));

async function download(url) {
  if (!/^https:\/\//.test(url)) throw new Error('HTTPS image required');
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 12 * 1024 * 1024) throw new Error('Reference image too large');
  return bytes;
}
