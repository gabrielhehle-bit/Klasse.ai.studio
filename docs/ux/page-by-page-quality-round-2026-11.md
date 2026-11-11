# KLASSIO – Qualitätsrunde: Seite für Seite

Stand: 11. November 2026 · bestehendes Projekt KLASSIO (keine neue App)

## Ziel und Arbeitsweise

Jede Seite wird nach demselben Raster geprüft. Ein Arbeitspaket ist erst **fertig**, wenn es in der echten KLASSIO-Komponente integriert, die relevanten automatischen Prüfungen bestanden hat und der produktive Stand bei Veröffentlichung kontrolliert wurde. Änderungen zuerst in einem eigenständigen Branch/Pull Request; keine ungetesteten globalen Neu-Designs.

**Prüfkriterien, bei jeder Seite:**

1. **Aufgabe zuerst:** Welche 1–2 Handlungen erledigt eine Lehrperson hier häufig? Diese sind ohne Suche erreichbar.
2. **Informationshierarchie:** Aufgeräumte Kopfzeile, wenige gleichzeitige Aktionen, nicht mehrere redundante Symbolleisten.
3. **Bedienbarkeit:** Desktop und schmale Smartphones (mindestens 360 px); Tastatur, sinnvolle Fokusreihenfolge, verständliche Beschriftungen und Touch-Ziele um 44 px.
4. **Datenintegrität:** Keine Löschung, Migration oder Neuinterpretation gespeicherter Schüler-, Klassen-, Noten-, Teamteaching- und Planungsdaten durch UX-Änderungen.
5. **Konsistenz:** KLASSIO-Farbvariablen, Abstände, Typografie, Navigation, Filter, Leerzustände, Feedback und Druckansichten einheitlich.
6. **Nachweis:** TypeScript, Tests, Produktionsbuild, relevante Browser-E2E und bei Livegang Pre-Deployment Audit, geräteübergreifende Synchronisierung und Produktions-Healthcheck.

## Reihenfolge – bestehende Navigationsbereiche

| Runde | Seite / Bereich | Schwerpunkt | Stand |
| --- | --- | --- | --- |
| 01 | **Heute** (DashboardSimpleOverview) | Tagesfokus, Unterricht, Anwesenheit und offene Aufgaben ruhiger und handlungsorientiert | **In Bearbeitung** – UX-Branch |
| 02 | Klasse → Klassenübersicht / Klassenliste | Kinder schnell finden, Tagesaktionen, verlässliche Statusanzeigen | Geplant |
| 03 | Klasse → Schülerdossier / Klassendossier | Weniger Klickwege, Nachweise/Teilbereiche und Gesprächsvorbereitung | Geplant |
| 04 | Klasse → Anwesenheit / Sitzplan / Teamteaching | Schnelles Erfassen, mobile Bedienung, konfliktfreie Synchronisierung | Geplant |
| 05 | Notizen | Aufgaben, Notizen und Verhalten klar trennen; nichts versehentlich verlieren | Geplant |
| 06 | Planung → Wochenplan / Wochen-Check | Heute und Woche auf einen Blick; schneller Arbeitsfluss | Geplant |
| 07 | Planung → Jahresplanung / Materialbibliothek / Vertretung | Suche, Wiederverwendung und Export | Geplant |
| 08 | Leistungen → Übersicht und **Notenmappe** | Bestehende November-Verbesserungen kontrollieren; offene UI-Feinheiten | Bereits verbessert; Nachkontrolle |
| 09 | Leistungen → Diagnostik / Lernziele & Portfolio | Aussagekräftige Förderentscheidungen, weniger doppelte Eingaben | Geplant |
| 10 | Leistungen → KEL-Gespräche / verbale Beurteilung | Verständliche kindbezogene Darstellung, Druck/Präsentation und Freigaben | Geplant |
| 11 | Lehrercockpit | Smartboard-Bedienung, Widgets, stabile Anzeige im Unterricht | Geplant |
| 12 | Tools / Textanalyse / KI-Helfer / Lehrerzimmer | Werkzeuge auffindbar, klare Ergebnisse und Berechtigungen | Geplant |
| 13 | Druckzentrum / Datensicherung / Profil / Einstellungen | Einheitliche Einstellungen, Datensicherheit und Rückmeldung | Geplant |
| 14 | Querschnittsprüfung | Navigation, Ladezustände, Mobile, Kontrast, Berechtigungen und Regressions-Smoke | Geplant |

Zusätzliche Seiten aus dem Menü (Klassenkasse, Elternfotos, Lehrmittel, Wir-Gefühl, Jahresabschluss, Archiv sowie Sek-I-spezifische Module) werden in ihrer jeweiligen Runde mitgeprüft.

## Runde 01: Heute – konkrete Abnahme

- Die bestehende Reihenfolge bleibt **Profil & Hauptaktion → Unterricht → Wichtig und offen (mit Anwesenheit) → Schnellzugriff → Widgets**.
- Weniger dekorative Effekte; ruhige KLASSIO-Oberflächen, geringere Abstände, klare Handlungsaufforderung.
- Keine Änderung an Terminlogik, Anwesenheitsprüfung, persönlichen Aufgaben, Datenschutz-Anzeige oder `onNavigate`-Zielen.
- Mobile Unterrichtszeile nutzt schmalere Zeitspalte und umbruchfähige Fächer/Themen.
- Bestehenden PR #562 als Designreferenz verwenden, **nicht** ungeprüft in den aktuellen Hauptzweig mergen.
- Erfolgreiche Prüfungen erforderlich, bevor Veröffentlichungsstatus „live“ genannt wird.

## Ergebnisprotokoll

| Datum | Bereich | Änderung | Nachweis |
| --- | --- | --- | --- |
| 2026-11-11 | Notenmappe | Kompaktere Tabellenführung und sichtbare Noten-/Punkteeingabe | PR #567, Produktionslauf 43035359828 erfolgreich |
| 2026-11-11 | Heute | Ruhige kompakte Oberfläche und mobile Lesbarkeit auf aktuellem `main` vorbereitet | Aktueller UX-Pull-Request; Prüfergebnis ergänzen |

**Kein separater Datenspeicher oder neues KLASSIO-Projekt.** Dies ist der Fortschrittsplan im bestehenden Repository.
