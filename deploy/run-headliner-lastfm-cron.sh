#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/uletay}"
JOB="${1:-metadata}"

export PATH="/usr/local/bin:/usr/local/node/bin:/usr/sbin:/usr/bin:/sbin:/bin"

if [ ! -f "$DEPLOY_PATH/cms/package.json" ]; then
  echo "CMS not found at $DEPLOY_PATH/cms"
  exit 1
fi

cd "$DEPLOY_PATH/cms"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

case "$JOB" in
  metadata)
    npm run headliners:sync-lastfm
    ;;
  images)
    npm run headliners:sync-lastfm-images
    ;;
  *)
    echo "Unknown job: $JOB (expected metadata or images)" >&2
    exit 1
    ;;
esac
