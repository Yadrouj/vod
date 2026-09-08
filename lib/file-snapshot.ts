import { readFile, stat } from "node:fs/promises";

export type FileSnapshot<T> = { checkedAt?: number; mtimeMs?: number; value?: T; pending?: Promise<T> };

/** Single-flight cold reads; keep the last good snapshot if an atomic refresh
 * temporarily fails. Never retain a rejected promise or publish half a parse. */
export function readFileSnapshot<T>(file: string, cache: FileSnapshot<T>, interval = 30_000): Promise<T> {
  if (cache.value !== undefined && Date.now() - (cache.checkedAt ?? 0) < interval) return Promise.resolve(cache.value);
  if (cache.pending) return cache.pending;
  cache.pending = (async () => {
    try {
      const info = await stat(file);
      if (cache.value === undefined || cache.mtimeMs !== info.mtimeMs) {
        const value = JSON.parse(await readFile(file, "utf8")) as T;
        cache.value = value;
        cache.mtimeMs = info.mtimeMs;
      }
      return cache.value;
    } catch (error) {
      if (cache.value !== undefined) return cache.value;
      throw error;
    } finally {
      cache.checkedAt = Date.now();
      cache.pending = undefined;
    }
  })();
  return cache.pending;
}
