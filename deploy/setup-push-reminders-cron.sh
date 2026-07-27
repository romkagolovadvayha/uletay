#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

CRON_FILE="/etc/cron.d/uletay-push-reminders"
LOGROTATE_FILE="/etc/logrotate.d/uletay-push-reminders"
LOG_DIR="$DEPLOY_PATH/logs"
RUNNER="$DEPLOY_PATH/cms/node_modules/.bin/tsx"

if [ "$(id -u)" -ne 0 ]; then
  echo "setup-push-reminders-cron.sh must run as root (the cron job uses /etc/cron.d)"
  exit 1
fi

if ! command -v flock >/dev/null 2>&1; then
  echo "flock is required (install the util-linux package)"
  exit 1
fi

if [ ! -x "$RUNNER" ]; then
  echo "tsx runner not found: $RUNNER"
  exit 1
fi

mkdir -p "$LOG_DIR"
chmod 775 "$LOG_DIR"

cat > "$CRON_FILE" <<CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""
* * * * * root flock -n /tmp/uletay-push-reminders.lock bash -lc 'set -a; source "$DEPLOY_PATH/cms/.env"; set +a; cd "$DEPLOY_PATH/cms"; "$RUNNER" scripts/send-favorite-reminders.ts >> "$LOG_DIR/push-reminders.log" 2>&1'
CRON

chmod 0644 "$CRON_FILE"

cat > "$LOGROTATE_FILE" <<LOGROTATE
$LOG_DIR/push-reminders.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
LOGROTATE

chmod 0644 "$LOGROTATE_FILE"
echo "Favorite push reminders: every minute via $CRON_FILE"
echo "Favorite push reminder logs: daily rotation via $LOGROTATE_FILE"
