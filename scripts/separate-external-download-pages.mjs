import { createWriteStream } from "node:fs";
import { rename, writeFile, unlink, readFile } from "node:fs/promises";
import { once } from "node:events";
import { streamVodArchiveItems } from "./vod-json-stream.mjs";
import { separateExternalDownloadPages } from "./video-source-validation.mjs";

const input = process.argv[2] || "public/data/vod-catalog.json";
const output = process.argv[3] || input;
const report = process.argv[4] || ".media-cache/vod-sync/external-download-pages-report.json";
const checks = process.argv[5] ? JSON.parse(await readFile(process.argv[5],"utf8")) : { results: [] };
if (process.argv[5] && !checks.finished) throw new Error("Media verification must finish before applying its results");
const verified = new Map(checks.results.map(check => [check.url,check]));
const counts = { titles: 0, links: 0, pagesSeparated: 0, unavailableSeparated: 0, affectedTitles: 0 };
const metadata = await streamVodArchiveItems(input, item => {
  const result = separateExternalDownloadPages(item,verified);
  counts.titles++; counts.links += result.item.links?.length || 0;
  counts.pagesSeparated += result.moved; counts.unavailableSeparated += result.rejected; if (result.moved || result.rejected) counts.affectedTitles++;
});
const temporary = `${output}.${process.pid}.tmp`;
const writer = createWriteStream(temporary);
const write = async value => { if (!writer.write(value)) await once(writer, "drain"); };
try {
  const header = { ...metadata, totalTitles: counts.titles, totalLinks: counts.links, externalDownloadPagesSeparatedAt: new Date().toISOString() };
  await write(`${JSON.stringify(header).slice(0,-1)},"items":[`);
  let first = true;
  await streamVodArchiveItems(input, async item => {
    await write(`${first ? "" : ","}${JSON.stringify(separateExternalDownloadPages(item,verified).item)}`); first = false;
  });
  await write("]}"); await new Promise((resolve,reject) => { writer.once("error",reject); writer.end(resolve); });
  await rename(temporary,output);
} catch(error) { writer.destroy(); await unlink(temporary).catch(()=>{}); throw error; }
await writeFile(report,JSON.stringify({ checkedAt: new Date().toISOString(), ...counts, retainedAsReferences: true },null,2));
console.log(JSON.stringify(counts));
