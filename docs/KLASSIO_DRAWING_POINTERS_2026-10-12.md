# Zeichenfeld: Stift, Finger und abgebrochene Gesten · 12.10.2026

Fortsetzung nach dem veröffentlichten Tafelbild-Block #521 (`5db48722`).
Der Abgleich aller 112 Widget-Einträge ist abgeschlossen; dieser Block prüft
zusätzliche Eingabegrenzfälle vor der separaten Abnahme an echter Hardware.

## Fehler und Korrektur

- Nach Stift-Up blieb der Typ `pen` dauerhaft gesetzt. Fingerstriche wurden
  deshalb bis zum erneuten Einhängen des Widgets ignoriert. Die Sperre gilt
  jetzt nur für die laufende Geste und endet bei Up, Cancel oder Capture-Verlust.
- Ein zweiter Finger konnte die aktive Pointer-ID und den begonnenen Strich
  ersetzen. Ein laufender Kontakt behält jetzt seinen Strich; weitere Kontakte
  können ihn weder bewegen noch beenden.
- Rechte/mittlere Maustaste starten keinen Strich.
- Verlorenes Pointer-Capture beendet und speichert den begonnenen Strich einmal.
  Ein späteres Up desselben Kontakts erzeugt keine zweite Speicherung.

## Browsernachweis

Die bestehende 360/820-Chrome-Matrix sendet native CDP-Stift-, Maus- und
Touchkontakte, keine synthetischen DOM-Pointerevents und keine injizierten
gespeicherten Striche. Sie prüft Stift → Finger, einen zweiten Finger während
des ersten Strichs, das Loslassen des zweiten Fingers, rechte Maustaste,
Capture-Verlust, Touch-Cancel und erneutes Zeichnen. Die genaue Strichzahl bleibt
beim Minimieren und vollständigen Wiederöffnen erhalten. Der bestehende Test
prüft weiterhin tatsächliche rote Canvas-Pixel und Undo/Redo.

Lokal bestanden: TypeScript, alle 2.424 Logiktests, Produktionsbuild und
JavaScript-Syntaxprüfung des erweiterten Browserlaufs. Der neue Branch
`fix/drawing-pointer-ownership` ist in PR #522 hochgeladen. Der erste
Browserlauf bestätigte Stift → Finger, scheiterte jedoch am Testprotokoll:
Die partielle Touch-End-Nachricht hatte den ersten statt den zweiten Kontakt
freigegeben. Die korrigierte Nachricht nennt den freizugebenden zweiten Kontakt.
Zusätzliche vertrauenswürdige Pointerevent-Aufzeichnungen bestätigen die
tatsächlichen separaten Down-IDs und die zweite Up-ID im Browser. Vor Merge müssen sämtliche CI-Prüfungen einschließlich
beider vollständiger Browserläufe grün sein. Anschließend exakten Release und
`/api/health` bestätigen und im PR dokumentieren.

Native Browserkontakte sind keine Abnahme einer konkreten Touchtafel oder
eines physischen Stifts. Palm-Rejection des Geräts, Hör-/Mikrofonprüfung,
Sabine Raschs noch nicht genannte Vorschläge und „Herr Schürferung“ bleiben offen.
