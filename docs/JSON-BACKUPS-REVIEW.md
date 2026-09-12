# JSON-Backups und kritische Datenabläufe

Ausgangspunkt ist der vom Nutzer als aktuell bestätigte vollständige Export
`klasse.ai.studio (4)(1).zip`. Der erste PR-Commit übernimmt dessen 30 Abweichungen
gegenüber `main` (`11c9891d71f3451bd73dacf559ed62695fa9a8f2`), der zweite enthält
die nachfolgend beschriebenen Reparaturen. Kein Deployment und kein Merge.

## Verhalten

- Neue Downloads sind verschlüsselte JSON-Dateien mit Endung `.json`.
- OneDrive schreibt `LehrerAPP_Backup.json`. Vorhandene
  `LehrerAPP_Backup.lehrerapp` und `Lehrermappe_Backup.json` bleiben lesbar.
- Dateiimport, Einstellungen und Cloud-Import verwenden denselben Parser und
  Wiederherstellungsdienst. Reguläre ältere Klartext-JSON-Backups werden validiert
  und beim Speichern mit dem aktuellen Tresorschlüssel verschlüsselt.
- Ein fremdes Backup wird mit dessen Passwort oder Recovery-Code geöffnet.
  Das Passwort des aktuellen Tresors bleibt unverändert. Abbruch oder falsche
  Zugangsdaten ersetzen weder den aktiven Schlüssel noch den App-Zustand.
- Vor dem Ersetzen wird eine verschlüsselte Rücksicherung geschrieben. Unter
  Einstellungen → Datensicherung kann der vorherige Stand wiederhergestellt werden.
- Fehler beim dauerhaften Schreiben werden gemeldet; ein RAM-Fallback gilt im
  Browser nicht mehr als erfolgreiche Sicherung. Primäre Schreibvorgänge laufen
  nacheinander, damit bereits begonnene Autosaves den Import nicht überholen.
- Klassenwechsel übernehmen die Bewertungen der Zielklasse. Neue Klassen beginnen
  ohne fremde Schularbeitsbewertungen; Laden erhält zusätzliche Klassenfelder.
- PDF.js verwendet den lokal gebündelten Worker. Die `.mjs`-Datei ist jetzt im
  PWA-Precache enthalten, ohne ein CDN in der CSP freizuschalten.
- OneDrive-OAuth verwendet zeitlich begrenztes, signiertes und cookiegebundenes
  `state`. Die Signatur funktioniert über mehrere Instanzen mit gemeinsamem Secret.
  Callback-Ausgaben werden kontextgerecht escaped; Fenster-Nachrichten prüfen
  Ursprung und Absender.

## Prüfung

- 646 Tests bestanden (`node --import tsx --test src/lib/*.test.ts`).
- TypeScript (`tsc --noEmit`) bestanden.
- Produktionsbuild (`npm run build`) bestanden.
- Erzeugter Worker `pdf.worker.min-Dswkl-cV.mjs` im Serviceworker-Precache geprüft.
- Neue Regressionstests: JSON-Download und Entschlüsselung, anderes Gerät/anderer
  Tresor, 32-stelliges Passwort, Recovery-Code, ältere JSON-Datei mit BOM,
  Abbruch, beschädigte Daten, Speicherfehler und Klassenwechsel A → B → A.
- Sicherheitstests prüfen Callback-HTML, Cookiebindung, Signatur und Ablaufzeit.

Die Tests verwenden synthetische Daten. Die Browser-Download-APIs werden im
Downloadtest simuliert. Ein vollständiger visueller Browserdurchlauf, ein reales
Microsoft-Konto und die betroffene Live-Sokrates-Datei wurden nicht getestet.
Installation nach `package.json`-Versionsbereichen; kein eingefrorener Bun-Locklauf.

## Vor einer späteren Veröffentlichung

In Produktion müssen `SESSION_SECRET` (mindestens 32 zufällige Zeichen),
`LEHRERAPP_ACCESS_TEAM`, `LEHRERAPP_ACCESS_EXTERNAL` und eine HTTPS-`APP_URL`
gesetzt sein. Bekannte Standardzugangscodes werden abgewiesen. Microsofts
registrierte Redirect-URI muss zu dieser Domain passen. Die bestehende Lösung
für relative `__dirname`-Injektion bleibt erhalten.

Dieses Paket enthält noch keine umfassende UX-Überarbeitung. Navigation,
Widget-Auswahl und die gemeinsame Cockpit-Zeichenfläche folgen separat.
