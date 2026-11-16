import path from 'node:path';
import fallback from './data/vod-duplicate-groups.json';
import { readFileSnapshot, type FileSnapshot } from './file-snapshot';
import { createVodIdentityRegistry, dedupeVodCards } from './vod-identity.mjs';
import type { VodCatalogIndex } from './types';

type Manifest = Parameters<typeof createVodIdentityRegistry>[0] & { version: number };
export type VodIdentityRegistry = ReturnType<typeof createVodIdentityRegistry>;
const cache: FileSnapshot<Manifest> = {};
const registries = new WeakMap<Manifest, VodIdentityRegistry>();
const fallbackManifest = fallback as Manifest;

export async function loadVodIdentities(): Promise<VodIdentityRegistry> {
  const file = path.join(process.env.VOD_DATA_DIR || path.join(process.cwd(), 'public/data'), 'vod-identities.json');
  const data = await readFileSnapshot(file, cache).catch(() => fallbackManifest);
  const valid = data.version === 1 && Array.isArray(data.groups) && data.groups.length <= 10000
    && data.groups.every(group => typeof group.canonicalId === 'string' && Array.isArray(group.memberIds)
      && group.memberIds.length <= 100 && group.memberIds.every(id => typeof id === 'string' && /^[a-z0-9][a-z0-9_-]{0,179}$/i.test(id))
      && (group.aliases === undefined || (Array.isArray(group.aliases) && group.aliases.every(id => typeof id === 'string'))));
  const manifest = valid ? data : fallbackManifest;
  let registry = registries.get(manifest);
  if (!registry) { registry = createVodIdentityRegistry(manifest); registries.set(manifest, registry); }
  return registry;
}

export function canonicalVodIndex(index: VodCatalogIndex, registry: VodIdentityRegistry): VodCatalogIndex {
  const full = index.totalTitles === index.items.length;
  const items = dedupeVodCards(index.items, registry);
  const auditedCount = index.totalTitles === registry.manifest.rawTitles ? registry.manifest.canonicalTitles : undefined;
  return { ...index, items, totalTitles: full ? items.length : auditedCount ?? index.totalTitles,
    sections: index.sections.map(section => ({ ...section, items: dedupeVodCards(section.items, registry) })) };
}
