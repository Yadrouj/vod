# SarvNema product analytics

The private dashboard at `/admin` measures consented browser activity, playback,
download intent, and returning browsers. It starts collecting after installation;
existing Google Analytics history is not imported. The Google Analytics integration
is separate, so its totals are not expected to match this consented dataset.

## Access and configuration

Set the values in `.env.analytics.example` in the existing private environment.
Use a random `SARVNEMA_ADMIN_TOKEN` of at least 16 characters, preferably 32 random
bytes. The dashboard reuses that token for login without storing it in browser
storage. A signed HttpOnly, SameSite Strict cookie expires after eight hours.
Production cookies require HTTPS. Rotating the admin token revokes all sessions.

Set a separate stable `SARVNEMA_ANALYTICS_SECRET` to preserve pseudonymous
identities across admin-token rotations. Without it, the admin token supplies
the hashing key. Never prefix either secret with `NEXT_PUBLIC_`.

Unconfigured access fails closed, including localhost. Existing automation may
continue to send the private `x-admin-token` header. Browser administration uses
the secure session instead. `/admin/settings` contains the previous archive
controls, and `/admin/scrapers` retains the scraper dashboard.

## Metric definitions

| Metric | Meaning |
| --- | --- |
| Live browsers | Distinct pseudonymous browsers with a heartbeat in the last 60 seconds and no observed page exit. |
| Unique browsers | Distinct consented browser identifiers seen in the selected Tehran calendar dates, not identified people. |
| Sessions | Browser-tab sessions renewed after 30 minutes without a collector heartbeat. Separate tabs can create separate sessions. |
| Page views | Initial page load, pathname navigation, or a browser-cache page restoration. Search-query changes are not recorded as additional views. |
| Foreground time | Measured time with the document visible, not proof of attention. |
| Video and audio time | Wall-clock seconds while the selected instrumented player is playing, excluding pauses and buffering. Seeking and 2x playback do not manufacture elapsed time. Background audio can count. |
| Download clicks | Clicks that open the site's download gate. |
| Download handoffs | The gate starts handing the user to the file source. This does not confirm a file finished downloading or measure transferred bytes. |
| D1, D7, D30 | Exact-day return of the same browser after its first observed Tehran date. Only cohorts old enough for that target day enter the denominator. |
| Exit clues | Last observed playback error, buffering, completion, no recorded start, or unknown for departed/inactive sessions. These are not verified explanations of user intent. |

The playback funnel counts distinct browsers over the selected period. Download
handoffs are an independent branch; a visitor need not play before downloading.
Native playback clocks are capped at 15 seconds per heartbeat and bounded again
by elapsed server time. Retries with the same batch ID are deduplicated. Browser
suspension or blocked requests can undercount time.

Cross-origin iframe playback, including YouTube and publisher embeds, is not
timed. No clock is inferred from a clicked play poster. Children pages, admin
pages, camera and microphone streams, and personal uploads in rooms are excluded.
Public catalogue playback in watch/listen rooms uses the native media clock.
Content names resolve from the compact current catalogues; unresolved public IDs
remain links rather than fabricated titles.

## Privacy and storage

Collection requires a positive opt-in. Do Not Track and Global Privacy Control
disable this collector. A visible privacy control stops future measurement and
removes this collector's browser identifiers; it does not erase prior aggregates.
The random device/session IDs are HMAC-hashed before storage. Raw IPs, user-agent
strings, search text, URL queries, room invitation IDs, download signatures, chat,
camera/audio recordings, and session replay are not stored. Broad device classes
and minimized traffic sources are used instead. Server-side abuse limits briefly
use hashed connection keys in memory.

SQLite lives under `data/analytics`, never `public/`, Git, or an image layer.
Keep this directory on the existing private persistent data volume. The runtime
requires Node 22.13 or newer with `node:sqlite`; no native npm database add-on is
installed. WAL mode coordinates local readers/writers. This is a single-host
store, not a distributed multi-replica analytics database.

Daily activity retains 90 Tehran dates. Browser identifiers expire after 90 days
of inactivity; an active browser can retain its original first-observed date.
Deduplication keys retain two calendar dates. Cleanup runs on collection/report
reads and hourly while the store is open. For strict cleanup while collection
is inactive, use the same existing job runner to invoke:

```sh
node --import tsx scripts/prune-product-analytics.ts
```

No host timer or external service is installed automatically. Backups require
their own access and retention policy. Back up a live database through SQLite's
backup tooling or while its writers are stopped; do not copy only the main file
while WAL writes are active.

## Reliability and interpretation

The operations view reports the API process's RSS and uptime, the shared
partition's free space, and last recorded scraper statuses. It does not invent
a server-health percentage or claim ownership of unrelated containers. The
dashboard polls every 15 seconds while visible, keeps the last successful result
on a transient failure, and clears private data when authorization expires.
Authenticated exports contain aggregate daily rows and defend against spreadsheet
formula injection.

Client reporting, consent gaps, ad blockers, shared devices, and hostile traffic
affect coverage. These are operational/product signals, not billing-grade or
forensic counts. Use voluntary user research to establish actual reasons for exit.

## Validation

```sh
node --import tsx --test scripts/tests/product-analytics.test.ts
npx tsc --noEmit
```

`scripts/smoke-product-analytics.mjs` runs only against localhost with an isolated
test database. It verifies authentication, consent, native playback time,
duplicate batches, exports, and desktop/mobile dashboard behavior. Its synthetic
traffic is not production audience data.
