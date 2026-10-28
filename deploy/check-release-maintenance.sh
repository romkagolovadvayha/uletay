#!/usr/bin/env bash
# Verify runtime imports from the packaged tree, without the checkout's source files.
set -euo pipefail
archive="$(realpath "$1")"
dependencies="$(realpath cms/node_modules)"
unpacked="$(mktemp -d)"
trap 'rm -rf -- "$unpacked"' EXIT
tar -xzf "$archive" -C "$unpacked"
ln -s "$dependencies" "$unpacked/cms/node_modules"
cd "$unpacked"
node --import ./cms/node_modules/tsx/dist/loader.mjs -e '
  for (const module of [
    "./cms/src/lib/app-data.ts",
    "./cms/src/lib/headliner-web-images.ts",
    "./cms/src/lib/headliner-lastfm-sync.ts",
    "./cms/src/lib/favorite-reminders.ts",
  ]) require(module);
  console.log("Packaged CMS maintenance imports passed");
'
