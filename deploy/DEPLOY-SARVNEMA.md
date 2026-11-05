# SarvNema deploy guide (for people and AI assistants)

> **For AI assistants (ChatGPT, Claude, Copilot, …):** read this whole file before
> suggesting any deploy, server or Docker command for SarvNema. Follow it exactly.
> The production server is **shared with many unrelated services**. Only the
> SarvNema container (`vod-app`) and the SarvNema checkout (`/home/ubuntu/vod`)
> may be changed. When in doubt, stop and ask the human.

## 1. Facts

| Item | Value |
|---|---|
| Site | `https://sarvnema.ir` (TLS + CDN at ArvanCloud) |
| Server | `ssh ubuntu@109.122.247.136` (alias `parspack1`) |
| Repo on server | `/home/ubuntu/vod` (branch `main`, remote `git@github.com:Yadrouj/vod.git`) |
| Compose file | `deploy/host/docker-compose.host.yml` (project name `vod`) |
| Service / container | service `app` → container **`vod-app`**, image **`vod-app`** |
| App port | `127.0.0.1:3000` (loopback only; host nginx proxies `sarvnema.ir` to it) |
| Health check | `curl -fsS http://127.0.0.1:3000/readyz` on the server |
| Secrets | `/home/ubuntu/vod/.env.local` (not in Git, never print or commit it) |
| Live data | `/home/ubuntu/vod/public/data` and `/home/ubuntu/vod/data`, mounted into the container |

`deploy/README.md` and the comments at the top of `docker-compose.host.yml` mention
older hosts (`185.203.118.87`, `46.34.163.178`). **This file is the current source of truth.**

## 2. Hard rules: what you must NOT touch

The server runs ~50 other containers (examples: `intelicall-app`, `orbital-*`,
`minio`, `minerals-web`, `biosan-web`, `barekat-web`, `bam-app`, `finops-agent-*`,
`db-replicas_*`, `prometheus`). They are **not SarvNema**.

Never do any of these:

- `docker compose down`, `docker stop/rm/restart` on anything except `vod-app`.
- `docker system prune`, `docker image prune -a`, `docker volume prune`,
  `docker network prune` or any other global cleanup.
- Remove or retag images other than `vod-app`.
- Edit, reload or restart the host nginx, or any other service's config.
- `git reset --hard`, `git checkout -- .`, `git clean`, or `git stash` in
  `/home/ubuntu/vod`. The checkout has **intentional uncommitted changes**
  (live scraped data under `public/data/`, `data/`, and a `Dockerfile` tweak that
  raises the build heap). Destroying them loses production data.
- Start the `maintenance` service by hand (it has `scale: 0`; a host timer runs it).
- `pkill -f <pattern>` whose pattern also matches your own command line (it kills
  your own SSH session). Use the bracket trick: `pkill -f "^[d]ocker build"`.

Allowed: everything in sections 3–6 below, which only touches `vod-app`,
the `vod-app` image and `/home/ubuntu/vod`.

## 3. Code flow: pull, commit, push (on your laptop)

```bash
git status                       # must be clean; if not, stop and sort it out
git fetch origin
git pull --rebase origin main    # on conflicts: stop and ask
# ... make changes, run relevant tests ...
git add <files you changed>      # never `git add -A` blindly
git commit -m "Describe the change"
git fetch origin && git pull --rebase origin main   # again, right before pushing
git push origin main
```

The server deploys whatever is on `origin/main`. Never edit code directly on
the server.

## 4. Network: the server needs a reverse proxy to build

The server (in Iran) **cannot reliably reach Debian/npm/GitHub-style package
hosts**. `apt-get` inside the Docker build times out on `deb.debian.org`, so a
plain `docker compose up --build` fails like this:

```
E: Failed to fetch http://deb.debian.org/debian/dists/bookworm/main/binary-amd64/Packages  Connection timed out
```

Fix: borrow the laptop's internet through an SSH **reverse** tunnel.

**On the laptop, terminal 1** (small HTTP/HTTPS proxy, listens on laptop loopback only):

```bash
python3 -I deploy/tools/local-http-proxy.py 18080
# check: curl -x http://127.0.0.1:18080 -sI https://registry.npmjs.org/next
```

**On the laptop, terminal 2** (expose it on the server as `127.0.0.1:18181`;
auto-reconnects because the link drops long SSH sessions):

```bash
while true; do
  ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=5 -o ServerAliveCountMax=2 \
      -o ConnectTimeout=15 -R 127.0.0.1:18181:127.0.0.1:18080 ubuntu@109.122.247.136
  echo "tunnel dropped, reconnecting"; sleep 2
done
```

Notes:
- Port **18080 on the server is already used by another container**. That is why
  the server side is `18181`. Check with `ss -ltn | grep 18181` before using it.
- If your SSH config routes `parspack1` through a local SOCKS proxy that is down,
  connect to the IP directly or add `-o ProxyCommand=none`.
- Verify from the server:
  `curl -s -o /dev/null -w "%{http_code}\n" -x http://127.0.0.1:18181 http://deb.debian.org/debian/dists/bookworm/Release` → `200`.
- The tunnel can stall under large downloads. The server reaches
  `registry.npmjs.org` directly, so npm is excluded from the proxy with
  `no_proxy` (below); only `apt-get` goes through the tunnel.
- When done, stop both laptop terminals (Ctrl-C). Nothing is left on the server.

## 5. Deploy steps (on the server)

```bash
ssh ubuntu@109.122.247.136
cd /home/ubuntu/vod

# 5.1 Update code without touching the local data changes
git fetch origin main
git diff --name-only HEAD origin/main > /tmp/incoming.txt
git status --porcelain | cut -c4- | grep -Fx -f /tmp/incoming.txt || echo "no overlap"
#   If any file overlaps: STOP and ask. Otherwise:
git pull --ff-only origin main

# 5.2 Build the image through the tunnel, detached so an SSH drop can't kill it
P=http://127.0.0.1:18181
NP=registry.npmjs.org,.npmjs.org,localhost,127.0.0.1
setsid nohup sh -c "docker build --network host \
  --build-arg http_proxy=$P --build-arg https_proxy=$P \
  --build-arg HTTP_PROXY=$P --build-arg HTTPS_PROXY=$P \
  --build-arg no_proxy=$NP --build-arg NO_PROXY=$NP \
  -t vod-app -f Dockerfile . > /tmp/vod-build.log 2>&1; echo EXIT=\$? >> /tmp/vod-build.log" \
  </dev/null >/dev/null 2>&1 &

# 5.3 Watch it (reconnect and re-run this if SSH drops; the build keeps going)
tail -f /tmp/vod-build.log          # finished when the last line is EXIT=0
```

Why `docker build --network host`: the build has to reach the tunnel on the
server's `127.0.0.1:18181`. It builds the same image (`vod-app`) that the compose
file uses. The live site keeps running on the old image during the build
(the Next.js build takes several minutes on this 2-core box).

```bash
# 5.4 Only after EXIT=0: swap the container to the new image (a few seconds of downtime)
cd /home/ubuntu/vod/deploy/host
docker compose -f docker-compose.host.yml up -d --no-build app

# 5.5 Wait for healthy
docker ps --filter name=vod-app --format "{{.Status}}"   # wait for "(healthy)"
```

If the build fails (`EXIT` not 0): do **not** run 5.4. The old container keeps
serving. Read `/tmp/vod-build.log`, fix, rebuild.

## 6. Verify (from the laptop)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://sarvnema.ir/
# Pages that render 404 inside a 200 response contain this marker:
curl -s "https://sarvnema.ir/music/artists/%D9%87%D8%A7%DB%8C%D8%AF%D9%87" | grep -c 'NEXT_HTTP_ERROR_FALLBACK;404'   # expect 0
```

Also open the pages your change affects in a browser.

## 7. Rollback

Roll back through Git, never by editing files on the server:

```bash
# on the laptop
git revert <bad-sha>
git push origin main
```

Then repeat section 5.

## 8. Checklist for an AI assistant before answering

1. Does every command only touch `vod-app`, the `vod-app` image, or `/home/ubuntu/vod`? If not, rewrite it.
2. Does any command discard uncommitted changes on the server? If so, remove it.
3. Does the build need the internet? Then the tunnel (section 4) must be up first.
4. Is the build detached and checked for `EXIT=0` before the container is swapped?
5. After the deploy, verify (section 6) and report the results honestly.
