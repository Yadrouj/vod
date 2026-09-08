import assert from "node:assert/strict";
import test from "node:test";
import { findTrackArtwork } from "../enrich-music-artwork.mjs";
test("shared collection does not blindly assign its generic cover", () => {
 const track = { title: "My Song", sourceUrl: "https://rozmusic.com/a" };
 assert.equal(findTrackArtwork('<meta property="og:image" content="/generic.jpg">', track), null);
 assert.equal(findTrackArtwork('<img alt="My Song" src="/song.jpg">', track), "https://rozmusic.com/song.jpg");
 assert.equal(findTrackArtwork('<meta property="og:image" content="/song.jpg">', track, true), "https://rozmusic.com/song.jpg");
});
