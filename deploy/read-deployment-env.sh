#!/usr/bin/env bash
# Accept the original server transport and the extended DB/VK transport.
read_deployment_env() {
  local mode="$1" name value
  local -a values=() names=(
    DOMAIN DEPLOY_PATH LE_EMAIL CMS_PORT DB_HOST DB_NAME DB_USER DB_PASS
    ADMIN_USER ADMIN_PASSWORD SESSION_SECRET NEXT_PUBLIC_YANDEX_MAPS_API_KEY
    LASTFM_API_KEY LASTFM_PROXY_URL VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT
    EXPO_PUSH_ACCESS_TOKEN RUSTORE_PUSH_PROJECT_ID RUSTORE_PUSH_SERVICE_TOKEN
  )
  while IFS= read -r -d '' value; do values+=("$value"); done
  local original_count=21 extended_count=24
  if [[ "$mode" == release ]]; then
    original_count=22
    extended_count=25
  fi
  case "${#values[@]}" in
    "$original_count") ;;
    "$extended_count") names+=(DB_PORT VK_APP_ID VK_REDIRECT_URI) ;;
    *) echo 'Unexpected number of deployment fields'; return 1 ;;
  esac
  names+=(RELEASE_SHA)
  if [[ "$mode" == release ]]; then names+=(RELEASE_ID); fi
  local index=0
  for name in "${names[@]}"; do
    printf -v "$name" '%s' "${values[$index]}"
    export "$name"
    index=$((index + 1))
  done
}
