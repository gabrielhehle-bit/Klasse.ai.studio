# KLASSIO – Source of Truth

Stand: 2026-09-13

## Verbindliche Quelle

Die einzige verbindliche Quelle für Klassio ist:

- Repository: `gabrielhehle-bit/Klasse.ai.studio`
- Produktionsbranch: `main`
- Reconciliation: `reconcile/klassio-source-of-truth`
- aktuelles Abschluss-Paket: `fix/reconciliation-finalization`

ZIP-Dateien sind ausschließlich Backup- oder Release-Artefakte. Sie sind niemals
Entwicklungsgrundlage. Vor jeder Änderung müssen GitHub-HEAD, Branches und offene
Pull Requests geprüft werden.

## Reconciliation-Status

`main` ist noch nicht der vollständige reconciliierte Stand. Deshalb darf die
Abschlussarbeit noch nicht direkt auf `main` weitergeführt werden.

Aktuell geprüfter Abschluss-Commit:

- Branch: `fix/reconciliation-finalization`
- Commit: `499861eb6f7913e22329488afa527810e3dce1bf`
- Basis: `reconcile/klassio-source-of-truth`
- GitHub Actions: Pre-Deployment Audit erfolgreich
- TypeScript: erfolgreich
- Tests: 669/669 erfolgreich
- Production Build: erfolgreich
- PWA-Ausgabe: erfolgreich
- Production-Server-Smoke-Test: erfolgreich
- Zugangscode-/30-Tage-Session-Smoke-Test: erfolgreich

Der Abschluss-Branch enthält zusätzlich zum Reconciliation-Stand:

- Canva-CI-Korrektur
- fertige Mitarbeit-/Hausübungs-Schnellerfassung
- echten nativen PowerPoint-`.pptx`-Export für KEL
- E-Mail-Einmalcode-Login mit SMTP, Domain-Allowlist und Rate-Limits
- optionales 30-Tage-Gerätevertrauen für den lokalen Datentresor
- direkten Materialbibliothek→Wochenplan-Transfer mit Ergänzen/Ersetzen und Duplikatschutz
- aktualisierte Produktions- und Login-Dokumentation

## Sicherheitsentscheidungen

### Account-Anmeldung

Klassio kann einen sechsstelligen E-Mail-Einmalcode senden, sofern SMTP und die
erlaubten Schul-Domains am Server konfiguriert sind. Erfolgreiche Anmeldung setzt
eine HttpOnly-Session für bis zu 30 Tage. Der bisherige Zugangscode bleibt als
administrativer Fallback.

### Lokaler Datentresor

Die Account-Anmeldung ersetzt den lokalen AES-GCM-256-Datentresor nicht.

Optional kann eine Lehrkraft auf einem persönlichen, geschützten Dienstgerät
`Diesem Gerät 30 Tage vertrauen` aktivieren. Dabei wird der Vault-Key nur
verschlüsselt gespeichert. Der Geräteschlüssel ist ein nicht exportierbarer
Web-Crypto-`CryptoKey` in IndexedDB.

Passwort und Wiederherstellungscode werden nicht gespeichert.

### Recovery per E-Mail

Der Wiederherstellungscode des lokalen Datentresors wird bewusst **nicht**
unverschlüsselt per E-Mail versendet. Ein kompromittiertes E-Mail-Konto darf
nicht automatisch zur Entschlüsselung lokaler Schülerdaten führen.

## Datenmigration und Kompatibilität

Automatisiert abgesichert sind:

- Legacy-Single-Class → Multi-Class
- Klassenwechsel ohne Vermischung von Bewertungen/Metadaten
- verschlüsselte JSON-Backups
- BOM/JSON und einfache historische JS-Wrapper ohne Codeausführung
- Pre-Import-Sicherungsstand vor Wiederherstellung
- Recovery-Code und fremdes Backup-Passwort
- Abbruch bei beschädigten oder strukturell ungültigen Backups
- Race-Condition-Schutz zwischen Autosave und Restore

Noch nicht mit einem echten, vom Benutzer bereitgestellten historischen
Klassio/AI-Studio-Datenexport geprüft: Real-World-Altbackup. Das ist ein
Abnahmetest, keine bekannte Code-Lücke.

## Ferienkalender

Der Ferienalgorithmus für das Schuljahr 2026/27 wurde am 13.09.2026 gegen die
offiziellen österreichischen Termine geprüft. Die Semesterferien-Gruppen für
alle Bundesländer sowie Weihnachts-, Oster-, Pfingst- und Sommerferien stimmen
für 2026/27. Vorarlberg: Semesterferien 15.–20.02.2027.

## Deployment

Bekanntes World4You-Ziel aus dem vorangegangenen Staging:

- Runtime-Verzeichnis: `/var/www/klassio`
- bestehender älterer Stagingstand war bereits per `/api/health` erreichbar

Der Commit `499861e...` ist **noch nicht** auf World4You ausgerollt.
Vor Merge nach `main` sind noch erforderlich:

1. Abschluss-Branch in `reconcile/klassio-source-of-truth` übernehmen.
2. Reconciliation-Commit nochmals vollständig testen/builden.
3. Genau diesen Commit auf World4You-Staging deployen.
4. Realen Browser-Walkthrough durchführen.
5. Erst danach Reconciliation nach `main` mergen.
6. `main` nochmals per CI prüfen und optional taggen.

## Externe Konfiguration für Staging

Für den E-Mail-Login:

- `LEHRERAPP_ALLOWED_EMAIL_DOMAINS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER` / `SMTP_PASS` falls vom SMTP-Server benötigt
- `SMTP_FROM`

Für Canva:

- `CANVA_CLIENT_ID`
- `CANVA_CLIENT_SECRET`
- optional `CANVA_TOKEN_ENCRYPTION_KEY`

Secrets gehören ausschließlich in die Server-/Deployment-Konfiguration, niemals
in GitHub-Dateien oder Commits.

## Regel für die nächsten Chats

Ein neuer Chat arbeitet nicht von ZIPs, Erinnerungen oder früheren Berichten aus.
Er liest zuerst:

1. aktuellen GitHub-`main`-HEAD,
2. Branches und Pull Requests,
3. diese Datei,
4. `KLASSIO_FEATURE_MATRIX.md`.

Bis der Reconciliation-PR nach `main` gemergt ist, muss zusätzlich der aktuelle
Reconciliation-/Abschlussbranch geprüft werden.
