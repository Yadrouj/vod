import assert from "node:assert/strict";
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { rename, unlink } from "node:fs/promises";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";

const [baseline, catalog = "public/data/vod-catalog.json"] = process.argv.slice(2);
assert.ok(baseline, "Provide the local baseline archive");
const key = item => String(item.id || item.imdbCode);
const old = new Map();
await streamVodArchiveItems(baseline, item => {
  const links = old.get(key(item)) || new Map();
  for (const link of item.links || []) links.set(link.url, link);
  old.set(key(item), links);
});
const metadata = await streamVodArchiveItems(catalog, item => {
  const links = old.get(key(item)); if (!links) return;
  for (const link of [...(item.links || []), ...(item.externalDownloadPages || []), ...(item.unavailableDownloadLinks || []), ...(item.sourceLinkHistory || [])]) {
    links.delete(link.url); if (link.sourceOriginalUrl) links.delete(link.sourceOriginalUrl);
  }
});
const temporary = `${catalog}.${process.pid}.tmp`, writer = createWriteStream(temporary);
const write = async text => { if (!writer.write(text)) await once(writer, "drain"); };
let first = true, retained = 0;
try {
  await write(`${JSON.stringify(metadata).slice(0, -1)},"items":[`);
  await streamVodArchiveItems(catalog, async item => {
    const missing = old.get(key(item));
    if (missing?.size) {
      const history = [...missing.values()].map(link => ({ ...link, retainedAt: new Date().toISOString(), historyReason: "Previously indexed URL retained for provenance after source refresh; not independently reverified" }));
      retained += history.length;
      item = { ...item, sourceLinkHistory: [...(item.sourceLinkHistory || []), ...history] };
      old.delete(key(item));
    }
    await write(`${first ? "" : ","}${JSON.stringify(item)}`); first = false;
  });
  await write("]}"); await new Promise((resolve, reject) => { writer.once("error", reject); writer.end(resolve); });
  await rename(temporary, catalog);
} catch (error) { writer.destroy(); await unlink(temporary).catch(() => {}); throw error; }
console.log(JSON.stringify({ retainedForProvenance: retained, activeDownloadsChanged: false }));
