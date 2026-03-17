#!/bin/bash

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$APP_DIR/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$APP_DIR"

log "===== Deployment started ====="

# 1. Check for remote changes
log "Checking for remote changes..."
git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
  log "Already up to date. No deployment needed."
  exit 0
fi

log "Changes detected. Proceeding with deployment..."

# 2. Pull latest code
log "Pulling latest code from git..."
git pull origin "$(git rev-parse --abbrev-ref HEAD)"
log "Code pulled successfully."

# 3. Install/update dependencies
log "Installing dependencies..."
npm install --production=false
log "Dependencies installed."

# 4. Delete old build
log "Deleting old build..."
rm -rf dist/
log "Old build deleted."

# 5. Create new build
log "Building project..."
npm run build
log "Build completed successfully."

log "===== Deployment finished ====="
