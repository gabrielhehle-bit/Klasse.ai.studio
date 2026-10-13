# Notenmappe: sichtbare Bewertungen und Vollbild

Ausgangspunkt: bc057480 / PR #532. Das Foto zeigte die Einzeleingabe für „LZK 1“, während der Reiter „Alle Bewertungen“ fälschlich aktiv erschien.

## Änderungen

- Einzeleingabe klar gekennzeichnet; direkter Rückweg „Zur Gesamtübersicht“ setzt Kategorie- und Fehlendfilter zurück.
- Reiter werden während der Einzeleingabe nicht als Gesamtübersicht markiert.
- Kategorieauswahl zeigt auch noch leere Eingabespalten.
- Unvollständige Spaltenzähler erhalten die Standardwerte für andere Kategorien. Gespeicherte Werte und Metadaten jenseits alter Spaltenzähler bleiben unter ihren ursprünglichen Indizes sichtbar.
- Vollbildknopf in der Kopfzeile; Browservollbild mit fensterfüllender Rückfallebene. Keine Neumontage der Eingabefelder. Schließen per Knopf bzw. Escape; Dialoge und Eingaben behalten ihren Escape-Ablauf.
- Keine Änderung oder Migration der gespeicherten Bewertungen.

## Prüfung

- 2.455 Tests bestanden, einschließlich gespeicherter Bewertungen jenseits alter Spaltenzähler und fehlender Zähler.
- TypeScript und Produktionsbuild erfolgreich.
- Browserregression erweitert: eindeutiger Einzelspaltenstatus, Gesamtübersicht, fensterfüllende Geometrie und unveränderte Eingabewerte beim Wechsel in/aus Vollbild. Ausführung über bestehende Browser-CI; lokal ist kein Browser verfügbar.
