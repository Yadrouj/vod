import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { YouTubeSource } from "../../lib/old-iranian-media";
import { canonicalYouTubeUrl, youtubeDownloadGuide } from "../../components/youtube-download-guide";

const require = createRequire(import.meta.url);
require.extensions[".css"] = module => { module.exports = {}; };
const { YouTubePlayer } = require("../../components/youtube-player.tsx") as typeof import("../../components/youtube-player");

const source: YouTubeSource = {
  videoId: "YE7VzlLtp-4", title: "Big Buck Bunny", channel: "Blender Foundation",
  sourceUrl: "https://www.youtube.com/watch?v=YE7VzlLtp-4",
  thumbnailUrl: "https://i.ytimg.com/vi/YE7VzlLtp-4/hqdefault.jpg",
  evidenceUrl: "https://peach.blender.org/about/", playbackStatus: "not-tested",
};

test("download command is video-specific and pinned to the reviewed Yoinks version", () => {
  assert.deepEqual(youtubeDownloadGuide(source, source.title), {
    sourceUrl: source.sourceUrl,
    command: 'npx yoinks@0.3.1 "https://www.youtube.com/watch?v=YE7VzlLtp-4"',
  });
  assert.match(youtubeDownloadGuide({ ...source, videoId: "-AvdB_WeSiM" }, source.title)!.command, /watch\?v=-AvdB_WeSiM"$/);
});

test("malformed IDs and URL/shell metacharacters cannot enter a command", () => {
  for (const videoId of ["", "short", "YE7VzlLtp-4\n", "YE7VzlLtp-4&list=x", 'a";whoami;', "$(whoami)", "https://example.test/video", "1234567890é"]) {
    assert.equal(youtubeDownloadGuide({ ...source, videoId }, source.title), null, videoId);
  }
  assert.equal(youtubeDownloadGuide({ ...source, sourceUrl: 'https://evil.test/"; whoami; #', title: "$(whoami)" }, '"; whoami; #')?.command,
    'npx yoinks@0.3.1 "https://www.youtube.com/watch?v=YE7VzlLtp-4"');
});

test("unavailable and copyright-blocked references receive no download command", () => {
  assert.equal(youtubeDownloadGuide({ ...source, playbackStatus: "unavailable" }, source.title), null);
  assert.equal(youtubeDownloadGuide(source, "Paris Has Fallen"), null);
  assert.equal(youtubeDownloadGuide({ ...source, title: "Paris Has Fallen" }, source.title), null);
  assert.equal(youtubeDownloadGuide({ ...source, sourceUrl: "https://example.test/tt33184638" }, source.title), null);
});

test("player renders a native disclosure, labeled read-only command and honest limitations", () => {
  const markup = renderToStaticMarkup(<YouTubePlayer source={source} title={source.title} />);
  assert.match(markup, /<details[^>]*data-youtube-download-guidance/);
  assert.match(markup, /<summary[^>]*>/);
  assert.match(markup, /دانلود از YouTube/);
  assert.match(markup, /نیازمند ابزار دسکتاپ/);
  assert.match(markup, /دانلود مستقیم در مرورگر نیست/);
  assert.match(markup, /موفقیت دانلود تضمین نمی‌شود/);
  assert.match(markup, /هیچ دانلود موفقی تأیید نشده/);
  assert.match(markup, /عدم اتصال این شبکه/);
  assert.match(markup, /۲۲ یا بالاتر/);
  assert.match(markup, /کپی لینک یوتیوب/);
  assert.match(markup, /دور نمی‌زنند/);
  assert.match(markup, /مجوز نگهداری/);
  assert.match(markup, /role="status" aria-live="polite" aria-atomic="true"/);
  const fieldId = /<textarea id="([^"]+)"/.exec(markup)?.[1];
  assert.ok(fieldId);
  assert.ok(markup.includes(`<label for="${fieldId}">`));
  assert.match(markup, /<textarea[^>]*readOnly=""[^>]*dir="ltr"/);
  assert.match(markup, /npx yoinks@0\.3\.1 &quot;https:\/\/www\.youtube\.com\/watch\?v=YE7VzlLtp-4&quot;/);
  assert.match(markup, /aria-label="کپی دستور دانلود Big Buck Bunny"/);
  assert.doesNotMatch(markup, /<iframe|download="|\/api\//);
});

test("all YouTube actions use the canonical video URL, never a search or injected source link", () => {
  const markup = renderToStaticMarkup(<YouTubePlayer source={{ ...source, sourceUrl: "https://example.test/search?query=film" }} title={source.title} />);
  assert.doesNotMatch(markup, /example\.test/);
  assert.match(markup, /https:\/\/www\.youtube\.com\/watch\?v=YE7VzlLtp-4/);
  assert.equal(canonicalYouTubeUrl("YE7VzlLtp-4\n"), null);
  const invalid = renderToStaticMarkup(<YouTubePlayer source={{ ...source, videoId: "invalid" }} title={source.title} />);
  assert.match(invalid, /شناسهٔ این ویدیوی YouTube معتبر نیست/);
  assert.doesNotMatch(invalid, /<a |<iframe|npx yoinks|<textarea/);
});

test("original source, channel and identification evidence remain attributed", () => {
  const markup = renderToStaticMarkup(<YouTubePlayer source={source} title={source.title} />);
  assert.ok(markup.includes(`href="${source.sourceUrl}"`));
  assert.ok(markup.includes(`href="${source.evidenceUrl}"`));
  assert.match(markup, /Blender Foundation/);
  assert.match(markup, /https:\/\/github\.com\/pablostanley\/yoinks/);
  assert.match(markup, /https:\/\/support\.google\.com\/youtube\/answer\/2802167/);
});

test("blocked titles expose neither an embed, source link nor a command", () => {
  const markup = renderToStaticMarkup(<YouTubePlayer source={source} title="Paris Has Fallen" />);
  assert.match(markup, /گزارش نقض حق نشر/);
  assert.doesNotMatch(markup, /data-youtube-download-guidance|<iframe|<textarea|<a |npx|youtube\.com/);
});

test("known-unavailable sources do not advertise a download CTA", () => {
  const markup = renderToStaticMarkup(<YouTubePlayer source={{ ...source, playbackStatus: "unavailable" }} title={source.title} />);
  assert.match(markup, /دستور دانلود ارائه نمی‌شود/);
  assert.doesNotMatch(markup, /data-youtube-download-guidance|<textarea|npx yoinks/);
});
