#!/usr/bin/env bash
set -euo pipefail

echo "=== Node ==="
node --version

echo "=== Bun ==="
bun --version

echo "=== Nginx ==="
nginx -v 2>&1

echo "=== Klassio Service ==="
systemctl --no-pager --full status klassio || true

echo "=== Lokaler Healthcheck ==="
curl --fail --silent http://127.0.0.1:3100/api/health
echo

echo "=== Aktuelles Release ==="
readlink -f /srv/klassio/current || true
cat /srv/klassio/current/KLASSIO_DEPLOYMENT_COMMIT.txt 2>/dev/null || true

echo "=== Nginx Konfiguration ==="
nginx -t

echo "=== Öffentliche Antwort ==="
curl -I -L --max-time 15 https://klassio.at || true
