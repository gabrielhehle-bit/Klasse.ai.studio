# Klassio: fünfter gemeinsamer Widget-Prüfblock

Basis: veröffentlichter PR #505, `134a70784367da5b2b455ed8dd5e42a68b7e257e`.

| Widget | Änderung und Browsernachweis | Mindestfläche |
| --- | --- | --- |
| Körper-Entdecker | Native Darstellung aller sieben Organe; Auswahl, Zuordnungsaufgabe, Fehlversuch und korrekte Antwort bleiben beim Wiederöffnen erhalten. | 620×560 |
| Geographie-Kompass | Instrument und Erklärung passen auch im kleinen Fenster nebeneinander. Richtung, Aufgabe und Rückmeldung bleiben erhalten; falsche/richtige Richtung und nächste Aufgabe. | 420×620 |
| Wochentage-Trainer | Native Monats- und Wochentagsauswahl; Übungsaufgabe und Lösung gespeichert. Frei gewählte Tage heißen „Ausgewählt“, „Davor“ und „Danach“, statt das tatsächliche Heute zu behaupten. | 620×560 |
| Fahrrad-Führerschein | Native Verkehrszeichen, Frage und Antworten; Übungsstand und laufende/abgeschlossene Prüfung gespeichert. Fehlversuch, richtige Antwort, echte fünfteilige Übungsprüfung und Wiederöffnen während/nach Prüfung. | 800×560 |
| Wasserkreislauf-Puzzle | Native Kreislauf-, Puzzle- und Quizansichten; Reihenfolge, Antworten und Punktestand gespeichert. Pfeile lösen den sichtbaren Weg, fünf Quizfragen, Wiederöffnen nach Puzzle und mitten im Quiz. | 760×560 |

Die vorhandenen gemeinsamen Chrome-Läufe prüfen den Block nach echtem Ziehen auf
seine Mindestfläche. Die Resize-Messung erlaubt vier Pixel für Rahmen und
Bruchteile der prozentualen Tafelkoordinaten; Erreichbarkeit und 44-Pixel-Ziele
werden gesondert anhand der tatsächlichen Browserkoordinaten geprüft. Die
Aufgaben werden über die sichtbare UI beantwortet, ohne Lösungszustand einzusetzen.
Zahnrad/Escape und genaue Wiederherstellung der sichtbaren Aufgabe werden geprüft.

TypeScript, Produktionsbuild und lokale Modelltests sind Voraussetzung, ebenso
alle acht endgültigen PR-Prüfungen. Nach Merge zusätzlich Deployment,
öffentliche Release-SHA und /api/health prüfen. Die bestehende fachliche
Fragensammlung wird hier nicht geändert; echte Touch-Tafel und Sprachausgabe
sind nicht Teil dieses Browsernachweises.
