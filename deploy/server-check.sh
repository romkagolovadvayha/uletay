#!/usr/bin/env bash
# Run on VPS: bash /var/www/uletay/deploy/server-check.sh

set -uo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/uletay}"
CMS_PORT="${CMS_PORT:-3000}"

echo "=== Files ==="
ls -la "$DEPLOY_PATH/dist/index.html" 2>/dev/null || echo "MISSING: dist/index.html"
ls -la "$DEPLOY_PATH/cms/.next/standalone/server.js" 2>/dev/null || echo "MISSING: cms standalone server"

echo ""
echo "=== PM2 ==="
command -v pm2 >/dev/null && pm2 status || echo "pm2 not found"

echo ""
echo "=== CMS local ==="
curl -sS -o /dev/null -w "cms /api/data → HTTP %{http_code}\n" "http://127.0.0.1:${CMS_PORT}/api/data" || echo "CMS not reachable"

echo ""
echo "=== nginx sites ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
echo "--- uletay config (first 20 lines) ---"
head -20 /etc/nginx/sites-available/uletay 2>/dev/null || echo "No uletay nginx config"

echo ""
echo "=== nginx test ==="
sudo nginx -t 2>&1 || true

echo ""
echo "=== HTTP from outside (this host) ==="
curl -sS -o /dev/null -w "GET / → HTTP %{http_code}\n" "http://127.0.0.1/" || true
curl -sS -o /dev/null -w "GET /api/data → HTTP %{http_code}\n" "http://127.0.0.1/api/data" || true
