import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { decodeCompact } from "../../lib/download-gate";
import type { VodItem, VodLink } from "../../lib/types";

test("catalog, download API, watch rooms and bot gates keep the recorded DonyayeSerial server", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "sarvnema-donyaye-mapping-"));
  const previousDataDir = process.env.VOD_DATA_DIR;
  process.env.VOD_DATA_DIR = root;
  const source = "https://dls4.varzeshha3-uploader.top/DonyayeSerial/movies/2009/tt1155056/SoftSub/I.Love.You.Man.2009.1080p.BluRay.SoftSub.YIFY.DonyayeSerial.mkv";
  const link: VodLink = { url: source, label: "1080p", quality: "1080p", release: "BluRay", group: "SoftSub", size: "1.45 GB" };
  const item: VodItem = {
    id: "fixture", imdbCode: "tt1155056", imdbUrl: null, title: "I Love You, Man", type: "movie", year: 2009,
    imdbRating: 7, imdbVotes: 1, groups: ["SoftSub"], qualities: ["1080p"], links: [link],
  };
  try {
    await mkdir(path.join(root, "titles"));
    await writeFile(path.join(root, "titles", "tt1155056.json"), JSON.stringify(item));
    const { findVodItem } = await import("../../lib/catalog");
    const { GET: downloads } = await import("../../app/api/downloads/[id]/route");
    const { GET: watchRoom } = await import("../../app/api/watch-party/title/[id]/route");
    const { getBotTitleDetail } = await import("../../lib/bot-catalog");
    const params = () => ({ params: Promise.resolve({ id: item.imdbCode }) });

    await t.test("title loading preserves the source URL", async () => {
      assert.equal((await findVodItem(item.imdbCode))?.links[0].url, source);
    });
    await t.test("download API publishes the original server", async () => {
      const response = await downloads(new Request("https://sarvnema.ir/api/downloads/tt1155056"), params());
      assert.equal(response.status, 200);
      assert.equal((await response.json()).files[0].url, source);
    });
    await t.test("watch-together sources use the same corrected server", async () => {
      const response = await watchRoom(new Request("https://sarvnema.ir/api/watch-party/title/tt1155056"), params());
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.source.url, source);
      assert.equal(payload.sources[0].url, source);
    });
    await t.test("bot downloads keep the five-second site gate and correct target", async () => {
      const detail = await getBotTitleDetail(item.imdbCode, { includeDownloads: true }, "https://sarvnema.ir");
      assert.ok(detail);
      for (const file of [detail.bestFile, ...detail.movieFiles]) {
        assert.ok(file);
        const gate = new URL(file.url);
        assert.equal(gate.origin, "https://sarvnema.ir");
        assert.equal(gate.pathname, "/download/continue");
        assert.equal(decodeCompact(gate.searchParams.get("u")!), source);
      }
    });
  } finally {
    if (previousDataDir === undefined) delete process.env.VOD_DATA_DIR;
    else process.env.VOD_DATA_DIR = previousDataDir;
    await rm(root, { recursive: true, force: true });
  }
});
