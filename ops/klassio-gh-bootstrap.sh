#!/usr/bin/env bash
# Run once as root on the existing World4You vServer with a NEW deploy-only
# SSH public key file: bash klassio-gh-bootstrap.sh /path/to/deploy.pub
set -euo pipefail

if [[ "$EUID" -ne 0 || "$#" -ne 1 || ! -f "$1" ]]; then
  echo "Usage: sudo bash klassio-gh-bootstrap.sh /path/to/new-deploy-public-key.pub" >&2
  exit 1
fi
public_key="$(cat "$1")"
[[ "$public_key" =~ ^ssh-ed25519[[:space:]]+[A-Za-z0-9+/=]+([[:space:]].*)?$ ]] || {
  echo "Expected one ordinary ed25519 SSH public key (no options)" >&2
  exit 1
}
[[ "$(wc -l < "$1")" -le 1 ]] || { echo "Public key file must have one line" >&2; exit 1; }
ssh-keygen -lf "$1" >/dev/null

original_script="/root/klassio-deploy/deploy/deploy-release.sh"
[[ -f "$original_script" ]] || {
  echo "Existing production deploy script not found: $original_script" >&2
  exit 1
}
source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$source_dir/klassio-gh-deploy.sh" ]] || {
  echo "Place klassio-gh-bootstrap.sh and klassio-gh-deploy.sh in the same folder" >&2
  exit 1
}

if ! id -u klassio-deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash klassio-deploy
fi
install -d -o klassio-deploy -g klassio-deploy -m 0700 /home/klassio-deploy/.ssh
install -d -o klassio-deploy -g klassio-deploy -m 0700 /home/klassio-deploy/incoming
auth="/home/klassio-deploy/.ssh/authorized_keys"
touch "$auth"
chown klassio-deploy:klassio-deploy "$auth"
chmod 0600 "$auth"

# 'restrict' disables PTY and forwarding, while allowing the workflow's
# non-interactive ssh command and SFTP upload.
entry="restrict $public_key"
grep -Fqx -- "$entry" "$auth" || printf '%s\n' "$entry" >> "$auth"

install -o root -g root -m 0755 \
  "$source_dir/klassio-gh-deploy.sh" /usr/local/sbin/klassio-gh-deploy

sudoers="/etc/sudoers.d/klassio-github-production"
printf '%s\n' \
  'klassio-deploy ALL=(root) NOPASSWD: /usr/local/sbin/klassio-gh-deploy *' \
  > "$sudoers"
chmod 0440 "$sudoers"
visudo -cf "$sudoers"

echo "Deploy-only SSH user and restricted production command are installed."
echo "Next: configure GitHub secrets and enable KLASSIO_AUTODEPLOY_ENABLED."
