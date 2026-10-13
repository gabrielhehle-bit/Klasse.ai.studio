# Widgetauswahl: Qualität und weniger Einstiege

Ausgangspunkt: `main` / PR #526, `637e090f1641c037c4374d6d19a6a9726dffe6f7`.

Der bisherige Katalog enthält 112 Einträge. 30 sind über die kanonischen
Metadaten einem anderen Einstieg zugeordnet; das beweist keine vollständige
fachliche Zusammenführung ihrer Funktionen oder gespeicherten Einstellungen.

## Umgesetzter erster Schritt

- Reguläre Auswahl: 24 Gruppen. Grundlage sind die bisherigen 20 Kernwidgets,
  ergänzt um Hausübungen, Sterne der Woche, Bildwörterbuch und Atempause.
- Fachkategorien zeigen ebenfalls Gruppen und zählen diese. Leere reguläre
  Kategorien werden nicht angeboten.
- Suche in der regulären Auswahl findet auch bisherige Variantennamen,
  zeigt aber nur einen Treffer pro Gruppe. Beispiel: Bruch-Kuchen → Brüche.
- Verwandte Varianten sind nach bewusstem Aufklappen erreichbar. Der primäre
  Einstieg und identisch benannte Varianten werden darin nicht erneut gezeigt.
- Weitere Widgets: bewusster separater Zugriff auf alle 112 bisherigen
  Einträge und deren genaue Suche. Eine Suche innerhalb dieses Bereichs
  bleibt dort; normale Suche wechselt zu den Kernwidgets.
- Die Schülerliste bleibt während der Auswahl unsichtbar, ohne ihre Breite
  oder Einstellung zu ändern. Sie verdeckt dadurch keine Tablet-Bedienelemente.
- Tontrainer: Tastaturereignisse sind direkt am fokussierten Widget angebunden,
  statt einen globalen Listener bei jeder Änderung neu zu installieren. Die
  native Tastaturprüfung bleibt bestehen; Formulare und Modifikatortasten werden
  weiterhin ausgenommen.
- Favoriten und zuletzt verwendete Widgets behalten ihre gespeicherten Typen.
  Layouts, Vorlagen, Backups, Renderer und Widgetdaten werden nicht konvertiert
  oder gelöscht.

## Prüfung

Modelltests prüfen die 24 eindeutigen verfügbaren Gruppen, Altbestand,
Variantensuche und die vollständige Aufteilung in reguläre Kategorien.
Die bestehende Browserroutine prüft zusätzlich den 24er-Picker, einen einzelnen
Bruchtreffer samt Varianten, getrennte Suche eines Spezialthemas und den
erhaltenen 112er-Bestand. Screenshots werden für Laptop und die jeweilige
unterstützte Tabletansicht bei 820 Pixeln erstellt. Unter 768 Pixeln wechselt
die App bewusst vom Cockpit in den Handy-Schnellmodus. Die einzelnen Widgetprüfungen öffnen
bewusst den separaten Bestand, damit ihre genauen gespeicherten Typen weiter
geprüft werden. Der Timer-Restore-Vergleich prüft die angezeigte Zeit,
Weiter-/Pause-Aktion und Tonstatus unabhängig von seinen responsiven Textlabels.

## Offen: fachliche Zusammenführung

Dieser Schritt reduziert die Auswahl, nicht die Zahl der implementierten
Renderer. Die bisherigen Varianten öffnen weiterhin ihre eigenen Fenster.
Als Nächstes sind Zeit/Uhrlernen, Geld/Waage, Deutschübungen und Gefühle auf
einen klaren Funktionsumfang pro verbleibendem Widget zu prüfen und fachlich
zusammenzuführen. Dabei müssen vorhandene Aufgaben und Einstellungen über
einen nachvollziehbaren Übergang erhalten bleiben. Anschließend sind
Spezialthemen als Inhalte statt eigener Einstiege zu behandeln.

Eine bloße Katalogüberschneidung ist kein Nachweis eines kaputten Widgets.
Fehler erhalten einen reproduzierbaren Bedienungsfall. Bestehende grüne
Browserprüfungen ersetzen keine fachliche Qualitätsbewertung oder echte
Smartboard-, Mikrofon- und Lautsprecherprüfung.
