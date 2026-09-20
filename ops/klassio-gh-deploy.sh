#!/usr/bin/env bash
# Root-owned, narrow entry point for the dedicated GitHub Actions SSH deploy user.
# Install at /usr/local/sbin/klassio-gh-deploy (root:root, 0755).
set -euo pipefail

if [[ "$EUID" -ne 0 || "$#" -ne 2 ]]; then
  echo "Usage (via restricted sudo): klassio-gh-deploy <40-char-commit> <archive-sha256>" >&2
  exit 1
fi
commit="$1"
expected_hash="$2"
[[ "$commit" =~ ^[0-9a-f]{40}$ && "$expected_hash" =~ ^[0-9a-f]{64}$ ]] || {
  echo "Invalid commit or archive checksum" >&2
  exit 1
}

source_zip="/home/klassio-deploy/incoming/klassio-world4you-$commit.zip"
release_script="/root/klassio-deploy/deploy/deploy-release.sh"
[[ -f "$source_zip" && ! -L "$source_zip" && -f "$release_script" ]] || {
  echo "Missing expected release archive or installed release script" >&2
  exit 1
}
[[ "$(stat -c '%U' "$source_zip")" == "klassio-deploy" ]] || {
  echo "Release archive must belong to the restricted deploy user" >&2
  exit 1
}

# Hold the lock across install, service restart and post-install verification.
exec 9>/run/lock/klassio-production-release.lock
flock -w 600 9 || { echo "Another release is running" >&2; exit 1; }

# Never let the unprivileged user choose a root-readable source path.
# Copy into a root-owned directory before checksum verification and installation.
install -d -o root -g root -m 0700 /root/klassio-deploy/gh-incoming
trusted_zip="$(mktemp /root/klassio-deploy/gh-incoming/release-XXXXXXXX.zip)"
trap 'rm -f -- "$trusted_zip"' EXIT
cp -- "$source_zip" "$trusted_zip"
chmod 0600 "$trusted_zip"
echo "$expected_hash  $trusted_zip" | sha256sum --check --status || {
  echo "Archive checksum does not match tested GitHub Actions artifact" >&2
  exit 1
}

# Reuse the already installed production script; it checks the embedded commit,
# switches the current symlink, restarts klassio and rolls back on failed health.
bash "$release_script" "$trusted_zip" "$commit"

active_commit_file="/srv/klassio/current/KLASSIO_DEPLOYMENT_COMMIT.txt"
[[ -f "$active_commit_file" ]] || { echo "Active release has no commit marker" >&2; exit 1; }
active_commit="$(tr -d '[:space:]' < "$active_commit_file")"
[[ "$active_commit" == "$commit" ]] || {
  echo "Active release commit differs from requested commit" >&2
  exit 1
}
echo "Verified production release: $active_commit"
