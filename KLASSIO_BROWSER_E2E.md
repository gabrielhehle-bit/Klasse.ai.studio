# Klassio Browser-E2E

Dieser Test ergänzt die bestehenden Node-/TypeScript-/Build-Prüfungen um einen echten Chromium-Lauf.

## Automatisch geprüfter Pfad

1. Produktionsserver startet aus `dist/server.cjs`.
2. Klassio wird in einem frischen Browserprofil geöffnet.
3. Administrativer Zugangscode wird über die echte Login-Oberfläche eingegeben.
4. Der lokale AES-Datentresor wird in der echten Oberfläche eingerichtet.
5. Der generierte Wiederherstellungscode wird sichtbar geprüft und bestätigt.
6. Die bewusst auswählbare Beispielklasse wird aktiviert.
7. Reale Navigation wird geprüft:
   - Anwesenheit & Befinden
   - Sitzplan & Gruppen
   - Notenmappe
   - Wochenplan
   - Diagnostik
   - Druckzentrum
   - Backup & Daten
8. Das PWA-Manifest wird aus dem Browser abgerufen.
9. Unbehandelte JavaScript-Ausnahmen lassen den Lauf fehlschlagen.
10. Screenshot sowie Server-/Chrome-Logs werden als CI-Artefakt abgelegt.

## Sicherheitsgrenze

Der E2E-Lauf verwendet ausschließlich CI-Zugangsdaten und die ausdrücklich vorhandene Beispielklasse. Er verändert keine Produktionsdaten und ersetzt nicht den späteren echten Staging-Walkthrough auf `klassio.at`.

## Keine zusätzliche Browser-Abhängigkeit

Der GitHub-Runner bringt Chrome/Chromium mit. Das Skript steuert Chrome direkt über das Chrome DevTools Protocol. Dadurch bleiben `package.json` und `bun.lock` unverändert.
