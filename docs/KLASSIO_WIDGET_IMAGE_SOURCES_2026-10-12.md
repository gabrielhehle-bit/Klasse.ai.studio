# Tafelbild: Material- und Webquellen · 12.10.2026

Anschluss nach PR #520, veröffentlichter Stand `a1b30034`.
Der Katalogabgleich öffnet jetzt alle 112 Einträge; diese Änderung behandelt
zusätzliche Quellen- und Dialogfälle beim Tafelbild.

## Korrekturen

- Material- und HTTPS-Bilder werden vor dem Quellenwechsel wirklich dekodiert.
  Fehlerhafte Bilder lassen Quelle, Beschriftung und Transformation des bisher
  angezeigten Bildes unverändert. Keine Speicherung eines ungelesenen Kandidaten.
- Neuere Quelle, lokaler Upload, Entfernen, externe Aktualisierung, Unmount oder
  bewusstes Schließen des Quelldialogs entwerten ausstehende Bildprüfungen.
  Probe-Image, Handler und Zeitbegrenzung werden aufgeräumt.
- Neue Materialquellen benötigen dauerhafte Bilddaten oder eine HTTPS-Adresse;
  nicht dauerhafte Blob-Adressen werden nicht als gespeichertes Material übernommen.
  Vorhandene Legacy-Renderer bleiben kompatibel.
- Beschriftungen von Materialien sind Titel, keine Dateipfade: `1/2 und 1/4`
  bleibt erhalten. Web-Bilder bekommen ihre eigene Beschriftung statt der alten.
- Materiallisten tolerieren beschädigte Altbestände. Titel werden als Text
  normalisiert, fehlende IDs erhalten einen Render-Fallback.
- Die Produktions-CSP erlaubte bisher nur einige Bild-CDNs und blockierte
  sonstige HTTPS-Adressen trotz vorhandener Web-URL-Funktion. `img-src` erlaubt
  jetzt HTTPS-Bilder; Script-, API-, Objekt- und Frame-Regeln werden nicht erweitert.
- Externe Bilder laufen direkt über den Browser statt über den gemeinsamen
  PWA-Asset-Cache mit opaken Fremdantworten. Lokale App-Bilder bleiben offline
  cachefähig; Cache-/Update-Header des externen Anbieters gelten weiterhin.
- Dialogauslöser wird vor `autoFocus` erfasst. Verschwindet ein innerer
  Auslöser beim Wechsel aus Einstellungen, kehrt der Fokus zum vorhandenen
  Widget-Zahnrad zurück. Escape in Beschriftung verwirft den Entwurf.

## Reale Browserfälle in beiden bestehenden 360/820-Läufen

Zwei PNG-Dateien werden durch die echte Materialbibliothek hochgeladen:
ein gültiges erzeugtes Bild und ein beschädigtes PNG. Auswahl im Tafelbild,
Originalabmessungen, Bruch-Titel und Fehlererhalt werden tatsächlich geprüft.
Keine AppState-Injektion für Materialeinträge.

HTTPS-Bildantworten werden über Chrome-Netzwerkinterception mit lokal erzeugten
PNG-Bytes geliefert. Die Abfrage läuft weiterhin durch das echte Image-Element.
Abgelehnte externe Adresse löst keinen Request aus; defektes Bild ersetzt das
Material nicht. Langsame Anfrage, Escape/Abbruch, zweite schnellere Quelle,
verspätete Antwort und vollständige Wiederöffnung mit Zoom/Drehung folgen.
Nur synthetische Bilder und die reservierte `.invalid`-Testdomain; keine
echten Schülerbilder oder externe Live-Requests in der Prüfung.

Drei neue Logiktests: beschädigte/alte Materiallisten, dauerhafte gegenüber
ungültigen/ephemeren Bildquellen und der begrenzte Bild-CSP-Vertrag. TypeScript, Build, vollständige Tests,
endgültige Browsermatrix und genaue Live-Version sind vor Abschluss zu bestätigen.

Echte Touch-/Stift-/Audiohardware sowie weitere Konfigurationen und die übrige
Projektliste bleiben offen. Diese Quellenfälle sind keine pauschale Gesamtabnahme.
