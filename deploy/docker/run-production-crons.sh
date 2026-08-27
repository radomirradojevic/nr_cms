#!/bin/sh
set -u

request() {
  route="$1"
  curl --fail --silent --show-error --max-time 50 \
    --header "Authorization: Bearer ${CRON_SECRET}" \
    "${CRON_BASE_URL}${route}" >/dev/null || true
}

minute=0
while true; do
  request "/api/cron/content-publishing"
  if [ "$CRON_PROFILE" = "client" ]; then
    request "/api/cron/license-server-operations"
  fi
  if [ $((minute % 5)) -eq 0 ]; then
    request "/api/cron/webshop-license-issues"
  fi
  if [ $((minute % 1440)) -eq 0 ]; then
    request "/api/cron/webshop-entitlement"
    if [ "$CRON_PROFILE" = "client" ]; then
      request "/api/cron/license-server-entitlement"
    fi
  fi
  minute=$((minute + 1))
  sleep 60
done
