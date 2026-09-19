# KLASSIO – Lehrercockpit: Bestandsaufnahme und Umbauvertrag

Stand: 2026-09-19. Ausgangspunkt: GitHub `main` `05bf54bae5abbfee1d43ce96431a030a42bcc0ed`. Dieses Dokument beschreibt den **in Arbeit befindlichen Feature-Branch**, keine Freigabe und keinen produktiven Stand. Die ZIP ist ausdrücklich nicht Arbeitsgrundlage.

## Nachgeprüfte Architektur

- Produktive Oberfläche: `src/components/Unterrichtsmodus.tsx` (18.426 Zeilen am Ausgangsstand); `Cockpit.tsx` ist ein Legacy-Kompatibilitätsplatzhalter.
- Die weiße Bühne rendert `BoardTextEditor` und bis zu 108 Cockpit-Widgettypen. Ihre Textformatierungsleiste liegt bei aktiviertem Textwerkzeug **absolut über der Bühne**; ein gemeinsamer Auswahl-/Stift-/Textmodus ist dort noch nicht integriert.
- `BoardInk.tsx` bot am Ausgangsstand vektorielle Stifteingabe, war aber nicht in die produktive Fläche eingebunden. Auf dem Branch zeichnet nun eine kontrollierte `BoardInk`-Ebene direkt über der bestehenden weißen HTML-Textbühne. Die schmale gemeinsame Auswählen-/Stift-/Radierer-/Text-/Undo-/Redo-Leiste liegt außerhalb der Bühne; Ink wird klassenbezogen unter `boardSettings.cockpitInkByClass` gespeichert. Die alte `Tafel` bleibt separat verfügbar. Touchbedienung, Text-/Ink-Zwischenablagen und Backups müssen im echten Browser überprüft werden.
- Cockpit-Werkzeuge stehen teils in `Unterrichtsmodus.tsx`, teils in `WidgetConfig.tsx`, `CockpitWidgetContents.tsx` und eigenständigen Widgets. Dashboard-Zonen in `DisplaySettings.tsx` sind **andere** Widgets und dürfen nicht entfernt werden.
- `DEFAULT_COCKPIT_LAYOUT`, die beiden `allAvailableWidgets`-Listen (Zähler und Picker) und der Layout-Sanitizer sind bislang auf 108 Typen ausgelegt. Die alte Testdatei `cockpitFinalRequirements.test.ts` **fordert explizit 108**; diese Prüfung muss mit dem neuen Picker-Vertrag angepasst werden, bevor genau 20 live geschaltet werden.
- Das Layout wird beim Mount aus `app.cockpitLayout` in lokalen State übernommen. Klassenwechsel, Hydration und alte Layout-Slots benötigen gesonderte Wiedereinlese-/Rückschreibtests, bevor an der State-Synchronisierung geändert wird.
- Mitarbeitspunkte sind in `app.mitarbeitLogs`, Anwesenheit in `app.anwesenheit`; Klassen-/Widget-Zuordnungen und `boardSettings.cockpitTextByClass` dürfen nicht im Rahmen eines reinen UI-Umbaus umgeschrieben oder gelöscht werden.
- **Nachgewiesene Widerspruchsursache:** `KidAttendanceWidget` nahm 12 Demo-Kinder aus `DEFAULT_MOCK_STUDENTS`, wenn `app.schueler` leer war, während `StudentListWidgetContent` echte `app.schueler` nutzte. Auch `getPresentStudents` lieferte im Leerfall dieselben Demokinder für Gruppen. Auf diesem Branch sind diese Fallbacks entfernt; Fehlende Klassenauswahl und tatsächlich leere Klasse erscheinen im Check-in mit unterschiedlichem Hinweis; der globale Ladezustand wird bereits vor Einhängen des Cockpit im AppProvider angezeigt. Der tatsächliche Grund für **leere reale Klassendaten im konkreten Screenshot** bleibt ohne reproduzierte Anmeldung/Hydration ungeklärt.
- Die bisherige `StudentListWidgetContent`-Komponente zeigte Verhaltenssymbole, Notiz-Indikatoren und negative Punkt-Aktionen öffentlich. Auf diesem Branch nutzen **sowohl das `studentlist`-Widget als auch die rechte Cockpit-Schülerliste** stattdessen die isolierte `PublicStudentListWidget`: eindeutige kurze Namen, nur positive Punkte, große Touch-Plusfläche und gezieltes Undo nach bewusstem Plus. Die bisherigen, potenziell vertraulichen Verhaltens-/Notizinhalte bleiben im AppState und in separaten Lehrkraft-Modulen erhalten. Die vertrauliche alte UI-Komponente bleibt unaufgerufen im Quellcode; ein Browser-Sicherheits- und Persistenztest steht noch aus.
- Geburtstage werden bereits aus `unterrichtsmodus_geburtstagskinder` und `checkIsAutoBirthday` erkannt; Wochenendverschiebung nutzt `dashboard_settings_v7`. Das steuert u. a. den Klassenhaustier-Effekt. Der Branch ergänzt `BirthdayCelebration` als bewusst über die Cockpit-Bedienung gestarteten separaten Modus, der nur Vornamen bzw. eindeutige Anzeigenamen und eine optionale Grußnachricht zeigt. Geburtstagskandidaten werden weiterhin nach der bisherigen Wochenendregel erkannt; eine automatische Feieransicht gibt es nicht.
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
2. Bereits angebundene Bühne im echten Browser mit dupliziertem Bildschirm, Maus, Finger und Stift prüfen: gemeinsame Leiste liegt außerhalb der weißen Fläche und steuert Auswählen, Stift, Radierer, Text, Undo, Redo. Alte HTML-Tafeltexte und neue Vektor-Tinte erhalten getrennte, klassenbezogene Speicherpfade; tatsächliche Schreib-/Zeichenfunktion und Format-/Undo-Verhalten sind ohne Touch-/Browser-Test **noch nicht freigegeben**.
3. Öffentlichen Schülerlisten-View im Browser und auf Touchboard mit dupliziertem Bildschirm prüfen: isolierte neue Liste, positive Punkte und Touch-Plus mit Undo sind im Code angebunden; Sichtbarkeits-, Klassenwechsel- und Persistenzprüfung sind noch offen.
4. Nach überprüfter Quellfunktion-Zusammenführung den **Picker auf genau 20** umstellen. Bereits gespeicherte Typen zunächst read-only oder über bewusste Legacy-Bearbeitung erhalten; keine automatische irreversible Umwandlung alter `settings` und keine Entfernung des Renderers.
5. Bereits eingebauten, manuell aktivierbaren Geburtstagsmodus mit echten Klassendaten und Wochenendregeln prüfen. Er darf keine Geburtsdaten oder Altersangaben öffentlich anzeigen und muss vollständig schließbar sein.
6. Test-Vertrag `cockpitFinalRequirements.test.ts` passend zum 20er-Picker umstellen (108 **Legacy**-Typen weiterhin laden können). TypeScript, alle Tests, Build, PWA, Backup-Roundtrips, Klassenwechsel, Smartboard-Touch, duplizierter Laptopbildschirm und Browser-E2E tatsächlich ausführen.
7. Erst nach sichtbarer, bedienbarer Vorschau und dokumentierten grünen Checks PR zur Freigabe vorlegen. **Kein Merge nach main und kein Deployment ohne gesonderte Freigabe.**

## Teststatus dieses Zwischenstands

Regressionstests für leere Klassen, 20er-Zielkatalog, öffentliche Schülerliste und manuellen Geburtstagsmodus sind eingecheckt. Der GitHub-Feature-Workflow führt TypeScript, Tests und Build aus; das Ergebnis für den aktuellen HEAD muss ausdrücklich gesondert geprüft und etwaige Fehler behoben werden. Browser-Live-Audit, echter Smartboard-Test, Server-SSH und eine bedienbare Staging-Vorschau sind noch nicht erfolgt.
