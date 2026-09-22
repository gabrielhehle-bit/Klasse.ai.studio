# KLASSIO: direktes GitHub → klassio.at Deployment (ohne Staging)

## Stand und Grenze

Der bestehende produktive World4You-vServer verwendet laut letzter dokumentierter
Serverprüfung `/srv/klassio/current`, `/srv/klassio/previous`,
`klassio.service`, `/etc/klassio/klassio.env` und das **bereits installierte**
Skript `/root/klassio-deploy/deploy/deploy-release.sh`.

Der GitHub-`main`-Branch ist die einzige Release-Quelle. Das vorhandene
`Pre-Deployment Audit` erzeugt nach seinen Tests das Artefakt
`klassio-world4you-<commit>` mit `KLASSIO_DEPLOYMENT_COMMIT.txt`.
Der neue Workflow `.github/workflows/production-deploy.yml` lädt **genau dieses
Artefakt aus demselben erfolgreichen Audit-Run**, prüft die Commit-Kennung,
wartet auf erfolgreiche Schulverifizierungs- und Teamteaching-Browserprüfungen
und überträgt das Release direkt zum Produktionsserver. Er startet **nicht**
von Pull Requests oder anderen Branches.

**Aktivierung ist bewusst gesperrt**, solange die Repository-Variable
`KLASSIO_AUTODEPLOY_ENABLED` nicht explizit auf `true` gesetzt ist.
Ein PR-Merge allein stellt damit noch nichts bereit, solange die Einrichtung
nicht abgeschlossen ist. Vor dem ersten aktivierten Deploy prüfen, welcher
Commit tatsächlich auf dem Server läuft und dass das neue `main` mit
vorhandenen verschlüsselten Daten/Backups kompatibel ist.

## Pflichtprüfung vor Freigabe der verschlüsselten Konto-Versionsgeschichte

Der Server archiviert ab PR #283 vor jedem verschlüsselten Konto-Upload die
vorige Version unter `KLASSIO_DATA_DIR/account-sync/history/<account-id>/`.
Die Versionsgeschichte bietet **keine** Wiederherstellung älterer Datenstände,
die bereits vor der Aktivierung verloren gingen. Der Klartext bleibt auf dem
Endgerät und wird zur Historisierung niemals zum Server übertragen.

**PR #283 nicht auf main mergen, bevor diese Prüfung am produktiven Host
erfolgreich war.** Die automatischen GitHub-Browsertests können die tatsächlichen
World4You-Speicherpfade und Berechtigungen nicht überprüfen. Das bereits
installierte Release-Skript und die reale Serverkonfiguration sind nicht Teil
des GitHub-Repositories.

Als Serveradministrator auf dem echten World4You-Host die auf dem Branch
geprüfte Datei `ops/klassio-storage-preflight.sh` bereitstellen und ausführen:

```bash
sudo bash /root/klassio-deploy/gh-setup/klassio-storage-preflight.sh
```

Die Prüfung gibt ausschließlich PASS/FAIL ohne Schülerdaten, Kennwörter,
E-Mail-Adressen oder absolute Datenpfade aus. Sie kontrolliert eine **absolute,
release-unabhängige** `KLASSIO_DATA_DIR`-Konfiguration, vorhandenen
Service-Benutzer, dessen Probe-Schreib-/Lesezugriff mit atomarer Umbenennung,
ein nichtflüchtiges Dateisystem und mindestens 2 GiB freie Kapazität.
Ein isoliertes Probe-Verzeichnis wird wieder gelöscht; existierende
Klassen- oder Kontodatensätze werden weder gelesen noch verändert.

Bei FAIL zuerst die Produktionskonfiguration nach einer unabhängigen
verschlüsselten Sicherung fachgerecht korrigieren und dieselbe Prüfung
wiederholen. **Nicht** aus dem Web-UI eine Klasse neu anlegen, das lokale
Profil zurücksetzen oder Daten löschen. Eine gemeldete PASS-Ausgabe
ersetzt weder ein externes, unabhängig gespeichertes Server-Backup
noch einen tatsächlich getesteten Restore nach Serverausfall.

Die Sicherungsdateien im persönlichen E-Mail-Konto sind weiterhin eine
zusätzliche Rückfallebene, bis Backup und Restore auch unabhängig vom
World4You-Host praktisch nachgewiesen sind.

## Einmalige Server-Einrichtung

Keinen bestehenden Root-SSH-Schlüssel in GitHub hinterlegen. Stattdessen einen
**neuen ed25519-Schlüssel ausschließlich für GitHub Actions** erzeugen und
nur dessen öffentlichen Teil auf dem vServer eintragen. Den privaten Teil
nicht in Chat, Screenshots, Issues oder Dateien im Repository teilen.

1. Neuen Schlüssel auf dem eigenen Windows-Rechner erzeugen, z. B. in PowerShell:

   ```powershell
   ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\klassio_github_actions" -C "klassio-github-actions"
   ```

   Für unbeaufsichtigtes Deploy die Passphrase bei diesem **eigens dafür
   erzeugten, eingeschränkten Schlüssel** leer lassen. Sein privater Teil
   gehört ausschließlich in GitHub Actions Secrets, niemals ins Repository
   oder in einen Chat. Verwende ihn nicht als normalen Administrator-Schlüssel.

2. `ops/klassio-gh-bootstrap.sh` und `ops/klassio-gh-deploy.sh` aus dem
   geprüften Repositorystand zusammen mit der **öffentlichen** Datei
   `klassio_github_actions.pub` einmalig auf den vServer kopieren, etwa
   nach `/root/klassio-deploy/gh-setup/`. Die Dateien können nach Checkout
   des neuen Branches via `scp` mit dem bestehenden privaten
   Administrator-Schlüssel übertragen werden. Der private neue Deploy-Schlüssel
   wird **niemals** auf den Server kopiert.

3. Einmalig auf dem vServer als Administrator ausführen:

   ```bash
   sudo bash /root/klassio-deploy/gh-setup/klassio-gh-bootstrap.sh \
     /root/klassio-deploy/gh-setup/klassio_github_actions.pub
   ```

   Das Skript prüft, dass der bestehende Produktions-Deploy-Skriptpfad
   tatsächlich existiert, erstellt das eingeschränkte Konto
   `klassio-deploy`, installiert ausschließlich den neuen öffentlichen
   SSH-Schlüssel, einen root-eigenen, auf Commit + ZIP-Prüfsumme begrenzten
   Deploy-Wrapper und eine passende `sudoers`-Regel. Den vorhandenen
   Produktionsdienst und die Secrets-Datei verändert es nicht.

4. Den SSH-Hostschlüssel des vServers **unabhängig** prüfen: Auf dem Server
   `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`; die öffentliche
   Host-Key-Zeile auf dem eigenen Rechner über `ssh-keyscan -t ed25519 <HOST>`
   beziehen und deren Fingerprint mit dem auf dem Server vergleichen.
   Erst danach die exakte `known_hosts`-Zeile als GitHub-Secret hinterlegen.
   Niemals `StrictHostKeyChecking=no` verwenden.

## Einmalige GitHub-Einrichtung

Repository → **Settings → Secrets and variables → Actions**:

| Typ | Name | Inhalt |
|---|---|---|
| Secret | `KLASSIO_DEPLOY_HOST` | SSH-Hostname oder IP des aktuellen World4You-vServers |
| Secret | `KLASSIO_DEPLOY_USER` | `klassio-deploy` (kein Root) |
| Secret | `KLASSIO_DEPLOY_PORT` | SSH-Port (optional, Standard: 22) |
| Secret | `KLASSIO_DEPLOY_PRIVATE_KEY` | Vollständiger **neuer** Deploy-Privatschlüssel, nie im Repository |
| Secret | `KLASSIO_DEPLOY_KNOWN_HOSTS` | Verifizierte SSH-`known_hosts`-Zeile für exakt HOST/PORT |
| Variable | `KLASSIO_AUTODEPLOY_ENABLED` | Erst nach Einrichtung und Prüfung: `true` |

Der Wrapper führt nur den vorhandenen Release-Installer mit dem erwarteten
40-stelligen Commit und der verifizierten Archiv-SHA-256 aus. Der Installer
übernimmt weiterhin `current`-Umschaltung, Dienstneustart, Healthcheck und
Rollback. Für `klassio-deploy` ist **kein** allgemeiner sudo-/Root-Zugang
vorgesehen. Eine eventuell zuvor konfigurierte
GitHub-Umgebung `production` darf keine ungewollte Pflichtfreigabe erhalten,
wenn Deployments nach jedem grünen `main` wirklich automatisch laufen sollen.

**Vor dem ersten Live-Deploy** den aktuell aktiven Commit auf dem Server
(`cat /srv/klassio/current/KLASSIO_DEPLOYMENT_COMMIT.txt`) mit GitHub vergleichen,
ein aktuelles Datenbackup sicherstellen und den Entwicklungsstand
in einer echten Browserprüfung mit synthetischen Daten abnehmen.
Der Healthcheck prüft den Serverstart, **nicht** jede fachliche Funktion.
Nicht aus einem großen Alt-PR direkt auf `main` mergen.

## Alltag nach Aktivierung

1. Änderung auf einem **neuen Branch vom aktuellen `main`** entwickeln,
   bestehende PRs vorher auf doppelte Arbeit prüfen; Funktionen und Migrationen
   mit Tests abdecken. Pro zusammengehörigem Thema möglichst einen PR statt
   gestapelter PR-Ketten.
2. Erst bei grünen relevanten Prüfungen nach `main` integrieren.
3. `Pre-Deployment Audit` erstellt automatisch das Release. Nur wenn es
   erfolgreich war, `main` noch denselben Commit enthält und die beiden
   globalen Browserprüfungen erfolgreich sind, wird klassio.at aktualisiert.
4. Schlägt der **interne Server-Healthcheck im bestehenden Installationsskript**
   fehl, erfolgt dessen Rollback und die GitHub-Aktion wird rot. Die
   zusätzliche öffentliche HTTPS-Prüfung meldet einen Fehler, führt aber
   keinen separaten Rollback aus. Danach Fehler gezielt beheben, nicht
   einen älteren PR blind erneut mergen.

**Not-Aus:** Repository-Variable `KLASSIO_AUTODEPLOY_ENABLED` auf
`false` setzen, bevor eine neue Pipeline startet. Bereits laufende
Deployments ggf. in Actions abbrechen. Bei Sicherheitsvorfällen den
Deploy-Schlüssel aus `authorized_keys` entfernen und das GitHub-Secret
rotieren. Der hier eingerichtete Workflow veröffentlicht automatisch,
programmiert oder korrigiert aber nicht selbstständig neue Funktionen;
dafür benötigt jede KI-Aufgabe weiterhin einen ausführbaren Entwicklungsagenten.
