# Klassio: Widget-Prüfblock vom 8. Oktober 2026

Referenz: Punkt 8 „Widgets“ der ursprünglichen elfteiligen Roadmap.
Dieser Block ersetzt keine frühere Gesamtliste und bestätigt nicht alle Widgets.

## Umfang: zwölf Widget-Typen

| Widget | Automatischer Browsernachweis |
| --- | --- |
| Grundschulrechner | Tastenhöhe, Rechnung 2+3, Zustand nach Minimieren, Größenänderung an acht Griffen |
| Geographie-Kompass | Instrument überdeckt Erklärung bei 100/125/150 % nicht; Übungsmodus |
| QR-Code & Link | Vorschaugröße, korrekter Dialogtitel/Inhalt, Modus nach Minimieren |
| Timer / Sanduhr | Zwölf-Stunden-Grenze über +1 Minute, kein Abzug auf null vor Start, Pause nach Minimieren |
| Tagesablauf | Öffnen, minimieren, wieder öffnen |
| Bruch-Visualisierer | Inhalt nach Minimieren |
| Bruch-Visualisierer · Vergleich | Inhalt nach Minimieren |
| Glücksrad | Inhalt nach Minimieren |
| Stoppuhr | Start, Stopp, pausierter Stand nach Minimieren |
| Status-Ampel | Lautstärkeansicht nach Minimieren |
| Aufgaben-Checkliste | Standardinhalt nach Minimieren |
| Materialien & Links | Standardinhalt nach Minimieren |

Browser: echte Chrome-Prüfung im bestehenden Classroom-Routine-Workflow,
Tafelfläche 1366 × 768. Die Routine beginnt zusätzlich mit Mobilansichten 360/820.
Quelle: scripts/classroom-routine-browser-e2e.mjs.

## Korrekturen

- Timer: Minutenaddition respektiert die gleiche Obergrenze wie eigene Zeiteingabe.
- Timer: vorbereitete und pausierte Zeiten bleiben positiv. Während eines laufenden
  Countdowns darf −1 Minute weiterhin das Ende auslösen.
- Timer: Aktionsbuttons verwenden den Textfarbwert des gewählten Akzentthemas.
- Timer: abgelaufene Zeit bleibt als ruhige rote Anzeige stehen.
- Timer: Schnellauswahl, eigene Zeiteingabe und Optionen haben benannte Dialoge;
  Eingabefelder und Schließen-Schaltflächen sind beschriftet.

## Grenzen und nächste Schritte

Dieser Block ist eine Regression wichtiger Bedienabläufe, kein vollständiger
Funktionsnachweis jeder Konfiguration. Aufgabenbearbeitung, eigene Linklisten,
alle Klassengrößen, alle Theme-Kombinationen und Unterricht mit Touch-Tafel bleiben
weiter zu prüfen. Weitere Widgets folgen in Blöcken von zehn bis fünfzehn.
Der reale Teamteaching-/Gerätewechseltest bleibt gesondert offen.
