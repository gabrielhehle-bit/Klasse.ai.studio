# Zeitwerkzeuge zusammenführen

Das reguläre Zeit-Widget bietet Timer, Stoppuhr und Uhrzeit in einem Fenster. Der Timer behält seine bisherigen flachen Einstellungen. Stoppuhr und Uhr nutzen getrennte Einstellungen unter `timeStopwatch` und `timeClock`; `timeToolMode` merkt sich die Auswahl. Bestehende Einzelwidgets bleiben lesbar und über Weitere Widgets zugänglich.

Bereits besuchte Werkzeuge bleiben beim Wechsel montiert: Countdown und Stoppuhr laufen weiter, der Countdown löst seinen Alarm auch bei sichtbarer Uhr aus. Verdeckte Stoppuhren nehmen keine Tastaturbefehle an. Das gemeinsame Zahnrad öffnet die Einstellungen des sichtbaren Werkzeugs. Timer- und Uhr-Einstellungsflächen sind deckend; schmale Uhr-Einstellungen lassen sich scrollen. Die Mindesthöhe berücksichtigt die 44-Pixel-Moduswahl.

Der Browser-Unterrichtslauf prüft die normale Auswahl, Werkzeugwechsel bei laufendem Countdown und laufender Stoppuhr, Einstellungen des aktiven Werkzeugs, deckenden Hintergrund, Tablet-Bedienung und die Wiederherstellung des ausgewählten Modus nach Minimieren. Die bisherigen Timer-, Stoppuhr- und Uhrprüfungen bleiben bestehen. Separate Tests prüfen die Isolation der Einstellungen und die Kompatibilität vorhandener Timer-Einstellungen.

Ein laufender Countdown übersteht Werkzeugwechsel und Minimieren. Wie beim bisherigen Timer wird sein Laufzustand nicht nach dem Neuladen der gesamten Seite fortgesetzt.
