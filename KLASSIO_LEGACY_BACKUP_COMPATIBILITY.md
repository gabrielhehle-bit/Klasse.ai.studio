# Klassio – Legacy-Backup-Kompatibilität

Stand: 2026-09-15

## Unterstützte Sicherungsquellen

Klassio liest weiterhin:

- aktuelle verschlüsselte Klassio-`.json`-Sicherungen,
- historische unverschlüsselte JSON-Datenbestände,
- historische `.lehrerapp`-Dateien, sofern ihr Inhalt eines der unterstützten JSON-Formate ist,
- einfache historische JavaScript-Wrapper wie `const backup = {...};`, `let backup = {...};`, `var backup = {...};` oder `export default {...};`.

JavaScript wird beim Import **niemals ausgeführt**. Der gesamte Dateiinhalt muss entweder gültiges JSON oder exakt eine der erlaubten einfachen JSON-Zuweisungen sein.

## Historisches Mehrklassenformat `klassen`

Die Git-Historie zeigt, dass der erste Mehrklassen-Migrationscode bereits `raw.klassen` als Legacy-Indikator kannte. Bislang wurde dieses Feld aber nicht nach `classes` projiziert. Dadurch konnten historische Mehrklassenbestände trotz erkannter Existenz auf eine neu erzeugte Einzelklasse reduziert werden.

Die Migration übernimmt deshalb jetzt `klassen` nur dann als `classes`, wenn kein gültiges aktuelles `classes`-Array vorhanden ist. Ein vorhandenes aktuelles `classes`-Array hat immer Vorrang.

## Automatisch abgesicherte Daten

Ein synthetischer Zwei-Klassen-Altbestand prüft aktuell insbesondere:

- Schüler:innen,
- Noten,
- Bewertungsmetadaten,
- Gewichtungen,
- Jahresplanung,
- Wochenplanung,
- Anwesenheit,
- Sitzplan,
- Diagnostikergebnisse,
- Klassenwechsel,
- verschlüsselten Export,
- erneuten Restore.

Beschädigte historische Klassenlisten werden vor der Migration abgelehnt.

## Wichtige Grenze

Diese automatisierten Tests beweisen die unterstützten Datenformen im Repository. Sie ersetzen nicht den späteren manuellen Import einer echten persönlichen Alt-Sicherung im Staging. Eine reale Sicherung wird dabei **nicht** zur Entwicklungsgrundlage; sie dient ausschließlich als Migrations-/Abnahmedatei gegen den GitHub-Code.
