# KLASSIO – UX-Querschnittsprüfung der integrierten Hauptmodule
Stand: 17. November 2026 · Projekt: KLASSIO · Produktionsbasis bei Prüfungsbeginn: `18331d8a08ce4831266a081cf32b123c957321fe`

## Abgrenzung
Diese Runde verbindet **Quellcodeprüfung zentraler UI-Bausteine**, gezielte Oberflächenkorrekturen und die bestehende GitHub-Testlandschaft. Sie ist kein behaupteter vollständiger Handgerätetest aller Seiten und kein Ersatz für die praktische Freigabe mit Lehrpersonen.

## Nachweis der bisherigen Module
| Bereich | Integrierte Arbeit | Weiterhin relevant |
|---|---|---|
| Heute / Hauptnavigation | `DashboardSimpleOverview`, `Sidebar`, `GlobalActions` inspiziert; vorhandene semantische Navigation und Statusanzeigen geprüft | Echte Smartphone- und Surface-Sichtprüfung |
| Klasse / Teamteaching | Einfache Teamhilfe PR #663; Schülerdossier PR #666 | Zwei echte Schulaccounts, Klasse und beide Änderungsrichtungen testen |
| Planung | Wochen-Check, Schnellplanung und Tageskarten PR #667 | Tage, Stunden, Kinderfreigabe und gespeicherte Aufgaben in der realen Klasse prüfen |
| Leistungen / Notenmappe | Werkzeugmenü und mobile Kopfzeile PR #664 | Fachauswahl, Punkte-/Notenanzeige und KEL-Berichte mit Beispieldaten prüfen |
| Druckzentrum | Frühere Druck- und A4-Browserprüfungen, KEL-Elternblatt | A4 auf tatsächlichem Drucker, Unterschriftsfelder, Datenfreigabe |
| Einstellungen | Frühere Navigations- und Touchkorrekturen | Schnelle Änderungen, automatische Speicherung und Geräteabgleich |

## In dieser Runde nachgebessert
- `ui/Button`: kompakte Buttons auf schmalen Bildschirmen mindestens 44 px statt 34 px; Desktop-Kompaktgröße bleibt.
- `ui/IconButton`: auch kleine Symbolaktionen haben real 44 × 44 px statt nur behaupteter äußerer Touch-Marge.
- `ui/Input`, `ui/Select`, `ui/Textarea`: mobile Eingaben sind lesbarer (16 px Schrift) und kompakte Felder auf mobilen Geräten mindestens 44 px hoch; Desktop-Kompaktoption bleibt.
- `ui/SegmentedControl`: aktive Tabs haben einen tastaturbedienbaren Fokus; Links/Rechts, Oben/Unten und Pos1/Ende wählen unter den verfügbaren, nicht deaktivierten Optionen. Touchflächen mobil mindestens 44 px.
- `ui/Chip`: interaktive und löschbare Chips haben mobile Touchflächen und sichtbaren Tastaturfokus.
- `EmptyState`: alle Nutzeraktionen bleiben erhalten; die gemeinsame leere Ansicht nutzt thematische Farben, ruhige Abstände und eine lesbare 44px-Primäraktion statt eines 10px-Buttons mit dekorativer Daueranimation.

Keiner dieser Bausteine verändert gespeicherte Noten, Beobachtungen, Termine, Klassen, Teamteaching-Nachrichten oder Daten-Schemata. Kompakte Desktop-Steuerelemente können in dichten Tabellen kleiner als 44 px bleiben; dies ist keine pauschale Barrierefreiheitszertifizierung.

## Automatisierte Abnahme
- `src/lib/crossModuleDesignFinalAudit.test.ts` prüft Shared-Komponenten auf Lesbarkeit, semantische Zustände, Tastaturwege, Beschriftung und Touchgrößen.
- `Feature Validation`: TypeScript, Tests und Produktions-Build; zusätzlich die relevanten Browser-Workflows (inkl. Teamteaching, Zwei-Geräte-Sync, Planung, Schule) bei der Pull-Request-Abnahme.
- Produktivnachweis vor dieser Änderung: GitHub-Workflow **KLASSIO Production Deploy #44044243359**, Commit `18331d8`, mit erfolgreichem Schritt **Transfer and deploy to World4You** und **Check public production health** (prüft exakte `/api/release`-Commit-Kennung). Der anschließende **Production Node Runtime Audit #44044795053** war ebenfalls erfolgreich.
- Ein **späterer** Design-Commit ist erst nach seinem eigenen erfolgreichen Main-Produktionslauf als veröffentlicht zu bezeichnen.

## Noch offen, bevor KLASSIO 2.0 als praxistauglich freigegeben gilt
1. **Lehrpersonen-Abnahme:** Zwei getrennte, berechtigte Schulmail-Konten müssen dieselbe geteilte Klasse nutzen; Test in beide Richtungen, inklusive Offline-Wiederaufnahme und ohne echte personenbezogene Schülerdaten.
2. **Echte Geräte:** Android (schmal), Surface Touch/Tastatur, bei Bedarf iOS. Keine abgeschnittene Hauptaktion, keine versteckte Speichermeldung, sichtbarer Fokus.
3. **Druck:** KEL-Elternblatt aus dem wirklichen Browser und auf dem echten Drucker, genügend Platz für Unterschriften, keine ungefragt ausgegebenen Beobachtungen.
4. **Produktiv-Release:** Nach dem Merge des neuen Querschnitts-Pull-Requests `main`, CI, World4You-Deploy, `/api/health` und exakten `/api/release`-Stand erneut vergleichen.
5. **Stabilisierung:** Nur bei nachgewiesenen Fehlern korrigieren, keine neuen großen Module oder Cockpit-Umbauten vor dieser Freigabe.

Zur praktischen Abnahme: `docs/ux/KLASSIO_PRAKTISCHE_ABNAHME_2026-11-16.md`.
