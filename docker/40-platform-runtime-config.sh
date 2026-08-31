#!/bin/sh
set -eu

: "${PLATFORM_ENV:=production}"
: "${PLATFORM_IDENTITY_URL:=}"
: "${PLATFORM_TENANT_URL:=}"
: "${PLATFORM_AUTHORIZATION_URL:=}"
: "${PLATFORM_APPLICATION_URL:=}"
: "${PLATFORM_AUDIT_URL:=}"
: "${PLATFORM_CONFIG_URL:=}"

if [ "$PLATFORM_ENV" = 'production' ]; then
  for service_url in "$PLATFORM_IDENTITY_URL" "$PLATFORM_TENANT_URL" "$PLATFORM_AUTHORIZATION_URL" "$PLATFORM_APPLICATION_URL"; do
    if [ -z "$service_url" ]; then
      echo 'all PLATFORM_*_URL values are required in production' >&2
      exit 1
    fi
  done
fi

export PLATFORM_ENV PLATFORM_IDENTITY_URL PLATFORM_TENANT_URL PLATFORM_AUTHORIZATION_URL PLATFORM_APPLICATION_URL PLATFORM_AUDIT_URL PLATFORM_CONFIG_URL
envsubst '${PLATFORM_ENV} ${PLATFORM_IDENTITY_URL} ${PLATFORM_TENANT_URL} ${PLATFORM_AUTHORIZATION_URL} ${PLATFORM_APPLICATION_URL} ${PLATFORM_AUDIT_URL} ${PLATFORM_CONFIG_URL}' \
  < /usr/share/nginx/html/platform-config.js.template \
  > /usr/share/nginx/html/platform-config.js
