# Subtitle download verification

The catalogue's existing subtitle provider is **Subzone (subzone.ir)**, not a
separately verified service named Subzero. Provider search and download links
now use HTTPS.

- Nested release lists no longer truncate subtitle rows before their download
  link. All listed release names are preserved.
- Search candidates must include the query words. Obvious companion clips and
  making-of titles are excluded when they are not part of the query.
- Persian and English candidates share the result budget instead of allowing
  Persian results to fill every slot.
- At most 24 results are resolved, in batches of four. Every returned download
  URL is read from the corresponding detail page's actual download button.
  Missing buttons are omitted, not replaced with an invented download URL.
- Store the publisher's HTTPS download endpoint, not the short-lived signed CDN
  redirect. Existing player conversion follows the redirect through its trusted
  host allowlist and converts the downloaded file to VTT.

Verification on 2026-11-10: actual Persian and English Breaking Bad season-five
downloads both returned HTTP 200 and valid WEBVTT through the track handler.
Regression tests: `node --import tsx --test scripts/tests/subtitle-source.test.ts`.

Limits: this is request-time discovery, not a completed full-catalogue backfill.
Release labels must still be checked against the chosen season and episode.
Automatic selection of a particular episode within a multi-file season ZIP is
not implemented by this change; the existing archive-selection behavior remains.
