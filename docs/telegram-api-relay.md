# Telegram Bot API relay

Hosts inside Iran (for example the `ubuntu-one` server) cannot reach
`api.telegram.org`. Plain SOCKS proxies and VLESS tunnels to a foreign server
are cut by the filter after the TLS handshake. Single HTTPS requests to a
Cloudflare-fronted hostname do get through, so the bot talks to the Bot API
through a Cloudflare Tunnel that forwards only Bot API paths to Telegram.

## How it is wired

On a server outside Iran that already runs `cloudflared`, add this ingress rule
**above** any catch-all rule for the same hostname:

```yaml
  - hostname: relay.example.com
    path: ^/(file/)?bot[0-9]+:[A-Za-z0-9_-]+/
    service: https://api.telegram.org
    originRequest:
      httpHostHeader: api.telegram.org
      originServerName: api.telegram.org
```

Then validate and restart:

```bash
sudo cloudflared tunnel --config /etc/cloudflared/config.yml ingress validate
sudo systemctl restart cloudflared
```

Only `/bot<token>/…` and `/file/bot<token>/…` paths are forwarded, so the
relay is useless without a valid bot token.

## Using it

Set the relay as the API base in `.env.local` on the Iranian host:

```bash
TELEGRAM_API_BASE_URL=https://relay.example.com
```

`scripts/telegram-bot.mjs`, `scripts/telegram-channel.mjs` and
`scripts/telegram-channel-profile.mjs` all read it; unset, they use
`https://api.telegram.org`.

Check it from the host (a fake token must return Telegram's own 401):

```bash
curl https://relay.example.com/bot123:abc/getMe
# {"ok":false,"error_code":401,"description":"Unauthorized"}
```

The relay goes through Cloudflare, so a request body is capped at 100 MB.
That is above the 50 MB Bot API upload limit. A self-hosted Bot API server
(`TELEGRAM_LOCAL_API=1`, see `telegram-file-delivery.md`) is a separate setup.
