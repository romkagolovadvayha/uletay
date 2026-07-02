#!/usr/bin/env bash
set -euo pipefail

KEY="${1:-$HOME/.ssh/uletay_ci}"

if [ ! -f "$KEY" ]; then
  echo "Creating new key without passphrase: $KEY"
  ssh-keygen -t ed25519 -f "$KEY" -N "" -C "github-actions"
fi

echo "=== 1. Private key must work WITHOUT passphrase ==="
if ! ssh-keygen -y -f "$KEY" > /dev/null; then
  echo "FAIL: key has passphrase or is corrupted."
  echo "Recreate: ssh-keygen -t ed25519 -f $KEY -N \"\" -C github-actions"
  exit 1
fi
echo "OK"

echo ""
echo "=== 2. Add public key to authorized_keys ==="
PUB="${KEY}.pub"
grep -qxF "$(cat "$PUB")" "$HOME/.ssh/authorized_keys" 2>/dev/null \
  || cat "$PUB" >> "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"
echo "OK: $(cat "$PUB")"

echo ""
echo "=== 3. Base64 roundtrip test ==="
B64=$(base64 -w0 "$KEY")
TMP=$(mktemp)
echo "$B64" | base64 -d > "$TMP"
chmod 600 "$TMP"
ssh-keygen -y -f "$TMP" > /dev/null
rm -f "$TMP"
echo "OK: roundtrip works, b64 length ${#B64}"

echo ""
echo "=== 4. Copy ONE line to GitHub Secret: SSH_PRIVATE_KEY_B64 ==="
echo "$B64"
echo ""
echo "Delete SSH_PRIVATE_KEY and SSH_KEY_PASSPHRASE from GitHub."
