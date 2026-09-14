#!/usr/bin/env bash
# Invoked by the host timer; never use --force in an unattended schedule.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
COMPOSE_FILE="${1:-docker-compose.prod.yml}"
NAME="sarvnema-maintenance-scheduled"
case "$COMPOSE_FILE" in
  docker-compose.prod.yml|docker-compose.production.yml) ;;
  *) echo "Unsupported Compose file: $COMPOSE_FILE" >&2; exit 1 ;;
esac

if [[ "${2:-}" == "--stop" ]]; then
  if [[ "$(docker inspect --format '{{.State.Running}}' "$NAME" 2>/dev/null || true)" == true ]]; then
    docker stop --time 20 "$NAME"
  fi
  exit 0
fi

docker info --format '{{.ServerVersion}}' >/dev/null
compose=(docker compose -f "$COMPOSE_FILE")
# Plain ps excludes one-off run containers. --status implicitly enables --all
# in Compose and would incorrectly classify our own surviving job as a daemon.
daemon="$("${compose[@]}" ps -q maintenance)"
if [[ -n "$daemon" ]]; then
  echo "Refusing duplicate scheduling: stop the maintenance daemon before using the host timer." >&2
  exit 1
fi

running="$(docker inspect --format '{{.State.Running}}' "$NAME" 2>/dev/null || true)"
if [[ "$running" == true ]]; then
  # The host service may have been interrupted while Docker kept the job alive.
  # Wait for that same job, never launch another copy or steal its lock.
  echo "[maintenance-timer] Waiting for the existing scheduled container"
  result="$(docker wait "$NAME")"
  [[ "$result" =~ ^[0-9]+$ ]] || exit 1
  exit "$result"
elif [[ "$running" == false ]]; then
  docker rm "$NAME" >/dev/null
fi

echo "[maintenance-timer] Checking the configured Tehran schedule and server capacity"
exec "${compose[@]}" run --rm --no-deps -T --name "$NAME" maintenance node scripts/maintenance-scheduler.mjs
