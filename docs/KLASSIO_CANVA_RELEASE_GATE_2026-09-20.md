# KLASSIO Canva – Release-Gate, 20.09.2026

**Status: Draft PR #185, nicht auf `main` und nicht produktiv.** Keine realen Canva-Zugangsdaten in GitHub, Screenshots, Kommentaren oder Logs.

## Implementiert
- Canva Connect OAuth 2.0 mit PKCE und serverseitigem Code-Austausch; `state` und Cookie müssen passen. Initialisierendes und zurückkehrendes Klassio-E-Mail-Konto müssen identisch sein. Reine Zugangscode-Sitzungen können keine Canva-Tokens anderer Lehrpersonen lesen.
- Server hält Zugangstokens ausschließlich verschlüsselt in `KLASSIO_DATA_DIR/canva-tokens/<account-id>.json`, AES-256-GCM, Dateimodus 0600, zufälliger IV, authentifizierte Konto-/Sessionbindung. Der HttpOnly-Cookie enthält ausschließlich ein zufälliges Session-ID-Geheimnis. Der Server nutzt den stabilen `CANVA_TOKEN_ENCRYPTION_KEY` (32+ Zeichen), sonst `SESSION_SECRET`.
- Kein Canva-OAuth-Token und keine Dateinamen in Klassen-AppState/JSON-Backups. Ein neuer App-Prozess kann den bisherigen Token lesen, sofern persistentes Datenverzeichnis und Schlüssel unverändert bleiben. Jede neue Canva-Verbindung ersetzt die bisherige Verbindung dieses einen KLASSIO-Kontos. Abgelaufene Refresh Tokens erzwingen erneute Anmeldung.
- OAuth-/Export-Editorfenster werden direkt in der Klick-Geste geöffnet. Alte gespeicherte Canva-Bild-Widgets, Hintergründe und Materialien bleiben ohne Canva-Sitzung lesbar, da die importierten Bilder lokal im verschlüsselten AppState liegen.
- Ungültige oder mit neuem Server-Schlüssel unlesbare Sitzungen erscheinen als getrennt, ohne den gesamten Canva-Eintrag als „nicht konfiguriert“ auszugeben. Die angemeldete Person kann die Verbindung erneuern oder ihre Konto-Verbindung entfernen.
- Nur ein echter, authentifizierter Server-Check ermittelt „verbunden“; der Browser kann das nicht durch `localStorage` oder Query-Parameter bestätigen.

## Noch vor Produktivfreigabe durchzuführen
1. Am vServer das wirklich persistente `KLASSIO_DATA_DIR` **außerhalb** `/srv/klassio/releases/<release>` und `/srv/klassio/current` prüfen, Rechte und Backups testen; das Verzeichnis darf bei Deployment und Rollback nicht überschrieben werden.
2. In der produktiven geheimen Environment: `APP_URL=https://klassio.at`, `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `SESSION_SECRET` (dauerhaft!), optional einen **dauerhaft identischen** `CANVA_TOKEN_ENCRYPTION_KEY` hinterlegen. Schlüsselrotation unterbricht bestehende Canva-Verbindungen; sie werden dann neu autorisiert.
3. Im Canva Developer Portal exakt `https://klassio.at/api/canva/callback` und `design:meta:read design:content:read design:content:write` registrieren; Canva-Integration gegebenenfalls zur Nutzung durch andere Lehrpersonen freigeben.
4. Mit zwei eigenen **synthetischen**/Test-Lehrerkonten testen: Anmeldung, Canva verbinden, Designs laden, A4/PPTX erzeugen, PNG als Tafelhintergrund/Widget/Material importieren, PDF/JPEG/PPTX herunterladen, in einem zweiten Browser/Account Kontotrennung verifizieren. Danach `klassio.service` neu starten: Canva-Status muss bei gleichbleibendem Konto erhalten bleiben. Mit Konto B darf Konto A selbst bei übertragenem Canva-Cookie nicht lesbar sein.
5. `/api/health`, vollständige CI, alte verschlüsselte JSON-Backups nach Restore, Klassenkasse, frühere Zeichnungen und Cockpit-Widgets auf echtem Smartboard vor jeder Freigabe verifizieren. Release- und Rollback-Prozedur für persistenten Datenträger dokumentieren.

## Bewusste Grenzen
- Die 5-MB-Materialbibliothek und die JSON-Backups behalten ihre bisherige Speicherarchitektur. Große Dateien/100 MB oder 1 GB müssen vor Freigabe getrennt clientseitig verschlüsselt gespeichert und mitsamt Dateien zuverlässig wiederherstellbar sein – siehe `KLASSIO_MATERIAL_STORAGE_MIGRATION_2026-09-20.md`.
- PayPal-Tarife, Links und zahlungsbasierte Berechtigungen wurden nicht verändert.
- Der OAuth-Start-`state` bleibt bewusst nur 10 Minuten im Arbeitsspeicher. Ein Serverneustart während **des laufenden Verbindungsdialogs** erfordert einen neuen Start. Bereits erfolgreich verbundene Konten bleiben durch die persistente Session-Datei erhalten.
