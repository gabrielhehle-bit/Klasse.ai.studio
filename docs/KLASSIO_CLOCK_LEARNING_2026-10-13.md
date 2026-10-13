# Uhrlernen: ein gemeinsamer Einstieg

Ausgangspunkt ist der veröffentlichte Stand von PR #534, `7861a2d1f47d0985d787efd9a80136455e0eef33`.

Der reguläre Katalog bekommt einen gemeinsamen Uhrlernen-Einstieg mit drei Werkzeugen:

- Ablesen und Einstellen: vorhandener Uhren-Lern-Trainer, volle/halbe/Viertelstunden, erklärende Rückmeldung und neue Aufgaben auf Wunsch.
- Zeitaufträge: vorhandene gesprochene Aufgaben, darunter „halb fünf“ als 04:30 und Fünf-Minuten-Schritte, mit schaltbarer Digitalhilfe.
- Wort-Uhr: Echtzeit oder eigene Übungszeit mit Ziffern und deutscher Zeitangabe. Gerundete Angaben, auch beim Stundenwechsel, sind ausdrücklich ungefähr. Die Übungszeit kann minutengenau eingestellt werden.

Die Werkzeuge teilen nur das Fenster und die Auswahl. `clockpuzzle` und `clocksync` behalten ihre bisherigen Einträge in `__widgetLifecycleState`; die Wort-Uhr behält ihre bisherigen flachen Einstellungen. `clockLearningTool` speichert die ausgewählte Übung. Alte separate Widgets, Tafeln, Favoriten und Backups werden nicht konvertiert oder gelöscht. Neue Auswahl: 25 gemeinsame Einstiege; weiterhin 112 bestehende Bibliotheks-Einträge. Die drei Uhrnamen führen bei regulärer Suche zum selben Einstieg.

Das Kopf-Zahnrad öffnet die Wort-Uhr-Einstellungen oder eine erklärte Übungswahl. Alle Einstellungsflächen sind deckend. Das Fenster reserviert Platz für den 44px Größen-Ziehgriff. Die bisherige Aufgaben-/Feedback-Zeile und die Zeitaufträge nutzen den verbleibenden Platz ohne Verkleinern ihrer Touchflächen.

## Validierung

- Lokal 2.461 Modell-/Regressionstests mit Europe/Vienna, TypeScript und Produktionsbuild erfolgreich.
- Bestandstests prüfen unabhängige gespeicherte Aufgaben, unveränderte Originalobjekte, fremde Einstellungen und Rückfall bei ungültiger Übungsauswahl.
- Browserroutine ergänzt: echte Wechsel zwischen drei Übungen; korrektes 04:30-Zifferblatt; Erhalt von Aufgaben, Antworten und 23:55 bei Minimieren, Schließen und verschlüsseltem Neuladen. Native Trefferprüfung kontrolliert vier Ecken und Mitte jeder sichtbaren Schaltfläche sowie 44px Mindestmaß und deckende Einstellungen.
- Vor Veröffentlichung sind beide vollständigen Chrome-Läufe, alle CI-Prüfungen und die finalen Screenshots zu prüfen. Echte Touch-Hardware und Hörprüfung bleiben Geräteprüfungen.
