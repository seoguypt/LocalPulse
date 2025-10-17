#!/bin/sh
set -e

echo "=== Checking DATABASE_URL ==="
# Check both NUXT_DATABASE_URL and DATABASE_URL
DB_URL="${NUXT_DATABASE_URL:-$DATABASE_URL}"
if [ -z "$DB_URL" ]; then
  echo "ERROR: DATABASE_URL or NUXT_DATABASE_URL is not set!"
  echo "Please add a PostgreSQL database to your Railway project"
  exit 1
fi
echo "Database URL is set: ${DB_URL:0:30}..."

# Export for drizzle-kit
export DATABASE_URL="$DB_URL"

echo "=== Running database migrations ==="
cd /app
if node node_modules/drizzle-kit/bin.cjs push; then
  echo "✓ Migrations completed successfully"
else
  echo "⚠ Migration failed or no changes needed"
fi

echo "=== Starting application ==="
exec node .output/server/index.mjs
