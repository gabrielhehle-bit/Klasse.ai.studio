# Klassio: normale Dienstansicht

Fortsetzung von Roadmap-Punkt 8 „Widgets“.

Die bisherige Mindesthöhe von 220 Pixeln und zu dichte Dienstseiten ließen
Titel, Kinder und Aktionen unter die Seitentasten rutschen. Das Widget erhält
520 Pixel Mindesthöhe und 540 Pixel bevorzugte Höhe. Seiten reservieren Platz
für Kopfzeile, Navigation, langen Titel und zwei Kinderkarten. Weitere Kinder
bleiben über den bereits vorhandenen vollständigen Dialog erreichbar.

Die Seitentasten stehen außerhalb des Inhaltsbereichs und bleiben sichtbar.
Vorhandene Dienst- und Schüler-IDs werden nicht verändert. Sehr kleine alte
Widgetlayouts werden durch die bestehenden Mindestgrößenregeln vergrößert.
Ein Scrollfallback bleibt für nicht abgenommene extreme Namensvarianten bestehen;
dieser Block versteckt keine übergroßen Inhalte durch overflow-hidden.

Die Classroom-Prüfung verändert die tatsächliche Widgetgröße über den
Südost-Griff auf 280×520, 380×520 und 650×520 Pixel. Mit langem Titel und
zwei zugeteilten Kindern werden Inhaltsmaße, alle Schaltflächen, unveränderte
Zuweisungen und feste Seitentasten geprüft. Auch eine aktive Vertretung und
alle durchlaufenen Dienstseiten werden auf innere Scrollfreiheit geprüft.

Offen bleiben sämtliche Theme-/Namensvarianten, sehr niedrige Tafelflächen,
weitere Widgets und reale Touch-Geräte. Keine Gesamtfreigabe aller 111 Widgets.
