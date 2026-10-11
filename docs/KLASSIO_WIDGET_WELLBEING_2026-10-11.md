# Widget-Prüfung: Wohlbefinden · 11.10.2026

Fortsetzung des Musikblocks aus PR #513.

| Widget | Korrektur |
| --- | --- |
| Atempause | Verstrichene Zeit gespeichert; vollständiges Schließen pausiert, Fortsetzen benötigt einen Klick. Zyklen direkt aus Zeit und Rhythmus berechnet. Kein doppeltes Zählen durch Nebenwirkungen in React-Updatern. Neustart setzt die Zeit zurück; Rhythmuswechsel beginnt neu. Phasenton beim Fortsetzen passend zur aktuellen Phase. AudioContext beim Pausieren, Stummschalten und Schließen freigegeben. |
| Stimmungsmesser | Beginnt mit null tatsächlichen Stimmen statt elf erfundenen Stimmen. Freiwilliges Stimmungsbild ohne Namen; keine technische Garantie gegen Mehrfachstimmen. Zählungen, letzte Stimmen und Rücknahme gespeichert. Leeren verlangt Bestätigung. |
| Wasserbedarf-Tracker | Entfernt pauschales Ziel von zehn Gläsern/2,5 Litern und Belohnung für dessen Erreichen. Erfasst eine Person mit wählbarer Glasgröße und korrekter Literrechnung. Gespeicherte Mengen, Korrektur, bestätigtes Leeren. Berechnet ausdrücklich keinen persönlichen Bedarf. |
| Zahnputz-Station | Gesamte 120 Sekunden für Kau-, Außen- und Innenflächen, je 40 Sekunden als Orientierung. Ausspucken statt Ausspülen nach Abschluss. Zeit und Tonwahl gespeichert; öffnet pausiert. Optionaler Phasenton mit kontrollierter Freigabe statt ständig neu erzeugter, ungeschlossener AudioContexts. |
| Gefühls-Barometer | Keine vorgegebene zufriedene Stimmung. Freiwillige Auswahl, neutraler Anfang, gespeicherte Auswahl und Löschen. Beschreibungen ohne Bewertung eines Gefühls als besser/schlechter und ohne Heilversprechen. |

Große Bedienelemente (mindestens 44 Pixel), native Mindestgrößen für die vier neu gestalteten Widgets: 640×560 Pixel. Keine personenbezogenen Stimmungsdaten.

Fachliche Grundlage für Zahnflächen, zweiminütige Putzdauer und Ausspucken ohne Nachspülen: https://www.nhs.uk/live-well/healthy-teeth-and-gums/taking-care-of-childrens-teeth/ . Wasser als Durstlöscher: https://www.dge.de/gesunde-ernaehrung/gut-essen-und-trinken/dge-ernaehrungskreis/getraenke/ . Die Trinkmenge wird nicht aus Erwachsenenempfehlungen für Kinder abgeleitet.

Validierung: 2.387 Bibliothekstests bestanden. Neue Rechenfälle decken leere/ungültige Stimmen, alle Zahnputz-Phasengrenzen, endliche Mengen und drei Atemrhythmen ab. TypeScript und Produktionsbuild werden geprüft. Browserroutine ergänzt reale Bedienung und vollständiges Schließen/Wiederöffnen aller fünf Widgets, einschließlich Zeitfortschritt und kompletter Putzdauer mit vorgerückter monotoner Uhr. Browserergebnisse und Veröffentlichung werden erst nach tatsächlicher grüner CI bestätigt.

Reale Lautsprecher- und Touchtafelprüfung bleiben offen.
