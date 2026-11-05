import assert from "node:assert/strict";
import test from "node:test";
import { compatibleMediaIndex, isAppleMediaBrowser, mediaMimeType, nextUntriedMusicSource } from "../../lib/media-compatibility";
import { musicRelayHeaders } from "../../lib/music-media-response";

const ios = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1";
const probe = { canPlayType: (mime: string): CanPlayTypeResult => ["video/mp4", "audio/mpeg", "audio/mp4"].includes(mime) ? "probably" : "" };

test("Safari picks a native alternative for the same episode without changing another browser's provider policy", () => {
  const sources = [{ url: "https://a.test/Film.mkv", season: 1, episode: 2 }, { url: "https://a.test/Other.mp4", season: 1, episode: 3 }, { url: "https://a.test/Film.mp4", season: 1, episode: 2 }];
  assert.equal(compatibleMediaIndex(sources, 0, probe, ios), 2);
  assert.equal(compatibleMediaIndex(sources.slice(0, 2), 0, probe, ios), 0, "Never change the episode to hide a format error");
  assert.equal(compatibleMediaIndex(sources, 0, probe, "AppleWebKit Chrome/140 Safari/537"), 0);
  assert.equal(compatibleMediaIndex([{ url: "https://a.test/song.ogg" }, { url: "https://a.test/song.mp3" }], 0, probe, ios, true), 1);
  assert.equal(isAppleMediaBrowser(ios.replace("Version/18.0", "CriOS/140")), true);
  assert.equal(mediaMimeType("/api/music/library/track.mp3"), "audio/mpeg");
});

test("music fallback terminates after each distinct source fails; explicit retry can clear the failure set", () => {
  const sources = [{ url: "a" }, { url: "b" }, { url: "c", available: false }];
  const failed = new Set(["a"]);
  assert.equal(nextUntriedMusicSource(sources, 0, failed), 1);
  failed.add("b"); assert.equal(nextUntriedMusicSource(sources, 1, failed), -1);
  failed.clear(); assert.equal(nextUntriedMusicSource(sources, 1, failed), 0);
});

test("valid partial MP3 responses advertise byte ranges without caching partial bytes as whole songs", () => {
  const response = new Response(null, { status: 206, headers: { "Content-Type": "application/octet-stream", "Content-Range": "bytes 0-1/9000", "Content-Length": "2" } });
  const headers = musicRelayHeaders(response, "https://dl.rozmusic.com/song.mp3", false, "bytes=0-1");
  assert.equal(headers.get("Content-Type"), "audio/mpeg"); assert.equal(headers.get("Accept-Ranges"), "bytes");
  assert.equal(headers.get("Content-Range"), "bytes 0-1/9000"); assert.equal(headers.get("Content-Length"), "2");
  assert.match(headers.get("Cache-Control")!, /no-store/); assert.equal(headers.get("Vary"), "Range");
  const ignored = musicRelayHeaders(new Response(null), "https://cdn.test/song.mp3", false, "bytes=0-1");
  assert.equal(ignored.get("Accept-Ranges"), null, "Do not pretend that an upstream supports ranges");
});
