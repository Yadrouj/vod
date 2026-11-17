import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { glorytoonDownloadsForItem, mergeGlorytoonDownloads } from './glorytoon-downloads.mjs';
import type { PublisherDownload } from './publisher-download-types';
import type { VodItem } from './types';

let snapshot: Promise<unknown> | undefined;
let current: Promise<unknown> | undefined;
let expiresAt = 0;

export async function getGlorytoonDownloads(item: VodItem): Promise<PublisherDownload[]> {
  snapshot ??= readFile(path.join(process.cwd(), 'lib/data/glorytoon-downloads.json'), 'utf8').then(JSON.parse);
  if (!current || Date.now() >= expiresAt) {
    expiresAt = Date.now() + 30_000;
    current = snapshot.then(async bundled => {
      const file = path.join(process.env.VOD_DATA_DIR || path.join(process.cwd(), 'public/data'), 'glorytoon-downloads.json');
      try { return mergeGlorytoonDownloads(bundled, JSON.parse(await readFile(file, 'utf8'))); }
      catch { return bundled; }
    });
  }
  return glorytoonDownloadsForItem(await current, item) as PublisherDownload[];
}
