import { parseDirectoryRows } from "./moviesho-source-lib.mjs";

/** Walk only the supplied publisher directory, never its parent or another host. */
export async function collectMihanFiles(root, fetchText, { maxDirectories = 250, gapMs = 350 } = {}) {
  const base = new URL(root);
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const queue = [base.href], visited = new Set(), files = new Map();
  while (queue.length && (!maxDirectories || visited.size < maxDirectories)) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const html = await fetchText(current);
    for (const row of parseDirectoryRows(html,current)) {
      const url = new URL(row.url); url.hash=""; url.search="";
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) continue;
      if (row.isDirectory) {
        const depth = url.pathname.slice(base.pathname.length).split("/").filter(Boolean).length;
        if (depth <= 3 && !visited.has(url.href) && !queue.includes(url.href)) queue.push(url.href);
      } else if (/\.(?:mkv|mp4|m4v|avi|webm|mov|wmv)$/i.test(url.pathname)) {
        files.set(url.href,{...row,url:url.href});
      }
    }
    if (gapMs) await new Promise(resolve=>setTimeout(resolve,gapMs));
  }
  return { files: [...files.values()], directoriesChecked: visited.size, remainingDirectories: queue.length, complete: !queue.length };
}
