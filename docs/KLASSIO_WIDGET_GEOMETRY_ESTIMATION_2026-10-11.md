# Geometrie und Schätzen: nächster Fünferblock

Basis: PR #510, veröffentlicht als `75707366b2a0ee6443a8fe431a8356de78e0ad35`.

| Katalogeintrag | Fachliche Änderung und Browsernachweis | Mindestfläche |
| --- | --- | --- |
| Geometrie-Muster | Vier Formen, Größe/Drehung/Farbe, Platzieren und Rücknahme; randnahe Formen werden innerhalb der Musterfläche gehalten. Alle vier 2D/3D-Paare und ihre Eigenschaften, gespeicherte Platzierungen und Körperdrehung. | 760×560 |
| Formen-Entdecker | Vier Polygone mit großen nummerierten Ecken-/Seiten-Schaltflächen; falsche/richtige Eckenanzahl. Echte Drahtmodelle von Tetraeder, Würfel, Fünf-/Sechseckprisma ersetzen fehlerhafte CSS-Körper. Ecken, Kanten, Flächen und Drehung stimmen; Markierungen, Lösung und Ansicht werden gespeichert. | 640×560 |
| Winkel-Detektiv | Alle drei Stufen; Winkel wird unabhängig aus dem gezeichneten Strahl gemessen und falsch/richtig beantwortet. Geänderter Tipp entfernt alte Rückmeldung; 10°-Stufe hat passende Vorgaben. Die Grenzen stumpfer Winkel schließen 90° und 180° ausdrücklich aus. | 740×560 |
| Schätz-Glas | Der Startwert hängt nur vom Zahlenraum ab und verrät nicht mehr die Menge. Vier unterschiedliche Vorgaben im gesamten Bereich; alle ganzen Zahlen auswählbar. Alle 18 Inhalt/Stufe-Kombinationen mit unabhängiger Zählung der gezeichneten Gegenstände, Fehlversuch und exakter Schätzung. | 760×560 |
| Teilbarkeits-Roboter | Alle acht Regeln in drei Stufen; pro Runde drei passende und drei unpassende verschiedene Zahlen ohne Wiederholungsschleife. Falsche Auswahl wird einmal gewertet, passende Zahlen nur einmal; Runde endet nach allen drei Treffern, jederzeit neues Befüllen möglich. Aufgabe, Auswahl, Punkte und Erklärung bleiben gespeichert. | 760×560 |

Die fünf Fenster werden beim Wiederöffnen innerhalb der aktuell nutzbaren Tafel
positioniert. Im gemeinsamen Chrome-Lauf werden tatsächliche Größe/Passend-
Bedienelemente und der Fenstergriff benutzt. Die Routine prüft Mindestflächen,
44px-Ziele, Minimieren und vollständiges Schließen getrennt; Inhalte und Eingaben
müssen nach dem Wiederöffnen identisch sein. Antworten werden aus der sichtbaren
Darstellung berechnet und über die UI abgegeben, nicht in den Modellzustand gesetzt.

Lokale Modelle: 1.920 Roboter-Runden mit konstanten und zufälligen Zahlenquellen;
korrekte Körper-Topologie einschließlich Euler-Beziehung und eindeutiger Kanten;
Schätzvorgaben ohne Dubletten. 2.379 Bibliothekstests bestehen. Der bestehende
Anwesenheits-Test benutzt nun denselben Schultag wie die Anwendung statt UTC,
damit er zwischen Wiener und UTC-Mitternacht nicht fälschlich scheitert.

Lokaler Chromium prüft die tatsächlichen React-Komponenten, native Layouts und
Wiederherstellung nach vollständigem Neuladen. Die endgültigen gemeinsamen
Chrome-CI-Läufe, TypeScript und Produktionsbuild sind Voraussetzung für Merge.
Danach Pre-Deployment Audit, Production Deploy, exakte öffentliche Release-SHA
und `/api/health` prüfen. Echte Touch-Hardware und Hörprüfung bleiben offen.
