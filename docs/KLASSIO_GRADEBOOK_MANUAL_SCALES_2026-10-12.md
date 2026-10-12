# Notenmappe: manuelle Bewertung nach Fachskala · 12.10.2026

Anschluss an den veröffentlichten Konsistenz-Block #525 (`56877f1b`).

## Befunde und Korrektur

Im Mitarbeit-Reiter bot die manuelle Bewertung ausschließlich Notenknöpfe 1–5
an, auch wenn das Fach Punkte oder Prozent verwendete. Diese Fachskalen erhalten
jetzt das bestehende Dezimaleingabefeld mit Einheit und maximaler Punktzahl.
Notenknöpfe bleiben für die Notenskala erhalten. Die Ergebnisanzeige benennt
Punkte/Prozent; eine erfasste 0 bleibt sichtbar und löschbar, fehlende Werte
erscheinen als Gedankenstrich.

Die Prüfung verdächtiger Werte verwendete stets die Notengrenzen 1–5.
Sie prüft jetzt anhand der bestehenden Fachskala und bietet passend zu ihr
Korrekturgrenzen an; gültige 0 Punkte/Prozent und 50 % sind keine ungültigen Noten.

Die Bestätigung beim Wechsel der Bewertungsart übersah ausschließlich manuelle
Mitarbeitwerte. Sie berücksichtigt diese jetzt in beiden Semestern einschließlich
0, damit ihr Bedeutungswechsel ebenso bestätigt werden muss wie andere Leistungen.

## Nachweise und offene Prüfungen

Zwei Regressionen prüfen manuelle Werte beim Skalenwechsel mit Fach-/Roster-
Isolation sowie gewichtete Punkt-/Prozentberechnung für 0, halb, voll und fehlend.
Die bestehenden 2.432 Logiktests sind grün. Die vorhandene Gesamtnotenberechnung
für manuelle Punkte/Prozent bestand diese Grenzfälle ohne Änderung.

TypeScript und Produktionsbuild sind grün. Die erweiterte
Browsermatrix enthält reale Eingaben in Punkte/Prozent, sichtbare 0 und Löschung
sowie verschlüsselte Wiederherstellung; ihre Ausführung steht noch aus.
Browserprüfungen der neuen Skalenfelder, Warnungen, bestätigter/abgebrochener
Skalenwechsel und verschlüsselter Wiederherstellung sind vor Veröffentlichung
offen. Dieser Block schließt weitere Notenmappe-Konfigurationen nicht pauschal ab.
