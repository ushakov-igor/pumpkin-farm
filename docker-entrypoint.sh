#!/bin/sh
set -e

API_BASE_VALUE=${API_BASE:-/api}
TEMPLATE=/usr/share/nginx/html/config.template.js
TARGET=/usr/share/nginx/html/config.js

if [ -f "$TEMPLATE" ]; then
  sed "s|__API_BASE__|$API_BASE_VALUE|g" "$TEMPLATE" > "$TARGET"
fi

/app/db/migrate.sh || true

exec nginx -g "daemon off;"
