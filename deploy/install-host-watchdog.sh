#!/usr/bin/env bash
# Install once per shared VPS; files live outside application releases.
set -euo pipefail
[[ "$(id -u)" == 0 ]] || { echo 'Run as root'; exit 1; }
source_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
for binary in python3 curl mysqladmin pm2 nginx systemctl busctl; do
  command -v "$binary" >/dev/null
done
[[ -f /var/www/uletay/.active-port && -f /var/www/uletay/.active-process ]]
systemctl cat taxigr-api.service >/dev/null
python3 -c 'import ast,sys; ast.parse(open(sys.argv[1]).read())' "$source_dir/host-watchdog.py"
backup="$(mktemp -d /var/backups/uletay-watchdog.XXXXXX)"
files=(/usr/local/sbin/uletay-host-watchdog.py /etc/systemd/system/uletay-host-watchdog.service /etc/systemd/system/uletay-host-watchdog.timer /etc/systemd/system/nginx.service.d/10-uletay-restart.conf)
for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$backup$(dirname "$file")"
    cp -p "$file" "$backup$file"
  fi
done
echo "Previous configuration saved in $backup"
install -d -m 0700 /var/lib/uletay-host-watchdog
install -d -m 0755 /etc/systemd/system/nginx.service.d
install -m 0755 "$source_dir/host-watchdog.py" /usr/local/sbin/uletay-host-watchdog.py
install -m 0644 "$source_dir/uletay-host-watchdog.service" /etc/systemd/system/uletay-host-watchdog.service
install -m 0644 "$source_dir/uletay-host-watchdog.timer" /etc/systemd/system/uletay-host-watchdog.timer
cat > /etc/systemd/system/nginx.service.d/10-uletay-restart.conf <<'EOF'
[Unit]
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Restart=on-failure
RestartSec=5s
EOF
systemd-analyze verify /etc/systemd/system/uletay-host-watchdog.service /etc/systemd/system/uletay-host-watchdog.timer
systemctl daemon-reload
# The read-only check must succeed before automatic recovery is enabled.
python3 /usr/local/sbin/uletay-host-watchdog.py
systemctl enable --now uletay-host-watchdog.timer
systemctl start uletay-host-watchdog.service
systemctl is-active uletay-host-watchdog.timer
systemctl show nginx -p Restart -p RestartUSec
