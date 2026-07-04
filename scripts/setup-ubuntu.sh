#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-}"
TARGET_DIR="${2:-/opt/rjapp}"
BRANCH="${3:-main}"

if [[ -z "$REPO_URL" ]]; then
  echo "Usage: $0 <repo-url> [target-dir] [branch]"
  echo "Example: $0 git@github.com:owner/repo.git /opt/rjapp main"
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script supports Ubuntu/Debian (apt-get required)."
  exit 1
fi

echo "[setup] Installing base packages"
sudo apt-get update
sudo apt-get install -y git curl ca-certificates ufw

if ! command -v docker >/dev/null 2>&1; then
  echo "[setup] Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
else
  echo "[setup] Docker already installed"
fi

if ! groups "$USER" | grep -q '\bdocker\b'; then
  echo "[setup] Adding $USER to docker group"
  sudo usermod -aG docker "$USER"
  NEED_RELOGIN=1
else
  NEED_RELOGIN=0
fi

echo "[setup] Configuring firewall"
sudo ufw allow OpenSSH >/dev/null 2>&1 || true
sudo ufw allow 80/tcp >/dev/null 2>&1 || true
sudo ufw allow 443/tcp >/dev/null 2>&1 || true
sudo ufw --force enable >/dev/null 2>&1 || true

echo "[setup] Preparing project directory: $TARGET_DIR"
sudo mkdir -p "$TARGET_DIR"
sudo chown -R "$USER:$USER" "$TARGET_DIR"

if [[ ! -d "$TARGET_DIR/.git" ]]; then
  echo "[setup] Cloning repository"
  git clone --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"
else
  echo "[setup] Repository exists, updating"
  git -C "$TARGET_DIR" fetch origin "$BRANCH"
  git -C "$TARGET_DIR" checkout "$BRANCH"
  git -C "$TARGET_DIR" pull --ff-only origin "$BRANCH"
fi

cd "$TARGET_DIR"
chmod +x ./deploy.sh

if docker info >/dev/null 2>&1; then
  echo "[setup] Running initial deploy"
  ./deploy.sh
  echo "[setup] Done. Application should be reachable on port 80."
else
  echo "[setup] Docker permissions not active in this shell yet."
  if [[ "$NEED_RELOGIN" -eq 1 ]]; then
    echo "[setup] Please log out and log in again, then run:"
  else
    echo "[setup] Open a new shell, then run:"
  fi
  echo "cd $TARGET_DIR && ./deploy.sh"
fi
