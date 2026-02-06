#!/bin/sh
set -e

while true; do
  psql "postgres://authenticator:postgres@db:5432/pumpkin" \
    -v ON_ERROR_STOP=1 \
    -c "delete from public.presence where updated_at < now() - interval '60 seconds';"
  sleep 60
done
