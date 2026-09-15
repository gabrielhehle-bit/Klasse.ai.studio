# Klassio Staging Preview

## Zweck

`staging.klassio.at` ist die schnelle Vorschau-Umgebung für UI-/UX- und Funktionsabnahmen.

- `klassio.at` bleibt der freigegebene bzw. eingefrorene Stand.
- `staging.klassio.at` folgt dem GitHub-Branch `preview/klassio-staging`.
- ZIP-Dateien sind keine Arbeitsgrundlage.
- Der Server prüft GitHub automatisch im 60-Sekunden-Intervall.
- Ein neuer Commit wird nur aktiv, wenn Installation, TypeScript/Lint, Tests, Produktions-Build und lokaler Healthcheck erfolgreich sind.
- Bei fehlgeschlagenem Healthcheck wird auf das vorherige Staging-Release zurückgerollt.

## Serverlayout

- App: `/srv/klassio-staging`
- Releases: `/srv/klassio-staging/releases`
- Persistenz: `/var/lib/klassio-staging`
- Environment: `/etc/klassio/klassio-staging.env`
- Service: `klassio-staging.service`
- Update-Timer: `klassio-staging-update.timer`
- Interner Port: `3200`
- Nginx Host: `staging.klassio.at`

## Einmalige Installation

Vom Infrastruktur-Branch `chore/staging-preview-infra`:

```bash
bash deploy/staging/install-staging-preview.sh
```

Danach DNS:

```text
staging.klassio.at A 212.227.64.146
```

Sobald DNS aufgelöst wird:

```bash
certbot --nginx -d staging.klassio.at
```

## Betrieb

Status:

```bash
systemctl status klassio-staging --no-pager
systemctl status klassio-staging-update.timer --no-pager
```

Manuelles sofortiges Update, ohne auf den Timer zu warten:

```bash
systemctl start klassio-staging-update.service
journalctl -u klassio-staging-update.service -n 100 --no-pager -l
```

Aktiv deployter Commit:

```bash
cat /srv/klassio-staging/deployed-commit.txt
```

## Entwicklungsregel

Neue Arbeit bleibt in GitHub-Branches. Nur bewusst zur Vorschau freigegebene Commits werden in `preview/klassio-staging` übernommen. Erst nach Browserabnahme werden Änderungen in den verbindlichen Hauptstand integriert.
