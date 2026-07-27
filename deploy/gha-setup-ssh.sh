#!/usr/bin/env bash
set -euo pipefail

: "${SSH_HOST:?SSH_HOST is required}"
: "${SSH_USER:?SSH_USER is required}"
: "${SSH_KNOWN_HOSTS:?SSH_KNOWN_HOSTS is required; store a pinned host key in the production Secret}"

SSH_PORT="${SSH_PORT:-22}"
KEY_FILE="${KEY_FILE:-$HOME/.ssh/deploy_key}"
KNOWN_HOSTS_FILE="${KNOWN_HOSTS_FILE:-$HOME/.ssh/known_hosts}"

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

if head -c 4 "$KEY_FILE" | grep -q '^ssh-'; then
  echo "The configured SSH key is public; a private deployment key is required"
  exit 1
fi

if ! ssh-keygen -y -P '' -f "$KEY_FILE" > "${KEY_FILE}.pub" 2>/dev/null; then
  echo "The configured SSH private key is invalid or password-protected"
  exit 1
fi

printf '%s\n' "$SSH_KNOWN_HOSTS" | tr -d '\r' > "$KNOWN_HOSTS_FILE"
chmod 600 "$KNOWN_HOSTS_FILE"

if [ "$SSH_PORT" = "22" ]; then
  KNOWN_HOST_TARGET="$SSH_HOST"
else
  KNOWN_HOST_TARGET="[${SSH_HOST}]:${SSH_PORT}"
fi

if ! ssh-keygen -F "$KNOWN_HOST_TARGET" -f "$KNOWN_HOSTS_FILE" >/dev/null; then
  echo "SSH_KNOWN_HOSTS does not contain an entry for ${KNOWN_HOST_TARGET}"
  exit 1
fi

echo "DEPLOY_KEY_FILE=$KEY_FILE" >> "${GITHUB_ENV:-/dev/null}"
