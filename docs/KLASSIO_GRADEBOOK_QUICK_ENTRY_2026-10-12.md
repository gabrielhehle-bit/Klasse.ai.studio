# Notenmappe: schnelle Eingabe ganzer Bewertungsspalten · 12.10.2026

Ausgangspunkt: veröffentlichter Stand #525 (`56877f1b`).
Der Branch `fix/gradebook-quick-entry` enthält außerdem den noch unveröffentlichten
manuellen Skalenblock (`dcd63b4b`) samt dessen Dokumentation und Browserfällen.

## Ziel und Verhalten

Die Notentabelle ist der Einstieg. Direkte Schaltflächen + LZK, + Wochenplan
und + Schularbeit sind für die bereits aktivierten Bewertungskategorien sichtbar.
Sie wechseln auch aus dem Mitarbeit-/Hausübungsreiter zuerst in die Notentabelle
und verwenden dann den vorhandenen Metadatendialog (Titel, Datum, Höchstpunkte).
Vorhandene leere Slots werden wiederverwendet; erfasste 0 und beschriftete Slots
bleiben belegt. Schularbeiten aktualisieren ihre eigene Spaltenanzahl `saCount`.
Abbrechen legt keine Spalte an und verändert keine erfassten Werte. Auch das
allgemeine Menü Bewertung hinzufügen wechselt vor dem Öffnen zur Notentabelle,
enthält Wochenpläne und verwendet für neue Schularbeiten denselben schnellen
Klasseneinstieg statt sofort die Einzelkorrektur zu öffnen.

Nach Speichern öffnet sich die neue Bewertung in der vorhandenen Spaltenansicht.
Die Reihenfolge wird stabil nach Namen gesetzt und der Unvollständig-Filter
aufgehoben. Das erste Eingabefeld erhält den Fokus. Bei bestehenden Spalten
ist der Einstieg Eintragen sichtbar und per Tastatur erreichbar.

Die vier Bewertungstypen verwenden ein lokales Textfeld, das die bestehende
Fachvalidierung nutzt. Enter/Navigation/Tab oder Blur übernimmt unmittelbar;
Escape verwirft den Entwurf. Ungültige Eingaben speichern nichts und verhindern
die Tastaturnavigation, mit zugänglicher Fehlermeldung. Fach, Klasse, Kind,
Bewertungstyp, Spalte, Modus und Höchstpunkte isolieren die Feldkontexte.
Enter/Shift+Enter navigiert innerhalb derselben Spalte ausschließlich zu sichtbaren,
aktivierten Feldern. Die bisherige verzögerte Mitarbeit-/Endnoteneingabe ist davon
unabhängig. Die explizite 0 bleibt von einem leeren Bewertungsfeld getrennt.

Die Spaltenansicht zeigt Titel sowie erfasst/offen; ihre Mindestbreite wurde
von 1200 auf 700 Pixel reduziert. Name und berechneter Stand bleiben sichtbar.
Alle Bewertungen anzeigen führt zurück zur vollständigen Tabelle. Die bestehende
Schularbeit-Einzelkorrektur bleibt über ihre bisherigen Werkzeuge erreichbar.

## Prüfung und Grenzen

Alle 2.432 Logiktests, TypeScript und Produktionsbuild sind grün.
Die erweiterte Browsermatrix ist syntaktisch gültig und enthält reale LZK-/WP-/SA-
Erstellung, Eingabe von 12 und 0 Punkten, Enter-Fokuswechsel, ungültige 21 bei
Maximum 20, Escape, gespeicherte Prozentanzeige, Fortschritt, verschlüsselte
Wiederherstellung und Erhaltung vorhandener anderer Spaltenwerte.
Die Ausführung dieser neuen Browserfälle und ihre visuelle Prüfung stehen vor
Veröffentlichung aus. Es ist noch kein neuer Release veröffentlicht.
