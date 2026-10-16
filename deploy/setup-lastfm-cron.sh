#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

CRON_FILE="/etc/cron.d/uletay-lastfm"

# Last.fm sync runs via Gitlub Actions on the production host (local MySQL + configured proxy).
# A restricted SSH command runs the active CMS revision without a database tunnel.
if [ -f "$CRON_FILE" ]; then
  rm -f "$CRON_FILE"
  echo "Removed $CRON_FILE — Last.fm sync runs in Gitlub Actions (.forgejo/workflows/sync-lastfm.yml)"
fi

LASTFM_API_KEY=""
if [ -f "$DEPLOY_PATH/cms/.env" ]; then
  LASTFM_API_KEY=$(grep -E '^LASTFM_API_KEY=' "$DEPLOY_PATH/cms/.env" 2>/dev/null | cut -d= -f2- || true)
fi

if [ -z "$LASTFM_API_KEY" ]; then
  echo "LASTFM_API_KEY not configured — set in Gitlub PRODUCTION_LASTFM_API_KEY Secret"
  exit 0
fi

echo "Last.fm sync: Gitlub Actions schedule (daily metadata only)"
echo "  workflow: .forgejo/workflows/sync-lastfm.yml"
echo "  manual:   Actions → Sync Last.fm → Run workflow"
