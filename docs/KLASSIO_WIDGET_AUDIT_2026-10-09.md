# Klassio: gemeinsame Widget-Prüfblöcke vom 9. Oktober 2026

Referenz: Punkt 8 „Widgets“ der bestehenden Roadmap. Seit diesem Tag werden jeweils
fünf Widgets gemeinsam umgesetzt und im bestehenden Chrome-Workflow geprüft.
Der ältere Katalogdurchlauf ist kein vollständiger Nachweis aller Funktionen.

## Veröffentlichter Deutsch-Block: PR #500

- Lernwörter-Studio (`vocabulary`)
- Rechtschreib-Detektiv (`spellingdetective`)
- Wort-Baukasten (`wordbuilder`)
- Wort- & Satzwerkstatt (`scrambler`, Legacy-Alias)
- Zusammengesetzte Wörter (`compoundsplit`)

Nachweis: Import von sieben eigenen Wörtern, Dubletten, Bearbeiten/Löschen/Ergänzen,
Karten und Tastatur, echte Doppelkonsonanten-Markierungen, vollständige ABC-Seiten,
eigene Wort-/Satz-/Kompositum-Aufgaben, falsche/richtige Reihenfolge, Lösungen und
Minimieren/Wiederöffnen. Native Einstellungen mit Escape und Rückkehr zum Zahnrad.
640×560 bzw. 620×560 Mindestfläche; aktive Ziele mindestens 44×44 Pixel und erreichbar.
Alle acht Prüfungen bestanden; Veröffentlichung auf klassio.at bestätigt.
Release: `96c283ac7064bff232d313b606746b4213d81086`.

## Nächster Deutsch-Block: PR #501

| Widget | Gemeinsamer Chrome-Nachweis | Mindestfläche |
| --- | --- | --- |
| Wortketten-Spiel | Falscher Anfang, Tipps, 17 Wörter, Dublette, Rücknahme, alle Seiten, gespeicherter Entwurf | 500×520 |
| Buchstaben-Suchgitter | Alle echten Zielwörter in 5×5, 6×6 und 9×9 lösen, falsche Auswahl, Sterne und exakte Wiederherstellung | 640×560 |
| Wort-Salat | Elf Buchstaben von HAUSAUFGABE, falscher Anfang, reparierter Tipp, Lösung und genau einmalige Wertung, nächste Aufgabe | 600×560 |
| Geheimsprachen-Box | Caesar mit Überlauf, ROT13-Rückübersetzung, gespeicherte Methode/Botschaft | 440×420 |
| Story-Emojis | Sechs Bilder, eigener Auftrag, Beschriftungen, Sperren/Behalten, Verschieben, einzelner Austausch, genaue Wiederherstellung und Zahnrad/Escape/Fokus | 640×560 |

Beide gemeinsamen Browserläufe (360/820 Einstieg, anschließend 1366×768 Tafel)
bestanden; Screenshots werden als Workflow-Artefakte aufbewahrt. Der Browser löst
die sichtbaren Aufgaben selbst, ohne korrekte Antworten in den Zustand einzusetzen.
Die kleine Gitter-Generierung wird zusätzlich mit konstanten und zufälligen
Zahlenquellen geprüft: jedes angeforderte Wort muss tatsächlich enthalten sein.
Auswahlen müssen eine zusammenhängende Zeile oder Spalte bilden. Alte gültige
Gitter bleiben erhalten, unlösbare werden durch eine neue Runde ohne alte Sterne
ersetzt. Ausgelöste kurze Töne schließen ihren AudioContext nach dem Ton.

Vor Merge müssen alle acht Prüfungen für den endgültigen Commit grün sein.
Nach Merge muss der öffentliche Release exakt diesem Commit entsprechen und
`/api/health` den Status `ok` melden.

## Weiterhin offen

Echte Touch-Tafel und Hörprüfung; lange freie Inhalte und weitere Konfigurationen
über die konkreten Prüffälle hinaus. Die übrigen Widgets der Roadmap folgen in
weiteren Fünferblöcken. Die in PR #500 geänderte gemeinsame Wortwerkstatt bedeutet
keinen separaten Browsernachweis für den Katalogtyp `wortsatzwerkstatt`.
