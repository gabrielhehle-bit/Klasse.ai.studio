#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Bitte mit sudo/root ausführen."
  exit 1
fi

BASE=/srv/klassio
CURRENT="$(readlink -f "$BASE/current" || true)"
PREVIOUS="$(readlink -f "$BASE/previous" || true)"

if [ -z "$PREVIOUS" ] || [ ! -d "$PREVIOUS" ]; then
  echo "Kein vorheriges Klassio-Release vorhanden."
  exit 1
fi

ln -sfnT "$PREVIOUS" "$BASE/current"
if [ -n "$CURRENT" ] && [ -d "$CURRENT" ]; then
  ln -sfnT "$CURRENT" "$BASE/previous"
fi

systemctl restart klassio

for i in {1..40}; do
  if curl --fail --silent http://127.0.0.1:3100/api/health | grep -q '"status":"ok"'; then
    echo "Rollback erfolgreich: $PREVIOUS"
    exit 0
  fi
  sleep 0.5
done

journalctl -u klassio -n 80 --no-pager || true
echo "Rollback-Ziel startet nicht gesund."
exit 1
