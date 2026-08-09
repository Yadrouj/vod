import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

test("merges F2MY links without removing links from other providers", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sarvnema-f2my-"));
  try {
    const existingPath = path.join(directory, "catalog.json");
    const sourcePath = path.join(directory, "source.json");
    const reportPath = path.join(directory, "report.json");
    await writeFile(existingPath, JSON.stringify({
      sourceUrl: "https://existing.test",
      items: [{
        id: "tt1234567", imdbCode: "tt1234567", imdbUrl: "https://www.imdb.com/title/tt1234567/", title: "Example", type: "movie", year: 2024,
        imdbRating: null, imdbVotes: null, groups: ["Files"], qualities: ["720p"], f2myPageUrl: "https://www.f2my.top/1/example/",
        links: [
          { label: "Other", url: "https://other.test/example.mkv", size: null, group: "Files", quality: "720p", release: null },
          { label: "Old F2MY", url: "https://old.test/Film/Example.1080p.mkv", size: null, group: "Files", quality: "1080p", release: null, fileName: "Example.1080p.mkv", sourceProvider: "f2my", sourceBaseId: "f2my-old", sourceRelativePath: "Film/Example.1080p.mkv" },
        ],
      }],
    }));
    await writeFile(sourcePath, JSON.stringify({
      sourceUrl: "https://www.f2my.top",
      items: [{
        id: "tt1234567", imdbCode: "tt1234567", imdbUrl: "https://www.imdb.com/title/tt1234567/", title: "Example", type: "movie", year: 2024,
        imdbRating: null, imdbVotes: null, groups: ["Files"], qualities: ["1080p", "480p"], f2myPageUrl: "https://www.f2my.top/1/example/",
        links: [
          { label: "F2MY 1080", url: "https://new.test/Film/Example.1080p.mkv", size: null, group: "Files", quality: "1080p", release: null, fileName: "Example.1080p.mkv", sourceProvider: "f2my", sourceBaseId: "f2my-new", sourceRelativePath: "Film/Example.1080p.mkv" },
          { label: "F2MY 480", url: "https://new.test/Film/Example.480p.mkv", size: null, group: "Files", quality: "480p", release: null, fileName: "Example.480p.mkv", sourceProvider: "f2my", sourceBaseId: "f2my-new", sourceRelativePath: "Film/Example.480p.mkv" },
        ],
      }],
    }));

    await execFileAsync(process.execPath, ["scripts/merge-f2my-source.mjs", existingPath, sourcePath, existingPath, reportPath], { cwd: process.cwd() });
    const catalog = JSON.parse(await readFile(existingPath, "utf8"));
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    assert.equal(catalog.items.length, 1);
    assert.equal(catalog.items[0].links.length, 3);
    assert.ok(catalog.items[0].links.some((link) => link.url === "https://other.test/example.mkv"));
    assert.ok(catalog.items[0].links.some((link) => link.url === "https://new.test/Film/Example.1080p.mkv"));
    assert.equal(report.newLinks, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
