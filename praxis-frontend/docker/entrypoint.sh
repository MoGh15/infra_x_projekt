#!/bin/sh
set -e

# Leer = gleicher Origin, API-Aufrufe laufen über den nginx-Proxy (/api -> BACKEND_URL)
API_URL="${API_URL:-}"
BACKEND_URL="${BACKEND_URL:-http://backend:8080}"
export BACKEND_URL

# generate env.js
sed "s|\$API_URL|$API_URL|g" \
  /usr/share/nginx/html/assets/env.template.js \
  > /usr/share/nginx/html/assets/env.js

# generate nginx config (nur BACKEND_URL ersetzen, nginx-Variablen wie $host bleiben)
envsubst '${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec "$@"
