#!/usr/bin/env bash
set -euo pipefail

: "${SSH_HOST:?SSH_HOST is required}"
: "${SSH_USER:?SSH_USER is required}"

SSH_PORT="${SSH_PORT:-22}"
KEY_FILE="${KEY_FILE:-$HOME/.ssh/deploy_key}"

mkdir -p ~/.ssh
chmod 700 ~/.ssh

if [ -n "${SSH_PRIVATE_KEY_B64:-}" ]; then
  B64=$(echo "$SSH_PRIVATE_KEY_B64" | tr -d '\r\n \t')
  case $((${#B64} % 4)) in 2) B64="${B64}==" ;; 3) B64="${B64}=" ;; esac
  if ! echo "$B64" | openssl base64 -d -A > "$KEY_FILE" 2>/dev/null; then
    echo "$B64" | base64 -d > "$KEY_FILE"
  fi
elif [ -n "${SSH_PRIVATE_KEY:-}" ]; then
  if printf '%s' "$SSH_PRIVATE_KEY" | grep -q '\\n'; then
    printf '%b' "$SSH_PRIVATE_KEY" | tr -d '\r' > "$KEY_FILE"
  else
    printf '%s' "$SSH_PRIVATE_KEY" | tr -d '\r' > "$KEY_FILE"
  fi
else
  echo "SSH_PRIVATE_KEY_B64 or SSH_PRIVATE_KEY is required"
  exit 1
fi

chmod 600 "$KEY_FILE"
ssh-keyscan -p "$SSH_PORT" -H "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
echo "DEPLOY_KEY_FILE=$KEY_FILE" >> "${GITHUB_ENV:-/dev/null}"
