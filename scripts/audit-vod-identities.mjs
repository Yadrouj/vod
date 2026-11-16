import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planVodIdentities, vodIdentityDescriptor } from '../lib/vod-identity.mjs';
import { streamVodArchiveItems } from './vod-json-stream.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

export async function scanVodIdentities(file, previous = { groups: [] }) {
  const descriptors = [];
  await streamVodArchiveItems(file, item => { descriptors.push(vodIdentityDescriptor(item)); });
  return planVodIdentities(descriptors, previous);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] || 'public/data/vod-catalog.json';
  const output = process.argv[3] || '.media-cache/vod-sync/vod-duplicate-groups.json';
  const previous = JSON.parse(await readFile(output, 'utf8').catch(error => { if (error.code === 'ENOENT') return '{"groups":[]}'; throw error; }));
  const manifest = await scanVodIdentities(path.resolve(file), previous);
  await writeJsonAtomic(output, manifest);
  console.log(JSON.stringify({ file: output, rawTitles: manifest.rawTitles, canonicalTitles: manifest.canonicalTitles,
    groups: manifest.groups.length, distinctPageGroups: manifest.groups.filter(group => group.memberIds.length > 1).length,
    aliases: manifest.groups.reduce((sum, group) => sum + group.memberIds.length - 1, 0), unresolvedPairs: manifest.unresolvedPairs,
    eastOfEden: manifest.groups.find(group => group.memberIds.includes('familymovie-0c050ee1689bd331')) }, null, 2));
}
