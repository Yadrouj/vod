# Cinema detail pages

The title route now uses a scoped CSS module rather than overriding the global music theme.

- Desktop: left-hand poster/play action, compact title and synopsis, explicit best-file download with its icon on the physical left.
- Mobile: compact poster/title layout, full-width actions and a safe-area-aware playback/download dock. The old floating room launcher is hidden on these pages to prevent overlap.
- Downloads are the initial tab. `#downloads` activates it even after another tab was selected. Tabs support keyboard navigation in both directions.
- Season files are loaded on demand; failed requests can be retried. Episode source widgets mount only when expanded. Longer version lists are progressively revealed.
- Episode playback uses an exact catalog source URL, never a guessed URL or a trailer. Unsupported/external download variants remain downloadable without silently substituting another episode.
- The best-file shortcut selects the highest tagged resolution among release files, excluding previews, subtitles, archives and directories. It is not a guarantee of codec compatibility or source uptime.
- Trailer backgrounds use non-expired MP4/WebM metadata, preferring 720p. Missing expiration parameters no longer invalidate unsigned URLs. Videos are deferred, muted and paused outside the viewport or hidden tab. Reduced-motion and data-saving users opt in. Failed/absent/expired trailers retain the image; no full movie is used as a background fallback.

Validation:

```powershell
node --import tsx --test scripts/tests/title-presentation.test.ts scripts/tests/link-labels.test.ts
npx tsc --noEmit --incremental false
# PLAYWRIGHT_MODULE may point to an existing Playwright installation.
node scripts/smoke-title-detail.mjs
npm run build
```

The smoke test uses local film and series pages at 320–1440px, checks keyboard tabs and season TXT downloads, and exercises the trailer component with a small synthetic media fixture. It does not download movies or modify catalog records. External trailer/release availability remains dependent on each source.
