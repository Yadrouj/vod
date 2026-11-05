import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { decodeCompact } from "../../lib/download-gate";

test("repairs reach downloads, player sources and bot gates even when server title data has the wrong host", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sarvnema-donyaye-api-"));
  const previous = process.env.VOD_DATA_DIR;
  process.env.VOD_DATA_DIR = root;
  const id = "tt9999001";
  const oldUrl = `https://dls3.aparatchi-dlcenter.top/DonyayeSerial/movies/2009/${id}/SoftSub/Film.1080p.mkv`;
  const goodUrl = oldUrl.replace("dls3.aparatchi-dlcenter", "dls4.varzeshha3-uploader");
  const rawLink = { url: oldUrl, label: "1080p", quality: "1080p", group: "SoftSub", release: "BluRay", size: null };
  const item = { id, imdbCode: id, title: "Fixture film", type: "movie", links: [rawLink], groups: ["SoftSub"], qualities: ["1080p"] };
  try {
    await mkdir(path.join(root, "titles"));
    await writeFile(path.join(root, "titles", `${id}.json`), JSON.stringify(item));
    await writeFile(path.join(root, "donyaye-link-updates.json"), JSON.stringify({ version: 1, items: {
      [id]: { replacements: [{ fromUrl: oldUrl, link: { ...rawLink, url: goodUrl, verifiedAt: new Date().toISOString() } }] },
    } }));
    const { findVodItem } = await import("../../lib/catalog");
    const { GET: downloads } = await import("../../app/api/downloads/[id]/route");
    const { GET: rooms } = await import("../../app/api/watch-party/title/[id]/route");
    const { getBotTitleDetail } = await import("../../lib/bot-catalog");
    assert.equal((await findVodItem(id))?.links[0].url, goodUrl);
    const context = () => ({ params: Promise.resolve({ id }) });
    assert.equal((await (await downloads(new Request(`https://sarvnema.ir/api/downloads/${id}`), context())).json()).files[0].url, goodUrl);
    assert.equal((await (await rooms(new Request(`https://sarvnema.ir/api/watch-party/title/${id}`), context())).json()).sources[0].url, goodUrl);
    const bot = await getBotTitleDetail(id, { includeDownloads: true }, "https://sarvnema.ir");
    assert.ok(bot?.bestFile);
    const gate = new URL(bot.bestFile.url);
    assert.equal(gate.pathname, "/download/continue");
    assert.equal(decodeCompact(gate.searchParams.get("u")!), goodUrl);
  } finally {
    if (previous === undefined) delete process.env.VOD_DATA_DIR; else process.env.VOD_DATA_DIR = previous;
    assert.ok(path.resolve(root).startsWith(path.join(path.resolve(tmpdir()), "sarvnema-donyaye-api-")));
    await rm(root, { recursive: true, force: true });
  }
});
