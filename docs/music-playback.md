# Music playback lifecycle

The track page has one player with artwork, transport, progress, quality, volume,
lyrics, queue, downloads and listening-room controls. Visiting a track prepares
the player without autoplay. The listening-room button uses the engine's current
track, including selections made from its queue.

`MusicPlaybackProvider` owns one persistent `MusicPlayerEngine` in the root layout.
`MusicPlayer` registers a page slot. On a matching page, the host is positioned in
that slot and reserves its measured height. On other routes, started playback
becomes the compact floating player. Returning to the originating page or the
current track's detail page restores the inline presentation.

The host remains in the same body portal throughout these transitions. Do not
change its portal target, key it by pathname, or move the media element between
parents: those changes can reload or pause audio/video. A ResizeObserver plus
resize/scroll listeners aligns the host and slot without reparenting media.

Browsing a different track does not interrupt active playback; its Play button
explicitly replaces the current request. Unplayed previews never become visible
floating players. Fullscreen is an explicit action using the existing dialog.
Closing the floating player stops and unloads media. Entering Kids still unmounts
the adult playback provider through `AudienceBoundary`.

## Verification

With the local server running, set `PLAYWRIGHT_MODULE` to the installed
Playwright `index.mjs` and optionally `LOAD_BASE_URL` (default localhost:3004), then:

```sh
node scripts/smoke-music-inline.mjs
node scripts/smoke-music-refresh.mjs
node scripts/smoke-immersive-music.mjs
```

The inline smoke test serves an original silent WAV fixture. It verifies audio
and video elements, no autoplay/popup before playing, inline/dock/back transitions
without pause or reload events, matching room selection, queue changes, explicit
track replacement, fullscreen and 320–1440px layouts. External source availability
is independent of these UI and continuity checks. No deployment variables or
catalog migrations are required by this change.
