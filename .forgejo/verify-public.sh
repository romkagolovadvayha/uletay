#!/usr/bin/env bash
set -euo pipefail
curl -fsS --retry 5 --retry-delay 2 --retry-all-errors \
  "https://${DOMAIN}/" -o "$RUNNER_TEMP/uletay-index.html"
grep -qi '<html' "$RUNNER_TEMP/uletay-index.html"

curl -fsS --retry 5 --retry-delay 2 --retry-all-errors \
  "https://${DOMAIN}/api/data" -o "$RUNNER_TEMP/uletay-api.json"
node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8'))" \
  "$RUNNER_TEMP/uletay-api.json"
node deploy/verify-map-data.mjs \
  "$RUNNER_TEMP/uletay-api.json" "cms/seed/content.json"

node deploy/check-web-routes.mjs "https://${DOMAIN}"
node deploy/check-public-resources.mjs "https://${DOMAIN}" "${RELEASE_SHA:-}"
node deploy/check-vk-headliners.mjs "https://vk-headliners.${DOMAIN}" "${RELEASE_SHA:-}"
