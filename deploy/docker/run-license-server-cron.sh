#!/bin/sh
set -u

while true; do
  curl --fail --silent --show-error --max-time 50 \
    --request POST \
    --header "Authorization: Bearer ${NRLS_NONCE_CLEANUP_CRON_SECRET}" \
    "http://license-server:3000/api/internal/nonce-cleanup" >/dev/null || true
  sleep 3600
done
