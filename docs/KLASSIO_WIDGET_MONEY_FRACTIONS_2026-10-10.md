# Geldbörse, Bruchvergleich, Bruch-Kuchen, Bruch-Raster und Multi-Trainer

Basis: veröffentlichter PR #509, bd87ea3c1aea33e302fc9a539bc8b48953dbc63b.

Die drei Bruch-Katalogeinträge verwenden den aktiven FractionVisualizer. Die alten gleichnamigen Funktionen sind kein Nachweis. Canonical settings take precedence over legacy migration, including edited primary/secondary fractions, representation and reveal state. Regression verifies 7/12 > 3/8 for all three aliases with conflicting legacy data.

Geldbörse persists actual coins/bills, target, level, mode and feedback. Amount is derived in integer cents from actual money rather than a separately updated counter. Audio contexts close after short sounds. Browser coverage composes a difficult target from real denomination buttons and restores exact money and success. Fraction coverage changes a visible numerator and verifies minimize and close restoration for each alias. Multi-Trainer uses the active KopfrechenStudio; edited correct answers and unfinished input now also receive the existing close/reopen browser check.

Minimums: Geldbörse 760×560; the three Bruch aliases 640×560. Preset buttons at least 44×44. Compare controls identify Bruch A/B. Katalog descriptions now match actual strip visualization and multiplication/inverse practice.

Local tests, TypeScript, production build and both complete Chrome routines must pass before merge. Physical touch hardware and listening remain open. Final CI/deployment evidence is recorded in the PR.

Zusätzliche vorbereitete Browserfälle: Unterzahlung, Überzahlung, Münzen/Scheine entfernen und korrekt zahlen auf allen drei Stufen; exakte Wiederherstellung auch nach Fehlversuchen. Diese Fälle wurden im endgültigen Chrome-CI-Lauf ausgeführt und bestanden. PR #510 ist nach allen acht grünen Prüfungen veröffentlicht; Release `75707366b2a0ee6443a8fe431a8356de78e0ad35`, Production Deploy erfolgreich, öffentliche Release-SHA und Health bestätigt.

## Zusätzlicher lokaler Funktionsnachweis

Die aktiven React-Komponenten wurden in JSDOM tatsächlich gemountet, über echte React-Klickereignisse bedient, vollständig unmountet und mit gespeicherten Widget-Einstellungen erneut gemountet. Geldbörse: 20 c + 10 c, Entfernen, alle drei Schwierigkeitsstufen mit Unterzahlung/Überzahlung, anschließendes Korrigieren, unabhängig aus dem sichtbaren Zielbetrag zusammengesetzte richtige Lösung, Wiederherstellung des exakten Textes und Sperre weiterer Geldzugabe nach Erfolg. Alle Fälle bestanden.

Für jeden der drei Bruch-Katalogtypen wurden Kreis, Streifen und Vergleich über die tatsächlichen Einstellungen ausgewählt, Nenner und Zähler verändert, im Vergleich Bruch A/B getrennt bedient und nach vollständigem Unmount exakt wiederhergestellt. Alle neun Kombinationen bestanden. Zusätzlich wurden 7.744 Bruchvergleiche unabhängig über Kreuzmultiplikation und 264 Alias-Wiederherstellungen geprüft; 34 gezielte Bibliothekstests bestanden.

Dieser DOM-Nachweis bestätigt Funktionen und Wiederherstellung, enthält aber keine Browser-, Layout-, Audio- oder Touch-Hardwareprüfung. Der erste lokale Chrome-Download lieferte kein verwendbares ZIP. Anschließend wurde lokaler Chromium verfügbar; echte Browser-CI, Upload und Veröffentlichung wurden erfolgreich abgeschlossen (PR #510).

Die Chrome-CI deckte verdeckte Bedienelemente unter dem Dock auf. Bruchvergleich und Geldbörse sind nun für 560 Pixel Rahmenhöhe kompakter angeordnet; alle Geldstück- und Direktaktionsflächen behalten mindestens 44 Pixel. Doppelte Fehlermeldungen in der Geldbörse entfallen zugunsten der bestehenden konkreten Haupt-Rückmeldung. Native Mindestgrößen werden im gemeinsamen Browserlauf ausdrücklich durch Ziehen geprüft.
