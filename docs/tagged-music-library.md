# Tagged music library

The Melodify archive is **separate from scraped catalogs**: `public/data/melodify-library.json` is merged at read time. Audio stays on the server's read-only `/music-library` mount and is streamed through `/api/music/library/<id>.mp3`; do not commit MP3s or the checkpoint database.

## Current verified inventory (2026-09-29)

- 4,990 downloaded, nonempty MP3s; no missing downloaded files.
- 18 source tags, retained as many-to-many categories.
- 1,737 artist identities in the import, including collaborative performers. Exact normalized names/aliases reuse existing singer profiles.
- These IDs already existed in the previous export. This update restores their landing-page visibility, complete artist membership/counts, artwork, and category browsing; it does not claim another 4,990 unique additions.
- Failed/pending upstream downloads are excluded. Refreshing the catalog does not restart the Melodify crawler or fetch those unavailable files.

## Refresh safely on the server

From `/home/ubuntu/vod`, after updating the app image:

```sh
set -o pipefail
python3 scripts/export-melodify-library.py \
  /home/ubuntu/Documents/projects/vahid/melodify2/library \
  | docker run --rm -i --network none \
      --user "$(id -u):$(id -g)" \
      -v "$PWD/public/data:/app/public/data" \
      --entrypoint node vod-app scripts/import-melodify-library.mjs --stdin --dry-run
```

Check counts, then repeat **without `--dry-run`** to atomically replace only the library catalog. No app restart is required: all four music caches notice library changes within 30 seconds; already-open/cached pages can take their normal page refresh interval.

The exporter reads a SQLite transaction and only includes `status=done` files actually present under `tracks/`. It exports titles, artist names, artwork, categories and filenames—not upstream signed media URLs. Empty snapshots and unexpected removal of published tracks stop the import. Investigate missing files before explicitly permitting `--allow-removals`.

For an offline metadata snapshot, use `--output=<file>` on the exporter and `--input=<file>` on the importer. Re-running an unchanged snapshot preserves IDs, import dates, catalog version and counts.

## Where users find the music

- `/music`: the **تازه‌های آرشیو** shelf and tag-category navigation.
- `/music/collections/melodify-tagged-library`: the complete tagged-library playlist, with all imported tracks in arrival order.
- `/music?added=library`: the entire imported archive, 80 tracks per page.
- `/music?category=Chill` (or any source tag): all matching tracks, with filter-preserving pagination.
- `/music/artists/<slug>`: existing and imported tracks together, including all collaborators.

`addedAt` means *new to SarvNema*, not a new release. Unknown release dates stay unknown. Homepage payloads include only 48 imported tracks (24 on the film homepage); full filters and profiles use the complete catalog.

## Verification

```sh
node --import tsx --test scripts/tests/melodify-library.test.mjs scripts/tests/music-library-merge.test.ts scripts/tests/music-refresh.test.ts
node scripts/smoke-music-library.mjs
```

The browser smoke test requires Playwright/Chrome (or `PLAYWRIGHT_MODULE` pointing to an installed module) and a local running site at `LOAD_BASE_URL`, default `http://localhost:3004`. Test production audio independently with a small `Range: bytes=0-1023` request; a valid stream returns HTTP 206 and `audio/mpeg`.
