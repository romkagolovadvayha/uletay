#!/usr/bin/env bash
# Prepare a separate release and keep the previous process/files until verification passes.
set -euo pipefail

if [[ "${1:-}" != "--env-stdin" ]]; then
  echo "Usage: release-deploy.sh --env-stdin"
  exit 1
fi
for name in DOMAIN DEPLOY_PATH LE_EMAIL CMS_PORT DB_HOST DB_NAME DB_USER DB_PASS \
  ADMIN_USER ADMIN_PASSWORD SESSION_SECRET NEXT_PUBLIC_YANDEX_MAPS_API_KEY \
  LASTFM_API_KEY LASTFM_PROXY_URL VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT \
  EXPO_PUSH_ACCESS_TOKEN RUSTORE_PUSH_PROJECT_ID RUSTORE_PUSH_SERVICE_TOKEN RELEASE_SHA RELEASE_ID; do
  IFS= read -r -d '' value || { echo "Missing deployment field: $name"; exit 1; }
  printf -v "$name" '%s' "$value"
  export "$name"
done

[[ "$DEPLOY_PATH" =~ ^/[A-Za-z0-9_./-]+$ && "$DEPLOY_PATH" != / && "$DEPLOY_PATH" != *..* ]] || exit 1
[[ "$RELEASE_ID" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || exit 1
[[ "$CMS_PORT" =~ ^[0-9]+$ ]] && ((CMS_PORT > 0 && CMS_PORT < 65535)) || exit 1
export SHARED_ROOT="$DEPLOY_PATH"
export DEPLOY_PATH="$SHARED_ROOT/releases/$RELEASE_ID"
[[ -f "$DEPLOY_PATH/dist/index.html" && -f "$DEPLOY_PATH/cms/.next/standalone/server.js" ]] || exit 1
[[ ! -e "$DEPLOY_PATH/.activated" ]] || { echo 'Release was already activated; use a new run attempt'; exit 1; }
exec 9>"$SHARED_ROOT/.release.lock"
flock -n 9 || { echo 'Another release is being activated'; exit 1; }

previous="$(readlink -f "$SHARED_ROOT/current" 2>/dev/null || true)"
[[ -d "$previous/cms" ]] || previous="$SHARED_ROOT"
base_port="$CMS_PORT"
old_port="$(cat "$SHARED_ROOT/.active-port" 2>/dev/null || printf '%s' "$base_port")"
if [[ "$old_port" == "$base_port" ]]; then CMS_PORT=$((base_port + 1)); else CMS_PORT="$base_port"; fi
export CMS_PORT
export CMS_PROCESS_NAME="uletay-cms-$RELEASE_ID"
old_process="$(cat "$SHARED_ROOT/.active-process" 2>/dev/null || printf 'uletay-cms')"
[[ "$old_process" =~ ^uletay-cms(-[a-f0-9]{40}-[0-9]+-[0-9]+)?$ ]] || exit 1

mkdir -p "$SHARED_ROOT/uploads/images" "$SHARED_ROOT/logs"
ln -s "$SHARED_ROOT/uploads" "$DEPLOY_PATH/uploads"
ln -s "$SHARED_ROOT/logs" "$DEPLOY_PATH/logs"
if [[ -f "$previous/cms/.env" ]]; then
  cp "$previous/cms/.env" "$DEPLOY_PATH/cms/.env"
  chmod 600 "$DEPLOY_PATH/cms/.env"
fi

# Retain prior hashed chunks/fonts for open browser tabs, without replacing new assets.
for assets in dist/_expo dist/assets cms/.next/static; do
  if [[ -d "$previous/$assets" ]]; then
    mkdir -p "$DEPLOY_PATH/$assets"
    cp -a -n "$previous/$assets/." "$DEPLOY_PATH/$assets/"
  fi
done

backup="$(mktemp -d "$SHARED_ROOT/.release-backup.XXXXXX")"
for file in /etc/nginx/sites-available/uletay /etc/cron.d/uletay-push-reminders /etc/logrotate.d/uletay-push-reminders "$SHARED_ROOT/.active-port" "$SHARED_ROOT/.active-process"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$backup$(dirname "$file")"
    cp -p "$file" "$backup$file"
  fi
done
committed=0
if [[ -L /etc/nginx/sites-enabled/default ]]; then readlink /etc/nginx/sites-enabled/default > "$backup/default-target"; fi
rollback() {
  local status=$?
  trap - EXIT
  set +e
  if ((committed == 0)); then
    echo 'Release failed; restoring previous nginx configuration and reminder job.'
    for file in /etc/nginx/sites-available/uletay /etc/cron.d/uletay-push-reminders /etc/logrotate.d/uletay-push-reminders "$SHARED_ROOT/.active-port" "$SHARED_ROOT/.active-process"; do
      if [[ -f "$backup$file" ]]; then cp -p "$backup$file" "$file"; else rm -f "$file"; fi
    done
    if [[ "$previous" != "$SHARED_ROOT" ]]; then
      ln -s "$previous" "$SHARED_ROOT/.rollback-current-$RELEASE_ID"
      mv -Tf "$SHARED_ROOT/.rollback-current-$RELEASE_ID" "$SHARED_ROOT/current"
    elif [[ -L "$SHARED_ROOT/current" ]]; then
      rm -f "$SHARED_ROOT/current"
    fi
    if [[ -f "$backup/default-target" ]]; then ln -sf "$(cat "$backup/default-target")" /etc/nginx/sites-enabled/default; fi
    if [[ -f /etc/nginx/sites-available/uletay ]]; then
      ln -sf /etc/nginx/sites-available/uletay /etc/nginx/sites-enabled/uletay
    else
      rm -f /etc/nginx/sites-enabled/uletay
    fi
    nginx -t && systemctl reload nginx || true
    pm2 delete "$CMS_PROCESS_NAME" >/dev/null 2>&1 || true
    pm2 save >/dev/null 2>&1 || true
    # Previous process and release files have not been stopped or replaced.
  fi
  rm -rf -- "$backup"
  exit "$status"
}
trap rollback EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

bash "$DEPLOY_PATH/deploy/remote-deploy.sh"
health="$(curl -fsS --retry 4 --retry-delay 2 --max-time 10 "https://$DOMAIN/api/health")"
printf '%s' "$health" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const h=JSON.parse(s);if(!h.ok||h.release!==process.env.RELEASE_SHA)process.exit(1)})'

ln -s "$DEPLOY_PATH" "$SHARED_ROOT/.current-next"
mv -Tf "$SHARED_ROOT/.current-next" "$SHARED_ROOT/current"
printf '%s\n' "$CMS_PORT" > "$SHARED_ROOT/.active-port"
printf '%s\n' "$CMS_PROCESS_NAME" > "$SHARED_ROOT/.active-process"
touch "$DEPLOY_PATH/.activated"
committed=1
pm2 delete "$old_process" >/dev/null 2>&1 || true
pm2 save >/dev/null 2>&1 || true
echo "Activated release $RELEASE_ID; previous files retained at $previous"
