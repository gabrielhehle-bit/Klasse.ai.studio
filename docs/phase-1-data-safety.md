# Phase 1: Datensicherheit und Server-Zugriff

Ausgangsstand: `main`, Commit `11c9891d71f3451bd73dacf559ed62695fa9a8f2`.
Diese Änderung ist ein abgegrenztes erstes Paket aus dem technischen Audit.

## Verhalten

- Klassenwechsel übernimmt die Schularbeitsbewertungen der Zielklasse. Neue Klassen starten mit leeren Bewertungen. Beim Löschen einer aktiven Klasse werden die Bewertungen der verbleibenden Klasse geladen.
- Laden erhält zusätzliche Klassenfelder, insbesondere Unterrichtszeiten, Planungsanalyse, Gruppen und individuelle Farben. Ältere Einklassen-Daten und aktive Bewertungen, die nur auf Root-Ebene gespeichert waren, bleiben lesbar.
- Die vorhandenen Initialdaten, Normalisierung, Snapshot-Funktion und Wechsel-Funktion stehen in `src/lib/appState.ts`, damit tatsächliche Zustandsübergänge ohne React-/DOM-Mocks getestet werden können. Kein neues State-Framework und kein neues Datenformat.
- Dateibackup, OneDrive-Download, Import in den Einstellungen und Notfallkopie verwenden denselben Decoder und dieselbe Wiederherstellung im AppContext.
- Entschlüsselung eines fremden Backups verändert weder den lokalen VaultRecord noch den aktiven Schlüssel. Nach Bestätigung werden die importierten Daten mit dem bestehenden lokalen Schlüssel neu verschlüsselt. Das Passwort/der Recovery-Code des lokalen Tresors bleibt gültig.
- Vor dem Ersetzen des Primärspeichers wird der aktuelle Stand verschlüsselt in `hehle_v3_pre_import_backup` geschrieben, zurückgelesen und entschlüsselt. Erst anschließend wird die neue Generation geschrieben und geprüft. Bei einem Schreibfehler bleibt die Rücksicherung erhalten; ein Rollback des Primärspeichers wird versucht.
- Die Einstellungen bieten „Stand vor dem letzten Import wiederherstellen“. Dieser Vorgang legt wiederum eine Rücksicherung des aktuellen Standes an. Der Slot enthält jeweils einen Stand und ersetzt kein externes Backup.
- Import erfolgt ohne Seitenreload. Während des Schreibens sind normale Zustandsänderungen blockiert. Bei aktiver Geräteverbindung muss diese vor dem Import beendet werden.
- Primärschreibvorgänge werden in Aufrufreihenfolge abgearbeitet. Im Browser werden Speicherfehler weitergegeben; der RAM-Testtreiber darf keinen erfolgreichen Browser-Speichervorgang vortäuschen. Eine fehlgeschlagene Entschlüsselung beim Start darf keinen leeren Autosave auslösen.
- KI-Endpunkte, OneDrive-Endpunkte außer dem separat geprüften OAuth-Callback sowie Erstellung und Beenden einer Sync-Sitzung verlangen eine gültige Anmeldung.
- OneDrive verwendet einen zehn Minuten gültigen, signierten State mit Browser-Cookie. Callback-Ausgaben werden passend für HTML und JavaScript escaped. Der Client akzeptiert Nachrichten ausschließlich vom geöffneten Popup derselben Origin.

## Vor Live-Übernahme

1. In der Produktionsumgebung `SESSION_SECRET` auf einen starken Zufallswert mit mindestens 32 Zeichen setzen. Nicht den Gemini-Schlüssel als Session-Secret verwenden.
2. Mindestens einen eigenen `LEHRERAPP_ACCESS_TEAM` oder `LEHRERAPP_ACCESS_EXTERNAL` setzen; vorhandene Standardcodes sind in Produktion nicht mehr erlaubt. Unbenutzte Codes können entfallen.
3. `APP_URL` muss der tatsächlich verwendeten, kanonischen HTTPS-Origin entsprechen (hier voraussichtlich `https://klasse.ai.studio`). Microsoft-Redirect-URI: `<APP_URL>/api/onedrive/callback`. Andernfalls können Cookie/Popup-Origin-Prüfungen die Anmeldung bewusst ablehnen.
4. Eigenes verschlüsseltes Dateibackup herunterladen. Mit synthetischen Daten in einem getrennten Browserprofil zwei Klassen wechseln, App neu laden, Import bestätigen/abbrechen und Rücksicherung testen.
5. OneDrive-Anmeldung mit der tatsächlichen Microsoft-Konfiguration und Geräteverbindung mit dem vorgesehenen Zweitgerät testen. Erst danach die geprüfte Änderung nach `main` übernehmen und separat bereitstellen.

Eine Änderung des Session-Secrets kann die erneute Anmeldung mit dem **App-Zugangscode** erfordern. Das **lokale Tresor-Passwort** und verschlüsselte Nutzerdaten werden dabei nicht geändert.

## Kompatibilität und Grenzen

Die bisherigen Speicherkeys, AES-GCM-Formate und Vault-Metadaten bleiben bestehen. Zusätzliche Klassenfelder werden erhalten. Bereits früher überschriebene/verlorene Daten lassen sich durch dieses Update nicht rekonstruieren; dafür ist ein älteres Backup nötig.

Die Rücksicherung und der Primärdatensatz sind einzelne atomare IndexedDB-Writes mit Prüfung, keine gemeinsame Transaktion über IndexedDB, localStorage und sessionStorage. Optionale Fallbacks können bei Quota-Problemen älter bleiben. Die Schreibwarteschlange gilt für dieses Browserfenster; konkurrierende Tabs sind noch nicht koordiniert.

Dieses Paket löst noch nicht: fachbezogene Metadatenmigration, alle Klartext-Nebencaches, vollständige Offline-Zugangskontrolle, Entsperrkomfort/Flush vor Sperren, Wochenplan-/Tafel-Layout, Excel-Abhängigkeit oder vollständige Sync-Berechtigungen. Bestehende Sync-GET/PUT-Endpunkte bleiben für gekoppelte Geräte verfügbar; Sitzungscode allein ist dort weiterhin keine ausreichende Teilnehmer-/Schreibautorisierung. Vor einer breiteren Nutzung des Geräte-Sync ist das gesondert zu beheben. Die neue Anmeldung für DELETE ersetzt keine Eigentümerprüfung.

## Verifikation

- `node --import tsx --test src/lib/*.test.ts`: bestehende Tests plus Regressionen für Klassenwechsel, Importabbruch, falsche Schlüssel, fremde Vaults, 32-Zeichen-Passwort, Recovery-Code, Notfallkopien, Schreibreihenfolge, Speicher-/Readback-Fehler, API-Anmeldung und OAuth.
- `npm run lint`: TypeScript-Prüfung.
- `npm run build`: Vite/PWA und Server-Bundle.

Die Testinstallation stammt aus der Audit-Umgebung (`npm install --ignore-scripts --package-lock=false`), nicht aus einer frischen Installation mit dem exakten `bun.lock`. Bestehende Warnungen zu großen Frontend-Bundles bleiben. Keine echten Schülerdaten oder Live-Microsoft-Tokens verwendet; kein vollständiger Browser-/Geräte-Abnahmetest und kein Live-Deployment.
