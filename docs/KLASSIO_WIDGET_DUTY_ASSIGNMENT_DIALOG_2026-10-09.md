# Klassio: Kinder zuordnen

Fortsetzung von Roadmap-Punkt 8 „Widgets“.

Die bisherige Inline-Auswahl weicht einem nativen Dialog außerhalb der kleinen
Dienstkarte. Kopfzeile, Suche und Schließen bleiben sichtbar; die Klassenliste
scrollt bei Bedarf im ausdrücklich geöffneten Auswahlmodus. Namen werden
umgebrochen statt abgeschnitten. Die Spalten passen zur Dialogbreite,
Auswahl-Schaltflächen und Suche sind mindestens 44 Pixel hoch.

Die bestehende Mehrfachauswahl übernimmt Änderungen sofort. Häkchen,
Auswahlzustand und Anzahl zeigen die Zuordnung. Abwesende Kinder sind
gekennzeichnet. Die Suche ignoriert Groß-/Kleinschreibung und äußere Leerzeichen;
ohne Treffer erscheint eine Rückmeldung. Beim Öffnen wird der Suchfilter geleert.
Escape und Schließen geben den Fokus an die Zuweisungsaktion zurück.

Der Classroom-Browserlauf prüft den Dialog außerhalb der Karte, Suche,
Filterwechsel ohne Auswahlverlust, keine Treffer, Escape, erneutes Öffnen,
schmale 390-Pixel-Dialogansicht sowie Tablet/Desktop. Die Geometrieprüfung
wird mit kurzem und langem Diensttitel ausgeführt. Der bestehende Ablauf
prüft weiterhin Mehrfachauswahl, Wiederherstellung, Vertretungen und große
Kinderlisten mit ursprünglichen IDs.

Offen bleiben die allgemeine Scrollfreiheit bei sämtlichen Widgetmaßen,
weitere Widgets, Theme-/Namensvarianten und reale Touch-Geräte.
