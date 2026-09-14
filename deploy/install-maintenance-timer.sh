#!/usr/bin/env bash
# Run once with sudo after updating the checkout. Safe to run again on deploy.
# No Git operations, data resets, public admin endpoints, or embedded secrets.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
COMPOSE_FILE="${1:-docker-compose.prod.yml}"
case "$COMPOSE_FILE" in
  docker-compose.prod.yml|docker-compose.production.yml) ;;
  *) echo "Use docker-compose.prod.yml or docker-compose.production.yml" >&2; exit 1 ;;
esac
if [[ "$EUID" != 0 ]]; then
  echo "Run: sudo bash deploy/install-maintenance-timer.sh $COMPOSE_FILE" >&2
  exit 1
fi
# These values are rendered into systemd directives, not evaluated as shell code.
if [[ ! "$ROOT" =~ ^/[a-zA-Z0-9_./-]+$ ]]; then
  echo "The deployment path must not contain spaces or shell/systemd metacharacters" >&2
  exit 1
fi
for command in docker systemctl systemd-analyze; do command -v "$command" >/dev/null; done
[[ -d /run/systemd/system ]] || { echo "A Linux host running systemd is required" >&2; exit 1; }
cd "$ROOT"
compose=(docker compose -f "$COMPOSE_FILE")
"${compose[@]}" config --quiet

# Never silently combine an older host cron with the new timer.
if command -v crontab >/dev/null; then
  for user in root "${SUDO_USER:-root}"; do
    if crontab -u "$user" -l 2>/dev/null | grep -Eq '^[[:space:]]*[^#[:space:]].*(maintenance-scheduler|sarvnema-maintenance)'; then
      echo "Remove the existing maintenance cron for $user before installing the timer" >&2
      exit 1
    fi
  done
fi

# Build and check BEFORE stopping the existing scheduler. A failed build leaves
# the previous daemon/timer intact. This does not replace the running web app.
"${compose[@]}" build app
"${compose[@]}" run --rm --no-deps -T maintenance sh -ec 'command -v flock; test -f scripts/maintenance-scheduler.mjs; node scripts/maintenance-scheduler.mjs --check'

temporary="$(mktemp -d)"
trap 'rm -f "$temporary/sarvnema-maintenance.service" "$temporary/sarvnema-maintenance.timer"; rmdir "$temporary"' EXIT
sed -e "s|@ROOT@|$ROOT|g" -e "s|@COMPOSE@|$COMPOSE_FILE|g" infra/systemd/sarvnema-maintenance.service > "$temporary/sarvnema-maintenance.service"
cp infra/systemd/sarvnema-maintenance.timer "$temporary/sarvnema-maintenance.timer"
systemd-analyze verify "$temporary/sarvnema-maintenance.service" "$temporary/sarvnema-maintenance.timer"

if systemctl cat sarvnema-maintenance.timer >/dev/null 2>&1; then
  systemctl stop sarvnema-maintenance.timer sarvnema-maintenance.service
fi
daemon="$("${compose[@]}" ps -a -q maintenance)"
if [[ -n "$daemon" ]]; then
  # Explicitly disable Docker restart before stopping: only systemd will own
  # scheduling. Checkpoints and catalog bind mounts remain untouched.
  while IFS= read -r container; do
    oneoff="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.oneoff"}}' "$container")"
    if [[ "$oneoff" != True && "$oneoff" != true ]]; then
      docker update --restart=no "$container" >/dev/null
      docker stop --time 20 "$container" >/dev/null
    fi
  done <<< "$daemon"
fi
install -m 0644 "$temporary/sarvnema-maintenance.service" /etc/systemd/system/sarvnema-maintenance.service
install -m 0644 "$temporary/sarvnema-maintenance.timer" /etc/systemd/system/sarvnema-maintenance.timer
systemctl daemon-reload
systemctl enable --now sarvnema-maintenance.timer
systemctl start --no-block sarvnema-maintenance.service
systemctl is-enabled sarvnema-maintenance.timer
systemctl is-active sarvnema-maintenance.timer
systemctl list-timers sarvnema-maintenance.timer --no-pager
echo "Installed. Inspect runs: journalctl -u sarvnema-maintenance.service --since yesterday"
echo "Future Compose deploys must use --scale maintenance=0 (deploy/deploy.sh detects this timer)."
