# Playback source audit — 2026-11-05

## Scope and findings

The local audit inspected all 28,695 split title files (532,588 link records),
using the same source-base, verified DonyayeSerial and alternative-source
overlays as the app. These are catalog records, not distinct media files.
Restricted titles are skipped; neither the raw catalog nor private mounted
registry is overwritten by this audit.

The initial pass selected 510,694 playback links across 50 hosts, then checked
142 deterministic remote samples. An HTTP redirect is not accepted as working
media: the check follows approved hosts only, requests at most a 4 KiB prefix,
checks file signatures, and cancels the response. HTML/login responses,
timeouts, unapproved redirects and HTTP errors remain separate outcomes.

Verified matching file paths are available on the Film2Media direct CDN for
eight existing branches: `pnot`, `yA3f`, `aG5p`, `nP6z`, `oG4i`, `rD7g`,
`hZ9r`, and `xG3m`. Three existing releases per branch were probed through the
CDN entry point and both edges. Some requests timed out, while another edge
returned valid media for the same file. This is why a bounded local fallback
is retained rather than treating one successful HTTP request as a guarantee.

The shipped mapping now includes the legacy scraper IDs for these branches.
Recovery preserves the original filename, query, episode and playback position.
The runtime also repairs duplicated rotating prefixes by deriving the relative
path from the original URL, **only within a bundled verified mapping**. Explicit
custom administrator destinations and unrelated newly discovered hosts win.

The audit also found old preview files entering the full-release picker.
Plural `Trailers/` directories, numbered trailers, `Fragman`, `Bande-annonce`
and `First.Look` assets are now excluded from full playback/room sources. Their
catalog data is retained. After these changes the audit selected 507,657 links
across 42 hosts, including 200,205 records with a mapped original URL. The
3,037 fewer selected records are preview exclusions, not deleted releases.

New provider-managed redirect hosts were checked independently:
`stream1007.hashureplus.com`, `stream1008.hashureplus.com`,
`moviesho.deemano.ir` and `moviesho1.deemano.ir`. The nightly verification
workers now recognize the relevant exact CDN hosts (including Moviesho's
existing Musitraf origin). Lookalikes/private redirects are still rejected.
No redirect to the unrelated `karban.my` service was imported or followed.

## Repeat the read-only audit

```sh
npm run audit-playback-sources
npm run audit-playback-sources -- --remote --samples=3 --concurrency=3 --max-probes=200 --budget-ms=240000
```

Reports default to `.media-cache/playback-audit/latest.json` (ignored by Git).
Use `--output=PATH` to retain before/after snapshots. `VOD_DATA_DIR` selects a
mounted data directory. No audit result automatically deletes a source or
changes a host. Full URLs in local reports can contain signed download tokens;
do not publish these reports or add them to Git.

For real playback of one existing non-HEVC release per verified CDN branch:

```sh
node scripts/smoke-cdn-playback.mjs --live
```

This requires the local app on port 3004, a preceding audit report, Chrome,
and Playwright (`PLAYWRIGHT_MODULE` can select an existing installation).
`TEST_ORIGIN`, `TEST_BROWSER` and `PLAYBACK_AUDIT_REPORT` can override defaults.
`TEST_BRANCH=f2my-3536855aac55` selects one branch for an explicit recheck.
Each check requires time to advance, decoded video frames, and the exact
selected file path; it closes the context after five seconds of playback.
It does not download full films/episodes or substitute a different episode.

The live Chrome run passed all eight branches: The Miniature Wife, Gangs of
London, Death Sentence, C'mon C'mon, Unwelcome, Merry Christmas, No Time to Die,
and The Lobster. Each produced decoded video frames, audio bytes and advancing
playback time. Synthetic mobile/desktop regression tests separately cover
bounded delivery attempts, retry, same-episode source changes, retained time,
fullscreen recovery, and room host/guest synchronization.

A subsequent production-build run passed six of the eight initial attempts;
Unwelcome and Merry Christmas encountered a transient failure/timeout. An
explicit Unwelcome retry subsequently decoded video and audio, and both files
still returned valid HTTP 206 media prefixes. Chrome also reported an edge
connection timeout during that successful retry. These observations remain
network/provider uncertainty, not proof that every release is stable.
The Merry Christmas follow-up also exposed a player watchdog gap: metadata
arrival cleared buffering even while a user's `play()` promise remained pending.
Playback intent is now tracked separately, and metadata alone cannot cancel
recovery while playable data is still missing. The browser regression test
simulates this exact pending-promise/metadata sequence and verifies bounded
delivery fallback instead of an indefinite 0:00 wait.

## Limits

Every catalog record was structurally inspected, **not every file played**.
Remote probes sample each host, and live checks sample each verified branch.
Some providers still return missing files, HTML, regional/network failures or
unverified redirects. These outcomes must not be described as working links,
nor does a timeout justify replacing/removing an entire provider. DonyayeSerial
remains a secondary provider with its existing regional warning and recovery.

VS Code's embedded browser is not a substitute for Chrome/Edge/Safari playback
testing. A failure there alone does not establish a broken source. Deployment
requires a normal rebuild/restart; this change does not deploy the production
server or commit mounted catalog/LFS data.
