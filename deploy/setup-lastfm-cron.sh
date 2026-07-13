#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

CRON_FILE="/etc/cron.d/uletay-lastfm"
RUNNER="$DEPLOY_PATH/deploy/run-headliner-lastfm-cron.sh"
METADATA_LOG="/var/log/uletay-lastfm-sync.log"
IMAGES_LOG="/var/log/uletay-lastfm-images.log"

LASTFM_API_KEY=""
if [ -f "$DEPLOY_PATH/cms/.env" ]; then
  LASTFM_API_KEY=$(grep -E '^LASTFM_API_KEY=' "$DEPLOY_PATH/cms/.env" 2>/dev/null | cut -d= -f2- || true)
fi

if [ ! -x "$RUNNER" ]; then
  chmod +x "$RUNNER"
fi

if [ -z "$LASTFM_API_KEY" ]; then
  if [ -f "$CRON_FILE" ]; then
    rm -f "$CRON_FILE"
    echo "Removed $CRON_FILE — LASTFM_API_KEY is not configured"
  else
    echo "Skipping Last.fm cron — LASTFM_API_KEY is not configured"
  fi
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Warning: npm not found — Last.fm cron not installed"
  exit 0
fi

touch "$METADATA_LOG" "$IMAGES_LOG"
chmod 644 "$METADATA_LOG" "$IMAGES_LOG"

cat > "$CRON_FILE" <<CRON
# Uletay Last.fm headliner sync (managed by deploy/setup-lastfm-cron.sh)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
DEPLOY_PATH=${DEPLOY_PATH}

# Daily metadata sync at 04:00 server time
0 4 * * * root ${RUNNER} metadata >> ${METADATA_LOG} 2>&1

# Weekly image refresh on Sunday at 05:00 server time
0 5 * * 0 root ${RUNNER} images >> ${IMAGES_LOG} 2>&1
CRON

chmod 644 "$CRON_FILE"
echo "Installed Last.fm cron: $CRON_FILE"
echo "  metadata: daily 04:00 -> $METADATA_LOG"
echo "  images:   weekly Sun 05:00 -> $IMAGES_LOG"
