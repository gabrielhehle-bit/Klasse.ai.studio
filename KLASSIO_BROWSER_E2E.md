# Klassio Browser-E2E

Dieser Test ergänzt TypeScript, Node-Tests und Production Build um einen echten Chromium-Lauf auf dem aktuellen Usability-Stand.

## Automatisch geprüfter Pfad

1. Produktionsserver startet aus `dist/server.cjs`.
2. Klassio wird in einem frischen Chromium-Profil geöffnet.
3. Zugangscode wird über die echte Login-Oberfläche eingegeben.
4. Der lokale AES-Datentresor wird über die echte Oberfläche eingerichtet.
5. Wiederherstellungscode wird sichtbar geprüft und bestätigt.
6. Die ausdrücklich auswählbare Beispielklasse wird aktiviert.
7. Browser-Navigation prüft aktuelle Kernbereiche:
   - Heute
   - Notizen
   - Anwesenheit & Befinden
   - Sitzplan & Gruppen
   - Notenmappe
   - Wochenplan
   - Diagnostik
   - Tools
   - Textanalyse
   - Druckzentrum
   - Datensicherung
8. Textanalyse wird mit echtem Texteingabefeld ausgelöst; Flesch- und Wiener-Sachtextformel-Ausgabe müssen sichtbar werden.
9. Das PWA-Manifest wird aus dem Browser abgerufen.
10. Unbehandelte JavaScript-Ausnahmen lassen den Lauf fehlschlagen.
11. Screenshot sowie Server-/Chrome-Logs werden als CI-Artefakt abgelegt.

## Sicherheitsgrenze

Der E2E-Lauf verwendet nur CI-Zugangsdaten und die vorhandene Beispielklasse. Er verändert keine Produktionsdaten und ersetzt nicht die spätere reale Abnahme auf dem öffentlich deployten Staging-Commit.

## Keine zusätzliche Browser-Abhängigkeit

Der GitHub-Runner bringt Chrome/Chromium mit. Das Skript steuert Chrome direkt über das Chrome DevTools Protocol. `package.json` und `bun.lock` bleiben unverändert.
