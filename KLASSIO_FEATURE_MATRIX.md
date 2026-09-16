# KLASSIO – Feature Matrix

Stand: 2026-09-15 · Integrationsbranch `reconcile/klassio-source-of-truth`

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
| CI / TypeScript / Tests / Build / PWA | ✅ | Aktueller codehaltiger Reconciliation-Commit `c3785ab2bbcbc0c6e42bf46e6eb5d806f2001a67`: Pre-Deployment Audit #144 grün, 1010/1010 Tests, TypeScript, Production-Build, PWA-Ausgabe sowie Server-/Session-/E-Mail-Fallback-Smoke erfolgreich. Feature Validation #659 grün. |
| Commitgebundenes World4You-Artefakt | ✅ | Audit #144 erzeugte `klassio-world4you-c3785ab2bbcbc0c6e42bf46e6eb5d806f2001a67`. Für Staging ist immer das Artefakt des tatsächlich aktuellen, grünen Reconciliation-HEADs zu verwenden. |
| Browser-Walkthrough des Abschlussstands | 🔴 | Ein automatisierter echter Chrome-Vorlauf ist in Draft-PR #79 bereits grün, ersetzt aber nicht die reale Abnahme auf klassio.at. Der finale Walkthrough muss auf exakt demselben öffentlich deployten Staging-Commit erfolgen. |


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
| 11 | Jahresplanung | ✅ | PR #53 integriert; Audit #120 grün; reale Browser-/Touch-/Druck-/Excel-/Staging-Abnahme im Gesamt-Walkthrough |
| 12 | Wochenplanung | ✅ | PR #55 integriert; Audit #122 grün; reale Browser-/Touch-/Druck-/Excel-/Staging-Abnahme im Gesamt-Walkthrough |
| 13 | Materialbibliothek | ✅ | PR #57 integriert; Audit #124 grün; reale Browser-/Touch-/Datei-/Link-/Staging-Abnahme im Gesamt-Walkthrough |
| 14 | Übergabemappe | ✅ | PR #59 integriert; Audit #126 grün; reale Browser-/Touch-/Druck-/Datenschutz-/Staging-Abnahme im Gesamt-Walkthrough |
| 15 | Statistik & Profile | ✅ | PR #61 integriert; Audit #128 grün; 941/941 Tests; reale Browser-/Touch-/Druck-/Datenschutz-/Staging-Abnahme im Gesamt-Walkthrough |
| 16 | Diagnostik | ✅ | PR #63 integriert; Audit #130 grün; 948/948 Tests; reale Browser-/Touch-/Druck-/Datenschutz-/Staging-Abnahme im Gesamt-Walkthrough |
| 17 | Wir-Gefühl | ✅ | PR #65 integriert; Audit #132 grün; 956/956 Tests; reale Browser-/Touch-/Datenschutz-/Staging-Abnahme im Gesamt-Walkthrough |
| 18 | Jahresbericht | ✅ | PR #67 integriert; Audit #134 grün; 963/963 Tests; reale Browser-/Touch-/Druck-/Datenschutz-/KI-/Staging-Abnahme im Gesamt-Walkthrough |
| 19 | Archiv | ✅ | PR #69 integriert; Audit #136 grün; 976/976 Tests; reale Browser-/Touch-/Datenschutz-/Legacy-/Staging-Abnahme im Gesamt-Walkthrough |
| 20 | Druckzentrum | ✅ | PR #71 integriert; Audit #138 grün; 986/986 Tests; reale Browser-/Touch-/Drucker-/PDF-/Datenschutz-/Staging-Abnahme im Gesamt-Walkthrough |
| 21 | Datenarchiv / Datensicherung | ✅ | PR #73 integriert; Audit #140 grün; 995/995 Tests; reale Browser-/Restore-/OneDrive-/IndexedDB-/Staging-Abnahme im Gesamt-Walkthrough |
| 22 | Einstellungen | ✅ | PR #75 integriert; Audit #142 grün; 1004/1004 Tests; reale Browser-/Touch-/PWA-/Sync-/Staging-Abnahme im Gesamt-Walkthrough |

Alle 22 Einzelmodule sind technisch abgeschlossen. Ein neuer Chat setzt nach dem verpflichtenden Source-of-Truth-Check beim **Staging-/Browser-Walkthrough des aktuellen Reconciliation-HEADs** fort. Die reale Browser-/Staging-Abnahme bleibt bewusst von der technischen Modulabnahme getrennt; erst nach erfolgreicher Abnahme wird PR #5 nach `main` gemergt.

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
| Lehrercockpit: finale Anforderungen | ✅ | Freie weiße Smartboard-Fläche ohne Startkarte und ohne automatisch eingeblendetes Klassentier; keine Standardwidgets, verständliche Kategorien, sekundäre Ansichtssteuerung unter `Optionen → Ansicht`, konfigurierbare 1–10 Stunden-Slots/Pausen, klassenlokaler Tages-Sicherungsstatus und keine erfundene Klasse `4c`. Widgets bleiben frei platzierbar; Schreiben/Zeichnen übernimmt bewusst das Smartboard selbst. |
| Lehrercockpit: weiße freie Fläche | ✅ | Fläche bleibt unabhängig vom Theme weiß; leere Startkarte entfernt; Standardlayout enthält 0 sichtbare Widgets. |
| Cockpit: Smartboard-Schreibfläche | ✅ | Klassio stellt bewusst nur die weiße Fläche und Widgets bereit. Die eigene BoardInk-Zeichenebene ist aus der aktiven Oberfläche entfernt; Schreiben/Zeichnen erfolgt mit den Werkzeugen des Smartboards. Bestehende Alt-Datenstrukturen werden nicht gelöscht. |
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
| Wir-Gefühl | 🟡 | PR #65: „Wie geht es uns?“ übernimmt ausschließlich die freiwillige 5-Smiley-Befindensabfrage aus „Ich bin da!“; Verhaltensnotizen und Statusänderungen werden aus „Notizen & Beobachtungen“ gespiegelt. Der 14-Tage-Verlauf verwendet reale Check-in-Daten. Doppelter Klassen-Stimmungsbarometer, Demo-Klassenrat/-Verträge/-Klimadaten, zweites Klima-Tagebuch und künstliche Energie-/XP-Formel wurden entfernt. Klassenvertrag und Klassenrat sind klassenlokal; Legacy-Klartextdaten werden einmalig in den verschlüsselten App-State migriert. Automatisierte Tests und Audit #132 grün; reale Browser-/Touch-/Datenschutz-Abnahme offen. |
| Sokrates PDF-Import | ✅ | PR #16 integriert: PDF.js-Worker lokal gebundelt, `.mjs` im PWA-Precache, geometrische Tabellenerkennung und keine erfundenen Stammdaten; Regressionstests vorhanden. |
| Schülerliste | 🟡 | PR #41: Suche, Filter, Liste/Karten/Karte, Import, Dossier, Notiz/Interaktion und Bearbeiten/Löschen bleiben erhalten. Alter und Alterssortierung sind kalendergenau; Suche umfasst auch SV-Nummer. Reimporte erkennen bestehende Kinder und aktualisieren nur Stammdaten, ohne pädagogische Daten zu überschreiben; Sokrates-Metadaten werden übernommen. Löschen bereinigt die zugehörigen personenbezogenen Klassendaten vollständig, während Kassenbuchungen entkoppelt erhalten bleiben. Klassenwechsel schließen alte Dossier-/Modalzustände. Kartenmarker sind lokal gebündelt; Photon erhält nur PLZ/Ort und der Hinweis ist sichtbar. Automatisierte Tests und Audit #108 grün; reale Browser-Abnahme offen. |
| Schülerdossier Struktur | ✅ | Fünf feste Hauptbereiche: Übersicht; Lernen & Leistungen; Entwicklung & Diagnostik; Stammdaten & Organisation; Berichte & Materialien. Alte Einfach/Experte-/Ausblendlogik entfernt; Regressionstest vorhanden. |
| Schülerdossier Semesterwechsel | ✅ | Auswahl Semester 1/2 wird korrekt übernommen; Regressionstest vorhanden. |
| Schülerdossier Browser-Abnahme | 🟡 | Navigation, Detailtabs, Fokusmodus und responsive Darstellung müssen im finalen Browser-Walkthrough praktisch geprüft werden. |
| Sitzplan | 🟡 | PR #43: Positionen, Möbel und Regeln sind klassenlokal; Legacy-Regeln werden nach Schülerzugehörigkeit migriert. `nicht nebeneinander`, `nebeneinander`, `feste Zone` und `fester Platz` werden zentral geprüft, Fixplätze speichern ihre Position und Zonen richten sich an der realen Tafelposition aus. Würfelvorschau und Planungs-Analyse nutzen dieselbe Regelengine, erkennen Sitzkollisionen und der Optimierer hält Fixplätze sowie explizite Regeln ein. Abwesenheiten stammen aus den echten Anwesenheitsdaten mit lokalem Kalendertag. Sitzplan-UI-Zustände werden beim Klassenwechsel zurückgesetzt. Automatisierte Tests und Audit #110 grün; reale Drag/Drop-, Maus-/Touch- und Druck-/Browser-Abnahme offen. |
| Diagnostik | 🟡 | PR #9 + #63: 3-stufige Hierarchie, 1:1-Checks, Klassenscreenings und Ergebnisse bleiben erhalten. Neue Ergebnisse sind strikt an die stabile aktive Klassen-ID gebunden; Klassenwechsel verwerfen offene Auswahlzustände, Speichern validiert Klassen-/Schülerzuordnung und dedupliziert IDs. Screeningdaten nutzen lokale Kalendertage und keine erfundenen Klassen-Fallbacks. Automatische Auswertungstexte sind als pädagogische Momentaufnahme formuliert, nicht als Diagnose; Legacy-/Archivpfade behaupten keine fehlerfreie KI-Auslese und Normwerte müssen aus Originalauswertungen stammen. Automatisierte Tests und Audit #130 grün; reale Browser-/Touch-/Druck-/Datenschutz-Abnahme offen. |
| Multi-Class | ✅ | Klassenwechsel/Migration/Erweiterungsfelder, Cockpit-Ink sowie Notizen/Journal/Statusverlauf per Tests klassenlokal abgesichert; Schüler-Dossier-, Editor- und Interaktionszustände sowie Sitzplan-Auswahl/Vorschau/Undo werden beim Klassenwechsel zurückgesetzt. Sitzpositionen, Möbel und Sitzplan-Regeln bleiben strikt pro Klasse getrennt. Anwesenheit und Anwesenheitsdetails sind ebenfalls klassenlokal; Noten, Noten-Metadaten, Gewichtungen und Mitarbeit-Bewertungsregeln bleiben pro Klasse getrennt. Kassenstand/Sammlungen, Checklisten, flexible Listen und Klassenlogins sind ebenfalls klassenlokal. PR #81 ergänzt die historisch belegte Migration von `klassen` → `classes`; ein nichtleeres aktuelles `classes` hat Vorrang, ein leeres `classes` verdrängt echte historische Mehrklassendaten nicht. |

## Leistungen

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| Notenmappe | 🟡 | PR #47: Noten/Prozent/Punkte, Gewichtung, Schularbeiten, LZK/WOPL, sonstige Leistungen, Mitarbeit und HÜ bleiben erhalten. Ungültige Werte außerhalb von Noten 1–5, 0–100% bzw. 0–Max-Punkten werden abgewiesen statt still korrigiert. Endnoten erlauben 1–5 sowie SPF/ESPF. HÜ-Modus, Prozentabzug und Mitarbeitsabzug sind fachbezogen; Mitarbeit-Bewertungsmodus und Schwellenwerte sind klassenlokal und Legacy-Mehrklassenstände werden verlustfrei migriert. WOPL-Spiegelung Deutsch↔Mathematik verhindert numerische Rohwertübernahme bei unterschiedlichen Bewertungsarten und skaliert Punkte bei unterschiedlichen Maximalpunkten proportional. Automatisierte Tests und Audit #114 grün; reale Browser-/Touch-/Druck-Abnahme offen. |
| Statistik & Profile | 🟡 | PR #61: Noten-/Prozent-/Punktestatistik ist skalenkorrekt, Klassen- und Schüler-Leistungsindex sind vereinheitlicht und Planungsstatistik nutzt reale Wochen-/Jahresplandaten. Elterngespräche, KEL, Portfolio, KI-Zusammenfassungen und Profil-Beobachtungen sind klassenlokal; Legacy-Browserdaten werden in den verschlüsselten App-State migriert. Demo-/Fake-Vergleiche, erfundene Profilwerte, pseudo-offizielle Urkunden sowie vorgetäuschte Risiko-/Förder-/Sitzplatzdiagnosen wurden entfernt oder transparent als manuelle Hilfen umgesetzt. Automatisierte Tests und Audit #128 grün; reale Browser-/Touch-/Druck-/Datenschutz-Abnahme offen.  Antolin-Klassenberichte sind jetzt direkt über „Antolin importieren“ erreichbar; PDF/CSV/TXT/TSV bzw. Copy & Paste werden vor dem Speichern analysiert und als klassenlokale Snapshots übernommen. |
| Jahresbericht | 🟡 | PR #67: Entwürfe und Freigabestatus sind klassenlokal; Leistungsdaten werden semesterbezogen aus der echten Notenmappe gelesen, KEL/Beobachtungen nachvollziehbar ausgewählt und Doppelungen entfernt. Diagnosefelder und Klarnamen werden nicht automatisch in den KI-Prompt aufgenommen; Halluzinationen werden ausdrücklich untersagt. Die künstliche Kompetenz-Scorecard wurde durch eine transparente Datenbasis ersetzt. Druck ist offline, escaped, nicht amtlich gelabelt und Sammeldruck umfasst nur freigegebene Berichte. Automatisierte Tests und Audit #134 grün; reale Browser-/Touch-/Druck-/KI-/Datenschutz-Abnahme offen. |
| Archiv | 🟡 | PR #69: Jahresarchive sind schreibgeschützte, datensparsame Klassensnapshots und verändern die aktive Klasse nicht. Pädagogisch relevante Daten bleiben erhalten, SV-Nummer/Adresse/Elternkontakte/Foto sowie operative Zugangsdaten, Klassenkassa, Sitzplan und laufende Planung werden nicht übernommen. Es werden nur gespeicherte Endnoten angezeigt; keine künstlichen Archiv-Durchschnittswerte. Legacy-`historicalStudents` bleiben separat lesbar. `retiredClasses` trennt stillgelegte, wiederherstellbare Live-Klassen vom Jahresarchiv; alte Vollklassen werden verlustfrei migriert. Automatisierte Tests und Audit #136 grün; reale Browser-/Touch-/Datenschutz-/Legacy-Abnahme offen. |
| Druckzentrum | 🟡 | PR #71: Keine erfundene Klasse oder amtliche §-17-/Bescheid-Wirkung; Schülerauswahl wird beim Klassenwechsel isoliert. SPF-Bescheid wurde durch eine nicht amtliche Förderübersicht ersetzt, Namenskarten/Motivationsurkunden sind klar nicht amtlich. Dossier-Defaults sind datensparsamer: Finanzen, Elternkontakte und KI-Zusammenfassung aus; keine SV-Nummer im Standarddossier. KI-/Oberau-Daten kommen aus dem verschlüsselten App-State statt Legacy-`localStorage`; Fake-Index, pauschale Standarderreichung und erfundene Lobtexte entfernt. Leistungsdruck respektiert Noten/Prozent/Punkte; Semester-Notenspiegel zwingt Prozent-/Punktefächer nicht in 1–5. Dossier-Druck nutzt sandboxed `srcdoc` und escaped Markdown. Automatisierte Tests und Audit #138 grün; reale Browser-/Touch-/Drucker-/PDF-/Datenschutz-Abnahme offen. |
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
| Jahresplanung | 🟡 | PR #53: Vollbild, Lehrplan-Drawer, KI-Vorschläge, Druck und mehrere Themen bleiben erhalten. Mehrfachthemen sind in Excel/CSV/Monatsansicht verlustfrei; Excel-Import hat klare Ergänzen-/Überschreiben-Semantik, Schulwochen sind bundesland- und jahreswechselrichtig und Verschieben folgt echten Unterrichtswochen statt KW+1. Automatisierte Tests und Audit #120 grün; reale Browser-/Touch-/Druck-/Excel-Abnahme offen. |
| Wochenplanung | 🟡 | PR #55: Vollbild, Raster, Schnellplanung, Tagesfortschritt, Termine, Duplizieren und Schüler-Aufgabenblatt nutzen alle 10 Stunden-Slots; Stunde 9/10 erfinden keine Standardzeiten. Aktuelle Stunde, Excel-Vorlage und Mittagspause folgen der Klassenkonfiguration. Vorwoche, Wochenwahl und Wiederholungen sind bundesland- und jahreswechselrichtig. Mehrstundenblöcke enden spätestens bei Slot 10. Excel akzeptiert nur Stunde 1–10 und erfindet bei ungültigen Angaben weder Montag noch 1. Stunde. Der Wochenabschluss verwendet `erledigt`, bleibt mit Legacy-`completed` kompatibel und zeigt Stunden 1-basiert; der Schüler-Wochenplan übernimmt Stunde 9/10. Automatisierte Tests und Audit #122 grün; reale Browser-/Touch-/Druck-/Excel-Abnahme offen. |
| Stundenplan 10 Slots | ✅ | PR #13 integriert: Setup-Zeitfelder, Tagesrahmen, mobile/desktop Stammplan-Raster und Dashboard-Vorschau verwenden 10 Slots. Für 9./10. Stunde werden keine Standardzeiten erfunden; frei konfigurierbar. |
| Wochenplan Vollbild | ✅ | Implementiert. |
| Wochenplan Excel Roundtrip | ✅ | Vorlage + Import, Ergänzen/Lücken füllen oder überschreiben. |
| Wochenplan-Aufgabenblatt | ✅ | Generator vorhanden. |
| Jahresplan Vollbild | ✅ | Implementiert. |
| Jahresplan Excel Roundtrip | ✅ | PR #53: Vorlage + verlustfreier Merge/Overwrite. Mehrere Excel-Zeilen derselben KW/Fach-Zelle bleiben als Mehrfachthemen erhalten; Ergänzen bewahrt bestehende Themen und dedupliziert neue, Überschreiben ersetzt nur importierte Zellen. Schulstart/SW berücksichtigen Bundesland und Jahreswechsel; unbekannte Fächer werden nicht still dem ersten Fach zugeordnet. |
| Mehrere Themen pro Fach/KW | ✅ | PR #53: `items`-Struktur bleibt in Tabelle, Monatsansicht, CSV, Druck und Excel-Roundtrip erhalten; leere Zellen bleiben echte leere Zellen. |
| Materialbibliothek | 🟡 | PR #57: Anlegen, bearbeiten, suchen, filtern, gruppieren und favorisieren bleiben erhalten. Lokale Dateien sind auf PDF/JPG/PNG/WebP/GIF mit zentralen Größenlimits begrenzt; Links werden auf HTTP/HTTPS validiert und veraltete Datei-/Linkdaten beim Typwechsel entfernt. KI- und Arbeitsblatt-Speicher deduplizieren IDs, bewahren bestehende Metadaten und melden Erfolg nur bei tatsächlichem Speichern. Gelöschte globale Materialien werden aus Wochenplan-Verknüpfungen aller Klassen entfernt. Automatisierte Tests und Audit #124 grün; reale Browser-/Touch-/Datei-/Link-Abnahme offen. |
| Materialbibliothek CRUD | ✅ | PR #57: Anlegen, bearbeiten, suchen, filtern, gruppieren, favorisieren und löschen; Sammelaktionen bleiben auf sichtbare Treffer begrenzt. |
| Materialbibliothek → Wochenplan | ✅ | PR #57: Direkter Dialog für aktuelle KW/Tag/Stunde 1–10; Ergänzen/Ersetzen; IDs werden dedupliziert; Löschen räumt Verknüpfungen in allen Klassen auf, übrige Planung bleibt erhalten. |
| Übergabemappe / Vertretung | 🟡 | PR #59: 10-Slot-Tagesvertretung mit klassenkonfigurierten Zeiten, Materialbibliothek-Stundenbildern und einmaliger Legacy-Migration; Bearbeiten/Löschen ist mit Materialbibliothek und Wochenplan-Verknüpfungen konsistent. Vertretungshinweise sind klassenlokal, Notfallcheckliste startet ungeprüft, hardcodierte Schulkontakte wurden entfernt. Schulwechsel-Dossier enthält Stammdaten, Leistungsstand, klassenlokale Chronik, IKM-Plus und Diagnostik/Förderbedarf; Datenschutzansicht pseudonymisiert Namen und blendet sensible Stammdaten aus. Automatisierte Tests und Audit #126 grün; reale Browser-/Touch-/Druck-/Datenschutz-Abnahme offen. |
| Printcenter | 🟡 | Druckmodule vorhanden; realer Browser-/PDF-/Druckcheck offen. |
| Ferienlogik alle Bundesländer 2026/27 | ✅ | Gegen offizielle österreichische Termine geprüft. |

## Daten, Datenschutz und Sicherheit

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| AES-GCM-256 Datentresor | ✅ | Sicherheits- und Integritätstests grün. |
| PBKDF2 / Recovery / Passwortwechsel | ✅ | 600.000 Iterationen; Recovery-/Rotation-/Passwortwechseltests grün. |
| JSON-Backup verschlüsselt | ✅ | PR #73: Export verweigert fehlenden Vault, synchronisiert davor den aktiven Klassenstand und verwendet den lokalen Kalendertag für `Klassio_Sicherung_YYYY-MM-DD.json`; Roundtrip und Restore bleiben getestet, internes Backup-Format kompatibel. |
| Legacy-JSON/JS-Wrapper Parser | ✅ | JSON, BOM und einfache historische Wrapper werden ohne JavaScript-Ausführung gelesen. PR #81 ergänzt historisch belegte Mehrklassenstände unter `klassen` und validiert diese vor der Migration. |
| Frischer Produktivzustand ohne Demo-Fakedaten | ✅ | Kein Musterlehrer, kein gebündeltes 25-Schüler-Archiv, keine erfundenen Lehrerstatistiken, Schnelllinks oder Beispiel-QR-Werte; die Beispielklasse wird nur nach ausdrücklicher Auswahl geladen. |
| Echter historischer Benutzer-Backup-Import | 🟡 | PR #81: umfassender synthetischer Zwei-Klassen-Roundtrip ist grün – Schüler:innen, Noten, Bewertungsmetadaten/Gewichtungen, Jahres-/Wochenplanung, Anwesenheit, Sitzplan und Diagnostik überleben Legacy-Import, Normalisierung, Verschlüsselung und Restore. Ein echter persönlicher Altbackup-Datensatz bleibt als Staging-Abnahme offen und wird niemals Entwicklungsgrundlage. |
| Datenarchiv / Datensicherung | 🟡 | PR #73: 7-Tage-Backup-Erinnerung und 24h-Aufschub sind konsistent; lokale und OneDrive-Sicherungen zählen korrekt als Backup. Speicherbelegung nutzt die Browser-Quota statt eines fiktiven 5-MB-Limits. Tägliche verschlüsselte Notfallkopie und Dateinamen verwenden den lokalen Kalendertag; Einstellungen zeigen den echten `savedAt`-Zeitpunkt. Beide Werksreset-Pfade löschen Gerätevertrauen, App-/Browser-/Sitzungsdaten und erst zuletzt die Tresor-Metadaten; Löschfehler werden nicht verschluckt. Automatisierte Tests und Audit #140 grün; realer Browser-/Restore-/OneDrive-/IndexedDB-Test offen. |
| Pre-Import-Rücksicherung | ✅ | Restore legt verschlüsselten Vorzustand an, verifiziert ihn vor dem Einspielen und rollt bei Schreib-/Verifikationsfehlern zurück. Legacy-JSON/JS-Wrapper, Backup-Passwort und Recovery-Code bleiben unterstützt. |
| E-Mail-Einmalcode-Login | 🟡 | PR #85 trennt persönliches E-Mail-Konto und Schulidentität: jede gültige E-Mail kann grundsätzlich den Einmalcode-Login nutzen; 30-Tage-Session und Rate-Limits bleiben. Reales SMTP-Staging noch testen. |
| Schulregister Österreich | 🟡 | PR #86: persistentes serverseitiges Register mit stabiler Schul-ID, exakter Schul-Domain und Bundesland; alle 9 Bundesländer vorgesehen. VS Oberau / `vsfoa.vobs.at` ist initialer Seed. Neue Schulen können eine Verifizierungsanfrage stellen; private Mailanbieter und die VOBS-Sammeldomain werden nicht als Schule akzeptiert. Admin-Freigabe und Staging-Abnahme offen. |
| Lehrerzimmer / Kollegium | 🟡 | PR #78 in UX-Reconciliation integriert; Beiträge, Fragen, Antworten, @Erwähnungen und Kollegium bleiben strikt an die verifizierte Schul-ID gebunden. Private Klassio-Konten erhalten keinen schulweiten Zugriff. |
| Administrativer Zugangscode | ✅ | Bleibt als Fallback; CI-Smoke prüft Cookie-Session. |
| Vertrauenswürdiges Gerät für Tresor | 🟡 | PR #20 + #73: 30 Tage optional; Vault-Key nur verschlüsselt, Device-CryptoKey nicht exportierbar. Beide vollständigen Werksreset-Pfade entfernen Trusted-Device-Daten sowie danach die separaten Vault-Metadaten; stale/fremde Einträge werden bereinigt und Persistenz-Löschfehler brechen den Reset ab. Realer Browser/IndexedDB-Test offen. |
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
| OneDrive | 🟡 | PR #73: Upload verschlüsselt den synchronisierten aktiven Klassenstand und zählt als erledigte Sicherung für die Wochen-Erinnerung. Der lokale Werksreset behauptet nicht mehr, Cloud-Backups zu löschen; TLS/MFA/Conditional-Access werden nur als deployment-/tenantabhängig beschrieben. OAuth-State/Cookiebindung und Popup-Origin/Source bleiben automatisiert abgesichert; Live-OAuth/Backup-Abnahme auf Staging offen. |
| Freiwillige Unterstützung / PayPal | 🟡 | Herz öffnet einen Klassio-Dialog statt direkt PayPal. Einmalige Unterstützung nutzt den bestehenden PayPal.Me-Link; monatliche und jährliche wiederkehrende Links sind serverseitig separat konfigurierbar. Einstellungen zeigen eine öffentliche Dankesliste nur mit ausdrücklicher Zustimmung; Beträge, E-Mail-Adressen und Zahlungsdaten werden nicht veröffentlicht. Reale PayPal-Monats-/Jahreslinks und Opt-in-Liste auf Staging noch konfigurieren. |

## Deployment

| Bereich | Status | Nachweis / Rest |
|---|---:|---|
| World4You Runtime grundsätzlich | ✅ | Linux-vServer läuft produktiv mit Nginx/systemd/HTTPS. `klassio.at` bedient den eingefrorenen Reconciliation-Stand; interne App-Ports sind nicht öffentlich freigegeben. |
| World4You Release-Paket | ✅ | CI-Artefakt wird aus exakt dem geprüften Reconciliation-Commit erzeugt und trägt Branch-/Commitmarker. |
| World4You Abschluss-Staging | 🟡 | `staging.klassio.at` ist als getrennte Preview-Umgebung eingerichtet. Der Server prüft den GitHub-Preview-Branch automatisch mit Tests und Build und aktiviert nur erfolgreiche Releases; reale UX-/SMTP-/Browser-Abnahme läuft. |
| Finaler Browser-Test | 🔴 | Nach Deployment: Login/SMTP, Tresor/Recovery, Kernnavigation, Cockpit inkl. Maus/Touch/Stift, Klasse/Dossier, Planung, Gradebook, Diagnostik, Druck/PDF/PPTX, echte Altbackup-Migration, Backup/Restore, PWA/Offline und responsive Viewports. Der grüne automatisierte Chrome-Lauf aus Draft-PR #79 ist nur Vorprüfung. |
| Merge nach `main` | 🔴 | Erst nach grünem Staging-/Browser-Test PR #5 mergen. |
