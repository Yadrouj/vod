# Exact Persian/English subtitles

## Selection order

1. Inspect subtitle/caption tracks actually exposed by the browser's media engine.
   Prefer Persian, then English; other languages and unknown tracks are excluded.
2. Use a language-tagged subtitle supplied with the selected catalog release.
3. For a release without usable included text, resolve public Subzone download
   buttons for the exact title/year and, for series, the playing season/episode.
   Automatic mode tries a small number of matching candidates if a package fails.

SoftSub in a filename is **not** proof that the browser can demux that file's
embedded subtitle stream. No full movie download, server transcoding or fabricated
embedded track is attempted. The picker explains an unsupported embedded track
and offers the exact external match. HardSub is burned into the picture: automatic
mode avoids putting another subtitle over it. Manual selection remains available.

## Exact matching and stable direct downloads

`/api/subtitles/:id` derives its query from the catalog, not a user-supplied `q`.
Movies require the complete normalized name and release year when known. Series
resolve the correct season before fetching the language listings. A later season's
release year is not compared to the show's premiere year. The IMDb identity is
cross-checked when the provider publishes it. Extras, documentaries about the
show, same-name remakes and similarly named titles do not match by substring.

Only provider-declared Persian/English rows are returned. A download URL must be
read from the matching detail page's actual `downloadButton`; a guessed URL or a
search-page link is never presented as a subtitle file. The stable published
download endpoint may redirect to the provider's temporary CDN token. SarvNema
resolves that at request time instead of persisting an expiring CDN URL.

`/api/subtitles/track` includes language/season/episode in the request and cache
identity. It selects the requested file from a ZIP, not the first/largest member.
Known foreign languages, different episodes and ambiguous multi-file packs are
rejected. Compressed bytes, each extracted file, cumulative decompression and
archive entry counts are bounded. Redirects stay on the trusted host allowlist;
userinfo and nonstandard ports are rejected. Existing SRT/ASS/VTT normalization,
UTF-8/UTF-16/Windows-1256 decoding and cue sanitization remain in use.

## Player UX

- Full-screen mobile dialog, with the active track and on/off switch at the top.
- Two language choices: Persian and English; three results initially, with a
  "more releases" action when needed. Included tracks precede online candidates.
- One "Add subtitle" entry point: choose language, then upload SRT/VTT/ASS/ZIP or
  paste a direct link. A season ZIP uses the playing episode automatically.
- Timing and appearance stay separate from track selection. Appearance is stored
  locally; room hosts retain control of shared selection, while personal timing
  and style stay local.
- The separate download list below the player loads only when expanded. It no
  longer starts an additional all-seasons lookup on every watch-page load.
- Online results are scoped to the current title/episode, so old episode results
  cannot briefly become the new episode's automatic selection.

## Verification

```sh
npm run test:subtitles
```

Set `LIVE_SUBTITLE_TESTS=1` to include the bounded public-provider check. This
downloads **two subtitle ZIPs**, not videos. On 2026-11-17 the live Persian pack for
Breaking Bad S01 had **episode 2 as its first member and episode 1 as its last**.
The resolver selected S01E01 correctly: 678 Persian cues and 587 English cues,
with HTTP 200 and VTT output. This reproduces the precise failure mode of selecting
the first archive member.

Browser regression: `scripts/tests/subtitle-player.browser.test.mjs`, with
`SUBTITLE_TEST_ORIGIN` pointing to a local app and `PLAYWRIGHT_MODULE` pointing to
the installed Playwright module. Media and lookup requests in that test are
fixtures, so no full film is downloaded. It covers native priority, language
filtering, the playing episode, ZIP import, timing/style, and small/mobile layouts.
