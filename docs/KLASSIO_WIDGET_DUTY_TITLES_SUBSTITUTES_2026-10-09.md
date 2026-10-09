# Klassio: Diensttitel und Vertretungen

Fortsetzung von Roadmap-Punkt 8 „Widgets“.

Lange Diensttitel haben eine Zweizeilen-Vorschau mit „Ganz lesen“ und kompletter
Leseansicht. Umbenennen bleibt bis 80 Zeichen möglich; Eingabefeld und Symbolwahl
sind benannt und mindestens 44 Pixel hoch.

Die Vertretungsauswahl öffnet als nativer Dialog außerhalb des Widget-Rahmens.
Schließen und Abbrechen bleiben sichtbar; die Liste der anwesenden Kinder
scrollt bei Bedarf im ausdrücklich geöffneten Auswahlmodus. Escape schließt
und gibt den Fokus zurück. Namen werden umgebrochen statt abgeschnitten.

Der Classroom-Browserlauf verwendet die zuvor über Anwesenheit angelegte
entschuldigte Abwesenheit. Er prüft den langen Titel, unveränderte Zuweisungen
beim Lesen, ausschließlich anwesende Vertretungskandidaten, Dialogmaße bei
820/1366 Pixeln, Zuweisen, Minimieren/Wiederherstellen, Aufheben und Abbrechen.
Die Tagesbindung bestehender Vertretungen wird weiterhin in den Logiktests
geprüft. Datenmodell, originale Dienst- und Schüler-IDs bleiben erhalten.

Noch offen: große Zuweisungslisten im normalen Widget, sämtliche Namens- und
Themevarianten, alle anderen Widgets, echte Touch-Tafel und reale Gerätewechsel.
Dieser Block bestätigt keine vollständig scrollfreie Klassendienst-Ansicht.
