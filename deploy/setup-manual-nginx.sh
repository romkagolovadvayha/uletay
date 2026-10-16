#!/usr/bin/env bash
# Manual installation; generates the same routes as the release deployment.
set -euo pipefail
DOMAIN="${1:?Usage: setup-manual-nginx.sh example.ru /var/www/uletay}"
DEPLOY_PATH="${2:?Application directory is required}"
CMS_PORT="${CMS_PORT:-3000}"
[[ "$DOMAIN" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ && "$DOMAIN" == *.* && "$DOMAIN" != *..* ]] || exit 1
[[ "$DEPLOY_PATH" =~ ^/[A-Za-z0-9_./-]+$ && "$DEPLOY_PATH" != / && "$DEPLOY_PATH" != *..* ]] || exit 1
[[ "$CMS_PORT" =~ ^[0-9]+$ ]] && ((CMS_PORT > 0 && CMS_PORT < 65536)) || exit 1
[[ -f "$DEPLOY_PATH/dist/index.html" && -f "$DEPLOY_PATH/dist/festival-year.txt" ]] || { echo 'Build the web application first'; exit 1; }
source "$DEPLOY_PATH/deploy/nginx-ssl-setup.sh"
case "${3:-}" in
  '')
    apply_nginx_template "$DEPLOY_PATH/deploy/nginx.site.http.conf.template"
    echo "HTTP configured. Enable HTTPS: certbot --nginx -d $DOMAIN"
    ;;
  --https)
    [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]] || { echo 'Issue the certificate first'; exit 1; }
    ensure_ssl_params
    apply_nginx_template "$DEPLOY_PATH/deploy/nginx.site.ssl.conf.template"
    ;;
  *) echo 'Unknown option'; exit 1 ;;
esac
