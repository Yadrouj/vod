# Daily scraping on sarvnema.ir

The recommended production setup is a **host systemd timer**, not an open browser
or a developer PC. It checks every five minutes, survives host reboots, and runs
only inside the saved admin schedule (default **03:00–07:00 Asia/Tehran**).
An active job is not started again at the next five-minute tick.

## Install once on the server

After deploying this commit to `/home/ubuntu/vod`, run:

```bash
cd /home/ubuntu/vod
sudo bash deploy/install-maintenance-timer.sh
```

For the alternative, self-contained nginx stack, pass
`docker-compose.production.yml` as the final argument. Do not switch a running
site between the two Compose projects.

The installer builds the worker image and runs a read-only diagnostic first.
Only after these succeed does it stop the old maintenance daemon, disable that
container's Docker restart policy, install/enable the timer, and request the
first schedule check. It does not restart the web app, change DNS, reset Git,
overwrite the catalog, or reset the admin schedule. Re-running it upgrades the
worker; a job in progress is stopped gracefully and retains completed checkpoints.

Existing maintenance cron entries must be removed first (the installer checks
the root and invoking user's crontabs; also check `/etc/cron.d` if used). Do not
use daemon + cron + timer together. Keep only one scheduling method.

## Deploying subsequent code changes

`deploy/deploy.sh` detects an enabled timer and starts Compose with
`--scale maintenance=0`, keeping the old daemon out of the way. For manual deploys:

```bash
docker compose -f docker-compose.prod.yml up -d --build --scale maintenance=0
```

The next timer run uses the newly built image. No daily build/deploy is needed:
scrapers update the existing `public/data` and `data` bind mounts, and the site
reloads catalog changes through its existing data-cache invalidation.

**Preserve live data when updating Git.** Runtime archives can be modified inside
the checkout, including Git LFS files. Back up `public/data` and `data` outside the
checkout before pulling. The updated deployment script refuses a dirty checkout
instead of using `git reset --hard`. Preserve/reconcile runtime data with your
usual deployment backup workflow, and materialize LFS files with `git lfs pull`.
Do not replace live JSON with LFS pointer files or discard it just to clean Git.

## Verify activation and daily results

```bash
systemctl is-enabled sarvnema-maintenance.timer
systemctl is-active sarvnema-maintenance.timer
systemctl list-timers sarvnema-maintenance.timer --no-pager
journalctl -u sarvnema-maintenance.service --since yesterday --no-pager

# Read-only: schedule, readiness, reasons for deferral, today's completions,
# last daily trigger, and the most recent in-window result.
docker compose -f docker-compose.prod.yml run --rm --no-deps -T maintenance \
  node scripts/maintenance-scheduler.mjs --check
```

`enabled` + `active` confirms the timer is installed, **not** that every source
was scraped successfully. Look for `completedJobs` and the per-job failures in
the diagnostic/journal. Progress files are:

- `data/maintenance-scheduler-state.json`: successful jobs by date.
- `data/maintenance-scheduler-status.json`: current check/run.
- `data/maintenance-scheduler-last-run.json`: last in-window result; daytime
  waiting checks no longer overwrite the overnight failure/deferral reason.
- `data/refresh-checkpoints/`: resumable steps within refresh jobs.

Monitor failed units and alert if a scheduled morning has no completed jobs.
The runner propagates job failures to systemd; capacity deferrals are explicitly
logged as `waiting`, not reported as completed scraping.

## Why the old setup could miss a day

- A published web container alone does not install a host schedule. The previous
  daemon had to be included in the actual Compose deployment.
- The old limit of **12 requests per five minutes** could indefinitely defer a
  healthy site. A read-only production check on 2026-09-14 returned 268 requests
  with zero active/queued work. This is evidence of a potential blocker, not
  proof of yesterday's server state; SSH logs were not reachable during the fix.
- The standalone Compose file used `wget` for app readiness, but the image
  installed `curl`, not `wget`. Its healthy-app dependency could block maintenance.
- An abandoned file lock could block attempts for six hours after a crash.

The new Linux worker uses a kernel `flock` (included via `util-linux`) which is
released on process/container death. Never delete its `.flock` file while workers
are running. The runtime image must be rebuilt before using the updated worker.
Manual non-Docker Linux installations also require `flock`.

The default capacity check now uses actual request lanes: no queued work and
less than 50% occupancy in every lane. Existing limits on app memory (1350 MB),
active watch rooms (1), and host load (1.25) still apply. Older app versions
without lane telemetry fall back to 12 historical requests per five minutes.
An explicit `MAINTENANCE_MAX_RECENT_REQUESTS` still applies as a hard cap; remove
an old `=12` override or leave it empty in `.env` to use queue-based admission.
Do not increase memory/load caps without checking the server's actual headroom.

The timer uses `Persistent=true`: after downtime it checks the schedule again.
It does **not** force a daytime crawl if the whole permitted window was missed.
Retries continue inside the next allowed window; source outages, sustained load,
or an offline server can still prevent completion. Source-specific days/hours
must overlap the global admin schedule. Do not schedule `--force`.

## Pause / restore daemon mode

To pause automatic scraping, disable both the timer and any active run:

```bash
sudo systemctl disable --now sarvnema-maintenance.timer
sudo systemctl stop sarvnema-maintenance.service
```

To return to the old daemon after pausing the timer:

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate maintenance
```

For daily scheduling, retain the timer and adjust days/hours/source toggles in
the existing private scraper dashboard instead of stopping individual containers.

References: [systemd timer semantics](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html),
[Docker restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/),
[Compose startup/health dependencies](https://docs.docker.com/compose/how-tos/startup-order/).
