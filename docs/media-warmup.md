# Selected-media prebuffering

Film and music players now request native prebuffering when their selected
source is mounted, before the user presses Play. This uses the same media DOM
element as playback: no second download, Blob URL, service worker, or full-film
Cache Storage copy is created. Music previews without media ownership do not
prefetch, so the persistent player remains the single owner of the stream.

The shared hook requests `preload=auto` in visible tabs on ordinary connections.
It falls back to `metadata` with Data Saver, 2G/slow-2G, hidden tabs, or once a
paused player has at least ten seconds buffered around its playback position.
Only the current source is warmed, never every quality, episode, or queue item.
Source switches and retries reattach the listeners to the new media element.

Important: HTML preload is advisory. Browsers may ignore or exceed the requested
buffer, especially Safari/mobile devices. This is not a strict byte cap, offline
storage, or a guarantee that an unavailable remote source becomes playable.
Existing server headers determine HTTP caching; no remote cache directives are
overridden. No automatic sound/playback is introduced.

Validation: media-warmup unit tests, TypeScript and targeted ESLint. Existing
music-engine image lint warning is unrelated to this change.
