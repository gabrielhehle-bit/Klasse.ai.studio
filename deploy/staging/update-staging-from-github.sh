#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Bitte als root ausführen."
  exit 1
fi

for command in git tar bun node curl systemctl flock sudo; do
  command -v "$command" >/dev/null 2>&1 || { echo "Fehlt: $command"; exit 1; }
done

REPO_URL="${KLASSIO_STAGING_REPO_URL:-https://github.com/gabrielhehle-bit/Klasse.ai.studio.git}"
BRANCH="${KLASSIO_STAGING_BRANCH:-preview/klassio-staging}"
BASE=/srv/klassio-staging
RELEASES="$BASE/releases"
CACHE="$BASE/source"
DEPLOYED_FILE="$BASE/deployed-commit.txt"
LOCK_FILE=/run/klassio-staging-update.lock

mkdir -p "$RELEASES"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Ein Staging-Update läuft bereits."
  exit 0
fi

if [ ! -d "$CACHE/.git" ]; then
  git clone --filter=blob:none --no-checkout "$REPO_URL" "$CACHE"
fi

git -C "$CACHE" remote set-url origin "$REPO_URL"
git -C "$CACHE" fetch --force --prune origin "$BRANCH"
TARGET_COMMIT="$(git -C "$CACHE" rev-parse FETCH_HEAD)"
CURRENT_COMMIT="$(cat "$DEPLOYED_FILE" 2>/dev/null || true)"

if [ "$TARGET_COMMIT" = "$CURRENT_COMMIT" ] && [ -L "$BASE/current" ]; then
  echo "Staging ist bereits aktuell: $TARGET_COMMIT"
  exit 0
fi

echo "Neuer Staging-Commit: $TARGET_COMMIT"

INCOMING="$(mktemp -d "$RELEASES/.incoming-XXXXXX")"
cleanup() {
  rm -rf "$INCOMING"
}
trap cleanup EXIT

git -C "$CACHE" archive "$TARGET_COMMIT" | tar -x -C "$INCOMING"
printf '%s\n' "$TARGET_COMMIT" > "$INCOMING/KLASSIO_DEPLOYMENT_COMMIT.txt"

for required in "$INCOMING/package.json" "$INCOMING/bun.lock"; do
  if [ ! -f "$required" ]; then
    echo "Staging-Quelle unvollständig: $required fehlt."
    exit 1
  fi
done

chown -R klassio:klassio "$INCOMING"

sudo -u klassio env HOME=/home/klassio bash -lc "cd '$INCOMING' && /usr/local/bin/bun install --frozen-lockfile"
sudo -u klassio env HOME=/home/klassio bash -lc "cd '$INCOMING' && /usr/local/bin/bun run lint"
sudo -u klassio env HOME=/home/klassio bash -lc "cd '$INCOMING' && /usr/local/bin/bun test"
sudo -u klassio env HOME=/home/klassio bash -lc "cd '$INCOMING' && /usr/local/bin/bun run build"

for required in "$INCOMING/dist/server.cjs" "$INCOMING/dist/index.html" "$INCOMING/dist/manifest.webmanifest"; do
  if [ ! -f "$required" ]; then
    echo "Staging-Build unvollständig: $required fehlt."
    exit 1
  fi
done

sudo -u klassio env HOME=/home/klassio bash -lc "cd '$INCOMING' && rm -rf node_modules && /usr/local/bin/bun install --production --frozen-lockfile"

RELEASE_NAME="${TARGET_COMMIT:0:12}-$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="$RELEASES/$RELEASE_NAME"
PREVIOUS_TARGET=""

if [ -L "$BASE/current" ]; then
  PREVIOUS_TARGET="$(readlink -f "$BASE/current" || true)"
fi

mv "$INCOMING" "$RELEASE_DIR"
trap - EXIT
chown -R klassio:klassio "$RELEASE_DIR"

if [ -n "$PREVIOUS_TARGET" ] && [ -d "$PREVIOUS_TARGET" ]; then
  ln -sfnT "$PREVIOUS_TARGET" "$BASE/previous"
fi

ln -sfnT "$RELEASE_DIR" "$BASE/current"
systemctl restart klassio-staging

HEALTH_OK=0
for i in {1..60}; do
  if curl --fail --silent http://127.0.0.1:3200/api/health | grep -q '"status":"ok"'; then
    HEALTH_OK=1
    break
  fi
  sleep 0.5
done

if [ "$HEALTH_OK" -ne 1 ]; then
  echo "Staging-Healthcheck fehlgeschlagen."
  journalctl -u klassio-staging -n 100 --no-pager || true

  if [ -n "$PREVIOUS_TARGET" ] && [ -d "$PREVIOUS_TARGET" ]; then
    echo "Rollback auf: $PREVIOUS_TARGET"
    ln -sfnT "$PREVIOUS_TARGET" "$BASE/current"
    systemctl restart klassio-staging
  else
    systemctl stop klassio-staging || true
    rm -f "$BASE/current"
  fi
  exit 1
fi

printf '%s\n' "$TARGET_COMMIT" > "$DEPLOYED_FILE"

echo "Staging-Deployment erfolgreich."
echo "Commit: $TARGET_COMMIT"
echo "Release: $RELEASE_DIR"
curl --fail --silent http://127.0.0.1:3200/api/health
echo
