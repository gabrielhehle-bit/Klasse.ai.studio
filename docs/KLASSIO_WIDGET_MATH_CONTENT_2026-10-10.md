# Mathe-Karten, Rechenkette, Duell, Pyramide und Waage

Basis: PR #508, Release 101055a7ab160d97843a67b774cb04d592e50c69.

| Katalogeintrag | Fachlicher und funktionaler Nachweis | Mindestfläche |
| --- | --- | --- |
| Mathe-Karten | Aktives gemeinsames Kopfrechen-Studio: Aufgaben, Antwortentwurf, Lösung und Rückmeldung bleiben erhalten. Bearbeiten einer richtigen Antwort hebt die alte Erfolgsmeldung auf. | 640×560 |
| Rechenkette | Dasselbe Studio im Kettenmodus; Rechnung ausdrücklich Schritt für Schritt. Der begrenzte Notfallgenerator erhält ausgewählte Rechenart und Schrittzahl, auch bei ausschließlich Division. Ganzzahlige Zwischenergebnisse und sichtbarer Rechenweg. | 640×560 |
| Mathe-Duell | Vier Rechenarten in drei Stufen. Falsche Antwort gibt Feedback, richtige Antwort höchstens einen Punkt je Aufgabe. Expliziter Weiter-Schritt verhindert Doppelpunkte. 4:3 → 4:4 → 4:5 ergibt Team 2 als Sieger. Konfigurationswechsel startet ein neues Duell. | 760×560 |
| Mathe-Pyramide | Bestehende eindeutig lösbare Vorgaben bleiben erhalten. Drei Schwierigkeitsstufen und Zahlenräume 10/20/100/1000; fehlende, falsche und richtige Eingaben, Hinweise und gelöster Zustand. Beim Wiederöffnen keine neue Pyramide. | 740×560 |
| Gewichte-Waage | Lösung ist die sichtbare Gewichtsdifferenz. Acht verschiedene Antwortmöglichkeiten mit richtiger Lösung; Auswahl, Tipp, Rückmeldung und exakt dieselben Optionen bleiben beim Wiederöffnen erhalten. | 640×560 |

Mathe-Karten und Rechenkette werden über KopfrechenStudio gerendert. Die älteren gleichnamigen Funktionen werden nicht als aktive Browsernachweise gezählt. Die Pyramiden-Vorgabemuster wurden bewusst beibehalten: drei Basissteine; zwei Mittelsteine und untere Mitte; oberster Stein, ein Mittelstein und dessen äußere Basis. Alle bestimmen die Lösung eindeutig.

2.375 lokale Bibliothekstests bestanden. Modelltests prüfen konstante und zufällige Zahlenquellen, begrenzte Antwortgenerierung ohne Endlosschleifen, Ganzzahligkeit, echte Rechenergebnisse und die Siegschwelle für beide Teams. TypeScript und Produktionsbuild werden vor dem PR geprüft.

Erweiterte bestehende Chromium-Routine: tatsächliche Schülerantworten und Wiederherstellung der aktiven Karten/Ketten; vollständiges Duell mit 4:3/4:4-Situation und alle zwölf Stufen/Rechenart-Kombinationen; alle zwölf Pyramiden-Konfigurationen werden unabhängig aus sichtbaren Vorgaben berechnet; acht Waagen unabhängig aus Gewichtsdifferenzen. Fehlversuche, Hinweise, Mindestflächen, 44-px-Ziele und Minimieren/Schließen mit exakter Wiederherstellung sind enthalten. Browser-CI und Screenshots folgen im PR.

Kurze Duell-, Pyramiden- und Waagentöne schließen ihren AudioContext. Physische Touch-Tafel und Hörprüfung sind weiterhin offen.
