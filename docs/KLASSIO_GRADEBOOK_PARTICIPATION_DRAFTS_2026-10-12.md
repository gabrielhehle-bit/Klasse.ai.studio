# Notenmappe: sichere direkte Mitarbeitseingabe · 12.10.2026

Anschluss nach veröffentlichtem Tafelbild-Block #523 (`d989f3e0`).
Die bestehende Jahreswertung bleibt im Fachzähler 1; Monat/Woche/Semester
werden weiterhin aus dem Fachjournal berechnet. Sozialsterne bleiben getrennt.

## Konkreter Fehler

Das bisherige Zahlenfeld schrieb bei jedem `onChange` einen neuen Gesamtstand.
Das Ersetzen von 12 durch 15 konnte deshalb erst 1 speichern, elf frühere
Punkte zurücknehmen und danach vierzehn neu protokollieren. Auch das kurzzeitige
Leeren setzte Punkte auf 0. Ein Abbruch konnte diese Journaländerungen nicht
zurücknehmen, selbst wenn später dieselbe Endzahl angezeigt wurde.

## Korrektur

Das Feld hält Text als lokalen Entwurf. Enter, Auf-/Ab-Navigation oder Blur
übernimmt ausschließlich die vollständige gültige Zahl. Escape verwirft;
leere Eingaben werden verworfen statt zurückgesetzt. Explizite 0 bleibt möglich.
Negative, gebrochene, gemischte, exponentielle oder unsicher große Werte werden
nicht gespeichert. Ungültige Eingaben sind markiert und zugänglich erklärt;
Enter zeigt die native Browservalidierung und wechselt nicht zum nächsten Kind.
Externe Zähleränderungen sind maßgeblich; Fach-/Klassen-/Kindkontext remountet
das Feld, damit ein alter Entwurf nicht in einen anderen Datensatz gelangt.
Plus/Minus und die bestehende Fachjournal-/Undo-Logik bleiben erhalten.

## Nachweise und Grenzen

Drei Logiktests prüfen vollständige Zahlen, harte Schreibvalidierung und die
Erhaltung ursprünglicher Awards/Undo-Verknüpfungen bei einer einzigen finalen
Änderung. Die vollständige 360/820-Chrome-Matrix tippt real per CDP, prüft
unveränderte Diagrammwerte während Entwürfen, Enter/Blur/Zeilenwechsel, Escape,
Backspace/leeres Feld, ungültige/unsichere Zahlen, alle vier Zeitraumfilter,
Fachwechsel bei Fokus und gespeicherte 0 nach verschlüsseltem Reload.
Keine injizierten Mitarbeitseinträge oder App-State-Änderungen.

Vor Merge: TypeScript, vollständige Tests, Produktionsbuild und alle CI-Checks.
Nach Veröffentlichung: exakten Release und `/api/health` bestätigen und im PR
dokumentieren. Weitere Notenmappe-Konfigurationen sowie die übrigen Module
Statistik, KEL, Schülerdossier und Planung bleiben separate Prüfblöcke.
