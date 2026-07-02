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
ENV

cd "$DEPLOY_PATH/cms"
npm ci --omit=dev
npm run build

mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static

set -a
source .env
set +a
npm run db:install

ECOSYSTEM=$(sed \
  -e "s|__DEPLOY_PATH__|${DEPLOY_PATH}|g" \
  -e "s|__CMS_PORT__|${CMS_PORT}|g" \
  "$DEPLOY_PATH/deploy/ecosystem.config.cjs")

echo "$ECOSYSTEM" | sudo tee "$DEPLOY_PATH/deploy/ecosystem.runtime.cjs" > /dev/null

if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrRestart "$DEPLOY_PATH/deploy/ecosystem.runtime.cjs"
  pm2 save || true
else
  sudo npm install -g pm2
  pm2 startOrRestart "$DEPLOY_PATH/deploy/ecosystem.runtime.cjs"
  pm2 save || true
fi

sed \
  -e "s|__DOMAIN__|${DOMAIN}|g" \
  -e "s|__DEPLOY_PATH__|${DEPLOY_PATH}|g" \
  -e "s|__CMS_PORT__|${CMS_PORT}|g" \
  "$DEPLOY_PATH/deploy/nginx.site.conf.template" | sudo tee "$NGINX_SITE" > /dev/null

sudo ln -sf "$NGINX_SITE" "$NGINX_ENABLED"
sudo nginx -t
sudo systemctl reload nginx

if [[ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
  echo "Issuing HTTPS certificate for ${DOMAIN}..."
  sudo certbot --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$LE_EMAIL" \
    --redirect
else
  echo "HTTPS certificate already exists for ${DOMAIN}"
  sudo certbot renew --quiet || true
fi

sudo nginx -t
sudo systemctl reload nginx

echo "Deploy complete: https://${DOMAIN}"
echo "Admin: https://${DOMAIN}/admin"
