# Lautstärke und Arbeitsampel: gemeinsamer Einstieg

Fortsetzung nach PR #531, übernommen auf den veröffentlichten Stand von PR #533 (`5aa8ad82601486081a42c4ebbee29b3d5d0d5996`). Die Notenmappe und ihre Speicherlogik bleiben unverändert.

Das reguläre Widget bietet Arbeitsampel, Lautstärkevorgabe und Live-Pegel in einem Fenster. Die Auswahl zeigt dafür einen gemeinsamen Einstieg ohne zusätzliche Varianten-Schaltfläche. Die bisherigen Einzelwidgets bleiben unter Weitere Widgets erreichbar.

Ansicht, Lautstärkevorgabe und Mikrofon-Empfindlichkeit werden getrennt in den Widget-Einstellungen gespeichert und beim Minimieren sowie Schließen/Wiederöffnen erhalten. Der gemeinsame Arbeitsmodus bleibt weiterhin an den Klassenstatus gekoppelt. Ungültige gespeicherte Ansichten fallen auf die Arbeitsampel zurück. Das Kopf-Zahnrad öffnet eine deckende Empfindlichkeitsauswahl.

Der Live-Pegel startet ausschließlich über Messung starten. Wechsel aus der Live-Ansicht, Minimieren und Schließen geben das Mikrofon frei. Eine verspätet erteilte Berechtigung nach Verlassen der Ansicht wird ebenfalls beendet. Wiederherstellen startet keine Messung. Die Fenster-Mindestgröße berücksichtigt die drei Ansichten und reserviert Platz für den Größen-Ziehgriff.

## Prüfung

- TypeScript und Produktionsbuild erfolgreich.
- 2.448 Modell- und Regressionstests mit `TZ=Europe/Vienna node --import tsx --test src/lib/*.test.ts` erfolgreich. Der Node-Lauf mit der Umgebungszeitzone scheitert an einem unveränderten Datumstest in starsReview; die Wiener Zeitzone besteht. Die CI verwendet den bestehenden Bun-Testlauf.
- Browserroutine erweitert: reale Ansichtswechsel, erhaltene Lautstärkevorgabe und Empfindlichkeit, expliziter Mikrofonstart, Beenden bei Ansichtswechsel/Minimieren, verspätete Berechtigung sowie vollständiges Wiederöffnen. Trefferprüfungen kontrollieren Größe und Erreichbarkeit sichtbarer Schaltflächen.
- Laptop-/Tablet-Browserläufe und Veröffentlichung werden über die bestehenden GitHub-Workflows geprüft. Ein echtes Klassenraummikrofon muss weiterhin vor Ort getestet werden.

## Abgleich mit aktuellem Stand

- 2.457 Tests auf dem Stand von PR #533 mit Wiener Zeitzone erfolgreich.
- Die Browserprüfungen zum Werterhalt der Notenmappe und Vollbild bleiben im Unterrichtslauf enthalten.
- Änderungen betreffen nur das gemeinsame Lautstärke-/Arbeitsampel-Widget, dessen Katalog/Größen und die zugehörigen Prüfungen.

Auch der bisherige einzelne Lautstärkemesser beendet aktive und noch ausstehende Mikrofonfreigaben beim Minimieren. Wiederherstellen startet keine Messung. Die Browserroutine deckt beide Fälle separat für gespeicherte Einzelwidgets ab.
