#!/bin/sh
set -e

echo "=== Checking DATABASE_URL ==="
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set!"
  echo "Please add a PostgreSQL database to your Railway project"
  exit 1
fi
echo "DATABASE_URL is set: ${DATABASE_URL:0:30}..."

echo "=== Running database migrations ==="
if node_modules/.bin/drizzle-kit push; then
  echo "✓ Migrations completed successfully"
else
  echo "⚠ Migration failed or no changes needed"
fi

echo "=== Starting application ==="
exec node .output/server/index.mjs
