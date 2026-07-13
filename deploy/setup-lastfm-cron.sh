#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

CRON_FILE="/etc/cron.d/uletay-lastfm"

# Last.fm sync runs via GitHub Actions (SSH tunnel to MySQL + proxy from CI).
# VPS proxies often accept TCP but fail HTTPS CONNECT to Last.fm.
if [ -f "$CRON_FILE" ]; then
  rm -f "$CRON_FILE"
  echo "Removed $CRON_FILE — Last.fm sync runs in GitHub Actions (.github/workflows/sync-lastfm.yml)"
fi

LASTFM_API_KEY=""
if [ -f "$DEPLOY_PATH/cms/.env" ]; then
  LASTFM_API_KEY=$(grep -E '^LASTFM_API_KEY=' "$DEPLOY_PATH/cms/.env" 2>/dev/null | cut -d= -f2- || true)
fi

if [ -z "$LASTFM_API_KEY" ]; then
  echo "LASTFM_API_KEY not configured — set in GitHub production Secrets"
  exit 0
fi

echo "Last.fm sync: GitHub Actions schedule (daily metadata only)"
echo "  workflow: .github/workflows/sync-lastfm.yml"
echo "  manual:   Actions → Sync Last.fm → Run workflow"
