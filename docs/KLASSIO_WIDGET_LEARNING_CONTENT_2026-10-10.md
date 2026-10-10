# Lerninhalte: Rätsel, Farben, Symmetrie, Uhrzeit und Wetter

Dieser Block prüft Aufgaben, Lösungen und Lernabläufe zusätzlich zur Bedienoberfläche.

| Widget | Fachliche und didaktische Korrektur |
| --- | --- |
| Rätsel | Zwölf überprüfbare lokale Rätsel in vier Kategorien, konkrete Hinweise und eindeutige Lösungen. Fehlerhafte Kohlkopf-Antwort korrigiert. Eigene KI-Themen bleiben optional; bei Ausfall bleibt das bisherige Rätsel erhalten. |
| Farbmischung | Fünf Aufgaben mit konsistenten Rezepten und sichtbaren Sekundärfarben. Weiß erzeugt ausdrücklich hellere Farben und zählt bei reinem Grün als falsche Zutat. Die Vorschau ist als vereinfachtes Malfarbenmodell gekennzeichnet. Wiederholte Prüfung derselben Lösung vergibt keine zusätzlichen Punkte. |
| Symmetrie | Alle fünfzehn Motive werden vollständig bearbeitet. Spiegelung und 180°-Drehung haben unterschiedliche Zielfelder; Farbwechsel wird separat erklärt. Drei Zeilen pro Seite halten auch große Motive mit 44-px-Feldern bedienbar. |
| Uhrzeit | Fünf sachlich beschriftete Aufgaben, korrekte Stundenzeigerstellung einschließlich Minutenanteil. „Halb fünf“ bedeutet 4:30; Viertel vor zwölf 11:45. Minutenschritte übertragen über die volle Stunde in beide Richtungen. |
| Wetter | Konkrete Temperaturen begründen Kleidung. Regenjacke und Winterjacke sind getrennt. Bei Gewitter ist die richtige Handlung, mit einer erwachsenen Person in ein festes Gebäude zu gehen. Schirm, Baum und offene Hütte werden ausdrücklich als falscher Schutz bewertet. |

Gewitterquelle: [National Weather Service – Lightning safety](https://www.weather.gov/safety/lightning-safety-overview). Die Farbinterpolation ist ein Unterrichtsmodell und keine Simulation bestimmter Pigmente.

Alle fünf Widgets speichern Aufgabe, Eingaben und Rückmeldung über den vorhandenen Widget-Lebenszyklus. Mindestgrößen: Rätsel 700×560, Farben 760×560, Symmetrie 840×560, Uhr 740×560, Wetter 760×560.

Lokale Validierung: 2371 Bibliothekstests erfolgreich. Modelltests prüfen alle 720 Uhrzeiten mit positiven/negativen Schritten, sämtliche Farbaufgaben, Wetterlösungen und alle Motive einschließlich Spiegel-/Dreh-Invarianten.

Die erweiterte Chromium-Unterrichtsroutine löst die fünf Farbaufgaben, fünf Uhraufgaben, fünf Wettersituationen, sämtliche fünfzehn Symmetriemotive und zwölf lokalen Rätsel durch reale Klicks. Sie prüft Fehlversuche, Hinweise, Wiederherstellung nach Minimieren/Schließen sowie sichtbare Bedienelemente ab 44 px bei nativen Mindestgrößen. CI-Ausführung und visuelle Artefaktprüfung folgen im PR.

Abgrenzung: Der zusätzliche KI-Quiz-Untermodus ist nicht Teil dieses Inhaltsblocks. Physische Geräte und Lautsprecher werden durch Browserautomation nicht geprüft.
