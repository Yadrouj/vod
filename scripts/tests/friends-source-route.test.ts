import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyVerifiedSourceBases, rewriteSourceLink, type SourceLinkRegistry } from "../../lib/source-link-settings";
import type { VodLink } from "../../lib/types";
import { mediaDeliveryRoutes } from "../../lib/media-delivery";

test("Friends bypasses the redirect hostname, preserves the original episode and pins the verified CDN", async () => {
  const registry = applyVerifiedSourceBases({ version: 1, updatedAt: null, bases: {} });
  const sourceBaseId = "f2my-c2bb8dc3a85e";
  const sourceRelativePath = "Series/Friends/S05/Friends.S05E07.720p.Farsi.Sub.Film2Media.mkv";
  const original = new URL(sourceRelativePath, "https://bnrhd3fvb374s4bkwzxm54xf.abrtech.top/pnot/").href;
  const link = { url: original, sourceOriginalUrl: original, sourceBaseId, sourceRelativePath, sourceProvider: "f2my", season: 5, episode: 7, quality: "720p" } as VodLink;
  const rewritten = rewriteSourceLink(link, registry);
  assert.equal(rewritten.url, new URL(sourceRelativePath, "https://cdnzz.tmk51.ir.cdn.ir/pnot/").href);
  assert.equal(rewritten.sourceOriginalUrl, original);
  assert.equal(rewritten.season, 5); assert.equal(rewritten.episode, 7);
  assert.equal(link.url, original, "Raw source and archive are not mutated");
  assert.equal(registry.bases[sourceBaseId].manual, true, "The nightly discovery cannot restore the old redirector");
  assert.ok(registry.bases[sourceBaseId].aliases.includes("https://bnrhd3fvb374s4bkwzxm54xf.abrtech.top/pnot/"));
});

test("routing repair is committed, applies to stale automatic registries, and respects admin overrides", async () => {
  const bundled = JSON.parse(await readFile("lib/data/verified-source-bases.json", "utf8"));
  assert.equal(bundled.version, 1);
  const id = "f2my-c2bb8dc3a85e";
  const repaired = applyVerifiedSourceBases({ version: 1, updatedAt: null, bases: {} });
  const base = { ...repaired.bases[id], baseUrl: bundled.bases[id].replaces[0], manual: false };
  const automatic = { version: 1, updatedAt: null, bases: { [id]: base } } satisfies SourceLinkRegistry;
  assert.equal(applyVerifiedSourceBases(automatic).bases[id].baseUrl, bundled.bases[id].baseUrl);
  assert.equal(automatic.bases[id].baseUrl, base.baseUrl, "Runtime input is not mutated");
  const manual = { ...automatic, bases: { [id]: { ...base, manual: true, baseUrl: "https://admin.example/media/" } } };
  assert.equal(applyVerifiedSourceBases(manual).bases[id].baseUrl, "https://admin.example/media/");
  const fresh = { ...automatic, bases: { [id]: { ...base, baseUrl: "https://new-provider.example/updated/" } } };
  assert.equal(applyVerifiedSourceBases(fresh).bases[id].baseUrl, "https://new-provider.example/updated/");
});

test("delivery alternatives are bounded to observed endpoints of the identical file", () => {
  const path = "Series/Friends/S05/Friends.S05E07.720p.Farsi.Sub.Film2Media.mkv?keep=signature";
  const url = `https://cdnzz.tmk51.ir.cdn.ir/pnot/${path}`;
  assert.deepEqual(mediaDeliveryRoutes({ url }), [url, `https://edge07.tmk51.ir.cdn.ir/pnot/${path}`, `https://edge08.tmk51.ir.cdn.ir/pnot/${path}`]);
  assert.equal(mediaDeliveryRoutes({ url: `https://edge07.tmk51.ir.cdn.ir/pnot/${path}` }).length, 2, "Never cycle back through the router or duplicate an endpoint");
  for (const url of ["https://cdnzz.tmk51.ir.cdn.ir.attacker.test/pnot/movie.mkv", "https://cdnzz.tmk51.ir.cdn.ir/other/movie.mkv", "https://example.test/movie.mkv", "https://cdnzz.tmk51.ir.cdn.ir/pnot/login.php"]) {
    assert.deepEqual(mediaDeliveryRoutes({ url }), [url], "No guesses for another host, path or asset");
  }
  assert.deepEqual(mediaDeliveryRoutes(null), []);
});

test("every verified archive branch preserves the exact file, query and bounded delivery routes", async () => {
  const bundle = JSON.parse(await readFile("lib/data/verified-source-bases.json", "utf8"));
  const registry = applyVerifiedSourceBases({ version: 1, updatedAt: null, bases: {} });
  const roots = new Set<string>();
  for (const [id, value] of Object.entries(bundle.bases)) {
    const base = value as { baseUrl: string; replaces: string[] };
    roots.add(new URL(base.baseUrl).pathname);
    const original = new URL("Series/Example/S02/Example.S02E03.720p.mkv?keep=signature", base.replaces[0]).href;
    for (const relative of ["Series/Example/S02/Example.S02E03.720p.mkv?keep=signature", new URL(original).pathname.slice(1) + "?keep=signature"]) {
      const link = { url: original, sourceOriginalUrl: original, sourceProvider: "f2my", sourceBaseId: id, sourceRelativePath: relative, season: 2, episode: 3 } as VodLink;
      const result = rewriteSourceLink(link, registry);
      const expected = new URL("Series/Example/S02/Example.S02E03.720p.mkv?keep=signature", base.baseUrl).href;
      assert.equal(result.url, expected, `${id} must not double its rotating path`);
      assert.equal(result.sourceOriginalUrl, original);
      assert.equal(result.season, 2); assert.equal(result.episode, 3);
      const routes = mediaDeliveryRoutes(result);
      assert.equal(routes.length, 3); assert.equal(new Set(routes).size, 3);
      for (const route of routes) {
        assert.equal(new URL(route).pathname, new URL(expected).pathname);
        assert.equal(new URL(route).search, "?keep=signature");
      }
      const manual = { ...registry, bases: { ...registry.bases, [id]: { ...registry.bases[id], baseUrl: "https://admin.example/custom/", manual: true } } };
      assert.equal(rewriteSourceLink(link, manual).url, new URL(relative, "https://admin.example/custom/").href);
    }
  }
  assert.equal(roots.size, 8);
});
