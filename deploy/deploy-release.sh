#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Bitte mit sudo/root ausführen."
  exit 1
fi

ZIP_PATH="${1:-}"
EXPECTED_COMMIT="${2:-}"

if [ -z "$ZIP_PATH" ] || [ ! -f "$ZIP_PATH" ]; then
  echo "Verwendung: sudo deploy/deploy-release.sh /pfad/klassio-world4you-<sha>.zip [erwarteter-vollständiger-commit]"
  exit 1
fi

for command in unzip bun node curl systemctl; do
  command -v "$command" >/dev/null 2>&1 || { echo "Fehlt: $command"; exit 1; }
done

BASE=/srv/klassio
INCOMING="$(mktemp -d "$BASE/releases/.incoming-XXXXXX")"
cleanup() {
  rm -rf "$INCOMING"
}
trap cleanup EXIT

unzip -q "$ZIP_PATH" -d "$INCOMING"

for required in   "$INCOMING/dist/server.cjs"   "$INCOMING/dist/index.html"   "$INCOMING/package.json"   "$INCOMING/bun.lock"   "$INCOMING/KLASSIO_DEPLOYMENT_COMMIT.txt"; do
  if [ ! -f "$required" ]; then
    echo "Release unvollständig: $required fehlt."
    exit 1
  fi
done

DEPLOY_COMMIT="$(tr -d '[:space:]' < "$INCOMING/KLASSIO_DEPLOYMENT_COMMIT.txt")"
if [ -z "$DEPLOY_COMMIT" ]; then
  echo "Leere Commit-Kennung im Release."
  exit 1
fi

if [ -n "$EXPECTED_COMMIT" ] && [ "$DEPLOY_COMMIT" != "$EXPECTED_COMMIT" ]; then
  echo "Commit stimmt nicht: Release=$DEPLOY_COMMIT erwartet=$EXPECTED_COMMIT"
  exit 1
fi

RELEASE_NAME="${DEPLOY_COMMIT:0:12}-$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="$BASE/releases/$RELEASE_NAME"

chown -R klassio:klassio "$INCOMING"
sudo -u klassio env HOME=/home/klassio bash -lc "cd '$INCOMING' && /usr/local/bin/bun install --production --frozen-lockfile"

mv "$INCOMING" "$RELEASE_DIR"
trap - EXIT
chown -R klassio:klassio "$RELEASE_DIR"

PREVIOUS_TARGET=""
if [ -L "$BASE/current" ]; then
  PREVIOUS_TARGET="$(readlink -f "$BASE/current" || true)"
fi

if [ -n "$PREVIOUS_TARGET" ] && [ -d "$PREVIOUS_TARGET" ]; then
  ln -sfnT "$PREVIOUS_TARGET" "$BASE/previous"
fi

ln -sfnT "$RELEASE_DIR" "$BASE/current"
systemctl restart klassio

HEALTH_OK=0
for i in {1..40}; do
  if curl --fail --silent http://127.0.0.1:3100/api/health | grep -q '"status":"ok"'; then
    HEALTH_OK=1
    break
  fi
  sleep 0.5
done

if [ "$HEALTH_OK" -ne 1 ]; then
  echo "Healthcheck fehlgeschlagen. Letzte Service-Logs:"
  journalctl -u klassio -n 80 --no-pager || true

  if [ -n "$PREVIOUS_TARGET" ] && [ -d "$PREVIOUS_TARGET" ]; then
    echo "Rollback auf vorheriges Release: $PREVIOUS_TARGET"
    ln -sfnT "$PREVIOUS_TARGET" "$BASE/current"
    systemctl restart klassio
  else
    echo "Kein vorheriges Release vorhanden; Dienst wird gestoppt."
    systemctl stop klassio || true
    rm -f "$BASE/current"
  fi
  exit 1
fi

echo "Deployment erfolgreich."
echo "Commit: $DEPLOY_COMMIT"
echo "Release: $RELEASE_DIR"
curl --fail --silent http://127.0.0.1:3100/api/health
echo
