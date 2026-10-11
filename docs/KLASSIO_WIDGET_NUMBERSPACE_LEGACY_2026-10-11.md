# Widget-Prüfung: Zahlenraum und bisher separat offene Katalogtypen · 11.10.2026

Fortsetzung nach PR #516. Die fünf Einträge bleiben eigenständig im Katalog;
geteilte Komponenten sind kein Ersatz für ihre tatsächliche Browserprüfung.

| Katalogtyp | Inhalt und dauerhafter Prüffall |
| --- | --- |
| `zahlenraum` | Hunderterfeld mit tatsächlich 47 besetzten Punkten; Zweifarbigkeit 40 + 7. Wechsel nach ZR 10 begrenzt beide Teile, ohne negative Restmenge. 7 = 4 + 3 im Jäger-Raster, ungerade Punkte unten. Mengen bis 20 besitzen tastaturfähige 44-Pixel-Punktknöpfe; das Hunderterfeld dient als Darstellung, die Menge wird über die beschriftete Zahleneingabe, Schritt- oder Kurzwahlknöpfe eingestellt. |
| `anschauung` | Tatsächlich separat geöffnetes Legacy-Widget startet im Jäger-Zehnerfeld. Gleiche Inhaltsfälle mit vollständiger Wiederöffnung, eigenem Zahlenstrahlmodus und eigener gespeicherter Konfiguration. |
| `numberline` | Eigener Einstieg in den Zahlenstrahl. Rechensprünge 23 → 33 → 37 → 32 mit +10, frei eingegebenem +4 und −5. Sechs Marker per physischem Klick auf die SVG-Linie, Verdecken/Aufdecken, Entfernen und Leeren. Umrechnung über die tatsächliche SVG-Bildschirmmatrix, nicht feste CSS-Ränder. Eigene Bereiche 200–300 und −50–0, Hauptmarker 245 bzw. −25, nicht mehr sichtbare Marker/Sprünge werden bereinigt. Negative Minima, Marker und freie Sprungweiten werden Zeichen für Zeichen über die echte Browser-Tastatureingabe geprüft; native Minus-Zwischenzustände bleiben während der Eingabe erhalten. |
| `wortsatzwerkstatt` | Eigener Katalogeintrag erhält die zuvor fehlende Titel-Zahnrad-Anbindung an den vorhandenen Editor. Eigene Wortaufgabe, falscher/richtiger Anordnung, Tastatur und Leselösung. Der gemeinsame bestehende Deutschdurchlauf prüft zusätzlich vollständiges Schließen nach korrekten Wort-, Satz- und Kompositum-Aufgaben. Erfolg wird bei Wiederöffnung ausschließlich an die tatsächliche richtige Kartenreihenfolge gebunden; Verschieben hebt den alten Erfolgszustand auf. |
| `soundmachine` | Separater Einstieg in die Naturklänge. Nachträglich aktiviertes Kaminfeuer und Waldvögel müssen auf dem schon laufenden echten AudioContext neue Oszillatoren erzeugen; deaktiviertes Kaminfeuer darf keine weiteren Knackgeräusche starten. Spur-/Masterlautstärke, Timer, Minimieren, vollständiges Schließen und Wiederöffnung. Timer verwendet eine monotone Deadline, räumt außerhalb des React-State-Updaters auf und stoppt den tatsächlichen Kontext bei Ablauf. |

Zahlenraum-Einstellungen liegen im nativen Dialog mit Escape und Rückkehr zum
Zahnrad; sie verdrängen die Unterrichtsfläche nicht. Alle drei Zahlenraumtypen
haben 760×560 Mindestfläche für sechs Marker und vollständige Rechensprünge.
Vergrößerte Zahlenlabels und drei getrennte Beschriftungszeilen verhindern
die Überlagerung der aufeinanderfolgenden Sprungwerte.
Klang-Maschine: 760×560 mit fünf zugleich erreichbaren Quellen. Wortwerkstatt:
620×560. Keine Punkteskala oder Schülerprofile im Zahlenraum.

Sieben neue Logiktests prüfen beschädigte Daten, beide Teile der Zerlegung,
Legacy-Bereiche einschließlich oberer Null, sichtbare Marker/Sprünge,
korrekte Wiederöffnung aller drei Wortmodi, laufende Klangumschaltung und
begrenzte Timerressourcen. TypeScript, Produktionsbuild, vollständige Tests,
beide Chrome-Matrixläufe und genaue Live-Release-Prüfung werden in der PR belegt.
Echte Touch-/Stift-/Lautsprecherabnahme bleibt offen.
