# KLASSIO – Cockpit-Widgets: Größe und ohne innere Scrollleisten

Stand: 2026-09-20. GitHub main bei Beginn: `b40f56f64ed9f8aeff57cb8a853ff2bf4a83042b`. Diese erste Umbaustufe basiert technisch auf dem noch offenen **Draft-PR #185** (`56bfbade5235c96a08d675eb68250e73bf47dc9b`) und ist selbst **nicht** in main oder Produktion. Die alte ZIP ist keine Arbeitsgrundlage.

## Verbindlicher Anzeigevertrag

- Die **weiße Cockpit-Bühne** bleibt frei nutzbar zum Schreiben, Zeichnen und Platzieren beliebiger Widgets; nicht die Bühne durch ein neues festes Dashboard ersetzen.
- Kein Widget darf eine **innere vertikale oder horizontale Scrollleiste** zur normalen Unterrichtsbedienung voraussetzen. Das bloße Ersetzen von `overflow-y-auto` durch `overflow-hidden` zählt nicht als Lösung: alle Inhalte und Aktionen müssen durch adaptive Anordnung, echte Seiten/Ansichtswechsel oder eine ausdrücklich angebotene Vergrößerung erreichbar bleiben.
- Inhaltsgröße schlägt willkürliche Prozentwerte: Mindestbreite und -höhe je Widgettyp; mindestens 44 px Touch-Ziel für Hauptaktionen, kein abgeschnittener Name/Arbeitsauftrag. Kleine Widgetform = reduzierte **Zusammenfassung**, große Widgetform = vollständige Darstellung; kein implizites Verstecken einzelner Kinder oder Aufgaben.
- Listen für 25 Kinder: klare, vollständig lesbare Kurznamen, sichtbarer Status/Plus-Aktion für **jedes** Kind auf derselben Seite, sobald eine entsprechende Tafelfläche tatsächlich vorhanden ist. Wenn das physikalisch nicht passt, sichtbarer Hinweis mit dauerhaft speicherbarer Vergrößerung; niemals stille Ausblendung, private Schülermerkmale, automatische Demo-Kinder oder heimliche Scrollbereiche.
- Einstellungen dürfen in einem eigens geöffneten Dialog/Ansichtsmodus untergebracht werden; der **normale Widget-Inhalt** soll ohne Scrollen bedienbar sein. Persistierte Widget-IDs, Positionen, Einstellungen, Klassenbindung, JSON-Backup und Rücksicherung bleiben erhalten.
- Größenprüfung für 1366×768, 1920×1080, 4K mit 150 % Skalierung sowie schmale Fenster, im Chrome/Edge-Browser und am Touch-Smartboard. Auch 1, 17, 25 und 30 synthetische Kinder, lange/doppelte Namen, lange Aufgabentexte, aktive Bearbeitung, Klassenwechsel, Wiederladen und Projektions-/Datenschutzansicht prüfen.

## Tatsächlich im Code nachgesehen (kein abgeschlossener Live-Browsertest)

| Widget/Bereich | Main / PR #185 am 20.09. | Für endgültige Freigabe noch erforderlich |
| --- | --- | --- |
| Gemeinsamer Rahmen `CockpitWidget.tsx` | `overflow-auto no-scrollbar` am ganzen Kind; vorhandener Test fordert explizit Scrollen statt Abschneiden. Prozentgrößen + minimale Pixelgrößen, aber keine automatische Inhaltsmessung. | Pro Typ inhaltssicheres Layout, Rahmen-Scrollfallback erst entfernen, wenn Inhalte nachweislich ohne Scrollen navigierbar sind. |
| `Ich bin da!` (`KidAttendanceWidget`) | main: interne `overflow-y-auto`-Listen. PR #185: 25er-Dense-Grid und Vergrößerungsaktion, Änderungen noch nicht gemergt; Konfiguration/Overlays scrollen teils weiter. | Tafelflächen, 25er-Test, lange Namen, Rechte und Haupt-/Overlay-Modus visuell prüfen. |
| `Unsere Pluspunkte` (`PublicStudentListWidget`) | main: innere scrollbare Zeilenliste. PR #185: Raster **nur wenn** rechnerisch ausreichend Platz, sonst wieder scrollbare Liste. | Aus kleinen Ansichten in eine nicht-scrollende Übersicht/Vergrößerung überleiten; alle Namen und +1/Undo prüfen. |
| `Arbeitsphase / To-do` (`TodoWidget`) | main/PR #185: `overflow-y-auto` in der Aufgabenliste, 280×200 px Mindestgröße. | **Diese Stufe:** auf echte Seiten umgestellt, 340×360 px Minimum, 25 Aufgaben per Seitennavigation erreichbar. Sichtprüfung sehr langer Texte und gleichzeitiger Vorlage/Bestätigung ausstehend. |
| `Gruppen` | main/PR #185: Gruppen-/Mitgliederliste `overflow-y-auto`, zusätzliche Einstellungslisten scrollen. | Gruppenkarten adaptiv nach Personenzahl, Gruppenweise Umschalten statt interner Liste; 25er- und Constraint-Tests. |
| `Klassendienste` | main/PR #185: ausdrücklich `dienste-content-scrollable`; interne Grid-/Auswahllisten scrollen. | Alle Dienste in gekachelter Ansicht oder paginiert mit vollständiger Zuweisung, auch bei 25 Kindern. |
| `Timer` | main/PR #185: mehrere Einstellungs-/Bestätigungs-Overlays mit `overflow-y-auto`. | Laufende Zeit vollständig ohne Scrollen; Zusatzfunktionen in expliziter eigener Ansicht. |
| `Arbeitsauftrag` | main/PR #185: Hauptinhalt `overflow-y-auto` in mehreren Darstellungen. | Auftragstext skalieren/aufteilen statt wegscrollen; kein Abschneiden bei langen Arbeitsaufträgen. |
| `Zufallsauswahl` | main/PR #185: Namensauswahlliste `overflow-y-auto`. | Hauptauswahl ohne Scrollen, optionale Vollansicht für 25er-Konfiguration. |
| `Rechner` | main/PR #185: Ergebnis-/Historienbereich `overflow-y-auto`. | Tasten und Anzeige ohne Scrollen; Historie als separater Verlauf. |

**Wichtig:** Nur diese Beispiele wurden im Quellcode gezielt auf Scrollklassen geprüft. Die übrigen gespeicherten Legacy-Typen sind damit weder geprüft noch freigegeben. Es gibt laut Cockpit-Bestandsaufnahme bis zu 108 Legacy-Typen und einen geplanten 20er-Zielkatalog; dieser wurde **nicht automatisch umgestellt oder gelöscht**.

## Erste Umbaustufe / offene Abnahme

Diese Branch-Stufe ändert ausschließlich To-do-Darstellung, ihre Mindestgröße und eigenständige Regressionstests. Seitenzahl und aktuelle Seite sind **rein lokal**; die gespeicherte Aufgabensammlung bleibt unverändert. Das ist **keine** vollständige Widget-Neuerstellung und darf nicht als alle-Widgets-no-scroll ausgegeben werden.

Nächste Überprüfung: Browserrender des To-do für 0/1/8/25 Aufgaben bei Minimal-/Standard-/Maximalgröße, 120+-Zeichen-Text, Bearbeitungsmodus, Vorlagen und Löschen/Undo; explizit auf `scrollHeight > clientHeight`, verdeckte Buttons und Touch-Ziele prüfen. Bei zu langem Einzeltext entweder echte mehrseitige Textdarstellung oder eindeutig sichtbare Vollansicht anbieten, nicht den Text verbergen.

Weitere Umsetzung in getrennten schmalen Pull Requests, erst nach Merge/Abgleich mit PR #185: Schülerliste und Check-in, Gruppen/Dienste, Zeit/Arbeitsauftrag, restliche Katalog-Widgets. Alte JSON-Layouts und Klassen-/Schülerdaten müssen unberührt bleiben. CI, echte Browsersichtprüfung und Freigabe vor Merge/Deployment.
