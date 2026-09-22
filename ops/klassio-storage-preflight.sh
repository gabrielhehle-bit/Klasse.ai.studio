#!/usr/bin/env bash
# Read-only production storage preflight for the KLASSIO administrator.
# Run ON the World4You host as root; never paste service secrets into a chat.
# Does not read, decrypt, enumerate or modify any teacher's existing snapshots.
set -euo pipefail
[[ "$EUID" -eq 0 ]] || { echo "FAIL: run as server administrator (root)." >&2; exit 1; }
[[ -f /etc/klassio/klassio.env ]] || { echo "FAIL: service environment file missing." >&2; exit 1; }

# This root-owned service configuration is trusted input, not user-supplied data.
# Silence stdout while sourcing to avoid accidentally printing any credentials.
set -a
source /etc/klassio/klassio.env >/dev/null
set +a
[[ -n "${KLASSIO_DATA_DIR:-}" ]] || { echo "FAIL: KLASSIO_DATA_DIR is not configured." >&2; exit 1; }
[[ "$KLASSIO_DATA_DIR" = /* ]] || {
  echo "FAIL: KLASSIO_DATA_DIR must be an absolute, release-independent directory." >&2; exit 1;
}
[[ -d "$KLASSIO_DATA_DIR" ]] || { echo "FAIL: configured data directory does not exist." >&2; exit 1; }
real_data="$(realpath -e -- "$KLASSIO_DATA_DIR")"
[[ -n "$real_data" && "$real_data" != '/' ]] || { echo "FAIL: invalid data directory." >&2; exit 1; }

# Reject the active/previous symlinks AND the underlying versioned release tree.
# Those locations can vanish when a deployment rotates its releases.
for unsafe in /srv/klassio/current /srv/klassio/previous /srv/klassio/releases /srv/klassio/release; do
  [[ -e "$unsafe" ]] || continue
  real_unsafe="$(realpath -e -- "$unsafe")"
  if [[ "$real_data" == "$real_unsafe" || "$real_data" == "$real_unsafe/"* ]]; then
    echo "FAIL: data directory is inside an ephemeral deployment release." >&2
    exit 1
  fi
done
case "$real_data" in
  /tmp|/tmp/*|/var/tmp|/var/tmp/*|/run|/run/*|/dev/shm|/dev/shm/*)
    echo "FAIL: data directory is within an ephemeral system location." >&2; exit 1 ;;
esac

# A service installed without a dedicated account needs independent permission
# review. Running a successful write probe as root would not verify the app user.
service_user="$(systemctl show klassio.service -p User --value)"
[[ -n "$service_user" && "$service_user" != root ]] || {
  echo "FAIL: unable to verify an unprivileged klassio.service account." >&2; exit 1;
}

history="$real_data/account-sync/history"
# Probe uses a NEW isolated directory. It never enters a real teacher's history.
# Do not create the parent when missing: the app must be able to create it.
probe_root="$real_data/account-sync"
if [[ ! -d "$probe_root" ]]; then probe_root="$real_data"; fi
runuser -u "$service_user" -- bash -c '
  set -euo pipefail
  umask 077
  probe="$(mktemp -d "$1/.klassio-history-preflight.XXXXXXXX")"
  trap '\''rm -rf -- "$probe"'\'' EXIT
  printf "encrypted-history-preflight\\n" > "$probe/revision.tmp"
  mv -- "$probe/revision.tmp" "$probe/revision.json"
  [[ "$(cat "$probe/revision.json")" == "encrypted-history-preflight" ]]
' _ "$probe_root" || { echo "FAIL: app service account cannot atomically write and read its data directory." >&2; exit 1; }

# Check writeability of existing history if present (without reading private files).
if [[ -d "$history" ]]; then
  runuser -u "$service_user" -- test -w "$history" || {
    echo "FAIL: existing encrypted history directory is not writable by the app." >&2; exit 1;
  }
fi

filesystem="$(stat -f -c '%T' -- "$real_data")"
[[ "$filesystem" != tmpfs && "$filesystem" != ramfs ]] || {
  echo "FAIL: data directory resides on a volatile memory filesystem." >&2; exit 1;
}
available_kib="$(df -Pk -- "$real_data" | awk 'NR==2 {print $4}')"
[[ "$available_kib" =~ ^[0-9]+$ && "$available_kib" -ge 2097152 ]] || {
  echo "FAIL: fewer than 2 GiB available for encrypted account history." >&2; exit 1;
}
echo "PASS: release-independent absolute storage, service-user atomic write/read, nonvolatile filesystem and >=2 GiB free."
echo "NOTE: this does NOT verify off-server backups, restore across full host loss, or long-term disk capacity."
