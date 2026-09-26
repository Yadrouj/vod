import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ids = [
  "old-iranian-1358026", "old-iranian-1358006", "old-iranian-1358004",
  "old-iranian-1358020", "old-iranian-1357008", "old-iranian-1357027",
  "old-iranian-1357007", "old-iranian-1355063", "old-iranian-1356009",
  "old-iranian-1356016", "old-iranian-1356030", "old-iranian-1356038",
  "old-iranian-1356052", "old-iranian-1356053", "old-iranian-1357010",
  "old-iranian-1355011", "old-iranian-1355055", "old-iranian-1355057",
  "old-iranian-1355049", "old-iranian-1355022", "old-iranian-1354048",
  "old-iranian-1354049", "old-iranian-1355014",
];

function stringAfter(input, marker) {
  const start = input.indexOf(marker);
  if (start < 0) return null;
  let end = start + marker.length;
  let escaped = false;
  for (; end < input.length; end += 1) {
    const char = input[end];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === "\"") break;
  }
  try { return JSON.parse("\"" + input.slice(start + marker.length, end) + "\""); } catch { return null; }
}

function parseResults(html) {
  const marker = "\"videoRenderer\":{";
  const results = [];
  let cursor = 0;
  while (results.length < 10) {
    const index = html.indexOf(marker, cursor);
    if (index < 0) break;
    cursor = index + marker.length;
    const chunk = html.slice(index, index + 8_000);
    const videoId = stringAfter(chunk, "\"videoId\":\"");
    const title = stringAfter(chunk, "\"title\":{\"runs\":[{\"text\":\"");
    const channel = stringAfter(chunk, "\"longBylineText\":{\"runs\":[{\"text\":\"");
    const lengthArea = chunk.slice(Math.max(0, chunk.indexOf("\"lengthText\"")), 1_500);
    const length = stringAfter(lengthArea, "\"simpleText\":\"") || stringAfter(lengthArea, "\"label\":\"");
    if (videoId && title && !results.some(result => result.videoId === videoId)) results.push({ videoId, title, channel, length });
  }
  return results;
}

async function main() {
  const selected = process.argv.find(value => value.startsWith("--id="))?.slice(5);
  const selectedIds = selected ? [selected] : ids;
  for (const id of selectedIds) {
    const file = path.join(ROOT, "public", "data", "titles", id + ".json");
    const item = JSON.parse(await readFile(file, "utf8"));
    const query = [item.persianTitle, item.title, item.originalTitle, item.persianYear].filter(Boolean).join(" ");
    const response = await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(query + " فیلم کامل"), {
      headers: { "accept-language": "fa-IR,fa;q=0.9,en;q=0.8", "user-agent": "Mozilla/5.0 SarvNema research" },
      signal: AbortSignal.timeout(20_000),
    });
    const html = await response.text();
    console.log(JSON.stringify({ id, title: item.title, query, results: parseResults(html) }));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
