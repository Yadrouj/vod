# Alternative playback sources and recovery

## November 5, 2026 refresh

- The local master catalog had 21,405 titles with direct DonyayeSerial media;
  8,383 already had at least one other provider (before expiry filtering).
- A fresh public-provider scan read 66 FamilyMovie titles / 3,411 source links.
  It was partial: some detail requests timed out, and other sites had no public
  downloads or were unreachable. A separate Moviesho scan read 60 recent titles
  / 1,695 links, but none matched a DonyayeSerial title in the local split data.
- For 16 exact-IMDb matches from the public scan, 1,307 alternative files passed
  HTTP range checks and actual Matroska/MP4 signature checks. The worker rejected
  ambiguous/mismatched episode identities, rather than guessing.
- These are verified file responses, not promises of codec compatibility or
  availability in every region. Only a small prefix was read, not full films.

The verified delta is `lib/data/alternative-source-links.json`, outside the LFS
archive and mounted public data. Runtime refreshes are stored in
`VOD_DATA_DIR/alternative-source-links.json` and merged on a 30-second cache.
No remote source is fetched during page rendering. Raw title files are unchanged.

## Playback policy

Online playback, title actions and watch-together APIs prefer other providers
before DonyayeSerial. Native browser formats remain preferred *within* each
provider tier; a DonyayeSerial MP4 cannot hide another provider's MKV. Original
DonyayeSerial releases remain selectable as fallbacks. Episodes stay chronological
and the provider preference applies within the exact season/episode.

Explicitly chosen source/resume links are respected. Passive saved progress from
DonyayeSerial upgrades to an available alternative for the same episode and
retains the remembered playback position. Expired signed media cannot be selected
as the default. Signatures are preserved; only the known FamilyMovie signature
fields are ignored for matching refreshed tokens of an identical file.

## Error recovery

An in-player recovery panel is visible in fullscreen and on mobile. It offers
Reload player, Next source (when available), and Choose source. Reload remounts
the media element, clears its error, and preserves the playback position. Next
source prefers another host/provider and never advances the episode. Failed
sources are not automatically retried in an endless cycle.

In rooms a retry is local: it does not rewind or interrupt other participants.
Only a host or participant with change-source permission can change the shared
source. One participant's local network error never silently changes everyone's
source or episode. A 20-second stalled-load watchdog also exposes recovery.

## Nightly refresh

Both existing public/curated refresh jobs now run
`scripts/refresh-alternative-sources.mjs` before publishing their catalog results.
The main catalog sync also verifies its curated matches. Existing scheduler
locks/window (03:00–07:00 Tehran) are unchanged; no duplicate daemon is introduced.
Dry-run catalog sync writes verification output only inside its staging directory.

The verification budget defaults to 800 files / four minutes per invocation,
with four concurrent bounded range checks, allowlisted media hosts/redirects,
and round-robin title coverage. Budget/network failures preserve prior results.
Signed FamilyMovie URLs expire: fresh daily source retrieval remains essential;
after expiry they are omitted instead of presented as working downloads.

Manual invocation (do not overlap the scheduler):

```sh
node scripts/refresh-alternative-sources.mjs SOURCE.json public/data/alternative-source-links.json REPORT.json
```

Use `ALTERNATIVE_SOURCE_PROBE_LIMIT` (max 4,000) and
`ALTERNATIVE_SOURCE_BUDGET_MS` for a bounded backfill.

## FJ iOS: registered, not scraped behind login

Requested source: https://fj-ios.com/

On November 5 the root redirected to `/login.php`; `robots.txt` returned
`User-agent: *` / `Disallow: /`. The public WordPress and sitemap endpoints were
not available. The registry now includes `fj-ios` as a gated provider, reporting
`robots-blocked` / `authentication-required`, with zero imported files. A blocked
optional provider does not prevent the other nightly providers from publishing.

An owner-authorized public API/export (and appropriate crawl permission) is
required to implement its actual archive adapter. No account was created, no
password requested, and no protected endpoints/downloads were bypassed. Do not
claim that this site's entire archive has been checked or imported.

The user-supplied `/pages/dl.php` sample for *Veins of the World* returned
HTTP 200 **HTML**, not a video: it displayed a subscription-required notice.
An `.mkv` value in its `f` query parameter does not make that handler a public
direct media file. The sample was checked without cookies or account access.

Production was not deployed by this change. Rebuild/restart the app and existing
maintenance service on deployment, preserving mounted data and environment files.
