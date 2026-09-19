# KLASSIO – Lehrercockpit: Bestandsaufnahme und Umbauvertrag

Stand: 2026-09-19. Ausgangspunkt: GitHub `main` `05bf54bae5abbfee1d43ce96431a030a42bcc0ed`. Dieses Dokument beschreibt den **in Arbeit befindlichen Feature-Branch**, keine Freigabe und keinen produktiven Stand. Die ZIP ist ausdrücklich nicht Arbeitsgrundlage.

## Nachgeprüfte Architektur

- Produktive Oberfläche: `src/components/Unterrichtsmodus.tsx` (18.426 Zeilen am Ausgangsstand); `Cockpit.tsx` ist ein Legacy-Kompatibilitätsplatzhalter.
- Die weiße Bühne rendert `BoardTextEditor` und bis zu 108 Cockpit-Widgettypen. Ihre Textformatierungsleiste liegt bei aktiviertem Textwerkzeug **absolut über der Bühne**; ein gemeinsamer Auswahl-/Stift-/Textmodus ist dort noch nicht integriert.
- `BoardInk.tsx` bietet bereits vektorielle Stifteingabe, ist aber im produktiven `Unterrichtsmodus.tsx` am Ausgangsstand nicht eingebunden. `Tafel` wird separat als Vollbild-Overlay geöffnet. Zeichnung und bestehender HTML-Tafeltext müssen getrennt erhalten und erst danach vereinheitlicht werden.
- Cockpit-Werkzeuge stehen teils in `Unterrichtsmodus.tsx`, teils in `WidgetConfig.tsx`, `CockpitWidgetContents.tsx` und eigenständigen Widgets. Dashboard-Zonen in `DisplaySettings.tsx` sind **andere** Widgets und dürfen nicht entfernt werden.
- `DEFAULT_COCKPIT_LAYOUT`, die beiden `allAvailableWidgets`-Listen (Zähler und Picker) und der Layout-Sanitizer sind bislang auf 108 Typen ausgelegt. Die alte Testdatei `cockpitFinalRequirements.test.ts` **fordert explizit 108**; diese Prüfung muss mit dem neuen Picker-Vertrag angepasst werden, bevor genau 20 live geschaltet werden.
- Das Layout wird beim Mount aus `app.cockpitLayout` in lokalen State übernommen. Klassenwechsel, Hydration und alte Layout-Slots benötigen gesonderte Wiedereinlese-/Rückschreibtests, bevor an der State-Synchronisierung geändert wird.
- Mitarbeitspunkte sind in `app.mitarbeitLogs`, Anwesenheit in `app.anwesenheit`; Klassen-/Widget-Zuordnungen und `boardSettings.cockpitTextByClass` dürfen nicht im Rahmen eines reinen UI-Umbaus umgeschrieben oder gelöscht werden.
- **Nachgewiesene Widerspruchsursache:** `KidAttendanceWidget` nahm 12 Demo-Kinder aus `DEFAULT_MOCK_STUDENTS`, wenn `app.schueler` leer war, während `StudentListWidgetContent` echte `app.schueler` nutzte. Auch `getPresentStudents` lieferte im Leerfall dieselben Demokinder für Gruppen. Auf diesem Branch sind diese Fallbacks entfernt; Ladezustand, fehlende Klassenauswahl und tatsächlich leere Klasse erscheinen im Check-in mit unterschiedlichem Hinweis. Der tatsächliche Grund für **leere reale Klassendaten im konkreten Screenshot** bleibt ohne reproduzierte Anmeldung/Hydration ungeklärt.
- `StudentListWidgetContent` stellt derzeit interne Verhaltenssymbole, Notiz-Indikatoren und negative Punkt-Aktionen auf der Bühne dar. Das ist mit dem Standard „duplizierter Bildschirm“ nicht vereinbar und muss vor Freigabe geändert werden. Plus-Logik und rückgängig machbare Korrekturen sind zu erhalten.
- Geburtstage werden bereits aus `unterrichtsmodus_geburtstagskinder` und `checkIsAutoBirthday` erkannt; Wochenendverschiebung nutzt `dashboard_settings_v7`. Das steuert u. a. den Klassenhaustier-Effekt. Ein separater, bewusst zu aktivierender Geburtstagsmodus auf der weißen Bühne ist **noch nicht vorhanden**.
- Datumsinkonsistenz: `studentSelectionUtils` verwendete UTC für den Tag, `kidAttendanceAlgorithm.getTodayIsoDate` lokale Kalenderdaten. Der erste Aufruf wurde auf den lokalen Helfer umgestellt; andere Cockpit-Stellen, darunter die öffentliche Schülerliste und Pluspunkte, müssen vor Abschluss ebenfalls vereinheitlicht werden.

## Zielkatalog und Legacy-Zuordnung

Die verbindliche Auswahl steht in `src/components/cockpit/plannedCockpitCatalog.ts`: genau **20** Einstiege. `sources` verzeichnet vorhandene Typen, deren Funktion und gespeicherte Einstellungen später fachlich in dem Einstieg aufgehen **könnten**. Es ist noch **keine** automatische Konversion. Zuordnungen mit mehreren Typen erfordern UI-/Datenprüfung vor einer Zusammenführung.

| Neuer Einstieg | Bisherige Quelltypen |
| --- | --- |
| Ich bin da! | kidattendance |
| Schülerliste & Mitarbeit | studentlist |
| Gruppen bilden | groups |
| Zufallsauswahl | randomname, wheel, faircall |
| Zeit | timer, stopwatch, clock |
| Tagesablauf | timeline, phases |
| Arbeitsauftrag | instruction, todo |
| Klassendienste | dienste |
| Lautstärke & Arbeitsampel | trafficlight, noisemeter, noisescales |
| Klassenziel | klassenglas, classtarget, thermometer |
| Würfel | dice |
| Bild & Material | image |
| QR-Code & Link | qrcode, links |
| Lernwörter | vocabulary |
| Wörter & Sätze | wortsatzwerkstatt, scrambler, wordscramble, sentencebuilding, wordbuilder, compoundsplit, abcorder |
| Quiz & Rätsel | riddle, aiquiz – KI darf nicht Pflicht sein |
| Zahlenraum | zahlenraum, anschauung, numberline |
| Kopfrechnen | kopfrechnen, multitrainer, mathchain |
| Brüche | fractionvisualizer, fractions, fractioncake, fractiongrid |
| Musik & Klänge | sounds, soundmachine, piano, rhythm, tonetrainer |

Es sind **49** derzeitige Typ-IDs auf 20 Einstiegskategorien vorgemerkt. Die verbleibenden **59** Typen sind zunächst `Legacy / nicht im regulären Zielkatalog`, **nicht** `löschen`. Darunter `drawing` (Schrift/Stift künftig Bühne), `pet`, `weather`, Lernspiele, Spezialanschauungen und weitere Altwerkzeuge. Beim Laden älterer JSON-Backups/Vorlagen muss auch dieser Altbestand sichtbar und exportierbar bleiben, bevor eine bewusste Archivierungs-/Ersatzfunktion existiert. Eine unbekannte Widget-ID darf nicht unbemerkt durch den Sanitizer verschwinden.

## Offene PRs und Änderungskonflikte

- PR #148: Canva-Hintergrund, Bild-/Materialimport, Änderungen an `Unterrichtsmodus.tsx`, `src/types.ts` und Canva-Dateien. Nicht ungeprüft integrieren; Ziel-Bildwidget und weißer Standard müssen mit dieser PR zusammenpassen.
- PRs #87 und #89: frühere Änderungen an `Unterrichtsmodus.tsx` und Widget-/Layout-Bedienung. Vor Übernahme einzeln fachlich vergleichen statt zu mergen.
- PR #151 betrifft u. a. Cockpit-Autostart, aber andere Module; #149, #150, #152–#158 und ältere PRs behandeln fachlich andere Bereiche und sind kein Bestandteil dieses Cockpit-Branches.
- PR #83 enthält Staging-Preview-Infrastruktur, ist noch nicht in `main`; ein funktionierender, erreichbarer Cockpit-Vorschau-Link ist hier **nicht** nachgewiesen.

## Verbindliche weitere Schritte vor Freigabe

1. Lade-/Klassenauswahlzustände in der echten App mit leerer, echter und gewechselter Klasse reproduzieren; fehlende Namensdaten ggf. in Klasse/Hydration korrigieren. Keine echten Schülerdaten in Screenshots, Logs, Issues oder Tests.
2. Bühne als ein Fenster mit dauerhaft weißem Hintergrund und **einer Leiste außerhalb** der Bühne aufbauen: Auswählen, Stift, Radierer, Text, Undo, Redo. Vorhandenes HTML/Textformat und Vektor-Tinte verlustfrei nebeneinander unterstützen; bestehende Inhalte nicht per Neuanlage überschreiben.
3. Öffentlichen Schülerlisten-View: nur eindeutige Vornamen und positive Punkte; private Status-/Notizinformationen entfernen; große Touchflächen; bewusstes Plus und dediziertes Undo ohne versehentliche Minuspunkte. Anwesenheit und Befinden getrennt, Befinden nicht allgemein öffentlich.
4. Nach überprüfter Quellfunktion-Zusammenführung den **Picker auf genau 20** umstellen. Bereits gespeicherte Typen zunächst read-only oder über bewusste Legacy-Bearbeitung erhalten; keine automatische irreversible Umwandlung alter `settings` und keine Entfernung des Renderers.
5. Geburtstagsmodus separat und manuell aktivieren; Wochenendregeln, keine Geburtsdaten/Altersangabe öffentlich.
6. Test-Vertrag `cockpitFinalRequirements.test.ts` passend zum 20er-Picker umstellen (108 **Legacy**-Typen weiterhin laden können). TypeScript, alle Tests, Build, PWA, Backup-Roundtrips, Klassenwechsel, Smartboard-Touch, duplizierter Laptopbildschirm und Browser-E2E tatsächlich ausführen.
7. Erst nach sichtbarer, bedienbarer Vorschau und dokumentierten grünen Checks PR zur Freigabe vorlegen. **Kein Merge nach main und kein Deployment ohne gesonderte Freigabe.**

## Teststatus dieses Zwischenstands

Es wurden Regressionstests für leere reale Klassen und den geplanten 20er-Katalog **geschrieben**, aber in dieser Bearbeitung noch **nicht lokal ausgeführt**. Der GitHub-Feature-Workflow kann nach Push/PR TypeScript, Testlauf und Build prüfen; dessen Ergebnis ist gesondert abzulesen. Ein Browser-Live-Audit, echter Smartboard-Test, Server-SSH und ein Staging-Test sind in dieser Bearbeitung nicht erfolgt.
