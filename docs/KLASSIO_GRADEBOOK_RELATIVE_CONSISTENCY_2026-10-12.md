# Notenmappe: konsistente relative Mitarbeitbewertung · 12.10.2026

Anschluss an den veröffentlichten Eingabe-Block #524 (`6edcfbba`).

## Befund

Die Mitarbeitzeile verwendete den Schnitt der Kinder mit Punkten; die gemeinsame
Gesamtnotenberechnung bezog auch Kinder ohne Punkte ein. Bei 10/10/0 Punkten
zeigte die Zeile Note 3, die Gesamtberechnung dagegen Note 1. Bei einer Klasse
mit ausschließlich gespeicherten Nullen konnte die Gesamtnote sogar 1 werden.
Ein expliziter relativer Grenzwert von 0 wurde in der Zeile durch den Standard
ersetzt; ein nur teilweise gespeicherter Grenzwertsatz ließ die gemeinsame
Berechnung fehlende Grenzen als NaN vergleichen.

## Korrektur

Die Zeile verwendet dieselbe `miZuNote`-Berechnung wie die Gesamtnote.
Der bestehende Maßstab der Zeile bleibt maßgeblich: Nur Kinder mit Punkten
bestimmen den Schnitt. Gespeicherte 0 ergibt in relativer Bewertung Note 5;
ein fehlender Zähler bleibt in der Gesamtnote ohne Bewertung.
Relative Grenzen erhalten einzelne Standardwerte ausschließlich bei fehlendem
Eintrag (`??`), sodass ausdrücklich eingestellte 0 erhalten bleibt.

## Prüfung

Drei Regressionen prüfen 10/10/0 samt Gesamtnote und Prozentmodus, die leere
gegenüber der mit 0 erfassten Klasse, teilweise konfigurierte Grenzen und 0 %, 
Fach-/Semester-/Roster-Isolation sowie unbestätigte relative Bewertung.
Vor Veröffentlichung sind vollständige Logiktests, TypeScript, Build und die
anwendbare bestehende Browser-CI auszuführen. Dieses Dokument bescheinigt keine
neue Hardwareprüfung und keinen vollständigen Abschluss der Notenmappe.
