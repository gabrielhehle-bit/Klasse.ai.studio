# Klassio: große Zuweisungslisten

Fortsetzung von Roadmap-Punkt 8 „Widgets“.

Ab drei zugeteilten Kindern zeigt die Dienstkarte eine kompakte Anzahl mit
Abwesenheiten statt einer immer längeren Liste. „Alle … Kinder ansehen“ öffnet
die vollständige Liste als nativen Dialog außerhalb des Widget-Rahmens.
Namen erhalten eine eigene Zeile; Entfernen und Vertretung stehen darunter.
Der Dialog passt die Spalten an seine verfügbare Breite an. Nur die ausdrücklich
geöffnete vollständige Liste scrollt bei vielen Kindern; Schließen bleibt sichtbar.

Vertretungen öffnen über der Kinderliste. Escape kehrt zuerst zur Kinderliste
und anschließend zur Übersicht zurück. Sinkt die Anzahl auf zwei Kinder,
werden sie wieder direkt angezeigt und Schließen fokussiert „Kinder zuordnen“.
Die vorhandenen Zuweisungen und temporären Vertretungen behalten ihre IDs.

Der Classroom-Browserlauf teilt alle zwölf Testkinder über die Oberfläche zu,
prüft die gleichbleibende Übersichtshöhe, vollständige eindeutige IDs, Namen,
Touch-Schaltflächen und das Erreichen des letzten Kindes bei 390 Pixel
Dialogbreite sowie 820/1366 Pixel Viewportbreite. Er prüft verschachtelte
Vertretungsauswahl, Escape, Entfernen bis auf die beiden ursprünglichen
Kinder und die Rückkehr des Fokus nach dem Wechsel zur direkten Anzeige.

Offen bleiben die Inline-Zuweisungsauswahl, sämtliche Theme-/Namensvarianten,
eine durchgehend scrollfreie Diensteansicht und echte Touch-Geräte.
