# DonyayeSerial download server mapping

## Fix (November 3, 2026)

The archive distributes files across independent `dls` servers. The old
runtime mapping preserved `dls*.aparatchi-dlcenter.top`, but replaced links
on `dls*.varzeshha3-uploader.top` with the single base configured in
`data/vod-settings.json`. A file on `dls4` could therefore be requested
from `dls7`, where it does not exist. This is a mapping error, not evidence
of VPN blocking or a browser autoplay problem.

`lib/download-settings.ts` now preserves the exact source URL for both
domain generations, including the server number, protocol, path and query.
The provider's redirects remain responsible for locating its current CDN.
No domain aliases or server numbers are guessed. The administrator's base
still acts as a fallback for unknown legacy mirrors whose actual pathname
contains `/DonyayeSerial/`. A nested URL in a query or fragment is not
treated as a mirror path; malformed and non-HTTP URLs are unchanged.

The rule lives in `rewriteDownloadUrl`, so direct callers and catalog
loading agree. Title pages, online sources, watch-together sources,
download exports and bot download gates use the corrected catalog URLs.
Supplementary links already preserve their original provider URLs. The
admin preview also stops suggesting that changing the fallback will move
a known provider URL to another server.

## Reported example

For `tt1155056` (I Love You, Man), the 1080p SoftSub file stays on
`dls4.varzeshha3-uploader.top`; it is no longer flattened to the configured
`dls7.aparatchi-dlcenter.top`. The 720p source stays on its recorded `dls7`.

The earlier diagnostic scan inspected 232,303 DonyayeSerial link entries.
Of those, 34,936 legacy-domain links were being rewritten, including
27,326 cross-server rewrites. These counts describe URL mapping, not a live
download test of every entry. Some source URLs are independently missing;
preserving the correct server cannot restore a file removed upstream.

## Verification

Regression coverage includes both domain generations and HTTP/HTTPS,
different server numbers, query/fragment preservation, unknown-mirror
fallbacks, unrelated URLs, non-mutating catalog loading, and plain/compact
five-second download gates. Fixture-based integration tests exercise the
real catalog loader, download API, watch-room API and bot serializer
without external network calls.

```sh
node --import tsx --test scripts/tests/download-settings.test.ts scripts/tests/download-settings.integration.test.ts scripts/tests/playback-help.test.ts scripts/tests/link-labels.test.ts scripts/tests/content-restrictions.test.ts scripts/tests/bot-api.test.ts scripts/tests/donyaye-archive.test.mjs
npx tsc --noEmit
```

The local all-title mapping scan and bounded live media-header probes are
recorded in ignored `.media-cache/donyaye-audit/mapping-fix-verification.json`.
The post-fix scan covered 28,695 titles and 539,828 total link entries:
all 232,303 DonyayeSerial entries retained their source URLs, with zero
server changes. All 16 live samples returned HTTP 206 and a valid media
header, including the reported title's 1080p/720p files and the 15
previously confirmed rewrite-induced failures.
Each live probe requests only bytes 0–1023, follows approved provider CDN
redirects, and checks the media signature. This does not verify complete
downloads, browser codec support or availability from every country.

## Deployment and old links

This is a code fix: no catalog rewrite, archive re-scrape, data migration or
Git LFS upload is required. Build the new commit and restart the application
using the existing deployment procedure. No production deployment is
performed as part of this change.

Restarting clears the application's in-memory API caches. If a reverse
proxy or CDN cached title/download/watch-room responses, purge those paths
or allow their cache lifetime to expire (currently up to 15 minutes for
the affected APIs).

Already copied download-gate URLs contain their old target. This change
does not guess a different server for those URLs: reopen the title page
after the deployment/cache refresh and copy a newly generated link. Old
Telegram posts similarly retain their embedded target until regenerated.
The five-second download page and existing content restrictions are
unchanged.
