# Glorytoon publisher downloads

SarvNema extracts the exact `href` from public download anchors, rather than
guessing a CDN path from a movie title. Parent folder names are not quality
evidence: the supplied Emperor's New Groove 1080p file is inside a 720p folder.
Tooltip size, source URL, filename, extraction evidence and time are retained.

## What is currently included

The reviewed bundle (`lib/data/glorytoon-downloads.json`) contains **12 files for
five catalog titles**: eight videos and four separate dub audio downloads.
The first three exact file URLs were provided by the user; ordinary public HTTP
requests subsequently extracted ten anchors from three publisher articles
(one anchor was the already supplied Emperor file, so no duplicate was added).

| SarvNema page | Release | Evidence |
| --- | --- | --- |
| `/tt0120917#downloads` | The Emperor's New Groove (2000), 1080p/720p + separate audio | Actual publisher download anchors, including the supplied sample |
| `/tt2953050#downloads` | Encanto (2021), 720p | Exact file and publisher player page supplied by user |
| `/tt1667889#downloads` | Ice Age: Continental Drift (2012), 1080p | Exact file supplied by user; specific publisher article not yet established |
| `/tt1219342#downloads` | Legend of the Guardians (2010), 1080p/720p + separate audio | Actual publisher download anchors |
| `/tt3416828#downloads` | Ice Age: Collision Course (2016), 1080p/720p + two separate audio variants | Actual publisher download anchors |

These are **extracted links, not successful playback checks**. At implementation
time direct public page access worked briefly, then further crawling was stopped
by a Cloudflare challenge (including robots.txt). The download hostname failed
DNS resolution for all 12 file probes. Neither result proves the files have been
deleted. **The full archive crawl is incomplete.** Its queue is checkpointed.
The health probe keeps DNS/network failures `unverified`; only explicit 404/410
responses mark a file `unavailable`.

The title's download tab lists the publisher releases, their status and the
original publisher page. Downloads retain the existing five-second SarvNema gate.
Supplemental files do not replace working sources or enter automatic playback.
Separate dub audio, DTS/6-channel audio and trailers have distinct labels; even an
audio-only MKV cannot accidentally become a full-film player source.

## Public, sequential crawl

```sh
npm run scrape-glorytoon -- --verify
npm run scrape-glorytoon -- --full --retry --verify
```

The crawler checks robots first, follows public post/category/genre/pagination
anchors on the publisher's host sequentially, waits at least one second between
page requests and checkpoints after every page. Default budget: 80 pages / 15
minutes; `--full` permits up to 1,000 pages. It stops on authentication, redirects
requiring review, a Cloudflare challenge or a network error. Individual missing
pages are reported; transient 5xx pages are deferred for a later run. No challenge bypass,
cookie extraction, paid-content enumeration or generated media filenames.

Outputs:

- `public/data/glorytoon-downloads.json`: live supplemental download data (ignored
  by Git; can be mounted in production via the existing VOD data directory).
- `.media-cache/glorytoon/report.json`: actual pages read, anchors extracted,
  unmatched pages, blocked reasons and verification results.
- `.media-cache/glorytoon/state.json`: checked pages and pending queue.

A blocked run exits with code 2 and retains all prior links. A page ceiling/budget
run is `partial`, never a claim that every page was crawled. Re-run to continue;
`--retry` also revisits checked pages. Discovery never overwrites a previous health
result. `--verify` probes at most the first 1KB with a timeout and cancels the body;
a recognized media header is required for `available` (not a browser codec test).

## Import HTML saved by the user

If the user's browser can access a public page but automated access is blocked,
save the page HTML normally. Create a UTF-8 manifest in the same directory:

```json
{
  "pages": [
    {"url": "https://glorytoon.com/the-emperors-new-groove-glory", "file": "emperor.html"}
  ]
}
```

```sh
node scripts/scrape-glorytoon.mjs --offline --import=/path/to/manifest.json --verify
```

Only anchors actually present in those files are imported. Matching requires one
unambiguous IMDb identity or an exact catalog title plus release year; ambiguous
records stay in the report rather than being assigned to a sequel/remake. This
does not use a logged-in browser session or request protected media.

Run `npm run test:glorytoon` for parser, quality, audio separation, identity,
publisher-host validation, health evidence and preservation regression tests.
