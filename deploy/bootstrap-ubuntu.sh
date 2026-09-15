#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Bitte als root ausführen: sudo bash deploy/bootstrap-ubuntu.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y   ca-certificates   curl   gnupg   nginx   ufw   unzip   jq   certbot   python3-certbot-nginx

# Node.js 22 LTS über das signierte NodeSource-Repository.
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key   | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg

cat >/etc/apt/sources.list.d/nodesource.list <<'EOF'
deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main
EOF

apt-get update
apt-get install -y nodejs

# Bun wird nur für die reproduzierbare Installation aus dem vorhandenen bun.lock
# verwendet. Die App selbst läuft anschließend mit Node.js.
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
  install -m 0755 /root/.bun/bin/bun /usr/local/bin/bun
fi

if ! id klassio >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash klassio
fi

install -d -o klassio -g klassio -m 0750 /srv/klassio
install -d -o klassio -g klassio -m 0750 /srv/klassio/releases
install -d -o klassio -g klassio -m 0700 /var/lib/klassio
install -d -o root -g root -m 0750 /etc/klassio

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

systemctl enable nginx

echo "=== Klassio vServer Basis vorbereitet ==="
node --version
npm --version
bun --version
nginx -v
echo "Als Nächstes: Env-Datei, systemd-Service und Nginx-Site installieren. Noch keine DNS-Umschaltung vornehmen."
