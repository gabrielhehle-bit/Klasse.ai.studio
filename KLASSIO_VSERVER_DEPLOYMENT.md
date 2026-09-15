# Klassio auf dem World4You Linux-vServer

Zielarchitektur:

```text
Internet
   ↓ HTTPS
Nginx :80/:443
   ↓ Reverse Proxy
127.0.0.1:3100
   ↓
Klassio Node/Express
```

Die Node-App wird **nicht** direkt ins Internet geöffnet. Port 3100 bleibt lokal und wird ausschließlich von Nginx angesprochen.

## Zielsystem

Für den bestellten Linux vServer S:

- Ubuntu 24.04 LTS, falls bei der Bereitstellung auswählbar
- 2 CPU
- 4 GB RAM
- 120 GB Speicher
- Node.js 22 LTS
- Nginx
- systemd
- UFW
- Let's Encrypt / Certbot

## 1. Server-Basis

Nach Erhalt der vServer-IP und des Root-Zugangs:

```bash
sudo bash deploy/bootstrap-ubuntu.sh
```

Das Skript installiert die Basispakete, Node.js 22, Bun, Nginx, Certbot und richtet den unprivilegierten Benutzer `klassio` sowie die Verzeichnisse ein.

## 2. Service- und Nginx-Dateien installieren

```bash
sudo install -m 0644 deploy/systemd/klassio.service /etc/systemd/system/klassio.service
sudo install -m 0644 deploy/nginx/klassio.conf /etc/nginx/sites-available/klassio
sudo ln -sfn /etc/nginx/sites-available/klassio /etc/nginx/sites-enabled/klassio
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Produktionsgeheimnisse anlegen

```bash
sudo install -m 0600 deploy/klassio.env.example /etc/klassio/klassio.env
sudo nano /etc/klassio/klassio.env
```

Mindestens setzen:

- `APP_URL=https://klassio.at`
- starker zufälliger `SESSION_SECRET`
- lange zufällige administrative Zugangscodes
- `LEHRERAPP_ALLOWED_EMAIL_DOMAINS=vsfoa.vobs.at`
- SMTP-Daten für E-Mail-Login
- Gemini-Key nur wenn Live-KI aktiviert werden soll
- OAuth-Secrets nur wenn die jeweilige Integration tatsächlich genutzt wird

Geheimnisse werden **nie** in GitHub committed.

Zufallswert erzeugen:

```bash
openssl rand -base64 48
```

## 4. Erstes Release installieren

Für die erste Staging-Abnahme ist der verbindliche Reconciliation-Commit:

`6ee20763a0b2624d9268118b33d2ae579aa2c9e5`

Das verwendete GitHub-Artefakt muss exakt diesen Commit in `KLASSIO_DEPLOYMENT_COMMIT.txt` enthalten.

Verbindliches Artefakt für diese Abnahme:

- Datei: `klassio-world4you-6ee20763a0b2624d9268118b33d2ae579aa2c9e5.zip`
- SHA-256: `5aff6c5ec50906259e2927e3a3ade90cfcad483f21bcb67e1b47fb51a1cbf537`
- GitHub Actions Artifact-ID: `10403947886`
- Erzeugt durch Workflow `Frozen Staging Artifact`, Run #2

Vor dem Deployment muss die SHA-256-Prüfsumme übereinstimmen.

Beispiel:

```bash
sha256sum /tmp/klassio-world4you-6ee20763a0b2624d9268118b33d2ae579aa2c9e5.zip
# Erwartet: 5aff6c5ec50906259e2927e3a3ade90cfcad483f21bcb67e1b47fb51a1cbf537

sudo bash deploy/deploy-release.sh \
  /tmp/klassio-world4you-6ee20763a0b2624d9268118b33d2ae579aa2c9e5.zip \
  6ee20763a0b2624d9268118b33d2ae579aa2c9e5
```

Das Skript:

1. prüft das Release-Artefakt,
2. verifiziert auf Wunsch den exakten Commit,
3. installiert Produktionsabhängigkeiten reproduzierbar aus `bun.lock`,
4. legt ein unveränderliches Release unter `/srv/klassio/releases` an,
5. schaltet den `current`-Symlink um,
6. startet `klassio.service`,
7. prüft `/api/health`,
8. rollt bei einem fehlgeschlagenen Healthcheck automatisch auf das vorherige Release zurück.

## 5. DNS erst nach lokal grünem Server umstellen

Vor der DNS-Umschaltung:

```bash
curl http://127.0.0.1:3100/api/health
sudo systemctl status klassio
sudo nginx -t
```

Erst wenn das grün ist, die DNS-Einträge für `klassio.at` auf den neuen vServer zeigen lassen.

Wichtig: Auch vorhandene AAAA-Einträge prüfen. Ein alter IPv6-Eintrag kann sonst trotz korrektem A-Record weiterhin auf den alten Webspace führen.

## 6. HTTPS aktivieren

Nur Domains in den Certbot-Aufruf aufnehmen, deren DNS bereits auf diesen vServer zeigt.

Wenn `klassio.at` und `www.klassio.at` beide korrekt zeigen:

```bash
sudo certbot --nginx -d klassio.at -d www.klassio.at
```

Falls zunächst nur `klassio.at` verwendet wird:

```bash
sudo certbot --nginx -d klassio.at
```

Danach:

```bash
curl -I https://klassio.at
sudo certbot renew --dry-run
```

## 7. Staging-Abnahme

Danach exakt `KLASSIO_STAGING_CHECKLIST.md` durchführen. Der GitHub-Commit auf dem Server darf während dieser Abnahme nicht wechseln.

Erst wenn die Checkliste grün ist:

1. Staging-Probleme auf einem eigenen Fix-Branch beheben.
2. Audit des exakten finalen Reconciliation-HEADs.
3. PR #5 nach `main` mergen.
4. `main` erneut prüfen.
5. Optional Tag `v0.9.0-source-reconciled`.
6. Erst danach Design PR #77 und Lehrerzimmer PR #78 integrieren.

## Rollback

```bash
sudo bash deploy/rollback.sh
```

Das tauscht `current` und `previous`, startet den Dienst neu und verlangt anschließend einen erfolgreichen Healthcheck.

## Diagnose

```bash
sudo bash deploy/verify-server.sh
journalctl -u klassio -n 100 --no-pager
journalctl -u nginx -n 100 --no-pager
```
