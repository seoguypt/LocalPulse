#!/bin/sh
set -e

echo "Running database migrations..."
node_modules/.bin/drizzle-kit push || echo "Migration failed or no changes needed"

echo "Starting application..."
exec node .output/server/index.mjs
