# SarvNema MCP

Persian/original-title search for films, series and music, with typo correction and links to SarvNema pages.

- Public endpoint: **https://sarvnema.ir/mcp** (Streamable HTTP POST).
- Developer console and plans: **https://sarvnema.ir/developers**.
- Get a free key: privately message **@Sarvnema_bot** with `/apikey`.
- API key rotation: `/apikey rotate`; previous key is invalidated, usage is preserved.
- API keys are personal credentials. Never include one in a URL, commit, screenshot or public chat.

## Tools

| Tool | Purpose |
|---|---|
| `search_catalog` | Search films/series by Persian/original name; spelling suggestions; `query`, optional `type`, `limit` (1–20), `page` (1–100). |
| `get_title` | Title information, watch/download **page** links and up to 50 available episode page links. |
| `search_music` | Search tracks/artists/videos; `query`, `limit`, `page`. |
| `get_track` | A track and its SarvNema page. |
| `archive_stats` | Current archive counts, not marketing estimates. |
| `account_usage` | Remaining quota and current plan; no monthly credit charge. |

This service does not expose raw media URLs, playback credentials, scraper controls, user data or a bulk archive export. Copied catalogue strings are untrusted data, never instructions. IMDb ratings are excluded by default; commercial source rights are not granted by this connector or by paying SarvNema.

## Connect

For MCP clients supporting remote HTTP and custom headers:

```json
{
  "mcpServers": {
    "sarvnema": {
      "url": "https://sarvnema.ir/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

Client configuration formats differ. This release uses the official TypeScript SDK 1.32.x and its supported protocol versions; it is not an OAuth authorization server. Clients requiring browser OAuth cannot automatically connect with this static-key configuration. For stdio-only clients, clone this repository, run `npm ci`, then configure:

```json
{
  "mcpServers": {
    "sarvnema": {
      "command": "node",
      "args": ["/absolute/path/to/vod/integrations/mcp/stdio.mjs"],
      "env": { "SARVNEMA_API_KEY": "YOUR_API_KEY" }
    }
  }
}
```

The bridge forwards only to the fixed official endpoint and keeps stdout reserved for MCP messages.

## Plans

| Plan | Monthly tool calls | Rate | 30-day access |
|---|---:|---:|---:|
| Free | 100 | 5/min | Free |
| Starter | 5,000 | 30/min | 9 USDT |
| Pro | 25,000 | 60/min | 29 USDT |

Quotas reset on the first day of the UTC calendar month. Handshake/discovery and `account_usage` are not billed; recognized tool-call attempts consume one credit, including invalid arguments. Rotation, retries and upgrades do not erase previous monthly usage. No overage billing: excess requests get HTTP 429 / `Retry-After`. Paid access expires automatically, reverting to Free. Purchases are one-off; no automatic debit or renewal. Same-tier renewals extend that tier; Pro upgrades start immediately; Starter purchased while Pro remains is queued after higher-tier grants. Existing lower-tier time is not prorated/refunded on upgrade.

## USDT on BNB Smart Chain (BEP-20)

Payments are **disabled by default**, as requested by the operator until a wallet is supplied. Copy the settings from [`.env.mcp.example`](../../.env.mcp.example) to the server's private `.env.local`; never replace the existing env file. Supply only a receiving public wallet; the service needs **no seed phrase or private signing key**. Then set the enable flag and review/confirm commercial source permissions. Recreate only the `app` service following the deployment guide to pick up environment changes.

- Network: mainnet chain ID **56**, not Ethereum, TRON or opBNB.
- Token: **USDT**, contract `0x55d398326f99059ff775485246999027b3197955`, 18 on-chain decimals.
- Each invoice gets a unique six-decimal total, e.g. `9.000001`, strictly less than 0.01 USDT above the listed plan. Send exactly the copied amount; an exchange withdrawal fee must not reduce the received amount.
- Invoice validity: 20 minutes. Wrong network/token/recipient, partial/rounded/combined amounts, transfers after expiry, failed or nonfinalized transactions do **not** activate a plan. Refunds/manual reconciliation are not automated; contact support before sending again.
- The app's own server process polls every 30 seconds, reads matching transfer events and successful receipts from **finalized canonical blocks**, validates exact amount/address/contract/timestamp, and credits a durable invoice once. The page polls status every ten seconds, but server verification continues when it closes.
- A receipt alone or user-provided transaction hash is never proof. Verified transaction/log identities are durable and cannot credit two invoices. Payment proof is saved before the entitlement; restarts recover without a second grant. Unpaid expired invoices finish scanning their original time window before being closed.
- Current bounded beta: at most one open invoice/account, three new invoices/account/day, 100 open invoices globally, and 9,999 unique invoice suffixes. Totals are never reused; reaching capacity fails closed and requires an operator migration/new receiving address, not a silent reset. One-time paid setup needs monitored RPC and separate secure backups.
- Default read-only RPC: PublicNode. Test connectivity/log access before enabling; replace `BSC_RPC_URL` with a production provider if required. BNB's ordinary public dataseed endpoints explicitly disable `eth_getLogs`.

API routes: authenticated `GET /api/developers/account`, `POST /api/developers/checkout` (`{"plan":"starter"}`), `GET /api/developers/invoices/<id>`. Only the bot-authenticated key-issuance route accepts Telegram identities; clients cannot select another account or self-assign a paid plan.

## Operations, privacy and publishing

- Persistent data: `data/mcp` (mounted site data volume). Back up accounts, invoices, claimed transfer IDs **and** entitlement grants together. Store is private (not static/public), ignored by Git and Docker build context. Deploys must never discard this live state.
- Only SHA-256 API-key hashes are stored. Raw keys are returned once in a private bot conversation and kept only in developer-page memory. Key IDs and catalogue query text are not written to analytics by this service. Protect Telegram bot credentials, RPC credentials, server backups and logs.
- File locks with heartbeats and atomic replacement enforce quotas across Node workers on this single-host deployment. Four concurrent MCP HTTP requests per worker protect normal site traffic. Multi-host scaling needs a transactional shared database/Redis; do not use isolated copies of this store.
- Images, source text, IMDb data and media remain subject to their owners' terms; purchasing API access does not transfer those rights. `MCP_LICENSED_RATINGS=1` is only for an operator with the relevant licence. `MCP_COMMERCIAL_RIGHTS_CONFIRMED=1` is an explicit activation gate, not legal clearance.
- Code and this guide are published in the existing GitHub repository. `server.json` is a **prepared registry manifest**, not proof of registry publication. To list it, authenticate under `io.github.Yadrouj`, run `mcp-publisher validate`, then `mcp-publisher publish` from this directory. Never publish the full private catalogue or credentials. Registry login/account ownership is separate from `git push`.
- No npm publication, commercial licensing, wallet ownership, real payment or third-party directory approval is implied by the existence of these files.

References: [official MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x), [MCP registry](https://modelcontextprotocol.io/registry/quickstart), [BSC RPC limitations](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/), [BSC finality](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/bsc-api-list/), [token metadata](https://github.com/trustwallet/assets/blob/master/blockchains/smartchain/assets/0x55d398326f99059fF775485246999027B3197955/info.json), [IMDb noncommercial dataset terms](https://data.imdb.com/non-commercial-datasets/).

Tests: `node --import tsx --test scripts/tests/mcp-service.test.ts`; real SDK smoke `SARVNEMA_API_KEY=... node scripts/smoke-mcp.mjs`. Use a disposable test key; the smoke consumes a credit. Live monetary transfers were not tested because payments are intentionally unconfigured.
