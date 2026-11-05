<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git Workflow

Before making any code changes:

1. Ensure the working tree is clean. If it is not, stop and ask me.
2. Run:
   ```bash
   git fetch origin
   git pull --rebase origin main
   ```
3. If `git pull` fails or has conflicts, stop and ask me.

After making changes:

1. Run any relevant tests.
2. Commit the changes with a descriptive commit message.
3. Before pushing, run:
   ```bash
   git fetch origin
   git pull --rebase origin main
   ```
4. If there are conflicts, stop and ask me.
5. Push the changes to `origin/main`.

# Deploying SarvNema (production server)

Whenever a task involves deploying, the production server, SSH, Docker, nginx or
"make it live", first read `deploy/DEPLOY-SARVNEMA.md` completely and follow it.
`deploy/README.md` and the comments at the top of `deploy/host/docker-compose.host.yml`
name old hosts. Ignore those host details.

Server: `ssh ubuntu@109.122.247.136` (alias `parspack1`), repo `/home/ubuntu/vod`,
compose file `deploy/host/docker-compose.host.yml`, service `app`, container and
image `vod-app`. Production deploys `origin/main`, so commit and push first; never edit
code on the server.

The server is shared with about 50 unrelated containers. Hard rules:

- Only touch the `vod-app` container, the `vod-app` image and `/home/ubuntu/vod`.
  Never stop, restart, remove or recreate any other container, and never run
  `docker compose down`.
- Never run global cleanup: `docker system/image/volume/network prune`.
- Never edit, reload or restart nginx or any other service's config.
- Never discard the server checkout's uncommitted changes. They are live data and a
  Dockerfile heap tweak. So no `git reset --hard`, `git checkout -- .`, `git clean` or
  `git stash` there; update only with `git pull --ff-only origin main`, after checking that
  incoming files don't overlap local changes.
- The server can't reach Debian package mirrors. `docker build` needs the SSH reverse
  proxy tunnel from a laptop (`deploy/tools/local-http-proxy.py`, server port `18181`;
  server port `18080` belongs to another container). Steps are in section 4 of the guide.
- Build detached with `docker build --network host ... -t vod-app`, and wait for `EXIT=0`
  in `/tmp/vod-build.log`. Only then swap with
  `docker compose -f docker-compose.host.yml up -d --no-build app`, wait for `(healthy)`,
  and verify https://sarvnema.ir.
- Never use `pkill -f` with a pattern that matches your own command (use `"^[d]ocker build"`).
- If anything is unclear or outside these rules, stop and ask.
