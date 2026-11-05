# Missing imported music files: exact-track recovery

Initial batch result (November 6, 2026): 4,990 imported tracks inventoried;
1,746 identities had candidates; 1,744 have a verified MP3 replacement in the
shipped bundle. The remaining 3,246 have no verified replacement from this
batch, including Moein's `melodify-6381` (Maandegar). The first pass checked
1,744 unique URLs; the continuation retried three unresolved identities and
recovered one more. These are bounded range checks, not 1,744 full-song plays.

## Extended list recovery (November 6, 2026)

The continuation has **1,993** imported songs with verified alternatives, a net
increase of **249** over the initial bundle. **2,997** remain without a verified
replacement; `melodify-6381` (Moein — Maandegar) is still among them.

- Paginated public RemiixBaz directory discovery found 56 playlist tables;
  3,978 unique source tracks were retained. All 56 playlist fetches succeeded.
- Singer archives at RozMusic and Musics-Fa were read as complete list pages,
  not individual song searches: 632 page records yielded 7,509 source tracks.
  All discovered pagination chains were exhausted except one archive that
  redirected outside the allowed archive path and was deliberately skipped.
- The first singer-archive pass was capped at eight pages per archive and a
  six-minute run budget. A checkpointed continuation with a 32-page cap
  completed the remaining list traversal; failed redirects are not completion.
- Existing alternatives were reviewed for explicit version markers. Nineteen
  source entries needed review: suitable replacements were recovered where
  possible, while one unsupported identity was removed from the generated
  alternative bundle. No original catalog song or local-file source was deleted.
- Bounded Chrome source tests played approximately three seconds of the newly
  recovered `melodify-4089` and `melodify-1330`, with nonzero playback time and
  valid duration. This is not a claim that every recovered song was played.

```sh
node scripts/scrape-remiixbaz.mjs --discover --delay-ms=1000
node scripts/recover-music-archive-lists.mjs
# For deeper checkpointed traversal, set ARCHIVE_RECOVERY_MAX_PAGES=32.
node scripts/melodify-source-recovery.mjs \
  --source-index=.media-cache/music/artist-archive-source.json \
  --source-index=.media-cache/music/remiixbaz-source.json \
  --continue-verified --revalidate-identities --write-verified
```

The identity review only touches the generated alternative-source bundle, never
the imported catalog. Include all contributing source snapshots when using
`--revalidate-identities`; otherwise a source missing from that input snapshot
could be excluded unnecessarily. `identity-review.json` records review entries,
and `unresolved.txt` lists the remaining imported identities. Probes still check
MP3 bytes and HTTP response, not acoustic fingerprints or complete-song decoding.

The 4,990-track library catalog is preserved, including IDs, artist references,
tags and original local-file sources. Missing file mounts are not fixed by
changing player error text.

Run `node scripts/melodify-source-recovery.mjs --write-verified` to compare the
import against the scraped catalog. This only considers whole normalized artist
and title identities with the same media kind; it does not fuzzy-match a remix,
another singer, a substring title or a video to an audio recording.

The script probes candidate HTTPS MP3 URLs with small range requests, checks
response status, rejects textual MIME types and checks MP3 prefix bytes. It
does not download full songs. A successful probe is not a complete browser
playback or identity-by-audio guarantee.

Outputs:

- `.media-cache/music-recovery/library.txt`: complete imported-track inventory.
- `.media-cache/music-recovery/report.json`: candidates, probe results and gaps.
- `.media-cache/music-recovery/verified-links.txt`: grouped verified direct links.
- `lib/data/melodify-source-replacements.json`: verified candidate sources with
  original provider-page attribution and check dates, shipped with code.

Runtime merging adds those sources ahead of the imported file source without
overwriting scraped data. Song pages and the catalog-backed music relay see
the same merged sources. The remaining unmatched songs still need individual
source discovery or restoration of the original read-only archive mount.

This is an explicit recovery task, not a new nightly job or an assertion that
every imported song has been recovered. Never use preview clips, search links
or an entire album as the replacement for an individual song.

## Batch source pages

`node scripts/scrape-remiixbaz.mjs --delay-ms=1000` refreshes complete public
playlist tables, not individual song searches. The current refresh retrieved
six successful lists (650 unique stored tracks / 40 artist credits):

- `https://remiixbaz.com/playlist/old-music/` — 100 rows
- `https://remiixbaz.com/playlist/siavash-ghomayshi/` — 98 rows
- `https://remiixbaz.com/playlist/ebi/` — 110 rows
- `https://remiixbaz.com/playlist/moein/` — 130 rows
- `https://remiixbaz.com/playlist/haydeh/` — 104 rows
- `https://remiixbaz.com/playlist/mahasti/` — 105 rows

The cached source snapshot is `.media-cache/music/remiixbaz-source.json`.
Pass it with `--source-index=.media-cache/music/remiixbaz-source.json` to the
recovery script to include newly refreshed lists. With `--continue-verified`,
previously verified entries are retained and only unresolved identities are
probed. Without that flag all candidate sources are checked afresh. Source
page refresh success does not itself verify every linked media file.

Bounded real Chrome source tests also advanced approximately three seconds for
`melodify-2193` (Moein, Paricheh), `melodify-1448` (Andy, Tabe To), and
`melodify-3798` (Siavash Ghomayshi, Bebakhsh). These test the replacement audio
URLs, not deployment of this code or every recovered file. One separate page
navigation failed with `ERR_CONNECTION_CLOSED`; the source tests were rerun in
an isolated browser page. No complete songs were downloaded by the verifier.
