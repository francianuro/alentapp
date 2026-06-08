#!/bin/sh
set -e

echo "Starting API..."
exec node packages/api/dist/app.js
