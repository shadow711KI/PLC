#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/rjapp}"
BRANCH="${BRANCH:-main}"

cd "$PROJECT_DIR"

echo "[deploy] Updating repository ($BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] Building and starting containers"
docker compose build --pull
docker compose up -d --remove-orphans

echo "[deploy] Cleaning unused images"
docker image prune -f

echo "[deploy] Done"
