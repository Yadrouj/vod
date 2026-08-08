import test from "node:test";
import assert from "node:assert/strict";
import {
  extractImdbIds,
  movieIdentityFromFile,
  parseDirectoryRows,
  parseSeasonEpisode,
  sourceEvidenceScore,
} from "../moviesho-source-lib.mjs";

test("parses Moviesho directory rows with exact file metadata", () => {
  const html = `
    <table><tbody>
      <tr><td class="link"><a href="../">Parent Directory</a></td><td class="size">-</td></tr>
      <tr><td class="link"><a href="Trying.S05E01.1080p.Farsi.Subbed.mkv">Trying.S05E01.1080p.Farsi.Subbed.mkv</a></td><td class="size">1.2 GiB</td><td class="date">2026-Aug-01 11:15</td></tr>
      <tr><td class="link"><a href="01.srt">01.srt</a></td><td class="size">44 KiB</td><td class="date">2026-Aug-01 11:15</td></tr>
    </tbody></table>`;
  const rows = parseDirectoryRows(html, "https://sr1.moviesho.com/Series/Trying/S05/");

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    name: "Trying.S05E01.1080p.Farsi.Subbed.mkv",
    url: "https://sr1.moviesho.com/Series/Trying/S05/Trying.S05E01.1080p.Farsi.Subbed.mkv",
    isDirectory: false,
    size: "1.2 GiB",
    modified: "2026-Aug-01 11:15",
  });
});

test("derives stable movie title and release year without using upload folders", () => {
  assert.deepEqual(movieIdentityFromFile("A.Letter.to.My.Youth.2026.1080p.Farsi.Subbed.mkv"), {
    title: "A Letter to My Youth",
    year: 2026,
    key: "a letter to my youth:2026",
  });
  assert.equal(movieIdentityFromFile("A.Hologram.for.the.King.1080p.WEB-DL.mkv").year, null);
});

test("matches episode coordinates from named video and numeric subtitle files", () => {
  assert.deepEqual(
    parseSeasonEpisode("https://sr1.moviesho.com/Series/Trying/S05/Trying.S05E08.1080p.mkv"),
    { season: 5, episode: 8 },
  );
  assert.deepEqual(
    parseSeasonEpisode("https://sr1.moviesho.com/Series/Trying/S05/08.srt"),
    { season: 5, episode: 8 },
  );
  assert.deepEqual(
    parseSeasonEpisode("https://sr1.moviesho.com/Series/Notes.from.the.Last.Row/Notes.from.the.Last.Row.E06.1080p.mkv"),
    { season: 1, episode: 6 },
  );
  assert.deepEqual(
    parseSeasonEpisode("https://sr1.moviesho.com/Series/Seasonless/03.srt"),
    { season: 1, episode: 3 },
  );
});

test("accepts a match only when IMDb and exact Moviesho source evidence coexist", () => {
  const html = `
    <a href="https://www.imdb.com/title/tt10982034" rel="nofollow noreferrer">IMDb</a>
    <a href="https://sr1.moviesho.com/Series/Trying/S05/Trying.S05E01.1080p.Farsi.Subbed.mkv">Download</a>`;
  assert.deepEqual(extractImdbIds(html), ["tt10982034"]);

  const exact = sourceEvidenceScore(html, {
    exactPaths: ["https://sr1.moviesho.com/Series/Trying/S05/Trying.S05E01.1080p.Farsi.Subbed.mkv"],
  });
  assert.equal(exact.accepted, true);
  assert.equal(exact.exactMatches, 1);

  const series = sourceEvidenceScore(html, { sourcePrefix: "/Series/Trying/" });
  assert.equal(series.accepted, true);
  assert.equal(series.prefixMatches, 1);

  const unrelated = sourceEvidenceScore(html, { sourcePrefix: "/Series/Forever/" });
  assert.equal(unrelated.accepted, false);
});
