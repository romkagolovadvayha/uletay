#!/usr/bin/env bash
# Isolated Linux integration test: actual release wrapper and filesystem switches,
# with nginx, PM2 and HTTP replaced by local stubs. Never contacts a server.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
test_root="$(mktemp -d /tmp/uletay-release-test.XXXXXX)"
cleanup() {
  [[ "$test_root" == /tmp/uletay-release-test.* && -d "$test_root" ]] || exit 1
  rm -rf -- "$test_root"
}
trap cleanup EXIT
sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
release_id="$sha-1-1"

for transport in original extended; do
for scenario in success prepare-failure health-failure; do
  export TEST_CASE="$test_root/$transport-$scenario"
  export SCENARIO="$scenario"
  mkdir -p "$TEST_CASE/bin" "$TEST_CASE/etc/nginx/sites-available" "$TEST_CASE/etc/nginx/sites-enabled" \
    "$TEST_CASE/etc/cron.d" "$TEST_CASE/etc/logrotate.d"
  root="$TEST_CASE/site"
  old="$root/releases/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-1-1"
  candidate="$root/releases/$release_id"
  mkdir -p "$old/cms/.next/static" "$old/dist/_expo" "$candidate/cms/.next/standalone" \
    "$candidate/cms/.next/static" "$candidate/dist" "$candidate/deploy"
  printf 'old-chunk' > "$old/dist/_expo/old.js"
  printf 'old-next' > "$old/cms/.next/static/old.js"
  printf 'old-shared' > "$old/cms/.next/static/common.js"
  printf 'new-shared' > "$candidate/cms/.next/static/common.js"
  printf 'test-only' > "$old/cms/.env"
  touch "$candidate/dist/index.html" "$candidate/cms/.next/standalone/server.js"
  ln -s "$old" "$root/current"
  printf '3000\n' > "$root/.active-port"
  printf 'uletay-cms-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-1-1\n' > "$root/.active-process"
  printf 'old-nginx\n' > "$TEST_CASE/etc/nginx/sites-available/uletay"
  printf 'old-cron\n' > "$TEST_CASE/etc/cron.d/uletay-push-reminders"
  ln -s "$TEST_CASE/etc/nginx/sites-available/default" "$TEST_CASE/etc/nginx/sites-enabled/default"
  ln -s "$TEST_CASE/etc/nginx/sites-available/uletay" "$TEST_CASE/etc/nginx/sites-enabled/uletay"

  for command in nginx systemctl pm2; do
    cat > "$TEST_CASE/bin/$command" <<'MOCK'
#!/usr/bin/env bash
printf '%s %s\n' "$(basename "$0")" "$*" >> "$TEST_CASE/operations"
MOCK
    chmod +x "$TEST_CASE/bin/$command"
  done
  cat > "$TEST_CASE/bin/curl" <<'MOCK'
#!/usr/bin/env bash
if [[ "$SCENARIO" == health-failure ]]; then
  printf '{"ok":true,"release":"wrong-release"}'
else
  printf '{"ok":true,"release":"%s"}' "$RELEASE_SHA"
fi
MOCK
  chmod +x "$TEST_CASE/bin/curl"
  cat > "$candidate/deploy/remote-deploy.sh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
pm2 start "$CMS_PROCESS_NAME"
printf 'new-nginx\n' > "$TEST_CASE/etc/nginx/sites-available/uletay"
printf 'new-cron\n' > "$TEST_CASE/etc/cron.d/uletay-push-reminders"
rm -f "$TEST_CASE/etc/nginx/sites-enabled/default"
[[ "$SCENARIO" != prepare-failure ]]
MOCK
  # Redirect only system configuration paths in the test copy; production source is unchanged.
  sed "s|/etc/|$TEST_CASE/etc/|g" "$repo/deploy/release-deploy.sh" > "$TEST_CASE/release.sh"
  cp "$repo/deploy/read-deployment-env.sh" "$TEST_CASE/read-deployment-env.sh"
  printf '%s\0' test.invalid "$root" test@example.invalid 3000 127.0.0.1 test test \
    '' admin '' '' '' '' '' '' '' '' '' '' '' > "$TEST_CASE/input"
  if [[ "$transport" == extended ]]; then
    printf '%s\0' 3306 '' '' >> "$TEST_CASE/input"
  fi
  printf '%s\0' "$sha" "$release_id" >> "$TEST_CASE/input"
  status=0
  PATH="$TEST_CASE/bin:$PATH" bash "$TEST_CASE/release.sh" --env-stdin < "$TEST_CASE/input" || status=$?
  test -f "$candidate/dist/_expo/old.js"
  test -f "$candidate/cms/.next/static/old.js"
  test "$(cat "$candidate/cms/.next/static/common.js")" = new-shared
  if [[ "$scenario" == success ]]; then
    test "$status" = 0
    test "$(readlink -f "$root/current")" = "$candidate"
    test "$(cat "$root/.active-port")" = 3001
    test -f "$candidate/.activated"
    grep -q '^pm2 delete uletay-cms-bbbbb' "$TEST_CASE/operations"
    ! grep -q "^pm2 delete uletay-cms-$release_id" "$TEST_CASE/operations"
  else
    test "$status" != 0
    test "$(readlink -f "$root/current")" = "$old"
    test "$(cat "$root/.active-port")" = 3000
    test "$(cat "$TEST_CASE/etc/nginx/sites-available/uletay")" = old-nginx
    test "$(cat "$TEST_CASE/etc/cron.d/uletay-push-reminders")" = old-cron
    test -L "$TEST_CASE/etc/nginx/sites-enabled/default"
    test ! -e "$candidate/.activated"
    ! grep -q '^pm2 delete uletay-cms-bbbbb' "$TEST_CASE/operations"
    grep -q "^pm2 delete uletay-cms-$release_id" "$TEST_CASE/operations"
  fi
  echo "Release scenario passed: $transport / $scenario"
done
done
