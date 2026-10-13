# Kompakte Notenmappe – 13.10.2026

## Ergebnis

Eine Kopfzeile enthält Fachwahl, Schuljahr, Bewertung hinzufügen und das Werkzeugmenü. Notenrechner, Notenübersicht, Auswertungen, Feedback, Gewichtungen und Ansichtseinstellungen bleiben im Menü erreichbar. Die bestehende Schuljahresdarstellung bleibt erhalten.

Die kompakte Tabelle zeigt nur Spalten mit Bezeichnung, Datum, Bereich, Höchstpunkten, gespeicherten Werten oder expliziter Nichtteilnahme. Gespeicherte Slot-Indizes und sämtliche Bewertungsdaten bleiben unverändert; insbesondere 0 Punkte bleiben sichtbar. Auch vorhandene Daten im zweiten Semester verhindern das Ausblenden. Die erweiterte Ansicht stellt die bisherigen Platzhalter wieder her.

LZK, Wochenpläne, Schularbeiten und sonstige Leistungen lassen sich gezielt filtern. Kopf, Zeilen und Klassenschnitt verwenden dieselben Spaltenindizes. Unvollständige Bewertungen beziehen sich auf die sichtbaren Spalten. Direkte Zelleneingabe sowie Enter, Shift+Enter und Escape bleiben bestehen.

Spaltennamen ersetzen wiederholte Eintragen-Schaltflächen. Teilnahme und Klassenschnitt-Ausnahme werden über aufklappbare Zell-/Namensoptionen bearbeitet. Nichtteilnahme wird als n. t., Ausschluss aus dem Schnitt als Ohne Schnitt angezeigt. SPF/ESPF-Badges bleiben sichtbar; die Teilnahme- und Durchschnittsberechnung wurde nicht verändert.

## Prüfung

- 2.450 Tests erfolgreich mit TZ=Europe/Vienna, einschließlich drei neuer Regressionstests zur Spaltensichtbarkeit.
- TypeScript und Produktionsbuild werden vor dem Upload geprüft.
- Der erste UTC-Testlauf enthielt einen bestehenden Zeitzonenfehler in starsReview.test.ts. Der vollständige Lauf in Europe/Vienna besteht.
- Keine Browser-/Touchprüfung in dieser Sitzung: die für diese Umgebung vorgesehene Browsersteuerung ist nicht verfügbar. Vor einer Freigabe müssen kleine und große Ansichten, Zellmenüs, Filter, neue Bewertungen und Tastatureingabe visuell geprüft werden.

## Noch zu prüfen

17 Kinder ohne Bewertungen; vorhandene LZK mit 0 Punkten; ausgeschlossene Teilnahme und Wiederaufnahme; SPF/ESPF-Ausnahmen; Filterwechsel; leere Spalten zwischen belegten Spalten; neue Bewertung ohne Eintrag; Scrollen; Druckansicht.
