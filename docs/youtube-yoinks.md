# YouTube login and Yoinks investigation

Latest local retest, November 3, 2026: the pinned repository's actual
`download()` helper was run again on the same authorized Blender video.
It failed while contacting YouTube (10-second connection timeout); no MP4
was produced or verified. The evidence is in ignored
`.media-cache/yoinks-tests/authorized-O63hfL/report.json`. This independent
retest does not establish a working browser download or a login bypass.

## Implemented integration

The desktop-guidance CTA follows the repository review and the
failed authorized download test. No server download endpoint has been added.
The shared `components/youtube-player.tsx` now displays a prominent inline
**دانلود از YouTube** (Download from YouTube) disclosure above the existing
official player. The always-visible qualifier says **Desktop tool required —
not a direct browser download**. The original `youtube-nocookie.com` embed,
click-to-play behavior, original YouTube link, channel attribution and
identification evidence are preserved.

The native `<details>/<summary>` disclosure works with keyboard and pointer
input. Expanded guidance includes the original video's canonical YouTube
link, the pinned video-specific Yoinks command, desktop setup/format-selection
instructions, rights/access restrictions, links to the upstream repository and
YouTube policy, and the explicit failed-test result. It makes no browser or
guaranteed download claim. A labeled, read-only LTR command field remains
manually selectable if clipboard access is unavailable or denied; copy status
is announced through a polite live region. Copying only copies text and never
executes the command, loads an iframe, or downloads media.

`components/youtube-download-guide.ts` constructs the command from exactly 11
ASCII YouTube ID characters and a fixed YouTube host, never from a supplied
URL or title. Extra URL/playlist parameters and shell metacharacters cannot
enter the generated command. Known-unavailable references receive no download
CTA, and copyright-blocked titles expose neither commands nor playback/source
links through this component. No unrestricted download page, shell endpoint,
cookie input or arbitrary-URL proxy exists.

YouTube documents that age-restricted videos generally cannot be watched on
third-party sites and require an eligible signed-in viewer on YouTube:
<https://support.google.com/youtube/answer/2802167?hl=en>.
There is no supported login-removal parameter in the official embed parameter
reference: <https://developers.google.com/youtube/player_parameters>.
The catalog symptom alone does not establish whether an individual video is
age-restricted, geographically restricted, unavailable, or subject to an
account/bot check. No access-control bypass was attempted.

## Reviewed upstream evidence

Repository: <https://github.com/pablostanley/yoinks>

Pinned commit: `6f03720813c22f907d3fb9ba98567f2169446b82`, version `0.3.1`.
The source was fetched as a commit-specific archive into the ignored
`.media-cache/vendor/yoinks` directory, then inspected **before executing it**.
Its MIT license is retained in the vendor directory.

- [`package.json`](https://github.com/pablostanley/yoinks/blob/6f03720813c22f907d3fb9ba98567f2169446b82/package.json)
  publishes only `dist`, with a `bin` entry for `dist/cli.js`. It declares no
  library exports, HTTP server, Next.js integration, or web-download facility.
- [`src/cli.tsx`](https://github.com/pablostanley/yoinks/blob/6f03720813c22f907d3fb9ba98567f2169446b82/src/cli.tsx)
  renders an interactive Ink application. With no URL it can inspect the local
  clipboard; the test always supplies a fixed URL and never imports the CLI.
- [`src/lib/args.ts`](https://github.com/pablostanley/yoinks/blob/6f03720813c22f907d3fb9ba98567f2169446b82/src/lib/args.ts)
  accepts one URL, theme, help and version options. `--best`, `--mp3` and `-o`
  are not implemented CLI options; the README lists scriptable mode and output
  directory selection as roadmap items.
- [`src/app.tsx`](https://github.com/pablostanley/yoinks/blob/6f03720813c22f907d3fb9ba98567f2169446b82/src/app.tsx)
  requires format selection and writes into `~/Downloads`. It may retry an
  expired extraction automatically. This UI workflow is not a server job API.
- [`src/lib/ytdlp.ts`](https://github.com/pablostanley/yoinks/blob/6f03720813c22f907d3fb9ba98567f2169446b82/src/lib/ytdlp.ts)
  does export source-level `probe()` and `download()` functions. They launch
  yt-dlp with argument arrays, not shell commands, but are private implementation
  details rather than a shipped/supported library API. The source has a global
  active-child slot, unbounded subprocess text buffers, no service-wide queue,
  no URL/network allowlist and no built-in duration/media-size limit. A managed
  server service would require separate design, sandboxing and operational
  authority; it is not a safe drop-in integration.
- Upstream `ensureYtDlp()` downloads the latest standalone binary into
  `~/.yoinks/bin` without checksum verification; ffmpeg is discovered on PATH or
  via `ffmpeg-static`. The test does **not** call that installer, install npm
  dependencies, access browser cookies, or use a user's yt-dlp configuration.

The inline guidance shows the original YouTube source and this exact command
(example is the authorized Blender clip):

```sh
npx yoinks@0.3.1 "https://www.youtube.com/watch?v=YE7VzlLtp-4"
```

This launches an interactive third-party desktop terminal tool, not a browser
file transfer. Its full CLI and npm distribution have **not** been verified by
this test. Upstream says files go to `~/Downloads`; users choose a format using
arrow keys and Enter. Node/npm and downloaded third-party executables are
required. Only download your own content or content you have permission to
keep, respecting licensing and platform terms. Neither the CTA nor the tool
should be described as removing login, age, country, payment, copyright or
other access restrictions. Do not expose unrestricted arbitrary-URL command
execution, an HTTP download proxy, cookies, account credentials or blocked
catalog sources.

## Actual authorized download test

Test target: Big Buck Bunny, Blender Foundation,
<https://www.youtube.com/watch?v=YE7VzlLtp-4>.
License evidence: <https://peach.blender.org/about/> (CC BY 3.0).
Attribution: (c) copyright 2008, Blender Foundation / www.bigbuckbunny.org.
No catalog films were downloaded or probed.

The local harness imports the reviewed repository's **unmodified `download()`
function** using the project's existing `tsx` loader. It invokes a real yt-dlp
process against the authorized YouTube URL, not a mock or a direct Blender
CDN stand-in. This is a source-helper test, not an interactive Ink CLI test.

```powershell
node --import tsx scripts/yoinks-authorized-smoke.mjs --run-authorized-download
node --test scripts/tests/yoinks-authorized-smoke.test.mjs
```

The opt-in test supports Windows and rejects arbitrary URLs/extra arguments.
It verifies SHA-256 hashes of the reviewed source and package metadata before
importing them. It downloads only the Windows yt-dlp `2026.10.26` executable,
verifying SHA-256
`f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d`
before execution. This matches the official release asset digest:
<https://github.com/yt-dlp/yt-dlp/releases/tag/2026.10.26>.

The test intercepts the imported helper's spawn boundary **only in its own
test process** to enforce a fixed executable, argument-array invocation with
`shell: false`, `--ignore-config`, no cookie files/browser cookies, no geographic
bypass, no retries, one video, one fragment worker, 10-second network socket
timeout, 1 MiB/s transfer limit and 32 MiB file limit. Netrc credentials are
opt-in in yt-dlp and are never enabled. A 180-second deadline terminates the
owned process tree; executable fetching has a separate 60-second deadline and
32 MiB cap. Output is confined to a new ignored
`.media-cache/yoinks-tests/authorized-*` directory. Each run records arguments,
bounded stderr, timestamps, status and any verified file hash in `report.json`.
No user-level binary installation or ffmpeg is needed for the requested
single muxed MP4 at 360p or lower.

An initial harness attempt included an unsupported `--no-netrc` option; its
exit code 2 is **not** evidence of a YouTube block. After fixing that option,
the actual repository probe failed with `Failed to extract any player
response`, with no media file. The direct `download()` test result is recorded
below. A success is reported only after a real nonempty MP4 container exists;
container verification would not establish successful decoding/playback.

## Verification result (2026-11-03)

**No verified download success.** The actual repository `download()` helper
was invoked against the authorized YouTube URL. yt-dlp exited 1 during
extraction with `YE7VzlLtp-4: Failed to extract any player response`. The run
created no media file; no cookies, alternate client, proxy or bypass retry was
attempted. The error does not prove that account authentication, rather than
network/extractor behavior, caused the failure.

Local raw evidence (ignored, not part of the commit):
`.media-cache/yoinks-tests/authorized-UTsyIP/report.json`,
2026-11-03 UTC. The earlier corrected probe's evidence is
`.media-cache/yoinks-tests/authorized-CTqNUK/report.json`.
The harness now omits `--max-downloads 1` because yt-dlp can exit 101 after
successfully completing its final allowed download, which the upstream helper
would misclassify as failure. A single hardcoded video and `--no-playlist`
already enforce the one-video limit. This does not affect the observed
extraction failure.

Offline safety and existing YouTube/content-restriction regressions:

```powershell
node --import tsx --test scripts/tests/yoinks-authorized-smoke.test.mjs scripts/tests/old-iranian-youtube.test.ts scripts/tests/content-restrictions.test.ts
npx eslint scripts/yoinks-authorized-smoke.mjs scripts/tests/yoinks-authorized-smoke.test.mjs
```

## UI regression verification

```powershell
node --import tsx --test scripts/tests/youtube-player.test.tsx scripts/tests/yoinks-authorized-smoke.test.mjs scripts/tests/old-iranian-youtube.test.ts scripts/tests/content-restrictions.test.ts
node --test scripts/tests/youtube-player.browser.test.mjs
npx eslint components/youtube-player.tsx components/youtube-download-guide.ts scripts/tests/youtube-player.test.tsx scripts/tests/youtube-player.browser.test.mjs scripts/yoinks-authorized-smoke.mjs scripts/tests/yoinks-authorized-smoke.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

The unit/regression run passes 211 tests. The isolated headless Chrome component
run passes all four viewport cases (320, 390, 768 and 1440 px; five Node test
results including the parent suite). It bundles the real component and its
scoped/global styles into a memory-only fixture, without starting Next or
touching main's `.next` output. Existing ignored Playwright tooling is loaded
from `.media-cache/browser-tools/node_modules/playwright`; alternatively set
`PLAYWRIGHT_MODULE` to an installed module file. No dependencies are installed
by the test. Set `YOUTUBE_TEST_BROWSER=msedge` to use installed Edge instead of
the default installed Chrome.

Browser checks cover disclosure Enter/Space behavior, visible focus, labeled
LTR command text, 44px touch target, clipboard success/rejection/unavailability,
manual selection, per-video reset, no horizontal overflow, preserved official
click-to-load embed, source attribution, and unavailable/copyright-blocked
states. The clipboard is a test-only in-memory stub; the real system clipboard
is never read or written. All external requests (including the iframe after
Play) receive inert fixture responses, so no external media is fetched and no
unauthorized clip is played. Opening/copying the guidance triggers no external
request, backend route or browser download. Screenshots are written only under
ignored `.media-cache/youtube-ui-tests/`.

Scoped ESLint and project TypeScript checks pass. This does not replace main's
full production build or site-wide integration checks. No package manifest or
lockfile changes, Git mutation, commit, push, deployment, server endpoint or UI
claim of a verified download was made. Main's concurrent unrelated edits were
left untouched. The real authorized media download remains **not verified**;
offline UI tests do not change that result.
