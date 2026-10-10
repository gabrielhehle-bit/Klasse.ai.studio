# Widget-Prüfung: Interaktion und Uhrentrainer · 11.10.2026

Dieser Fünferblock setzt die abgeschlossene Geometrie-/Schätzprüfung (PR #511) fort.

| Widget | Inhalt und Änderung | Überprüfter Ablauf |
| --- | --- | --- |
| Klassen-Challenge | Mission und Erledigt-Status werden gespeichert; die Abschlusszeile hält die 44-Pixel-Größenänderungsecke frei; Tonkontext schließt nach dem Signal. | Alle sechs Missionen, Abschluss sperrt Wiederholung, nächste Mission setzt Abschluss zurück. |
| Klassen-Kryptograph | Geheimtext, Schlüssel, Tresorziel, Eingabe, Anleitung und Rückmeldung bleiben erhalten. Beschriftete Eingaben, 44-Pixel-Schlüsselregler, deutsche Neustartaktion und sachliche Anleitung ohne behaupteten körperlichen Widerstand. | Cäsar-Wrap Z→C, gemischte Groß-/Kleinschreibung, unveränderte Umlaute/Satzzeichen; Tresor über sichtbare Höher-Hinweise gelöst. |
| Waagen-Schätzer | Tatsächlich schwerere Seite sinkt; Objekte folgen ihrem Balkenende. Gewichte können einzeln entfernt werden, Darstellung zeigt tatsächliche Gesamtmasse. Freie Gewichte begrenzt auf 0–5000 g; erneuter Klick auf aktiven Modus löscht die Arbeit nicht. | Alle sechs Rätsel (150/400/750/50/1200/2000 g), Unter-/Übergewicht, Abnehmen und exakt waagerechter Balken bei Gleichgewicht. Objektmassen sind Beispiele, keine allgemeingültigen Naturwerte. |
| Blitz-Reaktions-Trainer | A/L funktionieren bei Fokus im Widget; Tastaturwiederholung und modifizierte Tasten ignoriert. Synchroner Rundenschutz verhindert Überschreiben des Siegers; Fehlstarts löschen den Timer. Ergebnisse bleiben gespeichert. Laufende Runden werden beim Wiederöffnen ausdrücklich unterbrochen, da alte monotone Zeitstempel nicht wiederverwendbar sind. | Fehlstart mit anschließendem Warten über die maximale Verzögerung; echtes Signal, Tastatursieg, späterer Gegenklick, gespeichertes Resultat, Schließen während Wartephase. |
| Uhren-Lern-Trainer | Aufgabe, vier Antworten, Zeigerstellung, Modus/Stufe und Feedback werden gespeichert. Wiederöffnung erzeugt keine neue Aufgabe; neue Aufgaben nur bei echten Modus-/Stufenänderungen oder bewusster Aktion. Antwortauswahl aus endlichem Pool. Änderung der Zeiger löscht veraltetes Erfolgsfeedback. | Volle/halbe/Viertelstunden, jeweils Ablesen und Einstellen; unabhängige Berechnung aus tatsächlichen SVG-Zeigerwinkeln, falsche und richtige Antwort, eindeutige vier Optionen. |

Alle fünf tatsächlichen Unterrichtsmodus-Komponenten erhalten `onUpdate`. Mindestgrößen (inklusive Widget-Kopf) sind 460×560, 760×560, 740×560, 640×560 und 760×560 Pixel. Wiederhergestellte Fenster werden auf die nutzbare Tafel begrenzt.

## Nachweise

- TypeScript und Produktionsbuild erfolgreich; alle 2380 Bibliothekstests bestanden.
- Lokales Chromium mit tatsächlichen Komponenten: alle Ansichten ohne inneres Scrollen/Überlagerung, Bedienelemente mindestens 44×44 Pixel, erreichbare Klickmitte; Screenshots visuell geprüft.
- Funktionale Browserabläufe für alle oben genannten Inhalte; vollständiger Seitenneustart erhält Text, Eingaben, Auswahlen und SVG-Grafiken exakt.
- Dauerhafte Unterrichtsroutine in `scripts/classroom-routine-browser-e2e.mjs`: echte Mindestgrößen, Aufgaben, Minimieren und vollständiges Schließen/Wiederöffnen.
- Bestehender Fehlstart-Quelltexttest prüft nun den synchronen Rundenschutz statt der asynchronen React-Zustandsvariable.
- Vollständige Tests und Remote-CI werden vor dem Merge geprüft. Veröffentlichung erfolgt ausschließlich nach grüner CI des endgültigen PR-Standes; öffentlicher Release-Hash muss dem Merge entsprechen.

Offen bleiben ein Hörtest an echten Lautsprechern und die Bedienung an einer echten Touchtafel. Browsernachweise ersetzen diese Hardwareprüfungen nicht.
