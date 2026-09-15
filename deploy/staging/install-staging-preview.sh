#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
  echo "Bitte als root ausführen."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for required in   "$SCRIPT_DIR/klassio-staging.service"   "$SCRIPT_DIR/klassio-staging-update.service"   "$SCRIPT_DIR/klassio-staging-update.timer"   "$SCRIPT_DIR/nginx-staging.conf"   "$SCRIPT_DIR/update-staging-from-github.sh"; do
  [ -f "$required" ] || { echo "Fehlt: $required"; exit 1; }
done

id klassio >/dev/null 2>&1 || { echo "Systembenutzer klassio fehlt. Zuerst deploy/bootstrap-ubuntu.sh ausführen."; exit 1; }

install -d -o klassio -g klassio -m 0755 /srv/klassio-staging
install -d -o klassio -g klassio -m 0755 /srv/klassio-staging/releases
install -d -o klassio -g klassio -m 0700 /var/lib/klassio-staging
install -d -o root -g root -m 0755 /etc/klassio

STAGING_ENV=/etc/klassio/klassio-staging.env
PROD_ENV=/etc/klassio/klassio.env

if [ ! -f "$STAGING_ENV" ]; then
  if [ -f "$PROD_ENV" ]; then
    cp "$PROD_ENV" "$STAGING_ENV"
  else
    cat >"$STAGING_ENV" <<'EOF'
APP_URL=https://staging.klassio.at
SESSION_SECRET=
LEHRERAPP_ACCESS_TEAM=
LEHRERAPP_ACCESS_EXTERNAL=
LEHRERAPP_ALLOWED_EMAIL_DOMAINS=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
GEMINI_API_KEY=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
CANVA_CLIENT_ID=
CANVA_CLIENT_SECRET=
CANVA_TOKEN_ENCRYPTION_KEY=
KLASSIO_DATA_DIR=/var/lib/klassio-staging
EOF
  fi

  STAGING_SESSION_SECRET="$(openssl rand -hex 48)"
  STAGING_TEAM_CODE="$(openssl rand -hex 16)"
  STAGING_EXTERNAL_CODE="$(openssl rand -hex 16)"

  sed -i "s|^APP_URL=.*|APP_URL=https://staging.klassio.at|" "$STAGING_ENV"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$STAGING_SESSION_SECRET|" "$STAGING_ENV"
  sed -i "s|^LEHRERAPP_ACCESS_TEAM=.*|LEHRERAPP_ACCESS_TEAM=$STAGING_TEAM_CODE|" "$STAGING_ENV"
  sed -i "s|^LEHRERAPP_ACCESS_EXTERNAL=.*|LEHRERAPP_ACCESS_EXTERNAL=$STAGING_EXTERNAL_CODE|" "$STAGING_ENV"
  sed -i "s|^KLASSIO_DATA_DIR=.*|KLASSIO_DATA_DIR=/var/lib/klassio-staging|" "$STAGING_ENV"

  chmod 600 "$STAGING_ENV"
  chown root:root "$STAGING_ENV"

  echo
  echo "STAGING-ZUGANGSCODES - jetzt privat speichern und nicht in Chats posten:"
  echo "TEAM: $STAGING_TEAM_CODE"
  echo "EXTERNAL: $STAGING_EXTERNAL_CODE"
  echo
else
  chmod 600 "$STAGING_ENV"
  chown root:root "$STAGING_ENV"
  echo "Bestehende Staging-Umgebung bleibt unverändert: $STAGING_ENV"
fi

install -m 0755 "$SCRIPT_DIR/update-staging-from-github.sh" /usr/local/sbin/klassio-staging-update
install -m 0644 "$SCRIPT_DIR/klassio-staging.service" /etc/systemd/system/klassio-staging.service
install -m 0644 "$SCRIPT_DIR/klassio-staging-update.service" /etc/systemd/system/klassio-staging-update.service
install -m 0644 "$SCRIPT_DIR/klassio-staging-update.timer" /etc/systemd/system/klassio-staging-update.timer
install -m 0644 "$SCRIPT_DIR/nginx-staging.conf" /etc/nginx/sites-available/klassio-staging
ln -sfn /etc/nginx/sites-available/klassio-staging /etc/nginx/sites-enabled/klassio-staging

systemctl daemon-reload
nginx -t
systemctl reload nginx

systemctl enable klassio-staging.service
systemctl enable --now klassio-staging-update.timer

echo "Staging-Preview installiert."
echo "GitHub-Branch: preview/klassio-staging"
echo "Prüfintervall: 60 Sekunden"
echo "Interner Port: 3200"
echo "Öffentliche URL nach DNS + Certbot: https://staging.klassio.at"
