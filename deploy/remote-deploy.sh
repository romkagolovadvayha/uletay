#!/usr/bin/env bash
set -euo pipefail

read_nul_env() {
  local name="$1"
  local value

  if ! IFS= read -r -d '' value; then
    echo "Missing ${name} in deployment input"
    exit 1
  fi

  printf -v "$name" '%s' "$value"
  export "$name"
}

if [[ "${1:-}" == "--env-stdin" ]]; then
  for name in \
    DOMAIN DEPLOY_PATH LE_EMAIL CMS_PORT \
    DB_HOST DB_NAME DB_USER DB_PASS \
    ADMIN_USER ADMIN_PASSWORD SESSION_SECRET \
    NEXT_PUBLIC_YANDEX_MAPS_API_KEY \
    LASTFM_API_KEY LASTFM_PROXY_URL \
    VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT \
    EXPO_PUSH_ACCESS_TOKEN RUSTORE_PUSH_PROJECT_ID RUSTORE_PUSH_SERVICE_TOKEN \
    RELEASE_SHA; do
    read_nul_env "$name"
  done
  shift
fi

if (($# != 0)); then
  echo "Usage: remote-deploy.sh [--env-stdin]"
  exit 1
fi

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
RELEASE_SHA="${RELEASE_SHA:-manual}"

read_existing_env() {
  local key="$1"
  if [[ ! -f "$DEPLOY_PATH/cms/.env" ]]; then
    return 0
  fi

  (
    set +u
    # shellcheck disable=SC1090
    source "$DEPLOY_PATH/cms/.env"
    printf '%s' "${!key}"
  )
}

if [[ -z "$SESSION_SECRET" ]]; then
  SESSION_SECRET="$(read_existing_env SESSION_SECRET)"
fi

LASTFM_API_KEY="${LASTFM_API_KEY:-}"
if [[ -z "$LASTFM_API_KEY" ]]; then
  LASTFM_API_KEY="$(read_existing_env LASTFM_API_KEY)"
fi

LASTFM_PROXY_URL="${LASTFM_PROXY_URL:-}"
if [[ -z "$LASTFM_PROXY_URL" ]]; then
  LASTFM_PROXY_URL="$(read_existing_env LASTFM_PROXY_URL)"
fi

VAPID_PUBLIC_KEY="${VAPID_PUBLIC_KEY:-}"
VAPID_PRIVATE_KEY="${VAPID_PRIVATE_KEY:-}"
VAPID_SUBJECT="${VAPID_SUBJECT:-}"
EXPO_PUSH_ACCESS_TOKEN="${EXPO_PUSH_ACCESS_TOKEN:-}"
RUSTORE_PUSH_PROJECT_ID="${RUSTORE_PUSH_PROJECT_ID:-}"
RUSTORE_PUSH_SERVICE_TOKEN="${RUSTORE_PUSH_SERVICE_TOKEN:-}"
if [[ -z "$VAPID_PUBLIC_KEY" ]]; then
  VAPID_PUBLIC_KEY="$(read_existing_env VAPID_PUBLIC_KEY)"
fi
if [[ -z "$VAPID_PRIVATE_KEY" ]]; then
  VAPID_PRIVATE_KEY="$(read_existing_env VAPID_PRIVATE_KEY)"
fi
if [[ -z "$EXPO_PUSH_ACCESS_TOKEN" ]]; then
  EXPO_PUSH_ACCESS_TOKEN="$(read_existing_env EXPO_PUSH_ACCESS_TOKEN)"
fi
if [[ -z "$RUSTORE_PUSH_PROJECT_ID" ]]; then
  RUSTORE_PUSH_PROJECT_ID="$(read_existing_env RUSTORE_PUSH_PROJECT_ID)"
fi
if [[ -z "$RUSTORE_PUSH_SERVICE_TOKEN" ]]; then
  RUSTORE_PUSH_SERVICE_TOKEN="$(read_existing_env RUSTORE_PUSH_SERVICE_TOKEN)"
fi
if [[ -z "$VAPID_SUBJECT" ]]; then
  VAPID_SUBJECT="$(read_existing_env VAPID_SUBJECT)"
fi
VAPID_SUBJECT="${VAPID_SUBJECT:-mailto:admin@${DOMAIN}}"

if [[ -z "$RUSTORE_PUSH_PROJECT_ID" ]]; then
  echo "RUSTORE_PUSH_PROJECT_ID is required"
  exit 1
fi

if [[ -z "$VAPID_PUBLIC_KEY" || -z "$VAPID_PRIVATE_KEY" ]]; then
  VAPID_PAIR=$(node -e "const c=require('crypto');const {privateKey}=c.generateKeyPairSync('ec',{namedCurve:'prime256v1'});const j=privateKey.export({format:'jwk'});const b=v=>Buffer.from(v,'base64url');console.log(Buffer.concat([Buffer.from([4]),b(j.x),b(j.y)]).toString('base64url'));console.log(j.d)")
  VAPID_PUBLIC_KEY=$(printf '%s\n' "$VAPID_PAIR" | sed -n '1p')
  VAPID_PRIVATE_KEY=$(printf '%s\n' "$VAPID_PAIR" | sed -n '2p')
  echo "Generated a persistent Web Push VAPID key pair"
fi

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ ]] ||
   [[ "$DOMAIN" != *.* || "$DOMAIN" == *..* || "$DOMAIN" == www.* ]]; then
  echo "DOMAIN must be an apex host name without scheme, path, or www, got ${DOMAIN}"
  exit 1
fi

if [[ "$DEPLOY_PATH" != /* || "$DEPLOY_PATH" == "/" || "$DEPLOY_PATH" == *".."* ]] ||
   [[ "$DEPLOY_PATH" =~ [^A-Za-z0-9_./-] ]]; then
  echo "DEPLOY_PATH must be a safe absolute directory below /, got ${DEPLOY_PATH}"
  exit 1
fi

if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "ADMIN_PASSWORD is required"
  exit 1
fi

if [[ -z "$SESSION_SECRET" ]]; then
  SESSION_SECRET=$(openssl rand -hex 32)
fi

if ((${#SESSION_SECRET} < 32)); then
  echo "SESSION_SECRET must contain at least 32 characters"
  exit 1
fi

if [ ! -f "$DEPLOY_PATH/dist/index.html" ]; then
  echo "Missing $DEPLOY_PATH/dist/index.html — Expo build was not synced"
  exit 1
fi

if [ ! -f "$DEPLOY_PATH/dist/404.html" ]; then
  echo "Missing $DEPLOY_PATH/dist/404.html — rebuild web app with public/404.html"
  exit 1
fi

mkdir -p "$DEPLOY_PATH/uploads/images"
chmod 775 "$DEPLOY_PATH/uploads" "$DEPLOY_PATH/uploads/images" || true

ENV_TMP=$(mktemp "$DEPLOY_PATH/cms/.env.tmp.XXXXXX")
trap 'rm -f "$ENV_TMP"' EXIT

write_env() {
  printf '%s=%q\n' "$1" "$2" >> "$ENV_TMP"
}

write_env DB_HOST "$DB_HOST"
write_env DB_NAME "$DB_NAME"
write_env DB_USER "$DB_USER"
write_env DB_PASS "$DB_PASS"
write_env ADMIN_USER "$ADMIN_USER"
write_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
write_env SESSION_SECRET "$SESSION_SECRET"
write_env CORS_ORIGIN "https://${DOMAIN}"
write_env BASE_PATH ""
write_env UPLOAD_DIR "${DEPLOY_PATH}/uploads"
write_env REPO_ASSETS_DIR "${DEPLOY_PATH}/assets"
write_env PORT "$CMS_PORT"
write_env NODE_ENV "production"
write_env NEXT_PUBLIC_YANDEX_MAPS_API_KEY "${NEXT_PUBLIC_YANDEX_MAPS_API_KEY:-}"
write_env LASTFM_API_KEY "$LASTFM_API_KEY"
write_env LASTFM_PROXY_URL "$LASTFM_PROXY_URL"
write_env VAPID_PUBLIC_KEY "$VAPID_PUBLIC_KEY"
write_env VAPID_PRIVATE_KEY "$VAPID_PRIVATE_KEY"
write_env VAPID_SUBJECT "$VAPID_SUBJECT"
write_env EXPO_PUSH_ACCESS_TOKEN "$EXPO_PUSH_ACCESS_TOKEN"
write_env RUSTORE_PUSH_PROJECT_ID "$RUSTORE_PUSH_PROJECT_ID"
write_env RUSTORE_PUSH_SERVICE_TOKEN "$RUSTORE_PUSH_SERVICE_TOKEN"

chmod 600 "$ENV_TMP"
mv -f "$ENV_TMP" "$DEPLOY_PATH/cms/.env"
trap - EXIT

if [[ -z "$LASTFM_API_KEY" ]]; then
  echo "Warning: LASTFM_API_KEY is empty — headliners:sync-lastfm will fail until you set it in GitHub production secrets or cms/.env"
else
  echo "LASTFM_API_KEY configured (${#LASTFM_API_KEY} characters)"
fi

if [[ -n "$LASTFM_PROXY_URL" ]]; then
  echo "LASTFM_PROXY_URL configured"
fi

bash "$DEPLOY_PATH/deploy/setup-lastfm-cron.sh"

cd "$DEPLOY_PATH/cms"
npm ci

if [ ! -f .next/BUILD_ID ] || [ ! -f .next/standalone/server.js ]; then
  echo "CMS build artifacts from CI are missing"
  exit 1
fi

mkdir -p .next/standalone/.next/static
cp -a .next/static/. .next/standalone/.next/static/
mkdir -p .next/standalone/data
cp -a data/. .next/standalone/data/ 2>/dev/null || true

mkdir -p .next/standalone/node_modules
if [ -d node_modules/sharp ]; then
  cp -a node_modules/sharp .next/standalone/node_modules/
fi
if [ -d node_modules/@img ]; then
  cp -a node_modules/@img .next/standalone/node_modules/
fi

set -a
source "$DEPLOY_PATH/cms/.env"
set +a
# Schema only — do not re-seed app_content (preserves uploaded images and admin edits)
npm run db:migrate
bash "$DEPLOY_PATH/deploy/setup-push-reminders-cron.sh"

# Create 160×160 *-list.webp siblings only — never overwrites originals.
echo "Generating list image variants (siblings only)..."
UPLOAD_DIR="${UPLOAD_DIR:-$DEPLOY_PATH/uploads}" npm run images:generate-list

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
source "$DEPLOY_PATH/cms/.env"
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

PUSH_CONFIG=$(curl -fsS --max-time 5 "http://127.0.0.1:${CMS_PORT}/api/push/subscribe")
if ! printf '%s' "$PUSH_CONFIG" | grep -q '"webPushSupported":true'; then
  echo "Web Push configuration check failed"
  exit 1
fi
if [ ! -f "$DEPLOY_PATH/dist/push-sw.js" ] || [ ! -f "$DEPLOY_PATH/dist/manifest.webmanifest" ]; then
  echo "Web Push static files are missing from dist"
  exit 1
fi

SAMPLE_FOODCOURT="${DEPLOY_PATH}/assets/images/foodcourt/forrest-group-2.jpg"
if [ ! -f "$SAMPLE_FOODCOURT" ]; then
  echo "Warning: bundled foodcourt asset missing: $SAMPLE_FOODCOURT"
else
  FC_CODE=$(curl -sS -o /dev/null -w '%{http_code}' -H "Host: ${DOMAIN}" \
    "http://127.0.0.1:${CMS_PORT}/api/fest-assets/images/foodcourt/forrest-group-2.jpg" || echo "000")
  if [ "$FC_CODE" != "200" ]; then
    echo "Warning: fest-assets returned HTTP ${FC_CODE} (check REPO_ASSETS_DIR in cms/.env)"
  fi
fi

verify_https

printf '%s\n' "$RELEASE_SHA" > "$DEPLOY_PATH/.deploy-version"

echo "Deploy complete: https://${DOMAIN}"
echo "Admin: https://${DOMAIN}/admin"
