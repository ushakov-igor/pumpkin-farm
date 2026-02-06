#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set, skipping migrations"
  exit 0
fi

for f in /app/db/init/*.sql; do
  echo "Running $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
