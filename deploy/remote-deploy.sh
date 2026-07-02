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
PHP_FPM_SOCKET="${PHP_FPM_SOCKET:-/run/php/php8.2-fpm.sock}"
NGINX_SITE="/etc/nginx/sites-available/uletay"
NGINX_ENABLED="/etc/nginx/sites-enabled/uletay"

if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "ADMIN_PASSWORD is required"
  exit 1
fi

mkdir -p "$DEPLOY_PATH/api/uploads/images"
chmod -R 775 "$DEPLOY_PATH/api/uploads" || true

cat > "$DEPLOY_PATH/api/config.deploy.php" <<PHP
<?php
declare(strict_types=1);

return [
    'db_host' => '${DB_HOST}',
    'db_name' => '${DB_NAME}',
    'db_user' => '${DB_USER}',
    'db_pass' => '${DB_PASS}',
    'admin_username' => '${ADMIN_USER}',
    'admin_password' => '${ADMIN_PASSWORD}',
    'base_path' => '',
    'cors_origin' => 'https://${DOMAIN}',
];
PHP

php "$DEPLOY_PATH/api/install.php"

sed \
  -e "s|__DOMAIN__|${DOMAIN}|g" \
  -e "s|__DEPLOY_PATH__|${DEPLOY_PATH}|g" \
  -e "s|__PHP_FPM_SOCKET__|${PHP_FPM_SOCKET}|g" \
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
