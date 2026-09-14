#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "$MOCK_LOG"
case "$*" in
  'info --format {{.ServerVersion}}') echo mock ;;
  'compose -f docker-compose.prod.yml ps -q maintenance')
    if [[ "${MOCK_DAEMON:-}" == running ]]; then echo daemon-id; fi ;;
  'inspect --format {{.State.Running}} sarvnema-maintenance-scheduled')
    case "${MOCK_CONTAINER:-missing}" in
      running) echo true ;;
      stopped) echo false ;;
      *) exit 1 ;;
    esac ;;
  'wait sarvnema-maintenance-scheduled') echo "${MOCK_RUN_EXIT:-0}" ;;
  'rm sarvnema-maintenance-scheduled'|'stop --time 20 sarvnema-maintenance-scheduled') : ;;
  'compose -f docker-compose.prod.yml run --rm --no-deps -T --name sarvnema-maintenance-scheduled maintenance node scripts/maintenance-scheduler.mjs') exit "${MOCK_RUN_EXIT:-0}" ;;
  *) echo "Unexpected Docker command: $*" >&2; exit 99 ;;
esac
