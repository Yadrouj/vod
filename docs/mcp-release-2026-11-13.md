# Search platform and MCP release — 2026-11-13

- The popular-title shelf and its View All card now link to SarvNema browse, not IMDb. Individual cards stay on internal title pages.
- Telegram bot/channel profiles advertise the film/series/music search engine with live API counts, not hard-coded marketing numbers. Bot command menu includes `/stats` and private `/apikey`; scheduled profile refresh is every six hours. No new channel announcement is posted by this change.
- Developer page `/developers`, official-SDK HTTP endpoint `/mcp`, stdio bridge and GitHub documentation are ready. Six read-only discovery tools; static API-key clients supported; browser OAuth not advertised.
- Free: 100 tool calls/calendar month; Starter: 5,000 for 9 USDT/30 days; Pro: 25,000 for 29 USDT/30 days. Quotas persist across process restart and key rotation, with per-minute limits.
- Following the operator's explicit request, the receiving wallet is **blank** and real payments are **off**. Settings are in `.env.mcp.example`. Read `integrations/mcp/README.md` before enabling: BEP-20 only, exact never-reused invoice totals, finalized-block receipt checks, durable duplicate protection, no private wallet keys.
- Real RPC checks confirmed BSC chain 56, finalized-block support, token decimals 18 and filtered log access. Local mocks cover invalid token/amount/removed events, failed receipts, correct successful settlement and repeat scans without repeat credit. **No real payment or transfer was made.**
- Key expiry, concurrent rate limits, 100-credit monthly limit, owner isolation, request size/origin checks and plaintext-key exclusion passed. Official SDK smoke matched `breakng bud` to Breaking Bad. Existing movie/episode selection and box-office smoke passed after upgrading Next.js. Developer-page layout passed 320/390/1440px checks with zero page exceptions/overflow.
- Next.js/eslint-config-next pinned to 16.4.6; PostCSS to 8.5.32; compatible dependency security updates applied without `--force`. Production-dependency npm audit reported zero findings. Telegram-only image uses patched sharp 0.35.5. These checks are not a guarantee of absence of vulnerabilities.
- Registry manifest is prepared under `integrations/mcp/server.json`; the official publisher checksum was verified. Registry validation endpoint was unreachable from this connection, so no directory/registry publication is claimed. Code/documentation publication on GitHub is separate from registry listing.
- Production deployment must preserve `data/mcp` state along with all existing archive data. The Docker context excludes runtime billing records, deployment backups and abandoned archive temp/old copies; none of the host files are deleted.
# Production load follow-up

The first deployment exposed sustained music-detail CPU saturation: V8 sampling
identified `relatedMusic` repeatedly normalizing and sorting the entire catalogue.
Replace that path with a snapshot-scoped inverted recommendation index. Artist
and title boosts are retained exactly; constant-score fallback groups only need
their first `limit` candidates. A new catalogue object rebuilds the index.

Regression tests compare the complete ranking against the previous algorithm,
including aliases, repeated title terms, categories, kind, dates, stable ties,
empty catalogues and refresh invalidation. On the local 156,683-track catalogue,
20 recommendations measured 8,355 ms before and 16 ms after (excluding the
807 ms one-time index construction). These are local timings, not a production
latency guarantee. Production health and real SDK smoke must pass after rollout.

