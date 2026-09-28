#!/usr/bin/env bash
set -euo pipefail
echo 'Install dependencies'
npm ci --no-audit --no-fund
npm ci --no-audit --no-fund --prefix cms

echo 'Run preflight checks'
npx expo install --check
npm run lint
npm run typecheck
npx tsx --test scripts/test-radio.ts
npm run test:rustore-push-config
npm run test:audit-fixes
npm run test:sw
npm run test:api-url
npm run test:map
npm run test:map:renderer
npm run test:map:layout
npm run test:map:routing
npm run test:push-reminders --prefix cms
npm run test:admin --prefix cms
node scripts/test-deployed-map.mjs
npx tsx scripts/test-web-linking.mjs
test -f deploy/setup-push-reminders-cron.sh
for script in deploy/*.sh scripts/test-release-deploy.sh; do bash -n "$script"; done
bash scripts/test-release-deploy.sh

echo 'Check direct web navigation with nginx'
node scripts/test-web-routes.mjs

echo 'Build and verify web app'
npm run build:web
npm run seo:check
npm run test:push-web
test -f dist/index.html
test -f dist/404.html
test -f dist/manifest.webmanifest
test -f dist/push-sw.js
test -d dist/_expo/static/js/web
find dist/assets -name 'Ionicons*.ttf' | grep -q .
find dist/assets -name 'Montserrat_400Regular*.ttf' | grep -q .

echo 'Build and verify CMS'
npm run build --prefix cms
test -f cms/.next/BUILD_ID
test -f cms/.next/standalone/server.js

tar --dereference --hard-dereference --exclude='cms/.env*' --exclude='cms/node_modules' --exclude='cms/.next/cache' \
  -czf release.tar.gz dist assets cms deploy shared
