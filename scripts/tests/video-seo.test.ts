import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StructuredData } from "../../components/structured-data";
import { FILM_LANDING_SEO, MUSIC_LANDING_SEO, landingJsonLd } from "../../lib/landing-seo";
import { musicJsonLd, SITE_URL, videoJsonLd } from "../../lib/seo";
import type { MusicTrack } from "../../lib/music-types";
import type { VodItem } from "../../lib/types";

const artist = { name: "Fixture Artist", slug: "fixture-artist", sourceUrl: "https://publisher.example/artist" };
const track: MusicTrack = {
  id: "fixture-video", kind: "video", title: "Fixture concert", persianTitle: "", artist, artists: [artist],
  coverUrl: "https://publisher.example/video-thumbnail.jpg", description: "A concert performance.",
  publishedAt: "2026-09-11T13:54:57+00:00", addedAt: "2026-11-03T10:00:00Z",
  sourceUrl: "https://publisher.example/concert", category: "Music videos", folder: { root: "Music Video", year: null, month: null, day: null },
  sources: [{ url: "https://media.example/performance.mp4", label: "1080p", kind: "stream" }],
};
const film: VodItem = {
  id: "fixture-film", imdbCode: "tt1155056", title: "Fixture film", imdbUrl: null, type: "movie", year: 2009,
  releaseDate: "2009-03-20", imdbRating: 7, imdbVotes: 1, groups: [], qualities: [], links: [],
  posterUrl: "https://images.example/poster.jpg", backdropUrl: "https://images.example/backdrop.jpg", runtimeMinutes: 100,
};

function videos(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(videos);
  if (!value || typeof value !== "object") return [];
  const node = value as Record<string, unknown>;
  return [...([node["@type"]].flat().includes("VideoObject") ? [node] : []), ...Object.values(node).flatMap(videos)];
}

test("music video JSON-LD includes the real thumbnail, publication date and WatchAction", () => {
  const [video] = videos(musicJsonLd(track));
  assert.ok(video);
  assert.deepEqual(video.thumbnailUrl, [track.coverUrl]);
  assert.equal(video.uploadDate, track.publishedAt);
  assert.equal(video.contentUrl, track.sources[0].url);
  assert.equal((video.potentialAction as Record<string, unknown>)["@type"], "WatchAction");
});

test("thumbnail URLs are absolute HTTP(S), deduplicated, and never brand-placeholder fallbacks", () => {
  const [video] = videos(musicJsonLd({ ...track, coverUrl: "/covers/concert.jpg", album: {
    id: "album", title: "Album", sourceUrl: track.sourceUrl, coverUrl: `${SITE_URL}/covers/concert.jpg`,
  } }));
  assert.deepEqual(video.thumbnailUrl, [`${SITE_URL}/covers/concert.jpg`]);
  const album = { id: "album", title: "Album", sourceUrl: track.sourceUrl, coverUrl: "https://publisher.example/album.jpg" };
  assert.deepEqual(videos(musicJsonLd({ ...track, coverUrl: null, album }))[0].thumbnailUrl, [album.coverUrl]);
  for (const coverUrl of [null, "", " ", "javascript:alert(1)", "data:image/png;base64,AA==", "https://user:secret@images.example/a.jpg", "not-an-image-url"]) {
    const data = musicJsonLd({ ...track, coverUrl });
    assert.equal(videos(data).length, 0, String(coverUrl));
    assert.equal(data["@graph"][0]["@type"], "WebPage", "keep page metadata without claiming an incomplete video");
  }
});

test("missing or invalid publication dates never become a fabricated VideoObject date", () => {
  for (const publishedAt of [null, "", "2026", "2026-02-30", "2026-13-01", "yesterday", "2026-09-11T99:00:00Z"]) {
    assert.equal(videos(musicJsonLd({ ...track, publishedAt })).length, 0, String(publishedAt));
  }
  for (const publishedAt of ["2024-02-29", "2026-09-11T13:54:57+03:30", "2026-09-11T13:54:57.123Z"]) {
    assert.equal(videos(musicJsonLd({ ...track, publishedAt }))[0].uploadDate, publishedAt);
  }
});

test("unavailable streams are not advertised as the video's content URL", () => {
  const source = { url: "https://media.example/working.mp4", label: "720p", kind: "download" as const };
  const [video] = videos(musicJsonLd({ ...track, sources: [{ ...track.sources[0], available: false }, source] }));
  assert.equal(video.contentUrl, source.url);
});

test("audio tracks remain MusicRecording, without video-only thumbnail requirements", () => {
  const entity = musicJsonLd({ ...track, kind: "track", coverUrl: null, publishedAt: null })["@graph"][0] as Record<string, unknown>;
  assert.equal(entity["@type"], "MusicRecording");
  assert.equal(videos(entity).length, 0);
  assert.equal((entity.potentialAction as Record<string, unknown>)["@type"], "ListenAction");
});

test("film and series watch markup includes nonempty thumbnails and a known full publication date", () => {
  for (const type of ["movie", "tvSeries"]) {
    const data = videoJsonLd({ ...film, type }, "https://media.example/film.mp4");
    assert.ok(data);
    assert.deepEqual(data.thumbnailUrl, [film.backdropUrl, film.posterUrl]);
    assert.equal(data.uploadDate, film.releaseDate);
  }
  for (const item of [
    { ...film, posterUrl: null, backdropUrl: null },
    { ...film, releaseDate: null },
    { ...film, releaseDate: "2009" },
    { ...film, title: " " },
  ]) assert.equal(videoJsonLd(item, "https://media.example/film.mp4"), null);
  assert.equal(videoJsonLd(film, null), null);
  assert.equal(videoJsonLd(film, "javascript:alert(1)"), null);
});

test("landing topics describe concepts, not incomplete Movie or VideoObject instances", () => {
  for (const [content, pathname] of [[FILM_LANDING_SEO, "/"], [MUSIC_LANDING_SEO, "/music"]] as const) {
    const data = landingJsonLd(content, pathname);
    assert.equal(videos(data).length, 0);
    const page = data["@graph"][0];
    assert.equal(page["@type"], "WebPage");
    assert.ok(page.about);
    for (const topic of page.about) {
      assert.equal(topic["@type"], "Thing");
      assert.ok(topic.name);
    }
  }
});

test("server-rendered JSON-LD stays parseable and safe for video titles containing markup", () => {
  const title = '</script><script>alert("title")</script>';
  const html = renderToStaticMarkup(createElement(StructuredData, { data: musicJsonLd({ ...track, title, persianTitle: title }) }));
  assert.equal([...html.matchAll(/<script\b/g)].length, 1);
  const json = JSON.parse(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]);
  assert.equal(videos(json)[0].name, title);
  assert.ok(videos(json)[0].thumbnailUrl);
});
