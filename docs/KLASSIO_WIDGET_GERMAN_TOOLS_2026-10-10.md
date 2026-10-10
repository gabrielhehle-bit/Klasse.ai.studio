# Klassio: dritter gemeinsamer Deutsch-Block

Basis: veröffentlichter PR #502, f657ddf6deef9018a8a7b011abee43037271ddd2.

| Katalogeintrag | Änderung und Browsernachweis | Mindestfläche |
| --- | --- | --- |
| Wortforscher | Eingabe behält Groß-/Kleinschreibung. Silbenzahl ausdrücklich als korrigierbare Schätzung; Großschreibung ist keine Nomenbestimmung. Leere Eingabe, Umlaute, langes Wort und gespeicherte Korrektur. | 520×540 |
| Reim-Maschine | Vollständige Wörter Katze/Tatze; Wolke statt des ebenfalls gültigen Reims Wand als falsche Hand-Antwort. Gespeicherte Runde wird beim Wiederöffnen nicht ersetzt. Falsche/richtige Antwort und genaue Wiederherstellung. | 500×540 |
| Satzzeichen-Zoo | Lesbare Erklärung und Rückmeldung, große Satzzeichen/Aktionen. Falsche/richtige Auswahl für Frage, Aussage und Ausruf; gelöste Aufgabe und Serie beim Wiederöffnen. | 620×560 |
| Satzbau | Gemeinsames Zahnrad öffnet den vorhandenen Aufgabeneditor. Eigener Satz, manuelle falsche/richtige Reihenfolge, Tastatur, Lösung und Wiederöffnen. | 620×560 |
| ABC-Sortierer | Zahnrad und Speicherung der vorhandenen Lernwort-Komponente vollständig verdrahtet. Eigene Siebenwortliste, Import/Dubletten, Bearbeiten/Löschen, ABC-Seiten und Wiederöffnen. | 640×560 |

Die drei eigenständigen Werkzeuge verwenden native Schriftgrößen und mindestens
44 Pixel hohe Aktionen. Ihre Hauptansichten haben keine innere Scrollfläche.
Kurze Reim-/Zoo-Töne und Silbenklatschen schließen ihren AudioContext nach dem
letzten Ton. Eine beim Minimieren unterbrochene Reimdrehung beginnt beim erneuten
Öffnen eine neue vollständige Runde; abgeschlossene Runden bleiben erhalten.

Die beiden bestehenden vollständigen Chrome-Läufe (360/820 Einstieg, danach
Tafelfläche) prüfen diese Einträge zusätzlich. Die Wortforscher-Schätzung ist
keine vollständige sprachwissenschaftliche Silbentrennung. Lange KI-Antworten,
eigene KI-Generierung und echte Touch-Hardware sind hier nicht abgenommen.

TypeScript, Produktionsbuild und 2.363 lokale Tests wurden geprüft. Die Tests
laufen mit TZ=Europe/Vienna; eine andere lokale Zeitzone verfälscht einen
bestehenden Sterne-Zeitraumtest. Freigabe erst nach allen acht endgültigen
CI-Prüfungen; anschließend Release-SHA und /api/health prüfen.
