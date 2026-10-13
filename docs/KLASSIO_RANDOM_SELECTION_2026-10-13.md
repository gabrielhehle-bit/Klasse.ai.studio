# Zufallsauswahl zusammenführen

Namen ziehen, Glücksrad und Faire Runde sind im regulären Zufallsauswahl-Widget auswählbar. Bestehende Namensauswahl-Einstellungen bleiben an ihrem ursprünglichen Platz; Glücksrad-Einstellungen und Faire-Runde-Zustand liegen getrennt unter `selectionWheel` und `selectionFair`. `randomSelectionMode` speichert die Auswahl. Alte Glücksrad- und Fair-Call-Widgets bleiben unverändert erreichbar.

Bereits besuchte Varianten bleiben montiert. Ziehung, Teilnehmerauswahl und Rad-Ergebnis bleiben beim Wechsel erhalten. Während einer Ziehung sind Moduswechsel gesperrt. Die flüchtige Namensauswahl und Rad-Historie werden weiterhin beim Schließen gelöscht; die Faire Runde behält ihren bestehenden Klassen-/Tagesbezug. Es erfolgt keine Übernahme oder Überschreibung der Ergebnisse separater Altwidgets.

Das Kopf-Zahnrad öffnet für Namen die bestehenden zentralen Voreinstellungen, für das Glücksrad dessen Editor und für Faire Runde eine deckende Signalton-Konfiguration. Eigene Begriffe, Zahlen und anwesende Kinder bleiben im Rad nutzbar. Faire Runde unterstützt weiterhin Rücknahme und Pausieren einzelner Kinder.

Der erweiterte Chrome-Unterrichtslauf zieht tatsächlich Namen, dreht das Rad und ruft fair ein Kind auf. Er prüft die Wechsel-Sperre, alle drei Ergebnisse nach Moduswechseln, Einstellungen des aktiven Modus und die Wiederherstellung der Fairen Runde nach Minimieren. Bestehende Prüfungen der Einzelwidgets bleiben erhalten. Separate Tests prüfen die Isolation der gespeicherten Einstellungen.
