# Tafelbild: Finger-/Stiftgesten zum Verschieben · 12.10.2026

Anschluss nach veröffentlichtem Zeichenfeld-Block #522 (`c6e6ee5b`).
Dieser Block ergänzt Eingabegrenzfälle im Fenster und in der Vollbildanzeige.

## Korrekturen

- Genau ein Kontakt besitzt eine Verschiebegeste. Andere Kontakte und rechte
  Maustaste können diese weder übernehmen noch beenden.
- Beide Bildflächen verwenden `touch-action: none`; Fingerbewegungen werden
  nicht in Browser-Scrollen/-Zoomen umgedeutet.
- Die zuletzt berechnete Position liegt in der Gestenreferenz. Up speichert
  seine finalen Koordinaten, Cancel/Capture-Verlust die letzte echte Bewegung.
  Eine ausstehende React-Darstellung verliert dadurch keine letzte Bewegung.
- Vollbild schließen speichert eine noch gehaltene Geste und löst Capture.
  Zoom, Rotation, Reset, Entfernen, Quellen-/externe Settings-Wechsel und Unmount
  entwerten die alte Geste. Ein spätes Up kann keinen neuen Bildstand überschreiben.

## Browsernachweis

Beide vollständigen bestehenden 360/820-Läufe laden ein echtes lokales PNG.
Native CDP-Eingaben prüfen Stift → Finger, zwei Finger mit separaten
vertrauenswürdigen Pointer-IDs, Loslassen des zweiten Kontakts, Capture-Verlust,
Touch-Cancel, finalen Up-Ort ohne vorheriges Move und rechte Maustaste.
Genaue Transformationskoordinaten werden nach Minimieren und vollständigem
Wiederöffnen geprüft. Dieselben Kontakte laufen durch die Vollbildfläche;
zusätzlich Escape bei gehaltenem Finger und Quellenwechsel vor spätem Up.
Keine injizierten Widget-Einstellungen oder synthetischen DOM-Pointerevents.

Vor Merge: TypeScript, vollständige Logiktests, Build und alle CI-Prüfungen
einschließlich beider Browserläufe. Nach Merge: exakten Release und Health prüfen.
Die Abnahme konkreter Touchtafel-/Stifthardware und Audio bleibt separat offen.
