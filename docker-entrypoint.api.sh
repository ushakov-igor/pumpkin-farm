#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  /app/db/migrate.sh || true
fi

exec /usr/local/bin/postgrest
