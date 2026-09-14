# KLASSIO – Feature Matrix

Stand: 2026-09-14 · Integrationsbranch `reconcile/klassio-source-of-truth`

Legende:

- ✅ technisch umgesetzt und automatisiert geprüft
- 🟡 umgesetzt, aber realer Staging-/Browser-Abnahmetest fehlt
- 🔒 bewusst so entschieden / Sicherheitsgrenze
- 🔴 echte Restarbeit
- ⚪ späteres Zusatzfeature

## Fundament

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| GitHub als einzige Source of Truth | ✅ | Repository-Regeln dokumentiert; ZIP ist keine Arbeitsgrundlage. |
| Reconciliation vollständig zusammengeführt | ✅ | `fix/reconciliation-finalization` ist im Reconciliation-Branch enthalten; finaler PR #5 nach `main` angelegt. |
| Reconciliierter Stand auf `main` | 🔴 | Erst nach World4You-Staging + Browser-Walkthrough PR #5 mergen. |
| CI / TypeScript / Tests / Build / PWA | ✅ | Letzter codehaltiger Abschlussstand: 738/738 Tests, TS, Production-Build und PWA auf `983b04c` grün. Vor Staging muss zusätzlich der `Pre-Deployment Audit` des aktuellen Reconciliation-HEADs grün sein; er prüft Server-/Session-Smoke und erzeugt das commitgebundene World4You-Artefakt. |
| Commitgebundenes World4You-Artefakt | ✅ | CI erzeugt nur nach grünem Audit ein ZIP mit `dist`, Branch-/Commitmarker und Startkommando. |
| Browser-Walkthrough des Abschlussstands | 🔴 | Muss auf exakt demselben Staging-Commit erfolgen. |

## Oberfläche und Navigation

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Dashboard / Heute | 🟡 | PR #12 integriert: angezeigter Tag, lokale Datumsschlüssel, Bundesland/Ferien/Feiertage und Kalender-Ausnahmen werden berücksichtigt; Anwesenheit wird nicht automatisch als vollständig angenommen. Visuelle Browser-Abnahme offen. |
| SetupWizard | 🟡 | PR #11 integriert: Anrede/Vorname/Nachname mit Legacy-Migration, dynamische Schuljahre, Importdaten ohne erfundene Standardwerte; realer Setup-/Import-Browsercheck offen. |
| KI-Helfer | 🟡 | PR #10 integriert: echte Serverstatus-Anzeige, optionaler datensparsamer Klassenkontext ohne automatisch übermittelte Schülernamen, konkrete Fehlerzustände und explizite Foto-Datenschutzfreigabe. Live-Gemini-/Browser-Abnahme offen. |
| Kernnavigation | ✅ | Heute, Klasse, Planung, Leistungen, Unterricht + Utilities per Regressionstest abgesichert. |
| Sichtbares Produktbranding | ✅ | Setup, Demo-Hinweise, Diagnostik, Quest, Einstellungen, Backup-UI und Drucktexte verwenden Klassio/Klassio Quest; interne Legacy-Crypto-/Storage-Kennungen bleiben aus Kompatibilitätsgründen bewusst bestehen. |
| Lehrercockpit: finale Anforderungen | ✅ | PR #6 integriert; freie weiße Fläche ohne Startkarte, keine Standardwidgets, verständliche Kategorien, Optionen/Archiv und sprachliche Bereinigung per Regressionstests abgesichert. |
| Lehrercockpit: weiße freie Fläche | ✅ | Fläche bleibt unabhängig vom Theme weiß; leere Startkarte entfernt; Standardlayout enthält 0 sichtbare Widgets. |
| Cockpit: Schreiben und Zeichnen | ✅ | BoardInk liegt auf derselben Fläche wie Widgets; Stift, Text, Radierer, Undo/Redo sowie getrenntes Löschen von Schrift/Zeichnung sind umgesetzt. |
| Cockpit: vollständiger Widgetkatalog | ✅ | 108/108 erhaltene Widgettypen sind in Picker und Kategorie-Zählern vorhanden; vier frühere Mathe-Altlasten rendern wieder ihre echten Komponenten. |
| Cockpit: Widgets frei platzieren | 🟡 | Verschieben/Größe ist nur über `Optionen → Anordnung ändern` freischaltbar; realer Maus-/Touch-/Stift-Browsercheck bleibt offen. |
| Cockpit: benutzerdefinierte Layout-Slots | 🟡 | A/B/C-Slots bleiben als eigene, benennbare Layouts; keine mitgelieferten Beispielprofile. Browser-Abnahme offen. |
| Veraltete Cockpit-Kompatibilität | ✅ | Alte Tafel bleibt erhalten unter `Optionen → Archiv → Alte Tafelinhalte öffnen`; unerwartetes Öffnen ist per Regressionstest blockiert. |
| Mobile/responsive Nutzung | 🟡 | Responsive Code vorhanden; reale Browser-/Viewport-Abnahme offen. |

## Klasse und Schüler

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Anwesenheit | ✅ | Abschluss füllt nur leere Stunden; vorhandene Fehl-/Entschuldigungswerte bleiben erhalten. Dashboard verlangt Erfassung nur an echten Schultagen und zeigt „geprüft“ erst, wenn für alle Kinder alle aktiven Stunden erfasst sind; lokaler Kalendertag statt UTC; Regressionstests vorhanden. |
| Befinden | ✅ | Einheitliche 5-Stufen-Skala von sehr gut bis schlecht. |
| Schülerliste | 🟡 | Suche, Filter, Liste/Karten/Karte, Import, Dossier, Notiz/Interaktion und Bearbeiten/Löschen bleiben erhalten; ISO- und österreichische Geburtsdaten werden konsistent ausgewertet. CSV/Excel/Sokrates-Import erfindet fehlendes Geschlecht, Erstsprache oder Staatsbürgerschaft nicht; Browser-Abnahme offen. |
| Schülerdossier Struktur | ✅ | Fünf feste Hauptbereiche: Übersicht; Lernen & Leistungen; Entwicklung & Diagnostik; Stammdaten & Organisation; Berichte & Materialien. Alte Einfach/Experte-/Ausblendlogik entfernt; Regressionstest vorhanden. |
| Schülerdossier Semesterwechsel | ✅ | Auswahl Semester 1/2 wird korrekt übernommen; Regressionstest vorhanden. |
| Schülerdossier Browser-Abnahme | 🟡 | Navigation, Detailtabs, Fokusmodus und responsive Darstellung müssen im finalen Browser-Walkthrough praktisch geprüft werden. |
| Diagnostik | 🟡 | PR #9 integriert: 3-stufige Hierarchie/Checks/Ergebnisse, klassenlokale iKM-/Antolin-/Ziel-/Beobachtungs-/Metakognitionsdaten, aktive Klassen-ID für strukturierte Ergebnisse und lokale Datumsprüfung. Vollständiger Browser-Walkthrough offen. |
| Multi-Class | ✅ | Klassenwechsel/Migration/Erweiterungsfelder und Cockpit-Ink per Tests abgesichert. |

## Leistungen

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Notenmappe | 🟡 | Noten/Prozent/Punkte/Gewichtung/Schularbeiten usw. vorhanden; Browser-Abnahme offen. |
| Fachbezogene Bewertungsabschnitte | ✅ | Metadaten eines Fachs verändern andere Fächer nicht; Regressionstest vorhanden. |
| Mitarbeit | ✅ | Schnellerfassung inkl. Enter/↓ und Shift+Enter/↑; manuelle 1–5-Bewertung unterstützt. |
| Hausübungen | ✅ | Schnellerfassung; 0 = vollständig; Detailoptionen hinter `HÜ-Einstellungen`. |
| Filter „unvollständig“ | ✅ | Wirkt nur in der Notenansicht und berücksichtigt SA/LZK/WOPL/Sonstige/manuelle Mitarbeit; nicht in Mitarbeit/HÜ. |
| Sonstige Leistung / Bewertung erfassen | ✅ | Eigene Leistungsobjekte; kein leerer Datensatz beim Abbrechen. |

## Planung und Organisation

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Stundenplan 10 Slots | ✅ | PR #13 integriert: Setup-Zeitfelder, Tagesrahmen, mobile/desktop Stammplan-Raster und Dashboard-Vorschau verwenden 10 Slots. Für 9./10. Stunde werden keine Standardzeiten erfunden; frei konfigurierbar. |
| Wochenplan Vollbild | ✅ | Implementiert. |
| Wochenplan Excel Roundtrip | ✅ | Vorlage + Import, Ergänzen/Lücken füllen oder überschreiben. |
| Wochenplan-Aufgabenblatt | ✅ | Generator vorhanden. |
| Jahresplan Vollbild | ✅ | Implementiert. |
| Jahresplan Excel Roundtrip | ✅ | Vorlage + Merge/Overwrite; nicht importierte Felder bleiben erhalten. |
| Mehrere Themen pro Fach/KW | ✅ | `items`-Struktur und Mehrfachanzeige vorhanden. |
| Materialbibliothek CRUD | ✅ | Anlegen, bearbeiten, suchen, gruppieren, favorisieren und löschen. |
| Materialbibliothek → Wochenplan | ✅ | Direkter Dialog für KW/Tag/Stunde; Ergänzen/Ersetzen; IDs werden dedupliziert; übrige Planung bleibt erhalten. |
| Vertretungsplan | 🟡 | Reale Stundenplan-/Wochenplan-/Materialdaten; Browser-Abnahme offen. |
| Printcenter | 🟡 | Druckmodule vorhanden; realer Browser-/PDF-/Druckcheck offen. |
| Ferienlogik alle Bundesländer 2026/27 | ✅ | Gegen offizielle österreichische Termine geprüft. |

## Daten, Datenschutz und Sicherheit

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| AES-GCM-256 Datentresor | ✅ | Sicherheits- und Integritätstests grün. |
| PBKDF2 / Recovery / Passwortwechsel | ✅ | 600.000 Iterationen; Recovery-/Rotation-/Passwortwechseltests grün. |
| JSON-Backup verschlüsselt | ✅ | Export verweigert fehlenden Vault; Roundtrip und Restore getestet; neue Downloads heißen `Klassio_Sicherung_YYYY-MM-DD.json`, internes Backup-Format bleibt kompatibel. |
| Legacy-JSON/JS-Wrapper Parser | ✅ | JSON, BOM und einfache historische Wrapper werden ohne JavaScript-Ausführung gelesen. |
| Frischer Produktivzustand ohne Demo-Fakedaten | ✅ | Kein Musterlehrer, kein gebündeltes 25-Schüler-Archiv, keine erfundenen Lehrerstatistiken, Schnelllinks oder Beispiel-QR-Werte; die Beispielklasse wird nur nach ausdrücklicher Auswahl geladen. |
| Echter historischer Benutzer-Backup-Import | 🟡 | Kein realer Altbackup-Datensatz als Abnahmedatensatz hinterlegt; synthetische Legacy-Tests grün. |
| Pre-Import-Rücksicherung | ✅ | Restore legt verschlüsselten Vorzustand an; Fehler brechen Restore ab. |
| E-Mail-Einmalcode-Login | 🟡 | Server + UI + Rate-Limits + 30-Tage-Session fertig; reales SMTP-Staging noch testen. |
| Administrativer Zugangscode | ✅ | Bleibt als Fallback; CI-Smoke prüft Cookie-Session. |
| Vertrauenswürdiges Gerät für Tresor | 🟡 | 30 Tage optional; Vault-Key nur verschlüsselt, Device-CryptoKey nicht exportierbar; Browser/IndexedDB-Test offen. |
| Recovery-Code per E-Mail | 🔒 | Bewusst nicht umgesetzt: E-Mail-Kompromittierung darf den lokalen Tresor nicht entschlüsseln. |
| KI-Bilddatenschutz | ✅ | Fotoanalyse ist client- und serverseitig ohne explizite Bestätigung blockiert; Base64-Bilddaten laufen nicht durch Text-Regexfilter; nur JPEG/PNG/WebP für `askAI`; Regressionstests vorhanden. |
| Smartboard-Sync | 🟡 | Verschlüsselter Sync vorhanden; Browser-/Geräteabnahme offen. |
| Offline / PWA | 🟡 | Build und Service-Worker-Ausgabe grün; realer Offline-Browsercheck offen. |

## Integrationen und Ausgabe

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Canva | 🟡 | OAuth/PKCE, serverseitig verschlüsselte Tokens, Designsuche/-erstellung und PDF/PNG/JPG/PPTX-Export implementiert; Live-OAuth mit Staging-Secrets offen. |
| PowerPoint KEL | 🟡 | Echter `.pptx`-Export mit nativen editierbaren Diagrammen implementiert; Download/Öffnen in PowerPoint auf Staging offen. |
| PDF-Handout KEL | 🟡 | Bestehender PDF-Export bleibt; Browserprüfung offen. |
| OneDrive | 🟡 | Konfigurierbar; Live-OAuth/Backup-Abnahme auf Staging offen. |

## Deployment

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| World4You Runtime grundsätzlich | 🟡 | Server hat Node 18.20.4 und npm 9.2.0; aktives Zielverzeichnis muss vor dem finalen Upload am Server eindeutig geprüft werden. |
| World4You Release-Paket | ✅ | CI-Artefakt wird aus exakt dem geprüften Reconciliation-Commit erzeugt und trägt Branch-/Commitmarker. |
| World4You Abschluss-Staging | 🔴 | Exaktes aktuelles Reconciliation-Artefakt auf das aktive Staging-Ziel deployen und `/api/health` prüfen. |
| Finaler Browser-Test | 🔴 | Nach Deployment: Login, Tresor, Kernnavigation, Cockpit, Klasse/Dossier, Planung, Gradebook, Canva-Status, PPTX/PDF, Backup/Restore, PWA/Offline und responsive Viewports. |
| Merge nach `main` | 🔴 | Erst nach grünem Staging-/Browser-Test PR #5 mergen. |
