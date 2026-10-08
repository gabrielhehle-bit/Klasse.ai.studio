# Klassio: weiterer Prüfblock zu Roadmap-Punkt 8

## Änderungen

- Sterne-Auswertung: Ergebnisse erscheinen auf Seiten statt in einer inneren
  Scrollfläche. Seitenzahl und Zeilenhöhe berücksichtigen die echte Fläche und
  Namen; Vorwärts-/Zurück-Aktionen bleiben mindestens 44 Pixel hoch.
- Top 3, Top 10, alle Kinder, Zeitraum-/Fachfilter und die ausdrückliche Freigabe
  zum Anzeigen bleiben erhalten. Die gewählte Seite bleibt beim Minimieren erhalten.

## Browserabnahme

Die bestehende Classroom-Routine prüft zusätzlich:

- Gruppen bilden innerhalb des Widgets, ohne automatisch geöffnetes Vollbild;
  dieselbe Einteilung nach Minimieren und Wiederöffnen.
- Glücksrad: tatsächliche Ziehung abschließen und dasselbe Ergebnis wiederöffnen.
- Sterne: vor der Freigabe keine Namen; alle Kinder über Seiten erreichbar;
  Ergebniszeilen und Navigation innerhalb der Fläche ohne inneres Scrollen;
  ausgewählte Seite nach Wiederöffnen erhalten.

## Offen

Die Browserabnahme dieses Commits ist im zugehörigen PR/CI nachzuweisen.
Dieser Block bestätigt nicht alle Widgets. Statistik-Zeiträume und weitere
Widget-Konfigurationen, der Touch-Tafel-Praxistest und der reale Gerätewechsel
Lea/Manu bleiben getrennte Aufgaben.
