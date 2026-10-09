# Klassio: lange Texte in kleinen Widgets

Fortsetzung von Roadmap-Punkt 8 „Widgets“.

Aufgabenliste, Hausübungswidget und Hausübungen im Kinder-Wochenplan nutzen
eine gemeinsame Textvorschau. Wenn der Text tatsächlich mehr als zwei Zeilen
benötigt, erscheint „Ganz lesen“. Die große Leseansicht enthält den vollständigen
Text einschließlich langer Wörter und Links. Nur ihr Textbereich scrollt;
die Schließen-Schaltfläche bleibt sichtbar. Escape schließt die Ansicht und
der Tastaturfokus kehrt zur auslösenden Schaltfläche zurück.

Bei kurzen Aufgaben schaltet ein Textklick weiterhin den Erledigtstatus um.
Bei langen Aufgaben öffnet der Textklick die Leseansicht; das separate Häkchen
bleibt direkt bedienbar. Das Lesen verändert keinen Erledigtstatus.

Der Classroom-Browserlauf verwendet lange echte Aufgaben-/Hausübungseinträge
mit langen Links. Er prüft den vollständigen Text, die letzten Zeichen nach
dem Scrollen, fehlenden horizontalen Überlauf, sichtbare Schließen-Aktionen und
Escape/Fokusrückgabe bei 390 und 1366 Pixeln Breite. Minimieren/Wiederherstellen
und die Wochenwechsel bleiben Teil des bestehenden Ablaufs.

Die Geräteabnahme an der echten Touch-Tafel und weitere Widgets bleiben offen.
