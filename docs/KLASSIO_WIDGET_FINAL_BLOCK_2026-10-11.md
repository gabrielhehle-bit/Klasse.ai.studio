# Klassio: Abschlussblock der Widget-Inhaltsprüfung – 11. Oktober 2026

## Ausgangslage

Der aktuelle sichtbare Cockpit-Katalog enthält **112 eindeutige Registry-Typen**. Die früheren Angaben 108 beziehungsweise 111 stammen aus älteren Prüfschritten und sind nicht mehr die aktuelle Registry-Zahl.

Nach Abgleich der bisherigen Widget-PRs bleibt als letzter Registry-Restblock:

- `zahlenraum`, `anschauung`, `numberline` – ein gemeinsames Zahlenraum-Studio
- `image` – Tafelbild
- `sounds`, `soundmachine` – Musik & Klänge mit Legacy-Klang-Maschine
- `weather` – aktueller Wetterbericht
- `scrambler` – Legacy-Einstieg in die Wort- & Satzwerkstatt

Damit sind acht Registry-Typen, aber nur fünf eigenständige Funktionsbereiche übrig.

## Korrekturen in diesem Block

### Musik & Klänge

Beim Wechsel des Musikbereichs oder der Lautstärke wurde bisher das komplette `settings`-Objekt ersetzt. Dadurch konnten Einstellungen anderer Musik-Unterbereiche verloren gehen. Änderungen werden jetzt mit dem vorhandenen Zustand zusammengeführt.

Regressionstests sichern:

- Bereichswechsel behält Lautstärke und Rhythmus-/Naturklang-Zustand.
- Lautstärkeänderung behält den gewählten Bereich und Unterbereichsdaten.
- unbekannte alte Bereichswerte fallen sicher auf `signals` zurück.

### Sichere Mindestgrößen

Die letzten nicht vollständig abgenommenen Flächen erhalten beziehungsweise teilen jetzt explizite Mindestgrößen:

- Zahlenraum / Anschauung / Zahlenstrahl: 620 × 560
- Tafelbild: 460 × 420
- Klang-Maschine: 340 × 520, identisch mit Fokus-Klänge
- Wetter: 360 × 420
- Scrambler bleibt bei 620 × 560
- Musik & Klänge bleibt bei 840 × 560

Dadurch können die gemeinsamen Bedienelemente nicht mehr auf die alten 300 × 220 beziehungsweise 280 × 200/220 Pixel zusammengeschoben werden.

## Katalogvertrag

Ein dauerhafter Test hält fest:

- 112 sichtbare und eindeutige Registry-Typen
- Vorhandensein aller acht Abschluss-Typen
- `anschauung` und `numberline` → `zahlenraum`
- `soundmachine` → `sounds`
- `scrambler` → `wortsatzwerkstatt`

`image` und `weather` bleiben eigenständige Registry-Typen und werden nicht künstlich in einen der 20 Kernwidget-Aliase gezwungen.

## Noch getrennt zu prüfen

Die automatischen Bibliotheks-, TypeScript-, Build- und vorhandenen Browserprüfungen müssen auf dem endgültigen PR-Commit grün sein. Reale Touchtafel-, Lautsprecher-, Mikrofon- und echte Netzwerk-/Wetterabnahme bleiben Hardware-/Praxisprüfungen und sind nicht Teil des reinen Registry-Abschlusses.
