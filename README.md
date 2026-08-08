# LehrerAPP

Digitale Arbeitsumgebung für Lehrkräfte mit Dashboard, Planung, Notenmappe,
Diagnostik, Schülerdossiers, KEL-Präsentationen und optionalen KI-Funktionen.

## Lokal starten

Voraussetzung: eine aktuelle Node.js-Version.

```bash
npm install
npm run dev
```

Für KI-Funktionen muss `GEMINI_API_KEY` in einer lokalen `.env`-Datei gesetzt
werden. Die vollständige Vorlage steht in `.env.example`. Lokale `.env`-Dateien
werden nicht in Git aufgenommen.

## Produktionsprüfung

```bash
npm run build
npm start
```

Der Build erzeugt die Web-App und den gebündelten Server im Ordner `dist`.

## Veröffentlichung mit Google AI Studio

1. Dieses GitHub-Repository in Google AI Studio verbinden oder erneut importieren.
2. Den gewünschten Veröffentlichungsstand aus dem Branch `main` übernehmen.
3. `GEMINI_API_KEY` unter den AI-Studio-Secrets hinterlegen.
4. Nach der ersten Veröffentlichung `APP_URL` auf die öffentliche URL der App setzen.
5. Für die optionale OneDrive-Synchronisierung zusätzlich
   `MICROSOFT_CLIENT_ID` und `MICROSOFT_CLIENT_SECRET` hinterlegen.

Zugangsdaten dürfen niemals direkt in Quellcodedateien oder Commits gespeichert werden.
