# Klassio – Staging-/Browser-Abnahme

## Verbindlicher erster Staging-Stand

Repository: `gabrielhehle-bit/Klasse.ai.studio`  
Branch: `reconcile/klassio-source-of-truth`  
Commit: `6ee20763a0b2624d9268118b33d2ae579aa2c9e5`  
Artefakt: `klassio-world4you-6ee20763a0b2624d9268118b33d2ae579aa2c9e5.zip`  
SHA-256: `5aff6c5ec50906259e2927e3a3ade90cfcad483f21bcb67e1b47fb51a1cbf537`  
Artifact-ID: `10403947886`  
GitHub Actions: `Frozen Staging Artifact` Run #2

Während dieses Walkthroughs darf kein anderer App-Commit auf den Server geschaltet werden.

## A. Server und Release

- [ ] `KLASSIO_DEPLOYMENT_COMMIT.txt` entspricht exakt dem Zielcommit.
- [ ] `systemctl status klassio` ist grün.
- [ ] `curl http://127.0.0.1:3100/api/health` liefert `{"status":"ok"}`.
- [ ] Nginx-Konfiguration ist mit `nginx -t` gültig.
- [ ] `https://klassio.at/api/health` ist öffentlich erreichbar.
- [ ] HTTP wird auf HTTPS umgeleitet.
- [ ] Zertifikat ist gültig.
- [ ] Browserkonsole zeigt beim normalen Start keine unbehandelten Fehler.

## B. Zugang und Tresor

- [ ] Schul-E-Mail kann einen 6-stelligen Code anfordern.
- [ ] Code kommt tatsächlich per E-Mail an.
- [ ] Falscher/abgelaufener Code wird abgelehnt.
- [ ] E-Mail-Login bleibt nach Reload aktiv.
- [ ] Administrativer Zugangscode funktioniert als Fallback.
- [ ] Neuer lokaler Tresor kann erstellt werden.
- [ ] Wiederherstellungscode wird einmalig angezeigt.
- [ ] Ohne Bestätigung des Wiederherstellungscodes kann Setup nicht abgeschlossen werden.
- [ ] Tresor-Passwort entsperrt nach Reload.
- [ ] 30-Tage-Gerätevertrauen funktioniert auf einem persönlichen Testgerät.
- [ ] Wiederherstellungscode kann einen gesperrten Tresor entsperren.

## C. Klasse und Altdaten

- [ ] Neue Klasse kann angelegt werden.
- [ ] Sokrates-/CSV-/Excel-Klassenliste kann importiert werden.
- [ ] Alte kompatible Klassio/LehrerAPP-JSON-Datei kann importiert werden.
- [ ] Schülernamen, Stammdaten und Schuljahr bleiben quelltreu.
- [ ] Klassenwechsel trennt Daten korrekt.
- [ ] Keine Demo-Schüler erscheinen ohne bewusst aktivierten Demo-Modus.

## D. Heute und Lehrercockpit

- [ ] Heute-Ansicht lädt korrekt.
- [ ] Aktuelle Stunde/Tagesplan plausibel.
- [ ] Lehrercockpit öffnet.
- [ ] Weiße Fläche bleibt die gemeinsame Schreib-/Zeichen-/Widgetfläche.
- [ ] Schreiben mit Maus funktioniert.
- [ ] Zeichnen funktioniert.
- [ ] Touch/Stift auf geeignetem Gerät testen.
- [ ] Schrift und Zeichnung lassen sich getrennt löschen.
- [ ] Widgets hinzufügen, bewegen, skalieren und entfernen.
- [ ] Favoriten sowie A/B/C-Schnelllayouts funktionieren.
- [ ] Alter Tafel-/Archivinhalt ist erreichbar.

## E. Schüler:innen und Sitzplan

- [ ] Kinder & Dossiers lädt.
- [ ] Schülerdossier enthält die fünf vereinbarten Hauptbereiche.
- [ ] Stammdaten bearbeiten und speichern.
- [ ] Sitzplan laden und Plätze verändern.
- [ ] Gruppen/Overlays testen.
- [ ] Klassenwechsel zeigt keinen fremden Sitzplan.

## F. Anwesenheit und Befinden

- [ ] Anwesenheit für heutigen lokalen Kalendertag erfassen.
- [ ] Abwesend/verspätet/entschuldigt prüfen.
- [ ] „Ich bin da!“ im Cockpit testen.
- [ ] Freiwillige 5-Smiley-Befindensabfrage testen.
- [ ] Verbindung zu Verhalten/Diagnostik zeigt keine fremden Klasseninformationen.
- [ ] Anwesenheitsdruck testen.

## G. Notenmappe

- [ ] Fach wechseln.
- [ ] Notenmodus testen.
- [ ] Prozentmodus testen.
- [ ] Punktemodus testen.
- [ ] Wechselwarnung zwischen Bewertungsmodi prüfen.
- [ ] Bewertungsabschnitte pro Fach getrennt.
- [ ] Gewichtungen ändern.
- [ ] Schularbeit anlegen/auswerten.
- [ ] Notenrechner.
- [ ] Klassenwechsel isoliert Bewertungen korrekt.
- [ ] Druck/Export testen.

## H. Planung

- [ ] Planungszentrale.
- [ ] Jahresplanung.
- [ ] Jahresplanung Vollbild.
- [ ] Wochenplanung.
- [ ] Wochenplanung Vollbild.
- [ ] Kinder-Wochenplan erzeugen.
- [ ] Excel-Export/Import laut vorhandener Funktion testen.
- [ ] Stundenentwürfe.
- [ ] Materialbibliothek.
- [ ] Übergabemappe.

## I. Diagnostik und Entwicklung

- [ ] Diagnostik Startseite.
- [ ] Klassenscreening.
- [ ] Einzelkind-Diagnostik.
- [ ] Ergebnisse.
- [ ] Leseflüssigkeit/Automatisierung/Zehnerübergang stichprobenartig.
- [ ] Statistik & Profile.
- [ ] Wir-Gefühl.
- [ ] Jahresbericht.
- [ ] Keine Daten anderer Klassen sichtbar.

## J. Druckzentrum und Exporte

- [ ] Druckzentrum öffnet.
- [ ] A4-Vorschau bleibt korrekt weiß.
- [ ] Hoch-/Querformat.
- [ ] PDF-Ausgabe.
- [ ] Browser-Druckdialog.
- [ ] Schülerliste.
- [ ] Noten-/Bewertungsdruck.
- [ ] Planungsdruck.
- [ ] KEL-PDF/PPTX, sofern im finalen Ablauf relevant.

## K. Backup und Restore

- [ ] Neues verschlüsseltes lokales Backup erstellen.
- [ ] Backup-Dateiname verwendet Klassio.
- [ ] Restore in frischem Browserprofil durchführen.
- [ ] Vor Restore wird Sicherung/Rücksicherung wie vorgesehen erzeugt.
- [ ] Alte kompatible `.json`-/`.lehrerapp`-Dateien bleiben lesbar.
- [ ] Mehrklassendaten bleiben nach Restore isoliert.
- [ ] OneDrive nur testen, wenn echte OAuth-Konfiguration gesetzt ist.

## L. Integrationen

- [ ] Gemini Live-Anfrage nur bei gesetztem API-Key.
- [ ] Ohne Gemini-Key ehrliche Nicht-konfiguriert-Anzeige.
- [ ] Canva nur bei gesetzten OAuth-Secrets.
- [ ] Microsoft/OneDrive nur bei gesetzten OAuth-Secrets.
- [ ] Keine Secrets erscheinen im Browser, HTML oder Netzwerkpayload.

## M. PWA / Geräte

- [ ] Installation als PWA auf Desktop möglich.
- [ ] Reload funktioniert.
- [ ] Service Worker aktiv.
- [ ] Manifest lädt.
- [ ] Offline-Grundverhalten plausibel.
- [ ] Desktop Chrome/Edge.
- [ ] Smartphone-Viewport.
- [ ] Touch.
- [ ] Stift, sofern Gerät vorhanden.

## Freigabe

- [ ] Keine Blocker offen.
- [ ] Alle gefundenen Staging-Probleme sind als GitHub-Issue/Branch nachvollziehbar.
- [ ] Finaler Reconciliation-HEAD nach Fixes erneut vollständig auditiert.
- [ ] Erst danach PR #5 nach `main` mergen.
