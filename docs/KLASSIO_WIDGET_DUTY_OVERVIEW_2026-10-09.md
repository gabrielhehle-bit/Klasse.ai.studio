# Klassio: alle Klassendienste auf einen Blick

Fortsetzung von Roadmap-Punkt 8. Gabs neue Anforderung vom 9. Oktober:
Alle Klassendienste und ihre Kinder sollen gleichzeitig sichtbar sein.

## Umsetzung

Das Widget startet mit einer kompakten Übersicht aller vorhandenen Dienste.
Namen werden direkt angezeigt, auch bei mehr als zwei zugeteilten Kindern.
Abwesende Kinder und ihre heutige Vertretung bleiben sichtbar. Diensttitel und
Namen brechen vollständig um. Acht Dienste nutzen zwei Spalten; zusätzliche
Dienste oder größere Fenster nutzen drei. Mindestfläche: 640 × 560 Pixel.

Ein Klick öffnet die Zuordnung bei unbesetzten Diensten bzw. die Kinderliste
mit Entfernen und Vertretung bei besetzten Diensten. „Bearbeiten“ wechselt zur
bestehenden Verwaltung; „Übersicht“ kehrt zur gesamten Liste zurück.
Die Verwaltungsseiten werden ausschließlich beim Bearbeiten angezeigt.

Eine absichtlich leere Dienstliste bleibt leer. IDs, bestehende Zuweisungen,
Vertretungen und die bisherigen Verwaltungsfunktionen bleiben erhalten.
Zuweisungs- und Kinderdialoge schließen Zustand und Fenster im selben Vorgang,
damit ein verspätetes natives close-Ereignis einen erneut geöffneten Dialog
nicht zurücksetzen kann. Escape und Schließen geben den Fokus zurück.

## Lokaler Nachweis

TypeScript, Produktionsbuild und alle 2.363 Tests bestanden.
Der Classroom-Browsernachweis beginnt mit 360/820 Pixeln und prüft die Tafel
anschließend bei 1366 × 768 Pixeln. Die Klassendienste-Abschnitte bestanden:

- acht Dienste gleichzeitig ohne Seitenwechsel oder Scrollen;
- alle zwölf Testkinder bei einem Dienst, einschließlich Abwesenheit;
- vollständiger Titel mit 80 Zeichen und heutige Vertretung;
- native Zuordnung, Suche, Kinderliste, Escape und Fokus-Rückkehr;
- echte Größenänderung auf 640/760/880 × 560 Pixel;
- neunter eigener Dienst, lange Titel, Minimieren und Wiederöffnen;
- unveränderte Dienst- und Kinder-IDs.

Der vollständige lokale 360-Pixel-Lauf bestand den Klassendienste-Abschnitt und
scheiterte später am Start des AudioContext im separaten Fokus-Klänge-Test.
Der gezielte 820-Pixel-Lauf endete erfolgreich. Der gezielte Modus wird mit
KLASSIO_E2E_WIDGET_FOCUS=dienste aktiviert; die CI nutzt weiterhin den gesamten
ungekürzten Lauf. Eine echte Touch-Tafel wurde nicht geprüft.

## Übergabe / offen

Lokaler Branch: fix/class-duties-overview.
Basis: 39375aa42410b21cb8ea75f762303846e9ee6b74 (veröffentlichter PR #501).

Vor Veröffentlichung müssen alle acht Prüfungen am endgültigen Stand bestehen.
Danach PR zusammenführen und den öffentlichen Release sowie /api/health bestätigen.
Erst anschließend den nächsten Fünferblock der übrigen Widgets bearbeiten.
