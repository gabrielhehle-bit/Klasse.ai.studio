# KLASSIO – Source of Truth

Stand: 2026-09-14

## Verbindliche Quelle

Die einzige verbindliche Entwicklungsquelle für Klassio ist:

- Repository: `gabrielhehle-bit/Klasse.ai.studio`
- Produktionsbranch: `main`
- Integrations-/Reconciliation-Branch bis zur Freigabe: `reconcile/klassio-source-of-truth`
- finaler Integrations-PR: `#5` (`reconcile/klassio-source-of-truth` → `main`)

ZIP-Dateien sind ausschließlich Backup- oder Release-Artefakte. Sie sind niemals Entwicklungsgrundlage. Vor jeder Änderung müssen GitHub-`main`-HEAD, Branches, offene Pull Requests und diese beiden Projektdateien geprüft werden.

## Aktueller Reconciliation-Status

`main` ist noch nicht der vollständige reconciliierte Stand. Der vollständige Abschlussstand liegt bis zur Staging-Freigabe auf `reconcile/klassio-source-of-truth`.

Der frühere Abschlussbranch `fix/reconciliation-finalization` wurde vollständig in den Reconciliation-Branch übernommen. Zusätzlich wurde eine commitgebundene World4You-Release-Pipeline ergänzt. Am 14.09.2026 wurde PR #6 (`fix/cockpit-final-requirements`) in den Reconciliation-Branch integriert. Damit sind die final abgestimmten Lehrercockpit-Anforderungen technisch umgesetzt: freie weiße Fläche ohne Startkarte, gemeinsame Schreib-/Widgetfläche, getrenntes Löschen von Schrift und Zeichnung, verständliche Kategorien, vollständiger 108/108-Widgetkatalog, eigene Favoriten, A/B/C-Schnelllayouts, Archivzugang zu alten Tafelinhalten sowie reaktivierte historische Mathematik-Widgets.

Am 14.09.2026 wurde außerdem PR #7 (`fix/class-student-dossier-final`) integriert. Das Schülerdossier besitzt nun dauerhaft die fünf vereinbarten Hauptbereiche; die alte Einfach/Experte-/Sichtbarkeitslogik wurde aus der Oberfläche entfernt, Detailfunktionen bleiben erhalten und der Semesterwechsel 1/2 wurde repariert.

Danach wurden die produktionsrelevanten Restpunkte direkt auf Folgebranches bereinigt und in den Reconciliation-Branch übernommen: lokaler Kalendertag für Anwesenheit, robuste Geburtsdatums-/Alterslogik und Importnormalisierung, konsistente Geschlechtswerte aus CSV/Excel/Sokrates, Entfernung mitgelieferter Demo-Archiv-/Musterprofildaten aus dem normalen Startzustand, neutrale Lehrerstatistik ohne erfundene Werte, sichtbares Branding vollständig auf Klassio/Klassio Quest, Klassio-Dateinamen für neue Backups sowie bereinigte Morgenaufgaben ohne redaktionelle Platzhalterreste. Die Beispielklasse bleibt ausschließlich als bewusst auswählbarer Demo-Modus erhalten.

Im finalen Reconciliation-Lauf am 14.09.2026 wurden zusätzlich die geprüften PRs #9 bis #13 integriert:
- PR #9: Diagnostikdaten klassenlokal isoliert, strukturierte Ergebnisse an die aktive Klasse gebunden, lokaler Kalendertag abgesichert.
- PR #10: KI-Helfer mit echter Serverstatus-Anzeige, datensparsamem Klassenkontext sowie client- und serverseitiger Datenschutzfreigabe für anonymisierte Bilder.
- PR #11: SetupWizard mit strukturiertem Lehrkraftprofil, dynamischer Schuljahrauswahl und Importen ohne erfundene Schülerdaten.
- PR #12: Dashboard/Heute mit korrekter Schultags-/Anwesenheitslogik, lokalen Tagesdaten und vollständiger Erfassung statt angenommener Anwesenheit.
- PR #13: durchgängiger 10-Stunden-Slot-Vertrag für Setup und Dashboard; für Stunde 9/10 werden keine Uhrzeiten erfunden, sie bleiben frei konfigurierbar.

Anschließend wurden die letzten funktionalen Reste aus historischen Divergenzen selektiv auf frischen Branches vom jeweils aktuellen Reconciliation-HEAD umgesetzt:
- PR #15: neue OneDrive-Sicherungen heißen sichtbar `Klassio_Backup.json`; historische `LehrerAPP_Backup.json`, `LehrerAPP_Backup.lehrerapp` und `Lehrermappe_Backup.json` bleiben lesbar.
- PR #16: Sokrates-PDF-Import mit lokal gebündeltem PDF.js-Worker, PWA-Precache für `.mjs`, robuster geometrischer Tabellenerkennung und quelltreuer Stammdatenübernahme ohne erfundene Werte.
- PR #18: Integrationshärtung für Canva-Popup-Origin/Source, Smartboard-Fragment-Key, serverseitige Sync-Ablaufzeit, HttpOnly-only Access-Session sowie automatisierte Verträge für Canva-Exporte, KEL-PPTX/PDF und PWA-PDF-Worker.
- PR #19: Topbar/Wetter/WLAN ohne erfundene Produktivdaten; fehlende Klasse/Wetter/WLAN-Daten werden transparent als fehlend angezeigt statt plausibel simuliert.
- PR #20: vollständiger Werksreset löscht auch das 30-Tage-Gerätevertrauen; abgelaufene, unvollständige oder fremde Trusted-Device-Einträge werden automatisch bereinigt.
- PR #21: letzte sichtbare LehrerAPP-/Lehrermappe-/AI-Studio-Reste in Excel-Exporten und OneDrive-Hilfe auf Klassio/Server-Umgebungsvariablen umgestellt; interne Legacy-Kennungen bleiben kompatibel.
- PR #23: Navigation vollständig gemacht, ohne die vereinfachte Kernnavigation wieder aufzublähen. `Unterricht` ist jetzt ein eigener Hub; Lehrercockpit, KI-Helfer, Arbeitsblatt-Generator, Stationenbetrieb, Stimm-Notizen, Differenzierung und Elternbrief sind dort gebündelt. Klasse, Planung und Leistungen enthalten zusätzlich die zuvor verstreuten Detailwerkzeuge; das Cockpit kehrt beim Schließen in den Unterrichtsbereich zurück. Eine neue Feature-Branch-CI prüft TypeScript, Tests, Build und PWA-Ausgabe bereits vor der Integration.
- PR #25: Detailseiten erhalten eine stabile fachliche Elternzuordnung. Die Topbar zeigt Bereich und Seitentitel und bietet einen direkten Rückweg zu `Unterricht`, `Klasse`, `Planung` oder `Leistungen`; eigenständige Utilities bekommen bewusst keinen falschen Elternbereich.
- PR #26: Die Hauptbereiche wurden weiter vereinfacht. `Planung` zeigt keine doppelte Schnellleiste mehr, sondern trennt Kernplanung von Vorbereitung/Weitergabe. `Klasse` trennt Kinder & Alltag von Organisation & Gemeinschaft; `Leistungen` trennt Bewerten & Beurteilen von Lernentwicklung & Gesprächen. Alle vorhandenen Ziele bleiben erreichbar.

Die historischen divergierenden Branches `audit/production-demo-data`, `audit/visible-legacy-branding`, `audit/visible-legacy-branding-final`, `fix/klassio-visible-branding`, `fix/json-backups-and-critical-data-flows` und `feature/final-app-polish` wurden anschließend gezielt gegen den aktuellen Reconciliation-Stand geprüft. Ihre noch eigenen Commits enthalten entweder nur temporäre Audit-/CI-Workflows oder ältere Varianten von Funktionen, die im aktuellen Stand bereits gleichwertig oder neuer umgesetzt sind. Sie werden deshalb **nicht** in den Produktstand gemergt.

Der historische Branch `feature/final-app-polish` wird nicht gemergt und ist keine Arbeitsgrundlage. Seine relevanten funktionalen Lücken wurden selektiv auf frischen Branches vom jeweils aktuellen Reconciliation-HEAD neu umgesetzt. Verbleibende Unterschiede in Cockpit/BoardInk/Vorlagen stammen aus älteren UI-Varianten und werden nicht über den neueren, bereits getesteten Cockpit-Stand aus PR #6 gelegt.

Interne Legacy-Kennungen wie `LehrerAPP_Encrypted_Backup`, `LehrerAPP|EncryptedPayload|v1`, bestehende Storage-Namen und `gabic*`-Schlüssel bleiben absichtlich unverändert, soweit sie Daten-/Backup-Kompatibilität sichern. Sie sind keine sichtbaren Produktnamen.

Der aktuelle codehaltige Reconciliation-Stand wurde nach PR #26 auf Commit `892e9b90791edc30a84445bc859dfb448e1b8751` vollständig geprüft:

- Pre-Deployment Audit #93: erfolgreich
- TypeScript: erfolgreich
- Tests: 769/769 erfolgreich
- Production Build: erfolgreich
- PWA-/Build-Ausgabe: erfolgreich
- Production-Server- und `/api/health`-Smoke: erfolgreich
- Zugangscode-/Session-/E-Mail-Fallback-Smoke: erfolgreich
- World4You-Artefakt: `klassio-world4you-892e9b90791edc30a84445bc859dfb448e1b8751`

PR #25 und PR #26 wurden jeweils erst nach grüner Feature-Validation in `reconcile/klassio-source-of-truth` gemergt. Der aktuelle codehaltige Merge-Stand ist `892e9b90791edc30a84445bc859dfb448e1b8751`.

Nach jeder Dokumentations- oder Codeänderung ist ausschließlich der **neue** GitHub-HEAD verbindlich; dessen `Pre-Deployment Audit` muss erneut grün sein. Dieser Audit umfasst TypeScript, vollständige Testsuite, Production-Build, PWA-Ausgabe, Production-Server-Smoke, Zugangscode-/Session-Smoke und die Erzeugung des commitgebundenen World4You-Artefakts. Das Deployment-ZIP enthält `KLASSIO_DEPLOYMENT_COMMIT.txt` und `KLASSIO_DEPLOYMENT_BRANCH.txt`.

## Enthaltener Funktionsstand

Der Reconciliation-Stand enthält unter anderem:

- vereinfachte Kernnavigation mit `Heute`, `Klasse`, `Planung`, `Leistungen` und `Unterricht`; der Unterricht-Hub bündelt Lehrercockpit, KI-Helfer, Arbeitsblatt-Generator, Stationenbetrieb, Stimm-Notizen, Differenzierung und Elternbrief. Die übrigen Bestandswerkzeuge sind ihren fachlichen Hubs oder `Mehr` zugeordnet. Detailseiten zeigen ihren fachlichen Elternbereich samt Rückweg; die Hauptbereiche sind in verständliche Arbeitsgruppen statt doppelte oder ungegliederte Linklisten aufgeteilt.
- Lehrercockpit mit freier weißer Schreib-/Zeichen-/Widgetfläche ohne Startkarte; 108/108 erhaltene Widgets sind über Suche/Kategorien erreichbar, Favoriten bleiben benutzerdefiniert
- Dashboard/Heute mit ehrlicher Anwesenheitslogik: keine angenommene Präsenz, keine Pflicht an freien Tagen, „geprüft“ erst nach vollständiger Stunden-Erfassung
- KI-Helfer mit serverseitiger Verfügbarkeitsprüfung, datensparsamem Klassenkontext und expliziter Bild-Datenschutzfreigabe
- SetupWizard mit strukturiertem Lehrkraftprofil, dynamischen Schuljahren und 10 frei konfigurierbaren Stunden-Slots
- Anwesenheit, Befinden und Schülerliste; das Schülerdossier hat fünf feste Hauptbereiche (Übersicht, Lernen & Leistungen, Entwicklung & Diagnostik, Stammdaten & Organisation, Berichte & Materialien) ohne ausblendbare Alt-Navigation; Schülerimporte normalisieren österreichische/ISO-Geburtsdaten und Geschlechtswerte konsistent
- vollständige Notenmappe mit Noten/Prozent/Punkten, Gewichtung, fachbezogenen Bewertungsabschnitten, Schularbeiten, LZK/WOPL und sonstigen Leistungen
- schnelle Mitarbeit- und Hausübungs-Erfassung
- Wochen- und Jahresplanung inklusive Vollbild, Excel-Roundtrip und Aufgabenblattgenerator
- Materialbibliothek inklusive Übergabe in den Wochenplan
- Sokrates-PDF-Import mit lokal gebündeltem PDF.js-Worker und Offline/PWA-Unterstützung
- verschlüsselten lokalen Datentresor, verschlüsselte JSON-Backups und Legacy-Parser; lokale Sicherungsdateien heißen `Klassio_Sicherung_YYYY-MM-DD.json`, neue OneDrive-Sicherungen `Klassio_Backup.json`; historische OneDrive-Dateinamen und das interne verschlüsselte Legacy-Format bleiben kompatibel
- E-Mail-Einmalcode-Login mit administrativem Zugangscode als Fallback
- optionales 30-Tage-Gerätevertrauen für den Datentresor
- Canva-Integration
- nativen KEL-PowerPoint-`.pptx`-Export
- OneDrive und verschlüsselten Smartboard-Sync
- PWA-/Offline-Unterstützung

Die genaue Abnahme steht in `KLASSIO_FEATURE_MATRIX.md`.

## Sicherheitsentscheidungen

### Account-Anmeldung

Klassio kann einen sechsstelligen E-Mail-Einmalcode senden, sofern SMTP und die erlaubten Schul-Domains am Server konfiguriert sind. Eine erfolgreiche Anmeldung setzt eine HttpOnly-Session für bis zu 30 Tage. Der bisherige Zugangscode bleibt als administrativer Fallback.

### Lokaler Datentresor

Die Account-Anmeldung ersetzt den lokalen AES-GCM-256-Datentresor nicht.

Optional kann eine Lehrkraft auf einem persönlichen, geschützten Dienstgerät `Diesem Gerät 30 Tage vertrauen` aktivieren. Dabei wird der Vault-Key nur verschlüsselt gespeichert. Der Geräteschlüssel ist ein nicht exportierbarer Web-Crypto-`CryptoKey` in IndexedDB. Passwort und Wiederherstellungscode werden nicht gespeichert.

### Recovery per E-Mail

Der Wiederherstellungscode des lokalen Datentresors wird bewusst **nicht** unverschlüsselt per E-Mail versendet. Ein kompromittiertes E-Mail-Konto darf nicht automatisch zur Entschlüsselung lokaler Schülerdaten führen.

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
- exakte Erkennung und Entfernung des früher gebündelten 25-Schüler-Demoarchivs beim Laden; echte Benutzerarchive bleiben erhalten
- frischer App-Zustand ohne Musterlehrer, erfundene Archivschüler, voreingestellte Schnelllinks oder Beispiel-QR-Wert

Ein echter historischer Benutzer-Backup-Datensatz ist weiterhin ein Abnahmetest, sobald ein solcher bewusst bereitgestellt wird. Synthetische Legacy-Regressionstests sind grün.

## Ferienkalender

Der Ferienalgorithmus für das Schuljahr 2026/27 wurde am 13.09.2026 gegen die offiziellen österreichischen Termine geprüft. Die Semesterferien-Gruppen für alle Bundesländer sowie Weihnachts-, Oster-, Pfingst- und Sommerferien stimmen für 2026/27. Vorarlberg: Semesterferien 15.–20.02.2027.

## World4You-Staging

Die Release-Pipeline erzeugt nur aus einem erfolgreichen GitHub-Build ein commitgebundenes World4You-Artefakt. Das Paket enthält `dist/`, `package.json`, `bun.lock`, `.env.example`, README sowie Branch-/Commitmarker und startet mit `node dist/server.cjs`.

Beim letzten Server-Shell-Check wurde auf World4You `Node v18.20.4`, `npm 9.2.0` und kein Bun festgestellt. Als Shell-Arbeitsverzeichnis wurde `/home/www/web` angezeigt. Eine ältere Notiz nannte `/var/www/klassio`; deshalb darf dieser alte Pfad nicht ungeprüft als aktuelles Ziel verwendet werden.

Vor Merge nach `main` sind noch zwingend:

1. aktuellen Reconciliation-HEAD samt Dokumentationsstand vollständig per CI prüfen und das dazugehörige Artefakt erzeugen
2. exakt dieses Artefakt auf das tatsächlich aktive World4You-Staging-Ziel ausrollen
3. `/api/health` und Serverstart prüfen
4. realen Browser-Walkthrough auf demselben Commit durchführen
5. erst danach PR #5 nach `main` mergen
6. `main` nochmals per CI prüfen und anschließend optional taggen

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

Weitere Produktionswerte wie `SESSION_SECRET`, Zugangscodes, `APP_URL`, Gemini- und OneDrive-Zugangsdaten gehören ausschließlich in die Server-/Deployment-Konfiguration, niemals in GitHub-Dateien oder Commits.

## Pflicht für jeden neuen Chat

Ein neuer Chat arbeitet nicht von ZIPs, Erinnerungen oder früheren Berichten aus. Er liest zuerst:

1. aktuellen GitHub-`main`-HEAD
2. Branches und Pull Requests
3. `KLASSIO_SOURCE_OF_TRUTH.md`
4. `KLASSIO_FEATURE_MATRIX.md`
5. solange PR #5 nicht gemergt ist zusätzlich den aktuellen Reconciliation-HEAD und dessen letzten CI-Lauf
