#!/usr/bin/env bash
# Shared nginx + Let's Encrypt helpers for remote-deploy.sh
set -euo pipefail

apply_nginx_template() {
  local template_path="$1"
  local output_path="${2:-/etc/nginx/sites-available/uletay}"
  local enabled_path="${3:-/etc/nginx/sites-enabled/uletay}"
  local www_domain="www.${DOMAIN}"
  local festival_year
  festival_year="$(tr -d '\r\n' < "${DEPLOY_PATH}/dist/festival-year.txt")"
  if [[ ! "$festival_year" =~ ^[0-9]{4}$ ]]; then
    echo "Invalid festival year in dist/festival-year.txt: ${festival_year}" >&2
    return 1
  fi
  local sed_args=(
    -e "s|__DOMAIN__|${DOMAIN}|g"
    -e "s|__WWW_DOMAIN__|${www_domain}|g"
    -e "s|__DEPLOY_PATH__|${DEPLOY_PATH}|g"
    -e "s|__CMS_PORT__|${CMS_PORT}|g"
    -e "s|__FESTIVAL_YEAR__|${festival_year}|g"
  )

  sed "${sed_args[@]}" \
    "${DEPLOY_PATH}/deploy/nginx.spa-locations.conf" \
    | sudo tee "${DEPLOY_PATH}/deploy/nginx.spa-locations.active.conf" > /dev/null

  sed "${sed_args[@]}" "$template_path" | sudo tee "$output_path" > /dev/null

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

certificate_covers_www() {
  local www_domain="www.${DOMAIN}"
  sudo certbot certificates 2>/dev/null | grep -q "Domains:.*${www_domain}"
}

obtain_certificate() {
  local cert_dir="/etc/letsencrypt/live/${DOMAIN}"
  local www_domain="www.${DOMAIN}"

  ensure_certbot
  sudo mkdir -p /var/www/certbot

  if [[ -f "${cert_dir}/fullchain.pem" ]]; then
    if certificate_covers_www; then
      echo "Certificate already covers ${DOMAIN} and ${www_domain}"
      return 0
    fi

    echo "Expanding certificate to include ${www_domain}..."
    if ! sudo certbot certonly \
      --webroot \
      -w /var/www/certbot \
      -d "$DOMAIN" \
      -d "$www_domain" \
      --expand \
      --non-interactive \
      --agree-tos \
      -m "$LE_EMAIL" \
      --no-eff-email \
      --keep-until-expiring; then
      echo "::warning::Could not add ${www_domain} to certificate — www redirect will work only after DNS is configured"
    fi
    return 0
  fi

  echo "Requesting Let's Encrypt certificate for ${DOMAIN} and ${www_domain}..."
  if ! sudo certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    -d "$www_domain" \
    --non-interactive \
    --agree-tos \
    -m "$LE_EMAIL" \
    --no-eff-email \
    --keep-until-expiring; then
    echo "Falling back to apex-only certificate for ${DOMAIN}..."
    sudo certbot certonly \
      --webroot \
      -w /var/www/certbot \
      -d "$DOMAIN" \
      --non-interactive \
      --agree-tos \
      -m "$LE_EMAIL" \
      --no-eff-email \
      --keep-until-expiring
  fi
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
  local html_check="/tmp/uletay-https-check.html"
  local headers_check="/tmp/uletay-https-check.headers"
  local asset_headers_check="/tmp/uletay-asset-check.headers"
  local seo_check="/tmp/uletay-seo-check.html"
  local sitemap_check="/tmp/uletay-sitemap-check.xml"
  local robots_check="/tmp/uletay-robots-check.txt"
  local www_domain="www.${DOMAIN}"
  local code
  local index_asset
  local location

  curl -fsS -k --compressed "https://127.0.0.1/" \
    -H "Host: ${DOMAIN}" \
    -D "$headers_check" \
    -o "$html_check" \
    || { echo "HTTPS is not serving dist/ for ${DOMAIN}"; rm -f "$html_check" "$headers_check"; exit 1; }
  head -c 200 "$html_check" | grep -qiE 'html|УЛЕТАЙ|root' \
    || { echo "HTTPS is not serving dist/ for ${DOMAIN}"; rm -f "$html_check" "$headers_check"; exit 1; }
  for required_header in \
    strict-transport-security \
    content-security-policy \
    x-content-type-options \
    x-frame-options \
    referrer-policy \
    permissions-policy; do
    grep -qi "^${required_header}:" "$headers_check" \
      || { echo "Missing production header: ${required_header}"; rm -f "$html_check" "$headers_check"; exit 1; }
  done
  grep -qiE '^content-security-policy:.*style-src[^;]*https://yastatic\.net' "$headers_check" \
    || { echo "CSP style-src does not allow Yandex Maps styles"; rm -f "$html_check" "$headers_check"; exit 1; }
  grep -qi '^content-encoding: gzip' "$headers_check" \
    || { echo "Homepage is not gzip-compressed"; rm -f "$html_check" "$headers_check"; exit 1; }
  grep -qi '^link:.*hero-video-poster.webp.*rel=preload' "$headers_check" \
    || { echo "Homepage does not preload the LCP poster"; rm -f "$html_check" "$headers_check"; exit 1; }
  if grep -qiE '^server:.*nginx/[0-9]' "$headers_check"; then
    echo "nginx version is exposed in the Server header"
    rm -f "$html_check" "$headers_check"
    exit 1
  fi

  index_asset=$(grep -oE '/_expo/static/js/web/index-[^" ]+\.js' "$html_check" | head -1)
  if [[ -z "$index_asset" ]]; then
    echo "Could not locate the hashed web entry bundle"
    rm -f "$html_check" "$headers_check"
    exit 1
  fi
  curl -fsS -k -o /dev/null \
    -H "Host: ${DOMAIN}" \
    -H "Accept-Encoding: gzip" \
    -D "$asset_headers_check" \
    "https://127.0.0.1${index_asset}"
  grep -qi '^content-encoding: gzip' "$asset_headers_check" \
    || { echo "Web entry bundle is not gzip-compressed"; rm -f "$html_check" "$headers_check" "$asset_headers_check"; exit 1; }
  grep -qi '^cache-control:.*immutable' "$asset_headers_check" \
    || { echo "Hashed web entry bundle is not cached as immutable"; rm -f "$html_check" "$headers_check" "$asset_headers_check"; exit 1; }

  curl -fsS -k -o /dev/null \
    -H "Host: ${DOMAIN}" \
    -H "Accept-Encoding: gzip" \
    -D "$asset_headers_check" \
    "https://127.0.0.1/api/data"
  grep -qi '^content-encoding: gzip' "$asset_headers_check" \
    || { echo "API JSON is not gzip-compressed"; rm -f "$html_check" "$headers_check" "$asset_headers_check"; exit 1; }
  grep -qi '^cache-control:.*no-cache' "$asset_headers_check" \
    || { echo "API cache policy must require revalidation (no-cache)"; rm -f "$html_check" "$headers_check" "$asset_headers_check"; exit 1; }
  rm -f "$html_check" "$headers_check" "$asset_headers_check"

  curl -fsS -k "https://127.0.0.1/about" -H "Host: ${DOMAIN}" -o "$seo_check" \
    || { echo "HTTPS is not serving the /about SEO route"; rm -f "$seo_check"; exit 1; }
  grep -Fq "<title>О фестивале — УЛЕТАЙ" "$seo_check" \
    || { echo "/about has the wrong title"; rm -f "$seo_check"; exit 1; }
  grep -Fq "rel=\"canonical\" href=\"https://${DOMAIN}/about\"" "$seo_check" \
    || { echo "/about has the wrong canonical URL"; rm -f "$seo_check"; exit 1; }
  rm -f "$seo_check"

  curl -fsS -k "https://127.0.0.1/sitemap.xml" -H "Host: ${DOMAIN}" -o "$sitemap_check" \
    || { echo "sitemap.xml is not available"; rm -f "$sitemap_check"; exit 1; }
  local festival_year
  festival_year="$(tr -d '\r\n' < "${DEPLOY_PATH}/dist/festival-year.txt")"
  grep -Fq "<loc>https://${DOMAIN}/headliners/${festival_year}</loc>" "$sitemap_check" \
    || { echo "sitemap.xml does not contain public routes"; rm -f "$sitemap_check"; exit 1; }
  rm -f "$sitemap_check"

  curl -fsS -k "https://127.0.0.1/robots.txt" -H "Host: ${DOMAIN}" -o "$robots_check" \
    || { echo "robots.txt is not available"; rm -f "$robots_check"; exit 1; }
  grep -Fq "Sitemap: https://${DOMAIN}/sitemap.xml" "$robots_check" \
    || { echo "robots.txt points to the wrong sitemap"; rm -f "$robots_check"; exit 1; }
  rm -f "$robots_check"

  code=$(curl -fsS -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" "http://127.0.0.1/")
  if [[ "$code" != "301" && "$code" != "308" ]]; then
    echo "HTTP redirect to HTTPS expected (301), got ${code}"
    exit 1
  fi

  if certificate_covers_www; then
    code=$(curl -fsS -o /dev/null -w '%{http_code}' -H "Host: ${www_domain}" "http://127.0.0.1/")
    location=$(curl -fsS -o /dev/null -w '%{redirect_url}' -H "Host: ${www_domain}" "http://127.0.0.1/")
    if [[ "$code" != "301" && "$code" != "308" ]]; then
      echo "www HTTP redirect expected (301), got ${code}"
      exit 1
    fi
    if [[ "$location" != "https://${DOMAIN}/" && "$location" != "https://${DOMAIN}"* ]]; then
      echo "www HTTP redirect should target https://${DOMAIN}, got ${location:-<empty>}"
      exit 1
    fi

    code=$(curl -fsS -k -o /dev/null -w '%{http_code}' -H "Host: ${www_domain}" "https://127.0.0.1/")
    location=$(curl -fsS -k -o /dev/null -w '%{redirect_url}' -H "Host: ${www_domain}" "https://127.0.0.1/")
    if [[ "$code" != "301" && "$code" != "308" ]]; then
      echo "www HTTPS redirect expected (301), got ${code}"
      exit 1
    fi
    if [[ "$location" != "https://${DOMAIN}/" && "$location" != "https://${DOMAIN}"* ]]; then
      echo "www HTTPS redirect should target https://${DOMAIN}, got ${location:-<empty>}"
      exit 1
    fi
  else
    echo "Skipping www redirect checks — certificate does not include ${www_domain}"
  fi

  code=$(curl -sS -k -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" \
    "https://127.0.0.1/__uletay-404-check__")
  if [[ "$code" != "404" ]]; then
    echo "Custom 404 page expected (404), got ${code}"
    exit 1
  fi

  # Include current CMS entities, not only the build-time sitemap: newly added
  # cards must survive direct entry and refresh before another web build.
  node "${DEPLOY_PATH}/deploy/check-web-routes.mjs" "https://${DOMAIN}" 127.0.0.1
}
