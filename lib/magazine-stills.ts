import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

// A mirror is used only when its exact original URL matches the current gallery.
export const loadMagazineStills = cache(async (): Promise<Record<string, { path: string; titleId: string }>> => {
  try { return JSON.parse(await readFile(path.join(process.cwd(), 'public/media/magazine/stills/manifest.json'), 'utf8')).images ?? {}; }
  catch { return {}; }
});
