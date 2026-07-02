#!/usr/bin/env bash
# One-shot HTTPS fix on the server (run as root or with sudo for nginx/certbot).
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/uletay}"

if [[ -f "${DEPLOY_PATH}/cms/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${DEPLOY_PATH}/cms/.env"
  set +a
fi

: "${DOMAIN:?Set DOMAIN or cms/.env}"
: "${LE_EMAIL:?Set LE_EMAIL (email for Let's Encrypt)}"
: "${DEPLOY_PATH:?DEPLOY_PATH required}"
CMS_PORT="${PORT:-${CMS_PORT:-3000}}"

# shellcheck source=nginx-ssl-setup.sh
source "${DEPLOY_PATH}/deploy/nginx-ssl-setup.sh"
setup_https_nginx "$DEPLOY_PATH"
verify_https

echo "OK: https://${DOMAIN}/"
echo "HTTP → HTTPS redirect is active."
