# Klassio: vierter Sprach- und Spielblock

Basis: veröffentlichter PR #503, 971fe80b3cc2bf7f82dbcf7b5f2b6e3fbd714b43.

| Katalogeintrag | Änderung / Browserprüfung | Mindestfläche |
| --- | --- | --- |
| Bildwörterbuch | Native Darstellung ohne alte Skalierung; Lernkarte weiterblättern/wiederöffnen, falsches und richtiges Bild zuordnen. | 460×540 |
| Sequenz-Muster-Macher | Lesbare Stufen und große Antwortflächen; gelöste Folge bleibt bis „Nächstes Muster“ stehen, Serie zählt einmal. Mondfolge nach Vollmond korrigiert. Falsche/richtige Antwort und Wiederöffnen. | 580×520 |
| Buchstaben-Suppe | Großes stabiles Raster statt überlappender beweglicher Ziele; lange Extrem-Wörter buchstabieren, Fehlversuch korrigieren, gelöstes Wort erhalten. Wiederöffnen setzt gespeicherte KI-Wortliste nicht zurück. | 640×560 |
| Morse-Code-Station | Lesbare Anleitung und Alphabet, große Eingabe/Aktionen, Enter prüft Antwort. Laufende Wiedergabe beim Schließen/Minimieren abbrechen; Eingabe bleibt erhalten, Wiedergabe lässt sich neu starten. | 620×560 |
| Blumen-Rätsel | Eingabe pro Instanz statt globaler DOM-ID; Wort, Entwurf, Buchstaben und Fehlversuche gespeichert. Vollständiges Alphabet als Raster; Umlaute, Fehlversuch, Wiederöffnen und Gewinn. Eingabe auf spielbare Zeichen und 24 Buchstaben begrenzt. | 640×560 |

Alle Hauptansichten werden im vollständigen Chrome-Unterrichtslauf nach echtem
Ziehen auf ihre Mindestfläche geprüft, einschließlich sichtbarer und erreichbarer
44-Pixel-Ziele. Die gezielten lokalen Läufe prüfen die neuen Werkzeuge mit 360
und 820 Pixel Einstieg und anschließender Tafelfläche. Die unveränderte lokale
Fokus-Klänge-Audioprüfung benötigt den vollständigen Chrome in CI. KI-Generierung,
reale Sprachausgabe und echte Touch-Hardware sind nicht Teil dieser Abnahme.

Freigabe erst nach TypeScript, Produktionsbuild, allen lokalen Modelltests und
allen acht endgültigen PR-Prüfungen. Veröffentlichung zusätzlich mit erfolgreichem
Deployment, passender /api/release-SHA und /api/health verifizieren.
