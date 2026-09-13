# Klassio – Source of Truth

Stand: 2026-09-13

## Verbindliche Regel

Die einzige verbindliche Arbeitsgrundlage für Klassio ist das GitHub-Repository:

- Repository: `gabrielhehle-bit/Klasse.ai.studio`
- Produktions-/Integrationsbasis: `main`
- Aktueller Reconciliation-Branch: `reconcile/klassio-source-of-truth`

ZIP-Dateien, Downloads, Chat-Anhänge, lokale Kopien und World4You-Releases sind nur Snapshots/Backups. Sie dürfen nie ohne Abgleich gegen GitHub als neue Arbeitsgrundlage verwendet werden.

## Pflichtablauf vor jeder Änderung

1. aktuellen GitHub-`main`-Stand lesen
2. offene Branches/PRs prüfen
3. relevante Projektanforderungen gegen die Feature-Matrix prüfen
4. neuen Feature-/Fix-Branch vom aktuellen Integrationsstand erstellen
5. nur auf diesem Branch ändern
6. TypeScript, Tests und Build ausführen
7. Browser-/Runtime-Check für betroffene Bereiche durchführen
8. erst danach in `main` integrieren
9. Release/ZIP nur aus einem konkreten Commit erzeugen

## Quellen-Hierarchie bei Konflikten

1. explizite aktuelle Produktentscheidung des Nutzers
2. `KLASSIO_FEATURE_MATRIX.md`
3. aktueller Code auf dem Reconciliation-/main-Stand
4. neuere überprüfte GitHub-Branches
5. dokumentierte Phase-Berichte
6. ältere ZIP-/AI-Studio-Exporte nur als Recovery-Quelle

Keine ältere Quelle darf eine neuere bestätigte Produktentscheidung still überschreiben.

## Harte Produktregel

UI/UX darf vereinfacht und neu geordnet werden, aber bestehende Fachfunktionen dürfen nicht still entfernt werden. Insbesondere müssen Notenmappe, Punkte/Prozent/Noten, Gewichtungen, Notenrechner, Schularbeitenauswertung, LZK/WOPL, Fachkonfiguration, Statistiken sowie Daten-/Backupfunktionen erhalten bleiben, solange keine ausdrücklich neuere Produktentscheidung ihre Entfernung verlangt.

## Aktueller Reconciliation-Ausgangspunkt

Der Branch `fix/pre-deployment-blockers` wurde als Basis gewählt, weil er:

- `feat/classroom-usability` vollständig enthält
- zusätzlich 23 weitere Commits mit Pre-Deployment-Fixes enthält
- gegenüber `main` 30 Commits voraus ist
- zusätzliche Regressionstests und Sicherheits-/Datenfluss-Fixes enthält

Er ist trotzdem noch nicht automatisch die vollständige Produktwahrheit. Fehlende Funktionen aus BF/BG, AI-Studio-Exporten und späteren Projektentscheidungen werden auf `reconcile/klassio-source-of-truth` gezielt zusammengeführt.

## Verbotene Arbeitsweise

Nicht mehr zulässig:

- von `BG2`, `BG3`, `BE`, `BF` oder einem beliebigen ZIP direkt weiterentwickeln
- einen lokalen Download als "neueste Version" behandeln, ohne Commit-SHA
- in einem neuen Chat einen alten Snapshot als Ausgangsbasis verwenden
- fertige Funktionen aufgrund eines Chat-Berichts als vorhanden markieren, ohne Code-/Runtime-Prüfung
- Build/Test-Erfolg behaupten, wenn er nicht tatsächlich gelaufen ist

## Release-Nachweis

Jede freigegebene Version soll mindestens dokumentieren:

- Branch
- Commit-SHA
- Datum
- bestandene Tests
- Buildstatus
- Browser-/Runtime-Check
- Datenmigrationsstatus
- bekannte offene Punkte
- Deploymentstatus
