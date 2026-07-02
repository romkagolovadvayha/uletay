#!/usr/bin/env bash
# Shared nginx + Let's Encrypt helpers for remote-deploy.sh
set -euo pipefail

apply_nginx_template() {
  local template_path="$1"
  local output_path="${2:-/etc/nginx/sites-available/uletay}"
  local enabled_path="${3:-/etc/nginx/sites-enabled/uletay}"

  sed \
    -e "s|__DOMAIN__|${DOMAIN}|g" \
    -e "s|__DEPLOY_PATH__|${DEPLOY_PATH}|g" \
    -e "s|__CMS_PORT__|${CMS_PORT}|g" \
    "$template_path" | sudo tee "$output_path" > /dev/null

  sudo rm -f /etc/nginx/sites-enabled/default
  sudo ln -sf "$output_path" "$enabled_path"
  sudo nginx -t
  sudo systemctl reload nginx
}

ensure_certbot() {
  if command -v certbot >/dev/null 2>&1; then
    return 0
  fi
  echo "Installing certbot..."
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot
}

ensure_ssl_params() {
  if [[ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
    sudo mkdir -p /etc/letsencrypt
    if [[ -f /usr/share/certbot/options-ssl-nginx.conf ]]; then
      sudo cp /usr/share/certbot/options-ssl-nginx.conf /etc/letsencrypt/options-ssl-nginx.conf
    else
      sudo tee /etc/letsencrypt/options-ssl-nginx.conf > /dev/null <<'SSL'
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384";
SSL
    fi
  fi

  if [[ ! -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
    echo "Generating ssl-dhparams.pem (one-time)..."
    sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
  fi
}

obtain_certificate() {
  local cert_dir="/etc/letsencrypt/live/${DOMAIN}"
  if [[ -f "${cert_dir}/fullchain.pem" ]]; then
    echo "Certificate already present: ${cert_dir}"
    return 0
  fi

  ensure_certbot
  sudo mkdir -p /var/www/certbot

  echo "Requesting Let's Encrypt certificate for ${DOMAIN}..."
  sudo certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$LE_EMAIL" \
    --no-eff-email \
    --keep-until-expiring
}

setup_https_nginx() {
  local deploy_root="$1"
  local cert_dir="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

  sudo mkdir -p /var/www/certbot

  if [[ ! -f "$cert_dir" ]]; then
    echo "No certificate yet — serving HTTP and requesting cert..."
    apply_nginx_template "${deploy_root}/deploy/nginx.site.http.conf.template"
    obtain_certificate
  fi

  if [[ ! -f "$cert_dir" ]]; then
    echo "::error::Certificate was not issued for ${DOMAIN}. Check DNS A record points to this server."
    exit 1
  fi

  ensure_ssl_params
  apply_nginx_template "${deploy_root}/deploy/nginx.site.ssl.conf.template"

  ensure_certbot
  sudo certbot renew --quiet --deploy-hook "systemctl reload nginx" || true
}

verify_https() {
  curl -fsS -k "https://127.0.0.1/" -H "Host: ${DOMAIN}" | head -c 200 | grep -qiE 'html|УЛЕТАЙ|root' \
    || { echo "HTTPS is not serving dist/ for ${DOMAIN}"; exit 1; }

  local code
  code=$(curl -fsS -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" "http://127.0.0.1/")
  if [[ "$code" != "301" && "$code" != "308" ]]; then
    echo "HTTP redirect to HTTPS expected (301), got ${code}"
    exit 1
  fi
}
