#!/usr/bin/env bash
# VOD (sarvnema) deploy — run ON the infrastructure host (185.203.118.87).
# Idempotent: clones the repo if missing, otherwise fast-forwards main; pulls the
# git-LFS catalog; then (re)builds and starts the container.
set -euo pipefail

REPO="git@github.com:Yadrouj/vod.git"
BRANCH="main"
DIR="/home/ubuntu/vod"
COMPOSE_FILE="docker-compose.prod.yml"

# 0) git-lfs is required — the catalog (vod-catalog.json / vod-people.json) is LFS.
if ! command -v git-lfs >/dev/null 2>&1; then
  echo "!! git-lfs is not installed. Run: sudo apt-get install -y git-lfs" >&2
  exit 1
fi

# 1) clone-or-pull ------------------------------------------------------------
if [ -d "$DIR/.git" ]; then
  echo "==> Updating existing repo in $DIR"
  if ! git -C "$DIR" diff --quiet || ! git -C "$DIR" diff --cached --quiet; then
    echo "Uncommitted changes (including live archive data). Back up and preserve them before deploying; no reset was performed." >&2
    exit 1
  fi
  git -C "$DIR" fetch origin "$BRANCH"
  git -C "$DIR" checkout "$BRANCH"
  git -C "$DIR" pull --ff-only origin "$BRANCH"
else
  echo "==> Cloning $REPO into $DIR"
  git clone -b "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR"

# 2) materialise the LFS catalog (turns pointer files into real JSON) ----------
git lfs install --local
git lfs pull

# 3) build + start ------------------------------------------------------------
maintenance_args=()
if command -v systemctl >/dev/null && systemctl is-enabled --quiet sarvnema-maintenance.timer; then
  maintenance_args=(--scale maintenance=0)
fi
docker compose -f "$COMPOSE_FILE" up -d --build "${maintenance_args[@]}"

echo
echo "==> Status:"
docker compose -f "$COMPOSE_FILE" ps
echo
echo "==> Smoke test (from inside the docker network):"
docker run --rm --network infrastructure_default curlimages/curl:latest \
  -s -o /dev/null -w 'vod-app HTTP %{http_code}\n' http://vod-app:3000/ || true
echo
echo "Next: install nginx config + reload — see deploy/README.md"
