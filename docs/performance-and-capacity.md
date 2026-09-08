# Performance and capacity

## Runtime improvements

- Film indexes share one cold read/parse across concurrent requests. Catalog
  replacement invalidates the snapshot; a failed refresh retains the last good
  snapshot instead of caching a rejected promise.
- Music search precomputes normalized documents and popularity/year ordering
  once per catalog identity, with relevance buckets for each query. Suggestions
  use the compact artist catalog (all tracks, without alternate source payloads).
- Poster/music grids no longer prefetch every visible destination. Hover/focus
  warms at most one likely destination per 600ms, with a bounded 30s history;
  this is disabled on data-saver/2G. Route skeletons cover details and artists.
- Clicked links highlight immediately and announce navigation in a visible,
  accessible status. Back/Forward clears stale feedback; failures offer retry.
- Media relays stream bodies with backpressure. The 30s upstream deadline is for
  response headers only; client disconnects cancel the upstream body.

## Origin admission (custom server required)

Run production with `npm run build` then `npm start`, **not** `next dev` for
capacity comparisons or `next start` (which omits the custom media/socket gate).

| Setting | Default | Purpose |
| --- | ---: | --- |
| `HTTP_PAGE_CONCURRENCY` | 16 | Active pages and non-stream APIs |
| `HTTP_QUEUE_LIMIT` | 128 | Maximum waiting page/API requests |
| `HTTP_QUEUE_WAIT_MS` | 8000 | Maximum wait; then 503, never an infinite queue |
| `HTTP_MEDIA_CONCURRENCY` | 128 | Active local/relayed media responses |
| `HTTP_UPLOAD_CONCURRENCY` | 4 | Concurrent personal-media uploads |
| `HTTP_IP_BURST` / `HTTP_IP_RATE` | 160 / 12 per second | Visitor request budget |
| `WATCH_PARTY_MAX_CONNECTIONS` | 512 | Concurrent Engine.IO connections |

Assets have a separate bounded lane. Health/readiness probes bypass the queue,
including HEAD requests. Existing room participant limits remain unchanged.
WebSocket handshakes and event bursts are also bounded. Closing a response frees
its lane slot, and canceled queued requests are removed immediately. Queue
handoffs yield through `setImmediate` so recursive rendering cannot monopolize
the event loop ahead of media/TCP handling. Origin keep-alive is 10s, below the
15s header timeout; the TCP accept backlog is 2048.

Rejections carry 429/503, `Retry-After: 5`, `Cache-Control: private, no-store`,
`X-Sarvnema-Busy: 1`, and a Persian message. HTML navigations get a lightweight
retry page; API consumers receive JSON. Search renders an overload message,
not a misleading “no results”. These are **not reserved tickets** or guaranteed
positions: retry is manual, so clients do not create a synchronized retry storm.

`/readyz` exposes active, queued, rejected and admitted counts per lane plus RSS.
It remains ready while saturated, avoiding restart loops under bursts. Monitor
the queue and rejection counts separately. Limits are per process, not a shared
distributed queue; a multi-replica deployment also needs a shared Socket.IO
adapter/sticky routing and shared storage for rooms/uploads.

## Deployment / edge

`infra/nginx.conf` includes separate media streaming, upload size/time limits,
bounded request bursts, static-asset caching and Persian overload responses.
It no longer ignores private/no-store for arbitrary HTML. Do not cache private
rooms, admin, uploads or RSC navigations as generic HTML. Preserve RSC/router
headers and `_rsc` query variants through your CDN.

The standalone `docker-compose.production.yml` sets `TRUST_ISOLATED_PROXY=1`
because the app port is not published and nginx overwrites X-Real-IP. **Do not
use this setting on a publicly accessible origin.** Direct access ignores
untrusted forwarded/Cloudflare headers. Alternatively set `TRUSTED_PROXY_IPS`
to exact peer IPs; nginx must overwrite, never pass through, client identity.
For `docker-compose.prod.yml` (the external infrastructure nginx), first verify
its network isolation and header configuration, then set the trust option in
the server environment. That deployment does NOT automatically use this repo's
nginx.conf. If a CDN is in front, configure verified provider real-IP ranges at
nginx; never trust a visitor-supplied XFF value. Shared NAT users may need an
adjusted per-IP budget.

Local Docker's engine was unavailable during this change: nginx runtime syntax
and actual production deployment are **not verified**. Before deployment run
`nginx -t` in the target proxy, validate compose, and repeat a staging load test.

App admission cannot absorb volumetric DDoS or protect a saturated network
uplink. Use upstream CDN/WAF/rate limits and restrict direct origin access.
100 relayed viewers at 4 Mbps require roughly **400 Mbps outbound**, before
overhead (plus inbound upstream traffic); at 8 Mbps, roughly 800 Mbps. Direct
source playback transfers video from the source to the viewer, not this app.
No unrelated third-party source was load-tested.

## Reproducible checks

```powershell
node --import tsx --test scripts/tests/performance.test.ts
npm run build
node scripts/smoke-capacity.mjs
# Against a separate local production server; set PLAYWRIGHT_MODULE if needed:
node scripts/smoke-navigation-feedback.mjs
```

Capacity smoke starts its OWN localhost process on 3006 (override CAPACITY_PORT),
creates an isolated temporary 4 MiB fixture, then removes it and stops the owned
process. It never mutates the production catalog or uses external media. It
tests 100 HTTP clients, 100 sockets in two 50-person rooms, and 2,000 Range
requests (250 MiB). A 260-request HTML burst (up to 180 connections) overlaps
the media readers. Separate persistent connection pools model attackers and
viewers: a shared test pool would let attackers reuse the viewers' sockets,
unlike independent browsers. This
tests transport/synchronization, **not 100 real browser decoders**, a long
soak, Internet/CDN behavior, or remote source availability.

Initial same-machine baseline: 100 mixed page/search requests, all 200,
p50 19,728ms / p95 20,140ms. Final run after yielding render admissions: all
200, p50 2,333ms / p95 3,394ms. Warm music suggestion was 537ms before and
37ms after in separate samples. Final concurrent media + overload result:

- 2,000/2,000 Range responses: 206; 250 MiB over 13.6s, p50 219ms / p95
  3,018ms **including the overload**. No media rejections. This does not prove
  zero rebuffering for real codecs/Internet links.
- 100 synchronization recipients, sync p95 3ms; all 100 sockets still connected
  after the burst. Of 260 excess HTML requests, 129 completed and 131 received
  controlled 503 responses with Retry-After. Queue peaked at its cap of 128.
- Final page/stream lanes drained to zero; recovery request 56ms; sampled peak
  origin RSS 658 MiB. These are short-run samples, not a long-soak memory proof.
- Browser checks at 390px and 1440px: click acknowledgement ~2ms after a
  hydrated programmatic click, completed navigation, Back, and overload search
  message verified. Physical input latency/slow-device hydration not measured.

A raw 400-new-TCP-connection burst also hit local Windows connection refusals
**before HTTP** (reproduced on a plain Node server: 232 accepted, 168 refused).
An earlier test run had a >10-minute timing stall and was discarded; it cannot
support performance claims. These limits must not be mistaken for successful
DDoS mitigation. Re-run against the real Linux/CDN deployment, without competing
builds, and compare identical hardware/workloads. All figures above are local
observations, not production capacity or latency guarantees.

References: [Next navigation](https://nextjs.org/docs/app/getting-started/linking-and-navigating),
[nginx request limits](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html),
[Node HTTP timeouts](https://nodejs.org/api/http.html#serverrequesttimeout).
