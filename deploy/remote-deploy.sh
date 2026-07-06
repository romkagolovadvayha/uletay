#!/usr/bin/env bash
set -euo pipefail

: "${DOMAIN:?DOMAIN is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
: "${LE_EMAIL:?LE_EMAIL is required}"
: "${DB_HOST:?DB_HOST is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASS:?DB_PASS is required}"

ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
SESSION_SECRET="${SESSION_SECRET:-}"
CMS_PORT="${CMS_PORT:-3000}"
NGINX_SITE="/etc/nginx/sites-available/uletay"
NGINX_ENABLED="/etc/nginx/sites-enabled/uletay"

if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "ADMIN_PASSWORD is required"
  exit 1
fi

if [[ -z "$SESSION_SECRET" ]]; then
  SESSION_SECRET=$(openssl rand -hex 32)
fi

if [ ! -f "$DEPLOY_PATH/dist/index.html" ]; then
  echo "Missing $DEPLOY_PATH/dist/index.html — Expo build was not synced"
  exit 1
fi

mkdir -p "$DEPLOY_PATH/uploads/images"
chmod -R 775 "$DEPLOY_PATH/uploads" || true

cat > "$DEPLOY_PATH/cms/.env" <<ENV
DB_HOST=${DB_HOST}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
ADMIN_USER=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
SESSION_SECRET=${SESSION_SECRET}
CORS_ORIGIN=https://${DOMAIN}
BASE_PATH=
UPLOAD_DIR=${DEPLOY_PATH}/uploads
PORT=${CMS_PORT}
NODE_ENV=production
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=${NEXT_PUBLIC_YANDEX_MAPS_API_KEY:-}
ENV

cd "$DEPLOY_PATH/cms"
npm ci

if [ ! -f .next/BUILD_ID ]; then
  echo "CMS build not found from CI, building on server..."
  npm run build
fi

mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
mkdir -p .next/standalone/data
cp -r data/. .next/standalone/data/ 2>/dev/null || true

mkdir -p .next/standalone/node_modules
if [ -d node_modules/sharp ]; then
  cp -a node_modules/sharp .next/standalone/node_modules/
fi
if [ -d node_modules/@img ]; then
  cp -a node_modules/@img .next/standalone/node_modules/
fi

set -a
source .env
set +a
# Schema only — do not re-seed app_content (preserves uploaded images and admin edits)
npm run db:migrate

export PATH="/usr/local/bin:/usr/local/node/bin:$(npm prefix -g 2>/dev/null)/bin:${PATH}"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2..."
  sudo npm install -g pm2
  hash -r 2>/dev/null || true
  export PATH="/usr/local/bin:/usr/local/node/bin:$(npm prefix -g 2>/dev/null)/bin:${PATH}"
fi

PM2_BIN=$(command -v pm2 || true)
for candidate in /usr/local/bin/pm2 /usr/local/node/bin/pm2 /usr/bin/pm2; do
  if [ -x "$candidate" ]; then
    PM2_BIN="$candidate"
    break
  fi
done

if [ -z "$PM2_BIN" ] || [ ! -x "$PM2_BIN" ]; then
  echo "PM2 not found. On server run: sudo npm install -g pm2"
  exit 1
fi

echo "Using PM2: $PM2_BIN"

set -a
source .env
set +a
export HOSTNAME=127.0.0.1

CMS_SERVER="$DEPLOY_PATH/cms/.next/standalone/server.js"
if [ ! -f "$CMS_SERVER" ]; then
  echo "CMS server not found: $CMS_SERVER"
  exit 1
fi

if "$PM2_BIN" describe uletay-cms >/dev/null 2>&1; then
  "$PM2_BIN" restart uletay-cms --update-env
else
  "$PM2_BIN" start "$CMS_SERVER" --name uletay-cms --cwd "$DEPLOY_PATH/cms" --update-env
fi
"$PM2_BIN" save || true

# shellcheck source=nginx-ssl-setup.sh
source "$DEPLOY_PATH/deploy/nginx-ssl-setup.sh"
setup_https_nginx "$DEPLOY_PATH"

echo "Verifying local endpoints..."
FONT_FILE=$(find "$DEPLOY_PATH/dist/assets" -name 'Ionicons*.ttf' 2>/dev/null | head -1)
if [ -z "$FONT_FILE" ]; then
  echo "Font assets missing in dist/assets (check rsync excludes)"
  exit 1
fi

CMS_CHECK="/tmp/uletay-cms-check.json"
cms_ok=0
for _ in $(seq 1 20); do
  if curl -fsS --max-time 5 "http://127.0.0.1:${CMS_PORT}/api/data" -o "$CMS_CHECK" 2>/dev/null; then
    if grep -q '{' "$CMS_CHECK" 2>/dev/null; then
      cms_ok=1
      break
    fi
  fi
  sleep 1
done
rm -f "$CMS_CHECK"

if [ "$cms_ok" -ne 1 ]; then
  echo "CMS is not responding on port ${CMS_PORT}"
  "$PM2_BIN" logs uletay-cms --lines 40 --nostream 2>/dev/null || true
  exit 1
fi

verify_https

echo "Deploy complete: https://${DOMAIN}"
echo "Admin: https://${DOMAIN}/admin"
echo "Also by IP (HTTP): http://$(curl -fsS ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')/"
