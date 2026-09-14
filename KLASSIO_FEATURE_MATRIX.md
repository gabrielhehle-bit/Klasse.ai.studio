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
| Historische divergierende Arbeitsbranches | ✅ | Audit-/Branding-/JSON-/Polish-Branches wurden gegen den aktuellen Stand geprüft; verbleibende eigene Commits sind temporäre CI/Audit-Dateien oder ältere, bereits überholte Varianten und werden nicht gemergt. |
| Reconciliation vollständig zusammengeführt | ✅ | `fix/reconciliation-finalization` ist im Reconciliation-Branch enthalten; finaler PR #5 nach `main` angelegt. |
| Reconciliierter Stand auf `main` | 🔴 | Erst nach World4You-Staging + Browser-Walkthrough PR #5 mergen. |
| CI / TypeScript / Tests / Build / PWA | ✅ | Letzter codehaltiger Reconciliation-Commit `cbc0cc28a33a360114a2affb07c2b3093f03ddd3`: Pre-Deployment Audit #118 grün, 857/857 Tests, TypeScript, Production-Build, PWA-Ausgabe sowie Server-/Session-Smoke erfolgreich. Der aktuelle Branch-HEAD wird vor jeder Arbeit live aus GitHub gelesen. Zusätzlich prüft `Feature Validation` neue Feature-/Fix-/Chore-Branches bereits vor der Integration. |
| Commitgebundenes World4You-Artefakt | ✅ | Audit #118 erzeugte `klassio-world4you-cbc0cc28a33a360114a2affb07c2b3093f03ddd3` mit `dist`, Branch-/Commitmarker und Startkommando. Für Staging ist immer das Artefakt des tatsächlich aktuellen, grünen Reconciliation-HEADs zu verwenden. |
| Browser-Walkthrough des Abschlussstands | 🔴 | Muss auf exakt demselben Staging-Commit erfolgen. |


## Schritt-für-Schritt-Modulabnahme

| # | Bereich | Technischer Status | Nächster Schritt |
|---:|---|---:|---|
| 1 | Dashboard / Heute | ✅ | Code/Tests abgeschlossen; visuelle Staging-Abnahme im Gesamt-Walkthrough |
| 2 | Lehrercockpit | ✅ | PR #35 integriert; Audit #101 grün; reale Maus-/Touch-/Stift-Abnahme im Gesamt-Walkthrough |
| 3 | KI-Helfer | ✅ | PR #37 integriert; Audit #104 grün; reale Gemini-/Browser-Abnahme im Gesamt-Walkthrough |
| 4 | Notizen | ✅ | PR #39 integriert; Audit #106 grün; reale Browser-/Staging-Abnahme im Gesamt-Walkthrough |
| 5 | Schüler:innen | ✅ | PR #41 integriert; Audit #108 grün; reale Browser-/Staging-Abnahme im Gesamt-Walkthrough |
| 6 | Sitzplan | ✅ | PR #43 integriert; Audit #110 grün; reale Maus-/Touch-/Browser-/Staging-Abnahme im Gesamt-Walkthrough |
| 7 | Anwesenheit | ✅ | PR #45 integriert; Audit #112 grün; reale Browser-/Touch-/Druck-/Staging-Abnahme im Gesamt-Walkthrough |
| 8 | Notenmappe | ✅ | PR #47 integriert; Audit #114 grün; reale Browser-/Touch-/Druck-/Staging-Abnahme im Gesamt-Walkthrough |
| 9 | Kassa & Orga | ✅ | PR #49 integriert; Audit #116 grün; reale Browser-/Touch-/Druck-/Staging-Abnahme im Gesamt-Walkthrough |
| 10 | Planungszentrale | ✅ | PR #51 integriert; Audit #118 grün; reale Browser-/Touch-/Staging-Abnahme im Gesamt-Walkthrough |
| 11 | Jahresplanung | 🔴 | als Nächstes einzeln prüfen und abschließen |
| 12 | Wochenplanung | 🔴 | danach |
| 13 | Materialbibliothek | 🔴 | danach |
| 14 | Übergabemappe | 🔴 | danach |
| 15 | Statistik & Profile | 🔴 | danach |
| 16 | Diagnostik | 🔴 | danach |
| 17 | Wir-Gefühl | 🔴 | danach |
| 18 | Jahresbericht | 🔴 | danach |
| 19 | Archiv | 🔴 | danach |
| 20 | Druckzentrum | 🔴 | danach |
| 21 | Datenarchiv / Datensicherung | 🔴 | danach |
| 22 | Einstellungen | 🔴 | danach |

Ein neuer Chat setzt nach dem verpflichtenden Source-of-Truth-Check beim **ersten roten Modul dieser Tabelle** fort. Ein Modul wird erst auf ✅ gesetzt, wenn seine Änderungen integriert und der vollständige Reconciliation-Audit grün ist. Die reale Browser-/Staging-Abnahme bleibt davon getrennt und wird am Abschlussstand durchgeführt.

## Oberfläche und Navigation

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Dashboard / Heute | 🟡 | PR #12, #30 und #32: Datum/Ferien/Feiertage und ehrliche Anwesenheitslogik bleiben erhalten. Die kompakte Lehreransicht ist Standard und folgt `Jetzt → Heute → Wichtig → Schnell`; doppelte Tagesfokus-Karten wurden entfernt, laufende Stunde/Unterricht/Anwesenheit/Hinweise bleiben sichtbar, Schnellzugriffe führen zu Wochenplan, Notizen und Organisation. Backup liegt nicht mehr auf der täglichen Startseite; erweiterte Widgets bleiben optional verfügbar. Struktur- und Navigationstests grün; nur die reale visuelle Browser-Abnahme ist noch offen. |
| SetupWizard | 🟡 | PR #11 integriert: Anrede/Vorname/Nachname mit Legacy-Migration, dynamische Schuljahre, Importdaten ohne erfundene Standardwerte; realer Setup-/Import-Browsercheck offen. |
| KI-Helfer | 🟡 | PR #10 + #37: echte Serverstatus-Anzeige, optionaler datensparsamer Klassenkontext und aggregierter Lernzielkontext ohne automatisch übermittelte Schülernamen; Chatverläufe sind klassenlokal, Klassenwechsel schließen aktive Chats. Bildanalyse akzeptiert nur JPG/PNG/WebP bis 8 MB mit expliziter Datenschutzfreigabe und serverseitiger Prüfung. Remote-Prompts werden nicht im Klartext protokolliert; schulspezifische Prompt-Altlasten sind entfernt. Automatisierte Datenschutz-/Isolationstests grün; Live-Gemini-/Browser-Abnahme offen. |
| Notizen & Beobachtungen | 🟡 | PR #39: Chronik, Journal und Statusverlauf sind vollständig klassenlokal; Legacy-Mehrklassendaten werden anhand der Schüler-ID getrennt. Tages-Reset löscht Schnellnotizen nicht mehr; Schüler-Filter verwendet echte Kind-Verknüpfungen und die Suche findet Schülernamen. Undo/Redo und Auswahlzustände werden beim Klassenwechsel zurückgesetzt. Stimm-Notizen bleiben separat. Automatisierte Tests und Audit #106 grün; reale Browser-Abnahme offen. |
| Kernnavigation | ✅ | PR #23: Heute, Klasse, Planung, Leistungen und Unterricht bleiben die fünf Kernbereiche. Unterricht ist jetzt ein eigener Hub; zuvor verstreute Bestandswerkzeuge sind vollständig den Hubs bzw. `Mehr` zugeordnet. Regressionstests sichern Vollständigkeit und Reihenfolge. |
| Rücknavigation aus Detailseiten | ✅ | PR #25: Detailseiten kennen ihren fachlichen Hauptbereich; die Topbar zeigt Kontext + Seitentitel und bietet einen direkten Rückweg zu Unterricht, Klasse, Planung oder Leistungen. Utilities bleiben bewusst ohne künstlichen Elternbereich; Regressionstests sichern die Hierarchie. |
| Hauptbereich-Hubs | ✅ | PR #26: Klasse ist in `Kinder & Alltag` sowie `Organisation & Gemeinschaft`, Planung in `Kernplanung` sowie `Vorbereitung & Weitergabe` und Leistungen in `Bewerten & Beurteilen` sowie `Lernentwicklung & Gespräche` gegliedert. Doppelte Schnellnavigation wurde entfernt; alle bisherigen Ziele bleiben erreichbar. |
| Produktivdaten: Wetter/WLAN/Klasse | ✅ | PR #19: keine erfundenen Klassen-, WLAN-, Wetter- oder Prognosewerte; fehlende Daten werden transparent angezeigt, WLAN-QR nur bei echter SSID. |
| Sichtbares Produktbranding | ✅ | PR #21 finalisiert: Setup, Demo-Hinweise, Diagnostik, Quest, Einstellungen, Backup-UI, OneDrive-Hilfe sowie Wochen-/Jahresplaner-Excel verwenden Klassio/Klassio Quest; `.lehrerapp` ist als Legacy-Format gekennzeichnet. Interne Legacy-Crypto-/Storage-Kennungen bleiben aus Kompatibilitätsgründen bewusst bestehen. |
| Lehrercockpit: finale Anforderungen | ✅ | PR #6 + #35: freie weiße Fläche ohne Startkarte und ohne automatisch eingeblendetes Klassentier, keine Standardwidgets, verständliche Kategorien, sekundäre Ansichtssteuerung unter `Optionen → Ansicht`, konfigurierbare 1–10 Stunden-Slots/Pausen, klassenlokaler Tages-Sicherungsstatus und keine erfundene Klasse `4c`; Regressionstests und Audit #101 grün. |
| Lehrercockpit: weiße freie Fläche | ✅ | Fläche bleibt unabhängig vom Theme weiß; leere Startkarte entfernt; Standardlayout enthält 0 sichtbare Widgets. |
| Cockpit: Schreiben und Zeichnen | ✅ | BoardInk liegt auf derselben Fläche wie Widgets; Stift, Text, Radierer, Undo/Redo sowie getrenntes Löschen von Schrift/Zeichnung sind umgesetzt. |
| Cockpit: vollständiger Widgetkatalog | ✅ | 108/108 erhaltene Widgettypen sind in Standardlayout, Picker und Kategorie-Zählern vorhanden; exakte Anzahl ist per Regressionstest festgeschrieben, vier frühere Mathe-Altlasten rendern wieder ihre echten Komponenten. |
| Cockpit: Widgets frei platzieren | 🟡 | Verschieben/Größe ist nur über `Optionen → Anordnung ändern` freischaltbar; realer Maus-/Touch-/Stift-Browsercheck bleibt offen. |
| Cockpit: benutzerdefinierte Layout-Slots | 🟡 | A/B/C-Slots bleiben als eigene, benennbare Layouts; keine mitgelieferten Beispielprofile. Browser-Abnahme offen. |
| Veraltete Cockpit-Kompatibilität | ✅ | Alte Tafel bleibt erhalten unter `Optionen → Archiv → Alte Tafelinhalte öffnen`; unerwartetes Öffnen ist per Regressionstest blockiert. |
| Mobile/responsive Nutzung | 🟡 | Responsive Code vorhanden; reale Browser-/Viewport-Abnahme offen. |

## Klasse und Schüler

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Anwesenheit | 🟡 | PR #45: Stunden- und Detaildaten bleiben klassenlokal; Undo und offene Dialoge werden beim Klassenwechsel zurückgesetzt. Lokale Kalendertage, Wochenenden/Feiertage und echte konfigurierte Unterrichtsstunden steuern die Erfassung; ohne Stunden werden keine sechs Stunden oder Anwesenheitswerte erfunden. Stundenstatus, Fehlstunden, Entschuldigung, Notiz und Verspätung werden konsistent gehalten; die Verspätungseingabe ist wieder direkt erreichbar. Fehltage, Semesterstatistik und Trends sind auf das aktive Schuljahr begrenzt, verwenden Bundesland-Semestergrenzen und ISO-KW. Abschluss füllt weiterhin nur leere Stunden. Automatisierte Tests und Audit #112 grün; reale Browser-/Touch-/Druck-Abnahme offen. |
| Befinden | ✅ | Einheitliche 5-Stufen-Skala von sehr gut bis schlecht. |
| Sokrates PDF-Import | ✅ | PR #16 integriert: PDF.js-Worker lokal gebundelt, `.mjs` im PWA-Precache, geometrische Tabellenerkennung und keine erfundenen Stammdaten; Regressionstests vorhanden. |
| Schülerliste | 🟡 | PR #41: Suche, Filter, Liste/Karten/Karte, Import, Dossier, Notiz/Interaktion und Bearbeiten/Löschen bleiben erhalten. Alter und Alterssortierung sind kalendergenau; Suche umfasst auch SV-Nummer. Reimporte erkennen bestehende Kinder und aktualisieren nur Stammdaten, ohne pädagogische Daten zu überschreiben; Sokrates-Metadaten werden übernommen. Löschen bereinigt die zugehörigen personenbezogenen Klassendaten vollständig, während Kassenbuchungen entkoppelt erhalten bleiben. Klassenwechsel schließen alte Dossier-/Modalzustände. Kartenmarker sind lokal gebündelt; Photon erhält nur PLZ/Ort und der Hinweis ist sichtbar. Automatisierte Tests und Audit #108 grün; reale Browser-Abnahme offen. |
| Schülerdossier Struktur | ✅ | Fünf feste Hauptbereiche: Übersicht; Lernen & Leistungen; Entwicklung & Diagnostik; Stammdaten & Organisation; Berichte & Materialien. Alte Einfach/Experte-/Ausblendlogik entfernt; Regressionstest vorhanden. |
| Schülerdossier Semesterwechsel | ✅ | Auswahl Semester 1/2 wird korrekt übernommen; Regressionstest vorhanden. |
| Schülerdossier Browser-Abnahme | 🟡 | Navigation, Detailtabs, Fokusmodus und responsive Darstellung müssen im finalen Browser-Walkthrough praktisch geprüft werden. |
| Sitzplan | 🟡 | PR #43: Positionen, Möbel und Regeln sind klassenlokal; Legacy-Regeln werden nach Schülerzugehörigkeit migriert. `nicht nebeneinander`, `nebeneinander`, `feste Zone` und `fester Platz` werden zentral geprüft, Fixplätze speichern ihre Position und Zonen richten sich an der realen Tafelposition aus. Würfelvorschau und Planungs-Analyse nutzen dieselbe Regelengine, erkennen Sitzkollisionen und der Optimierer hält Fixplätze sowie explizite Regeln ein. Abwesenheiten stammen aus den echten Anwesenheitsdaten mit lokalem Kalendertag. Sitzplan-UI-Zustände werden beim Klassenwechsel zurückgesetzt. Automatisierte Tests und Audit #110 grün; reale Drag/Drop-, Maus-/Touch- und Druck-/Browser-Abnahme offen. |
| Diagnostik | 🟡 | PR #9 integriert: 3-stufige Hierarchie/Checks/Ergebnisse, klassenlokale iKM-/Antolin-/Ziel-/Beobachtungs-/Metakognitionsdaten, aktive Klassen-ID für strukturierte Ergebnisse und lokale Datumsprüfung. Vollständiger Browser-Walkthrough offen. |
| Multi-Class | ✅ | Klassenwechsel/Migration/Erweiterungsfelder, Cockpit-Ink sowie Notizen/Journal/Statusverlauf per Tests klassenlokal abgesichert; Schüler-Dossier-, Editor- und Interaktionszustände sowie Sitzplan-Auswahl/Vorschau/Undo werden beim Klassenwechsel zurückgesetzt. Sitzpositionen, Möbel und Sitzplan-Regeln bleiben strikt pro Klasse getrennt. Anwesenheit und Anwesenheitsdetails sind ebenfalls klassenlokal; Anwesenheits-Undo und offene Anwesenheitsdialoge werden beim Klassenwechsel verworfen. Noten, Noten-Metadaten, Gewichtungen und Mitarbeit-Bewertungsregeln bleiben pro Klasse getrennt; offene Notenmappe-Dialoge und lokale Gewichtungsentwürfe werden beim Klassenwechsel zurückgesetzt. Kassenstand/Sammlungen, Checklisten, flexible Listen und Klassenlogins sind ebenfalls klassenlokal; offene Kassa-/Orga- und Flexible-Listen-Zustände werden beim Klassenwechsel verworfen. |

## Leistungen

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Notenmappe | 🟡 | PR #47: Noten/Prozent/Punkte, Gewichtung, Schularbeiten, LZK/WOPL, sonstige Leistungen, Mitarbeit und HÜ bleiben erhalten. Ungültige Werte außerhalb von Noten 1–5, 0–100% bzw. 0–Max-Punkten werden abgewiesen statt still korrigiert. Endnoten erlauben 1–5 sowie SPF/ESPF. HÜ-Modus, Prozentabzug und Mitarbeitsabzug sind fachbezogen; Mitarbeit-Bewertungsmodus und Schwellenwerte sind klassenlokal und Legacy-Mehrklassenstände werden verlustfrei migriert. WOPL-Spiegelung Deutsch↔Mathematik verhindert numerische Rohwertübernahme bei unterschiedlichen Bewertungsarten und skaliert Punkte bei unterschiedlichen Maximalpunkten proportional. Automatisierte Tests und Audit #114 grün; reale Browser-/Touch-/Druck-Abnahme offen. |
| Fachbezogene Bewertungsabschnitte | ✅ | Metadaten eines Fachs verändern andere Fächer nicht; Regressionstest vorhanden. |
| Mitarbeit | ✅ | Schnellerfassung inkl. Enter/↓ und Shift+Enter/↑; manuelle 1–5-Bewertung unterstützt. |
| Hausübungen | ✅ | Schnellerfassung; 0 = vollständig; Detailoptionen hinter `HÜ-Einstellungen`. |
| Filter „unvollständig“ | ✅ | Wirkt nur in der Notenansicht und berücksichtigt SA/LZK/WOPL/Sonstige/manuelle Mitarbeit; nicht in Mitarbeit/HÜ. |
| Sonstige Leistung / Bewertung erfassen | ✅ | Eigene Leistungsobjekte; kein leerer Datensatz beim Abbrechen. |

## Planung und Organisation

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Kassa & Orga | 🟡 | PR #49: Geldsammlungen, Teilzahlungen, Kassenbuch, Checklisten, flexible Listen und Klassenlogins bleiben erhalten. Geldbeträge werden centgenau verarbeitet; Überzahlungen werden abgewiesen, `Alle bezahlt` bucht nur offene Differenzen und manuelle Buchungen werden beim Löschen korrekt gegengebucht. Automatische Sammlungsbuchungen sind vor manueller Löschung geschützt. Legacy-`beitrag_pro_kind` wird zentral auch für inaktive Klassen migriert; frühere globale Klassenlogins werden einmalig in alle bestehenden Klassen übernommen und danach pro Klasse getrennt geführt. Datumsfelder nutzen lokale Kalendertage und offene Editor-/Dialogzustände werden beim Klassenwechsel zurückgesetzt. Automatisierte Tests und Audit #116 grün; reale Browser-/Touch-/Druck-Abnahme offen. |
| Planungszentrale | 🟡 | PR #51: Übersicht und Planungswerkzeuge nutzen alle 10 Stunden-Slots; leere Klassen erfinden keine Fächer und das Öffnen am Wochenende verändert die ausgewählte KW nicht still. Parkgarage und Wochenvorlagen sind klassenlokal inklusive Legacy-Migration. KI-Themenvorschläge werden sichtbar auswählbar dargestellt; Fehlerzustände bleiben transparent und erzeugen keine erfundenen Ersatzvorschläge oder Schulstufen. Automatisierte Tests und Audit #118 grün; reale Browser-/Touch-Abnahme offen. |
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
| Vertrauenswürdiges Gerät für Tresor | 🟡 | PR #20: 30 Tage optional; Vault-Key nur verschlüsselt, Device-CryptoKey nicht exportierbar; Werksreset entfernt Trusted-Device-Daten und stale/fremde Einträge werden bereinigt. Realer Browser/IndexedDB-Test offen. |
| Recovery-Code per E-Mail | 🔒 | Bewusst nicht umgesetzt: E-Mail-Kompromittierung darf den lokalen Tresor nicht entschlüsseln. |
| KI-Bilddatenschutz | ✅ | Fotoanalyse ist client- und serverseitig ohne explizite Bestätigung blockiert; Base64-Bilddaten laufen nicht durch Text-Regexfilter; nur JPEG/PNG/WebP für `askAI`; Regressionstests vorhanden. |
| Smartboard-Sync | 🟡 | PR #18: SessionKey nur aus URL-Fragment, Query-Key abgewiesen und Ablaufzeit serverseitig gemessen; Browser-/Geräteabnahme offen. |
| Offline / PWA | 🟡 | Build und Service-Worker-Ausgabe grün; realer Offline-Browsercheck offen. |

## Integrationen und Ausgabe

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Canva | 🟡 | PR #18: OAuth/PKCE, serverseitig verschlüsselte Tokens, Designsuche/-erstellung und PDF/PNG/JPG/PPTX-Export; Popup-Nachrichten nur von Klassio-Origin und exakt geöffnetem Popup akzeptiert. Live-OAuth mit Staging-Secrets offen. |
| PowerPoint KEL | 🟡 | PR #18 bestätigt echten `.pptx`-Export mit nativen editierbaren Diagrammen per Integrationsvertrag; Download/Öffnen in PowerPoint auf Staging offen. |
| PDF-Handout KEL | 🟡 | Bestehender PDF-Export bleibt; Browserprüfung offen. |
| OneDrive Backup-Dateikompatibilität | ✅ | PR #15 integriert: neue Cloud-Sicherung `Klassio_Backup.json`; historische `LehrerAPP_Backup.json`, `LehrerAPP_Backup.lehrerapp` und `Lehrermappe_Backup.json` bleiben lesbar. |
| OneDrive | 🟡 | Konfigurierbar; OAuth-State/Cookiebindung und Popup-Origin/Source sind automatisiert abgesichert; Live-OAuth/Backup-Abnahme auf Staging offen. |

## Deployment

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| World4You Runtime grundsätzlich | 🟡 | Server hat Node 18.20.4 und npm 9.2.0; aktives Zielverzeichnis muss vor dem finalen Upload am Server eindeutig geprüft werden. |
| World4You Release-Paket | ✅ | CI-Artefakt wird aus exakt dem geprüften Reconciliation-Commit erzeugt und trägt Branch-/Commitmarker. |
| World4You Abschluss-Staging | 🔴 | Exaktes aktuelles Reconciliation-Artefakt auf das aktive Staging-Ziel deployen und `/api/health` prüfen. |
| Finaler Browser-Test | 🔴 | Nach Deployment: Login, Tresor, Kernnavigation, Cockpit, Klasse/Dossier, Planung, Gradebook, Canva-Status, PPTX/PDF, Backup/Restore, PWA/Offline und responsive Viewports. |
| Merge nach `main` | 🔴 | Erst nach grünem Staging-/Browser-Test PR #5 mergen. |
