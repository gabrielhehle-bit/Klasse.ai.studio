# KLASSIO – Feature Matrix

Stand: 2026-09-13 · Integrationsbranch `reconcile/klassio-source-of-truth`

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
| CI / TypeScript / Tests / Build / PWA | ✅ | 669/669 Tests, TS, Production-Build, PWA und Server-Smoke grün; nach jedem neuen Commit erneut verpflichtend. |
| Commitgebundenes World4You-Artefakt | ✅ | CI erzeugt nur nach grünem Audit ein ZIP mit `dist`, Branch-/Commitmarker und Startkommando. |
| Browser-Walkthrough des Abschlussstands | 🔴 | Muss auf exakt demselben Staging-Commit erfolgen. |

## Oberfläche und Navigation

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Dashboard / Heute | 🟡 | Funktional vorhanden; letzte visuelle Browser-Abnahme offen. |
| Kernnavigation | ✅ | Heute, Klasse, Planung, Leistungen, Unterricht + Utilities per Regressionstest abgesichert. |
| Notizen | 🔴 | Eigene Sidebar-Seite geplant: freie Notizen, Konferenznotizen, To-dos und mit Schüler:innen verknüpfte Notizen inkl. Rückverlinkung ins Dossier. |
| Lehrercockpit: weiße freie Fläche | 🟡 | Leerer Start ohne sichtbare Standardwidgets; Schreiben/Zeichnen + Widgets vorhanden. Browser-Abnahme offen. |
| Cockpit: Schreiben und Zeichnen | 🟡 | BoardInk + Unterrichtsfläche implementiert; Browser/Stiftprüfung offen. |
| Cockpit: Widgets frei platzieren | 🟡 | Layoutsystem und Widgetmenü vorhanden; Browserprüfung offen. |
| Cockpit: benutzerdefinierte Layout-Slots | 🟡 | A/B/C-Slots bleiben als eigene, adaptierbare Layouts; keine sichtbaren Beispielwidgets beim leeren Start. |
| Veraltete Cockpit-Kompatibilität | ✅ | Legacy-Komponente enthält keine Demo-/Fake-Daten; aktive Fläche ist Unterrichtsmodus. |
| Mobile/responsive Nutzung | 🟡 | Responsive Code vorhanden; reale Browser-/Viewport-Abnahme offen. |

## Klasse und Schüler

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Anwesenheit | ✅ | Abschluss füllt nur leere Stunden; vorhandene Fehl-/Entschuldigungswerte bleiben erhalten; Regressionstest vorhanden. |
| Befinden | ✅ | Einheitliche 5-Stufen-Skala von sehr gut bis schlecht. |
| Schülerliste | 🟡 | Dossier, Interaktion, Bearbeiten/Löschen und Statusaktionen vorhanden; Browser-Abnahme offen. |
| Schülerdossier | 🟡 | Übersicht, Lernen & Leistungen, Entwicklung & Diagnostik, Stammdaten & Organisation vorhanden; Browser-Abnahme offen. |
| Diagnostik | 🟡 | 3-stufige Hierarchie/Checks/Ergebnisse vorhanden; vollständiger Browser-Walkthrough offen. |
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
| JSON-Backup verschlüsselt | ✅ | Export verweigert fehlenden Vault; Roundtrip und Restore getestet. |
| Legacy-JSON/JS-Wrapper Parser | ✅ | JSON, BOM und einfache historische Wrapper werden ohne JavaScript-Ausführung gelesen. |
| Echter historischer Benutzer-Backup-Import | 🟡 | Kein realer Altbackup-Datensatz als Abnahmedatensatz hinterlegt; synthetische Legacy-Tests grün. |
| Pre-Import-Rücksicherung | ✅ | Restore legt verschlüsselten Vorzustand an; Fehler brechen Restore ab. |
| E-Mail-Einmalcode-Login | 🟡 | Server + UI + Rate-Limits + 30-Tage-Session fertig; reales SMTP-Staging noch testen. |
| Administrativer Zugangscode | ✅ | Bleibt als Fallback; CI-Smoke prüft Cookie-Session. |
| Vertrauenswürdiges Gerät für Tresor | 🟡 | 30 Tage optional; Vault-Key nur verschlüsselt, Device-CryptoKey nicht exportierbar; Browser/IndexedDB-Test offen. |
| Recovery-Code per E-Mail | 🔒 | Bewusst nicht umgesetzt: E-Mail-Kompromittierung darf den lokalen Tresor nicht entschlüsseln. |
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
