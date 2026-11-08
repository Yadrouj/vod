import test from "node:test";
import assert from "node:assert/strict";
import { movieDownloadSources } from "../../lib/downloads";
import type { VodLink } from "../../lib/types";

test("publisher and other mirrors precede Donyaye even when its quality is higher", () => {
  const make = (url: string, quality: string): VodLink => ({ url, quality, group: "Dubbed", release: null, size: null, label: quality });
  const sources = movieDownloadSources([
    make("https://dls7.aparatchi-dlcenter.top/DonyayeSerial/Film.2160p.mkv", "2160p"),
    make("https://cdn.example.org/Film.1080p.mp4", "1080p"),
    make("https://dl.moviezland.ir/movies/Film.720p.mkv", "720p"),
  ]);
  assert.equal(new URL(sources[0].url).hostname, "dl.moviezland.ir");
  assert.equal(new URL(sources[1].url).hostname, "cdn.example.org");
  assert.match(sources[2].url, /DonyayeSerial/);
});
