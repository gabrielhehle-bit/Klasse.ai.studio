# Tafelbild: Funktions- und Browserprüfung · 11.10.2026

Fortsetzung nach PR #518. Der bisher fehlende eigenständige Tafelbild-Nachweis
wird in beide bestehende Classroom-Routine-Läufe aufgenommen.

- Echter PNG-Dateiupload über die Browser-Dateieingabe. Nicht unterstützte und
  beschädigte Dateien ersetzen das vorherige Bild nicht.
- Alle vier Rotationen bleiben bei 100 % vollständig in der gemessenen Bildfläche;
  bewusstes Vergrößern bleibt möglich. Vollbild verwendet seine eigene Fläche.
  Ziehen bewegt das Bild entlang der Bildschirmachsen, auch bei Rotation.
- Zoom, Rotation, Verschiebung und Beschriftung nach Minimieren und vollständigem
  Schließen/Wiederöffnen. Entfernen bleibt bei älteren `url`-Snapshots wirksam.
- Native Dialoge für Einstellungen, Beschriftung, Bildadresse, Materialauswahl
  und Vollbild; Escape schließt und gibt den Fokus an den vorhandenen Auslöser
  zurück. Bedienflächen mindestens 44 Pixel; Werkzeugleiste kann umbrechen.
- Langsames Dateilesen darf einen neueren Upload nicht überschreiben. Unmount,
  Quellenwechsel und Entfernen entwerten ausstehende Uploads. Temporäre Object-URLs
  werden auch im Fehlerfall freigegeben.

Mindestfenster: 620×480; Standard: 680×520. Keine produktiven Klassenbilder in
Prüfungen: nur lokal im Test erzeugte Landschafts-/Hochformat-PNGs.

Drei neue Logiktests: ausdrückliches Entfernen trotz Legacy-URL, beschädigte
Transformationen, unverzerrtes Einpassen bei allen vier Rotationen.
CI am endgültigen Commit und Veröffentlichung sind vor Abschluss zu bestätigen.
Echte Touch-/Stiftbedienung sowie zusätzliche Material-/Webquellen bleiben
separate Prüffälle; diese Änderung erklärt nicht den gesamten Katalog für fertig.
