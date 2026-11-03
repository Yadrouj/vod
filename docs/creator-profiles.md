# 100 directors and 100 singers

Two independent, **unranked editorial discovery collections** combine classic,
contemporary, Iranian and international creators. These are not a copied BFI,
IMDb, Rolling Stone or chart ranking, and collection order is not a score.

## Public routes

- `/people/directors`: 100 directors; Persian/English search and archive-availability filter.
- `/person/{id}`: existing canonical person routes, now enriched for these directors.
- `/music/artists/top-100`: 100 singers; search, archive filter and missing-work report.
- `/music/artists/{slug}`: canonical singer profiles, including people with no local audio.
- `/data/creator-music-gaps.json`: selected unmatched recording names, albums,
  cover references and original release links. **No audio is included.**

Both parent directories link to the collections. The general artist directory
includes metadata-only curated singers and searches their English/Persian names.
Existing legacy singer links continue resolving. Existing tracks, stable IDs,
download gates, content restrictions and player behavior are not replaced.

## Identity, editorial and media provenance

`content/creators/selections.mjs` contains exactly 100 individuals in each list,
Persian names, original short introductions and reviewed transliteration aliases.
Wikipedia summaries resolve to Wikidata human entities (`Q5`) before publication.
IMDb person IDs connect filmmakers to the archive. Wikidata structured facts
and descriptions are CC0; source URLs remain visible on profiles.

English biographical excerpts are separately attributed to the exact Wikipedia
revision and authors/history under **CC BY-SA 4.0**. They are not claimed as
original SarvNema reporting, translated without attribution, or mixed into the
original Persian introduction. No unsourced private-life stories are generated.

Portraits use Commons file-level metadata: artist, file description page and
license. Only recognized free/PD licenses are imported; otherwise show initials,
not a random album cover or a Wikipedia fair-use photo under the text license.
The photo license is separate from the biography license. Source metadata HTML
is reduced to plain text; it is never inserted as raw HTML.
Remote portrait CDNs may throttle bulk requests (HTTP 429); the UI retains an
initials placeholder on failure instead of exposing a broken image. Portrait
availability is not confused with the availability of a music recording.

Apple Music/iTunes supplies up to 12 representative recording names and covers
per singer. This is **not an exhaustive discography, a popularity ranking or a
claim of complete global coverage**. Exact reviewed Apple artist IDs are used
where available; several old Wikidata IDs and spelling variants required reviewed
overrides. Do not attach a soundalike, tribute band or same-first-name artist.
Cover cards link to the actual store release. Preview audio is neither imported
nor used as a SarvNema track; music files are not downloaded by this workflow.

## Archive associations and availability

Directors show the union of their actual archived person/alias associations.
Per-title `Director`/`Directors` credits are checked individually. Acting,
writing and documentary appearances remain in a separate related-work section;
a person-level Director tag alone never makes every associated film their work
as director. Missing titles are not fabricated. Canonical title links preserve
the existing quality/version selector and restrictions.

Singers combine **all** exact-matched archive identities, including legacy and
tagged-library aliases. Related local tracks are deduplicated and paginated at
50 per page using the existing player. Recording title matching is exact after
normalization of punctuation, diacritics and explicit remaster labels; a shared
word is not a match. Runtime availability is recomputed against the current
music index, so deleted recordings cannot retain a stale play link.

An unmatched recording shows its real name, album cover, release source and
"not in the SarvNema archive" label, with **no** internal play/download control.
An artist with zero tracks still has a real profile; metadata does not promise
a download and JSON-LD does not fabricate a ListenAction. Individual singer
profiles use Person schema; existing band pages retain MusicGroup schema.

The director association snapshot and the downloadable gaps report are dated
snapshots. Refresh after catalog/people/artist-index rebuilds to reflect newly
imported works. They do not claim the entire worldwide filmography exists here.

## Build and refresh

```sh
# One-time/reviewed external research, cached in ignored .media-cache:
node scripts/research-creator-profiles.mjs
# Publish the verified metadata and join the current archive:
node --import tsx --max-old-space-size=2304 scripts/build-creator-profiles.mjs
# Later archive-only rebuild, using the shipped snapshot; no network/cache needed:
node --import tsx --max-old-space-size=2304 scripts/build-creator-profiles.mjs --refresh-archive
# Tests:
node --import tsx --test scripts/tests/creator-profiles.test.tsx
node --import tsx --max-old-space-size=2304 --test scripts/tests/creator-sitemap.test.ts
npx tsc --noEmit
```

The research job limits new Apple requests to fewer than 20/minute, uses bounded
timeouts/retries, validates every human identity and caches API responses.
Publication is all-or-nothing for the two 100-person collections. Archive-only
refresh preserves research dates rather than claiming the sources were rechecked.

Outputs are `public/data/creator-profiles.json` and
`public/data/creator-music-gaps.json`, ordinary Git JSON, **not new large LFS
catalogs**. Base music/VOD datasets are not rewritten. Profile data is read on
the server with a single-flight, mtime-aware cache; it is not bundled into the
browser. No external research runs during a visitor's page request.

## Later deployment

Ship the code and both snapshots together. If the server uses `VOD_DATA_DIR`,
copy the two JSON files into that data directory without replacing live archives.
For the public static gaps download, also ship `public/data/creator-music-gaps.json`
with the web artifact. Rebuild/restart normally, then verify both collection pages,
sample profiles, zero-track cases and the main sitemap parts. The sitemap includes
the two hubs and all 200 canonical profiles, including metadata-only singers.
Both `watch-party-server.ts` and `infra/nginx.conf` make an **exact-path exception**
for the small metadata-only gaps download. All other `/data/` catalogs remain
blocked. Ship both changes together when using the bundled Nginx configuration;
validate `nginx -t` in that deployment environment before reloading it.
**This task does not deploy to the production server or post to Telegram.**
