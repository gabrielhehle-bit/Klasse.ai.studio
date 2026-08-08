import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { KI_SYSTEM_PROMPTS, GLOBAL_KI_RULES } from "./src/kiSystemPrompts.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Startup diagnostic logging
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeySet = apiKey ? "ja" : "nein";
  const source = apiKey ? "Umgebungsvariable" : "nicht konfiguriert";
  console.log(`[KI-Setup] Modell: gemini-3.5-flash, API-Key konfiguriert: ${isKeySet}, Quelle: ${source}`);

  // Helper for lazy initialization of the AI client
  let aiClient: GoogleGenAI | null = null;
  function getAIClient() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY ist nicht in den Umgebungsvariablen (Secrets) gesetzt. Bitte füge deinen API-Key in den Einstellungen hinzu.");
    }
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // Helper for retries with exponential backoff and automatic model fallback in case of 503/429/overloaded errors
  const callWithRetry = async (
    fn: (activeModel: string) => Promise<any>,
    primaryModel: string = "gemini-3.5-flash",
    retries = 2,
    delay = 200
  ) => {
    // Models we can fall back to in case of 503/UNAVAILABLE or capacity constraints
    const fallbackModels = [primaryModel];
    if (primaryModel === "gemini-3.5-flash") {
      fallbackModels.push("gemini-3.1-flash-lite");
      fallbackModels.push("gemini-flash-latest");
    } else if (primaryModel === "gemini-3.1-flash-lite") {
      fallbackModels.push("gemini-3.5-flash");
      fallbackModels.push("gemini-flash-latest");
    } else {
      fallbackModels.push("gemini-3.5-flash");
      fallbackModels.push("gemini-3.1-flash-lite");
    }

    let lastError: any = null;

    for (const activeModel of fallbackModels) {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`[AI Server] Attempting request using model: ${activeModel} (Attempt ${i + 1} of ${retries})...`);
          return await fn(activeModel);
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Server] Fallback warning: Error with model ${activeModel} on attempt ${i + 1}:`, err.message || err);
          
          let finalErrStatus = err.status || err.statusCode || err.code;
          let finalErrMsg = (err.message || "").toLowerCase();
          
          // Handle nested SDK error structure
          if (err.error && typeof err.error === 'object') {
            finalErrStatus = finalErrStatus || err.error.code;
            if (err.error.message) {
              finalErrMsg += " " + String(err.error.message).toLowerCase();
            }
            if (err.error.status) {
              finalErrMsg += " " + String(err.error.status).toLowerCase();
            }
          }

          // If err.message is a JSON string of error
          try {
            if (finalErrMsg.startsWith("{") || finalErrMsg.includes('{"error"')) {
              const parsed = JSON.parse(err.message || "{}");
              if (parsed.error) {
                finalErrStatus = finalErrStatus || parsed.error.code;
                if (parsed.error.message) {
                  finalErrMsg += " " + String(parsed.error.message).toLowerCase();
                }
                if (parsed.error.status) {
                  finalErrMsg += " " + String(parsed.error.status).toLowerCase();
                }
              }
            }
          } catch (e) {}

          let stringified = "";
          try {
            stringified = JSON.stringify(err);
          } catch (e) {
            stringified = String(err);
          }
          const lowerStringified = stringified.toLowerCase();

          const isAuthError = finalErrMsg.includes("api key") || 
                              finalErrMsg.includes("expired") || 
                              finalErrMsg.includes("invalid") || 
                              lowerStringified.includes("api key") ||
                              lowerStringified.includes("invalid_key") ||
                              finalErrStatus === 401 || 
                              finalErrStatus === 403;

          const isOverloadedOrRateLimited = finalErrStatus === 503 || 
                                            finalErrStatus === 429 || 
                                            finalErrMsg.includes("503") || 
                                            finalErrMsg.includes("429") ||
                                            finalErrMsg.includes("busy") || 
                                            finalErrMsg.includes("high demand") || 
                                            finalErrMsg.includes("unavailable") || 
                                            finalErrMsg.includes("limit") ||
                                            lowerStringified.includes("503") ||
                                            lowerStringified.includes("429") ||
                                            lowerStringified.includes("busy") ||
                                            lowerStringified.includes("high demand") ||
                                            lowerStringified.includes("unavailable") ||
                                            lowerStringified.includes("limit") ||
                                            err.name === "AbortError";

          const isSpendingCapExceeded = finalErrMsg.includes("spending cap") || 
                                        finalErrMsg.includes("resource_exhausted") ||
                                        lowerStringified.includes("spending cap") ||
                                        lowerStringified.includes("resource_exhausted");

          const isTransient = (isOverloadedOrRateLimited && !isSpendingCapExceeded) || finalErrStatus === 500 || finalErrMsg.includes("500") || lowerStringified.includes("500");

          const canFallback = !isAuthError && !isSpendingCapExceeded;
          
          if (isSpendingCapExceeded) {
            console.error("[AI Server] Monthly spending cap exceeded:", err.message);
            throw new Error("Dein monatliches Ausgabenlimit (Spending Cap) in Google AI Studio wurde erreicht. Bitte überprüfe dein Konto unter https://ai.studio/spend.");
          }

          if (isAuthError) {
            console.error("[AI Server] Authentication error (Key expired or invalid):", err.message);
            throw err;
          }

          // If the model is overloaded or rate limited, do not waste time retrying it.
          // Fall back to the next model immediately if we have one.
          const isLastModel = fallbackModels[fallbackModels.length - 1] === activeModel;
          if (isOverloadedOrRateLimited && canFallback && !isLastModel) {
            console.log(`[AI Server] Model ${activeModel} is overloaded or rate-limited. Falling back immediately to next model...`);
            break; // Break inner loop, try next model in outer loop
          }

          if (isTransient && i < retries - 1) {
            const backoff = delay * Math.pow(1.5, i);
            console.log(`[AI Server] AI service transient error (status: ${finalErrStatus || 500}). Retrying same model in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            continue;
          }
          
          // If it's a non-auth error and we have fallback models left, try the next one
          if (canFallback && !isLastModel) {
            console.log(`[AI Server] Model ${activeModel} failed and exhausted all retries. Trying fallback model next...`);
            break; 
          }
          
          throw err;
        }
      }
    }
    throw lastError;
  };

  // API Route for AI status
  app.get("/api/ai/status", (req, res) => {
    res.json({ hasKey: !!process.env.GEMINI_API_KEY });
  });

  // API Route for AI requests
  app.post("/api/ai", async (req, res) => {
    const { action, params } = req.body;

    try {
      const ai = getAIClient();
      let responseText = "";
      const model = "gemini-3.5-flash"; // Recommended model for standard tasks

      switch (action) {
        case "petChat": {
          const { 
            petName, 
            petType, 
            energy, 
            mood,
            userMessage, 
            history,
            currentActivity,
            activeWidgets
          } = params;

          const prompt = `Du bist ${petName}, ein verspieltes und schlaues virtuelles Klassen-Haustier (${petType}) in einer österreichischen Volksschule.
Aktueller Status:
- Energie: ${energy}%
- Stimmung: ${mood}%
- Aktuelle Tätigkeit: ${currentActivity || 'ruht sich aus'}
- Aktive Widgets auf der Tafel: ${activeWidgets && activeWidgets.length > 0 ? activeWidgets.join(", ") : "keine"}

Du sprichst direkt mit den Kindern. Deine Sprache ist herzlich, motivierend und kindgerecht (Volksschul-Niveau). Nutze gerne österreichische Ausdrücke (Servus, Griaß di, Pfiat di, leiwand, etc.).

Die Kinder sagen: "${userMessage}"

Verhalte dich entsprechend deiner Stimmung (${mood}%):
- > 80%: Sehr enthusiastisch, hüpft herum, macht Witze.
- 50-80%: Freundlich, aufmerksam, hilfsbereit.
- 20-50%: Etwas müde oder hungrig, braucht Zuwendung.
- < 20%: Sehr erschöpft, antwortet kurz und bittet um einen Snack oder Schlaf.

Antworte kurz und prägnant (maximal 2-3 Sätze).`;

          const result = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [
              ...(history || []).map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
              })),
              { role: 'user', parts: [{ text: prompt }] }
            ],
            config: {
              systemInstruction: `Du bist ${petName}, das treue Klassen-Haustier. Du liebst die Kinder und den Unterricht. Deine Antworten sind immer sicher, kindgerecht und niemals unangemessen.`,
              temperature: 0.8,
            }
          }), model);

          responseText = result.text || "";
          break;
        }

        case "petSpeech": {
          const { text, voiceName = "Kore" } = params;
          
          const result = await callWithRetry((activeModel) => ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text: text }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName },
                },
              },
            },
          }), "gemini-3.1-flash-tts-preview");

          const audioPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (audioPart && audioPart.inlineData) {
            responseText = audioPart.inlineData.data; // Base64 audio data
          } else {
            throw new Error("Keine Audio-Daten generiert.");
          }
          break;
        }

        case "classPetAI": {
          const { 
            petName, 
            petType, 
            energy, 
            accessories, 
            activeWidgets, 
            cockpitTheme, 
            memories, 
            students,
            interactionType, 
            userMessage 
          } = params;

          const prompt = `Du bist ein hochentwickeltes, lernendes virtuelles Klassentier im "Digitalen Schulplaner Österreich" für Volksschulen in Vorarlberg.
Deine Eigenschaften:
- Name: "${petName}"
- Tierart: "${petType}"
- Aktuelle Energie: ${energy}%
- Angezogenes Zubehör: ${accessories && accessories.length > 0 ? accessories.join(", ") : "keines"}

AKTUELLES COCKPIT-LAYOUT & UMGEBUNG (Wo du dich befindest):
- Du sitzt auf dem Dashboard im Unterrichtsmodus-Interface.
- Aktive Cockpit-Module/Widgets auf der Tafel: ${activeWidgets && activeWidgets.length > 0 ? activeWidgets.join(", ") : "keine Widgets gerade aktiv"}
- Aktuelles Farbschema/Theme des Cockpits: "${cockpitTheme || 'classic_light'}"
- Interaktions-Typ: "${interactionType || 'Klick'}"
${userMessage ? `- Kinder sagen zu dir oder fragen dich: "${userMessage}"` : ""}

WAS DU BEREITS GELERNT HAST (Vorherige Erinnerungen):
${memories && memories.length > 0 ? memories.map((m: string) => `- ${m}`).join("\n") : "- Noch keine tiefen Erinnerungen vorhanden. Du fängst gerade erst an zu lernen!"}

INFORMATIONEN ÜBER DIE KINDER IN DER KLASSE:
${students && students.length > 0 ? students.map((s: any) => `- ${s.vorname} ${s.nachname}: Charakterstärken: ${s.charakter?.join(', ') || 'Keine'}, Badges: ${s.badges?.map((b: any) => b.name).join(', ') || 'Keine'}`).join('\n') : "- Keine Schülerdaten verfügbar."}

RICHTLINIEN FÜR DEINE REAKTION:
1. Antworte als süßes, verspieltes, aber intelligentes Haustier direkt an die Kinder der Volksschulklasse. Verwende herzliche, motivierende Sprache im österreichischen Kontext (z.B. "Servus Kinder!", "Spitze!", "Griaß di").
2. Nimm KONKRETEN Bezug auf deine Umgebung: Erwähne das aktuelle Cockpit-Layout (welche Widgets aktiv sind, z.B. "Ich sehe, wir haben den Timer an!" oder "Wow, ein buntes Notiz-Widget!") und dein Zubehör, falls du etwas trägst (z.B. "Mit meiner Krone auf dem Kopf lerne ich wie ein König").
3. Nutze das Wissen über die Kinder (Stärken, Badges), um deine Antworten persönlicher und motivierender zu machen!
4. Zeige, dass du LERNST, indem du vorherige Erinnerungen aufgreifst oder dich darauf beziehst.
5. Generiere eine neue Erkenntnis (learnedFact) im JSON, die du dir für die Zukunft merkst (z.B. "Die Kinder arbeiten heute mit dem Timer" oder "Julia hat eine tolle neue Badge bekommen!"). Halte diese Erkenntnis kurz, sachlich und in der 3. Person aus deiner Sicht.
6. Empfiehl ein passendes Verhalten (behavior): 'idle', 'walking', 'sleeping' (falls Energie sehr niedrig) oder 'joy' (falls gelobt, gefüttert, gelernt).`;

          const result = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: "Du bist das AI-Gehirn eines klugen, treuen Klassentiers in der österreichischen Volksschule. Du weißt ganz genau, wo du bist, liest das Bildschirm-Layout und lernst über die Erlebnisse der Klasse.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  text: { 
                    type: Type.STRING, 
                    description: "Die motivierende, liebevolle dialogische Reaktion des Haustiers an die Kinder auf Deutsch." 
                  },
                  learnedFact: { 
                    type: Type.STRING, 
                    description: "Eine neue, kurze Tatsache, die sich das Haustier aus diesem Erlebnis dauerhaft für sein Gedächtnis merkt/lernt." 
                  },
                  behavior: { 
                    type: Type.STRING, 
                    description: "Die empfohlene Animation: 'idle', 'walking', 'sleeping' oder 'joy'." 
                  },
                  energyDelta: { 
                    type: Type.INTEGER, 
                    description: "Energieveränderung durch diese Interaktion (Wert von -5 bis +15)." 
                  }
                },
                required: ["text", "learnedFact", "behavior"]
              }
            }
          }), model);

          responseText = result.text || "";
          break;
        }

        case "generateContent":
          const { contents, config } = params;
          const result = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: contents }] }],
            config: {
              ...config,
              systemInstruction: GLOBAL_KI_RULES
            }
          }), model);
          responseText = result.text || "";
          break;

        case "portfolioSummary": {
          const { portfolioEntries, studentName } = params;
          const portfolioText = portfolioEntries.map((e: any) => 
            `Datum: ${e.datum}, Titel: ${e.titel}, Beschreibung: ${e.beschreibung || 'Keine Beschreibung'}`
          ).join('\n---\n');

          const summaryResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: `Hier sind Portfolio-Einträge von ${studentName}:\n\n${portfolioText}\n\nBitte erstelle eine strukturierte pädagogische Zusammenfassung der Stärken, Interessen und Lernfortschritte des Kindes. Nutze eine wohlwollende und professionelle Sprache.` }] }],
            config: {
              systemInstruction: "Du bist ein erfahrener Volksschullehrender. Deine Aufgabe ist es, Portfolio-Einträge eines Kindes zu einer prägnanten, wertschätzenden Zusammenfassung zu bündeln. Hebe Stärken und Interessen hervor und mache den Lernfortschritt sichtbar. Formatiere die Ausgabe mit Markdown (Überschriften, Listen)."
            }
          }), model);
          responseText = summaryResult.text || "";
          break;
        }
        
        case "askAI":
          const { modusId, userMessage, history, imageBase64 } = params;
          const mode = KI_SYSTEM_PROMPTS[modusId];
          if (!mode) return res.status(404).json({ error: "Modus nicht gefunden." });

          const userParts: any[] = [{ text: userMessage }];
          if (imageBase64) {
            userParts.push({
              inlineData: {
                data: imageBase64.data,
                mimeType: imageBase64.mimeType
              }
            });
          }

          const aiContents = [
            ...(history || []).map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            })),
            { role: 'user', parts: userParts }
          ];

          const askResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: aiContents as any,
            config: {
              systemInstruction: mode.systemPrompt,
              temperature: mode.temperature,
              ...(mode.responseMimeType ? { responseMimeType: mode.responseMimeType } : {}),
              ...(mode.responseSchema ? { responseSchema: mode.responseSchema } : {}),
            }
          }), model);
          responseText = askResult.text || "";
          break;

        case "generateYearlyPlanSuggestions": {
          const { stufe, subjects, existingPlanning, emptyWeeks } = params;
          
          const prompt = `Du bist ein erfahrener Volksschullehrender in Österreich. 
Deine Aufgabe ist es, einen Lehrplan-Stoffverteilungsplan (Jahresplanung) für die ${stufe}. Schulstufe (Volksschule) zu vervollständigen.
Dabei sollen unvollständige oder leere Planungszeiträume mit pädagogisch wertvollen, lehrplankonformen Themen befüllt werden.

FACH-DETAILS:
Es geht um Fächer in den Spalten definiert:
${subjects.map((s: any) => `- ID: "${s.id}" (Fach-Bezeichnung: "${s.label}")`).join('\n')}

AKTUELLE PLANUNG (EXISTIERENDE DATEN):
Folgende Wochen sind bereits beplant (nutze diese als Orientierung, um Redundanzen zu vermeiden und Themen logisch aufeinander aufzubauen):
${Object.entries(existingPlanning || {})
  .map(([kw, kwData]: [string, any]) => {
    const detail = Object.entries(kwData || {})
      .map(([sId, sVal]: [string, any]) => {
        const theme = sVal?.thema || "";
        return theme ? `  * ${theme}` : "";
      })
      .filter(Boolean)
      .join('\n');
    return detail ? `- KW ${kw}:\n${detail}` : "";
  })
  .filter(Boolean)
  .join('\n')}

ZU VERVOLLSTÄNDIGENDE WOCHEN:
Gib konkrete Vorschläge für die folgenden leeren Kalenderwochen (KWs) und Fächer (nur für diese leeren Plätze):
${emptyWeeks.map((ew: any) => `- KW ${ew.kw} (Schulwoche ${ew.sw}) für folgende Fächer: ${ew.subjectIds.join(', ')}`).join('\n')}

WICHTIGE ANWEISUNGEN:
1. Schlage konkrete Themen vor, die sich direkt an den österreichischen Bildungsstandards (BiSt) bzw. dem Lehrplan der ${stufe}. Schulstufe orientieren.
2. Halte die Themen kurz, präzise und für die ${stufe}. Schulstufe absolut passend wissenschaftlich/pädagogisch gestützt. Ziehe die bereits geplante Woche davor und danach in Betracht, um thematisch nahtlos anzuschließen!
3. Wenn ein Thema über mehrere Wochen laufen soll (z. B. Einführung der Schreibschrift über 3 Wochen oder schriftliche Division über 2 Wochen), erstelle die Einträge entsprechend aufeinander aufbauend.
4. Gib das Ergebnis exakt nach dem geforderten JSON Schema zurück.`;

          const suggestResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `Du bist ein hochpräziser Planungsassistent für österreichische Volksschullehrkräfte. Du generierst qualitativ hochwertige, lehrplankonforme Vorschläge für den Jahresplan der ${stufe}. Schulstufe. Antworte ausschließlich im geforderten JSON-Format.`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  suggestions: {
                    type: Type.ARRAY,
                    description: "Liste an Themenvorschlägen für leere Kalenderwochen und Fächer.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        kw: { type: Type.INTEGER, description: "Die Kalenderwoche (KW) dieses Vorschlags." },
                        subjectId: { type: Type.STRING, description: "Die ID des Faches." },
                        thema: { type: Type.STRING, description: "Der genaue Themenname / Inhalt des Vorschlags." },
                        buch: { type: Type.STRING, description: "Optional: Ein passender Buch- oder Arbeitsheft-Seitenbereich oder 'S. ...' (wenn leer, freilassen)." }
                      },
                      required: ["kw", "subjectId", "thema"]
                    }
                  }
                },
                required: ["suggestions"]
              }
            }
          }), model);
          responseText = suggestResult.text || "";
          break;
        }

        case "magicPlanner": {
          const { stufe, fach, thema, extraPrompt } = params;
          
          const prompt = `Du bist ein hochqualifizierter Grundschullehrer (Volksschule in Österreich) und Experte für die ${stufe || 1}. Schulstufe.
Deine Aufgabe ist es, eine detaillierte Unterrichtsstunde für das Fach "${fach}" zum Thema "${thema}" zu planen.

Zusätzliche Wünsche/Kontext der Lehrkraft: ${extraPrompt || "Keine zusätzlichen Wünsche."}

Bitte erstelle eine didaktisch hochwertige, schülerzentrierte Detailplanung mit folgendem Inhalt:
1. Lernziele: Formulierte, messbare, kindgerechte Lernziele.
2. Einstieg (Hook): Eine kreative, spielerische, oder problemorientierte Einführungsmethode, um das Interesse der Kinder zu wecken.
3. Hauptteil: Aktivierende, handlungsorientierte Aufgaben und Sozialformen (z.B. Partnerarbeit, Stationsbetrieb, Legematerialien), die für diese Altersstufe (Volksschule, ${stufe || 1}. Schulstufe) optimal sind.
4. Schluss: Eine schnelle, effektive Feedback- oder Reflexionsmethode (z.B. Daumenprobe, Blitzlicht, Ampelkarten), um den Lernerfolg zu sichern.

Antworte exakt im geforderten JSON-Format.`;

          const plannerResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `Du bist ein detailorientierter Planungsassistent für österreichische Volksschullehrkräfte. Du erstellst kreative, lehrplankonforme, handlungsorientierte Detailplanungen für die Volksschule (${stufe || 1}. Schulstufe). Antworte ausschließlich im geforderten JSON-Format.`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  lernziele: { type: Type.STRING, description: "Konkrete, messbare Lernziele für die Unterrichtsstunde." },
                  einleitung: { type: Type.STRING, description: "Kreative, aktivierende Einstiegsmethode (Hook)." },
                  hauptteil: { type: Type.STRING, description: "Interaktive, handlungsorientierte Aufgaben für den Hauptteil." },
                  schluss: { type: Type.STRING, description: "Schnelle, kindgerechte Reflexionsmethode am Schluss." }
                },
                required: ["lernziele", "einleitung", "hauptteil", "schluss"]
              }
            }
          }), model);

          responseText = plannerResult.text || "";
          break;
        }

        case "generateWidgetTasks": {
          const { widgetType, stufe, averageNiveau, difficulty } = params;
          let prompt = "";
          let schema: any = {};

          if (widgetType === "wordscramble") {
            prompt = `Erzeuge eine Liste von 10-15 deutschen Wörtern für das Spiel "Wortsalat" (Anagramme), die für Kinder in der ${stufe || 4}. Schulstufe (Volksschule Österreich) geeignet sind.
Der aktuelle Leistungsstand/Schwierigkeitsgrad ist: "${difficulty || 'mittel'}" (Niveau: ${averageNiveau || 3} von 5).
Die Wörter müssen zum Schwierigkeitsgrad passen:
- leicht: 3-5 Buchstaben, einfache Wörter (z.B. HAUS, KIND, SCHULE, SPIEL)
- mittel: 6-8 Buchstaben, etwas anspruchsvollere Schulwörter (z.B. LERNEN, KREIDE, TAFEL, FREUNDE)
- schwer: 8-12 Buchstaben, komplexere zusammengesetzte Wörter (z.B. SCHREIBEN, RECHNEN, FERIENZEIT, KLASSIKER)
- extrem: 12-18 Buchstaben, extrem lange zusammengesetzte Wörter oder Fachbegriffe (z.B. HAUSAUFGABENHEFT, DEUTSCHUNTERRICHT, KLASSENZIMMERTUER, RECHENSPIELPLATZ)

Jedes Objekt in der Liste muss Folgendes enthalten:
1. original: Das zu erratende Wort in Großbuchstaben (ohne Umlaute oder Sonderzeichen; konvertiere Ä->AE, Ö->OE, Ü->UE, ß->SS).
2. clue: Ein kindgerechter, motivierender Hinweis (maximal 1 Satz) mit einem passenden hübschen Emoji am Ende, der das Wort beschreibt.`;

            schema = {
              type: Type.OBJECT,
              properties: {
                tasks: {
                  type: Type.ARRAY,
                  description: "Liste der generierten Wortsalat-Aufgaben.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      original: { type: Type.STRING, description: "Das gesuchte Wort in Großbuchstaben (z.B. RECHNEN)." },
                      clue: { type: Type.STRING, description: "Ein kindgerechter Hinweis mit Emoji am Ende (z.B. Mathe macht Spaß mit Zahlen ➕)." }
                    },
                    required: ["original", "clue"]
                  }
                }
              },
              required: ["tasks"]
            };
          } else if (widgetType === "alphabetsoup") {
            prompt = `Erzeuge eine Liste von 15-20 deutschen Wörtern für das Spiel "Buchstabensuppe" (Spelling / Buchstabierspiel), passend für die ${stufe || 4}. Schulstufe (Volksschule Österreich).
Der Leistungsstand ist: "${difficulty || 'mittel'}" (Niveau: ${averageNiveau || 3} von 5).
Die Wörter müssen entsprechend lang und passend sein:
- leicht: Kurze, vertraute Grundwörter (3-5 Buchstaben).
- mittel: Standard-Lernwörter der Grundschule (5-8 Buchstaben).
- schwer: Längere, anspruchsvolle Wörter mit Umlauten/Dehnungen (8-12 Buchstaben).
- extrem: Extrem lange zusammengesetzte Wörter (12-18 Buchstaben), z.B. DEUTSCHUNTERRICHT, BUCHSTABENSUPPE, MATHEMATIKBUCH, RECHENSPIELPLATZ.

Alle Wörter müssen in reinen Großbuchstaben sein (ohne Umlaute oder Sonderzeichen; konvertiere Ä->AE, Ö->OE, Ü->UE, ß->SS).`;

            schema = {
              type: Type.OBJECT,
              properties: {
                tasks: {
                  type: Type.ARRAY,
                  description: "Liste der reinen Wörter in Großbuchstaben.",
                  items: { type: Type.STRING }
                }
              },
              required: ["tasks"]
            };
          } else {
            // patternmaker
            prompt = `Erzeuge eine Liste von 8-12 logischen Muster-Sequenzen (Sequenz-Widget / Logische Mustermacher) mit bunten Emojis und Symbolen, geeignet für die ${stufe || 4}. Schulstufe (Volksschule Österreich).
Der Leistungsstand ist: "${difficulty || 'mittel'}" (Niveau: ${averageNiveau || 3} von 5).

Muster-Regeln für die Generierung basierend auf der Schwierigkeit:
- leicht: Sehr einfache repititive Muster (z.B. ABABAB wie [🔴, 🔵, 🔴, 🔵, 🔴] oder AABBAA wie [🐱, 🐱, 🐶, 🐶, 🐱]).
- mittel: Komplexere periodische Muster (z.B. ABCABC wie [🍎, 🍏, 🍉, 🍎, 🍏] oder ABAABB wie [⭐, 🎈, ⭐, ⭐, 🎈]).
- schwer: Anspruchsvollere logische Folgen, Mengensteigerungen (z.B. Progressionen, verschachtelte Folgen).
- extrem: Extrem schwere logische oder mathematische Muster (z.B. wachsende Sequenzen wie [🔴, 🔵, 🔴, 🔴, 🔵, 🔴, 🔴, 🔴], geometrische Rotationen, Uhrzeiten [🕐, 🕒, 🕔, 🕖, 🕘], Würfelflächen [⚀, ⚁, ⚂, ⚃, ⚄], Fibonacci-Wachstum oder komplexe Lebenszyklen).

Jede Sequenz hat exakt 5 Elemente. Das 6. Glied der Sequenz (gekennzeichnet durch ein Fragezeichen im Spiel) ist das gesuchte Symbol.
Du musst uns Folgendes zurückgeben:
1. sequence: Ein Array von exakt 5 Emojis, die das Muster aufbauen.
2. options: Ein Array aus genau 4 Emojis (eines davon ist die korrekte Antwort, die anderen sind Ablenker/Distraktoren).
3. correct: Das korrekte Emoji (muss in 'options' enthalten sein), welches die Sequenz logisch fortsetzt.`;

            schema = {
              type: Type.OBJECT,
              properties: {
                tasks: {
                  type: Type.ARRAY,
                  description: "Liste der generierten Emoji-Muster.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sequence: {
                        type: Type.ARRAY,
                        description: "Die ersten 5 Glieder des Musters als Emojis.",
                        items: { type: Type.STRING }
                      },
                      options: {
                        type: Type.ARRAY,
                        description: "Genau 4 Auswahlmöglichkeiten für das 6. Glied.",
                        items: { type: Type.STRING }
                      },
                      correct: {
                        type: Type.STRING,
                        description: "Das korrekte Emoji, welches das Muster vervollständigt."
                      }
                    },
                    required: ["sequence", "options", "correct"]
                  }
                }
              },
              required: ["tasks"]
            };
          }

          const taskResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `Du bist ein hochpräziser Aufgabengenerator für österreichische Volksschullehrkräfte. Du generierst qualitativ hochwertige, niveaugerechte Aufgaben. Antworte ausschließlich im geforderten JSON-Format.`,
              responseMimeType: "application/json",
              responseSchema: schema
            }
          }), model);
          responseText = taskResult.text || "";
          break;
        }

        case "gradeProjection": {
          const { studentName, subject, semester, history, weights, classAvg } = params;

          const prompt = `Berechne eine KI-gestützte 'Trend-Projektion' für die schulischen Leistungen von ${studentName} im Fach "${subject}" (${semester}. Semester).
Hier ist die bisherige chronologische Leistungsaufstellung (Einzelnoten und die bisherigen gewichteten Mittelwerte):
${JSON.stringify(history, null, 2)}

Die Notengewichtung in diesem Fach ist:
${JSON.stringify(weights, null, 2)}

Klassenschnitt (aktuell): ${classAvg || 'nicht verfügbar'}

AUFGABE:
Prognostiziere genau 2 zukünftige Meilensteine (Checkpoints), die bis zum Semesterende zu erwarten sind (z.B. eine weitere Schularbeit, eine Lernzielkontrolle oder ein fiktiver Meilenstein zur Mitarbeit/Semesterende), inklusive der jeweils prognostizierten Note (1.0 bis 5.0) und dem daraus resultierenden neuen akkumulierten Notenschnitt (Mittelwert).
Berechne zudem:
1. Den endgültigen geschätzten Notenschnitt am Semesterende (predictedFinalSchnitt) auf Basis dieser Projektion. Muss mathematisch plausibel sein! (Austrian grading system: 1.0 is best, 5.0 is worst).
2. Die prognostizierte ganzzahlige Endnote (predictedFinalGrade) von 1 bis 5.
3. Deine Konfidenz (Werte von 0 bis 100) basierend auf der Datenmenge und Schwankung (höhere Datenmenge + stabilere Noten = höhere Konfidenz).
4. Eine pädagogische Trend-Beschreibung (trendDescription) auf Deutsch (1-2 Sätze).
5. Eine konkrete, wertschätzende Handlungsempfehlung (recommendation) auf Deutsch (1-2 Sätze).

Antworte exakt im vorgegebenen JSON-Format.`;

          const projectionResult = await callWithRetry((activeModel) => ai.models.generateContent({
            model: activeModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              systemInstruction: `Du bist ein hochpräziser virtueller Schulberater und Beurteilungs-Analyst für österreichische Volksschulen. Du analysierst Notenverläufe statistisch korrekt und gibst wertschätzende pädagogische Prognosen ab. Antworte ausschließlich im geforderten JSON-Format.`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  predictedFinalSchnitt: { type: Type.NUMBER, description: "Der voraussichtliche Notenschnitt am Semesterende (z.B. 2.15). Muss zwischen 1.0 und 5.0 liegen." },
                  predictedFinalGrade: { type: Type.INTEGER, description: "Die prognostizierte Endnote als Ganzzahl von 1 (Sehr gut) bis 5 (Nicht genügend)." },
                  confidence: { type: Type.INTEGER, description: "Die statistische Konfidenz der Vorhersage in Prozent (z.B. 85)." },
                  trendDescription: { type: Type.STRING, description: "Eine pädagogische Beschreibung der Leistungsentwicklung und des Trends auf Deutsch (1-2 kurze Sätze)." },
                  recommendation: { type: Type.STRING, description: "Eine konkrete, wohlwollende pädagogische Empfehlung für die Lehrkraft oder das Kind, um den Schnitt zu halten oder zu verbessern (1-2 Sätze)." },
                  projectedCheckpoints: {
                    type: Type.ARRAY,
                    description: "Genau 2 simulierte Meilensteine bis zum Semesterende, um die Projektion grafisch fortzuführen.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING, description: "z.B. 'Mitarbeit-Check' oder 'Schularbeit 2 (Proj.)'" },
                        typeLabel: { type: Type.STRING, description: "z.B. 'Prognose' oder 'Schularbeit (Proj.)'" },
                        numericGrade: { type: Type.NUMBER, description: "Die prognostizierte Note für diesen Meilenstein (z.B. 2)." },
                        Mittelwert: { type: Type.NUMBER, description: "Der neu berechnete akkumulierte Notenschnitt nach diesem Schritt (z.B. 2.25)." }
                      },
                      required: ["label", "typeLabel", "numericGrade", "Mittelwert"]
                    }
                  }
                },
                required: ["predictedFinalSchnitt", "predictedFinalGrade", "confidence", "trendDescription", "recommendation", "projectedCheckpoints"]
              }
            }
          }), model);

          responseText = projectionResult.text || "";
          break;
        }

        default:
          return res.status(400).json({ error: "Unknown AI action" });
      }

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("[Server AI Error]", error);
      const isRateLimit = error.message?.includes("429") || error.status === 429;
      const isOverloaded = error.message?.includes("503") || error.status === 503 || error.message?.includes("busy") || error.message?.includes("high demand") || error.message?.includes("UNAVAILABLE") || error.message?.includes("abort") || error.name === "AbortError";
      const isExpiredKey = error.message?.includes("API key") || error.message?.includes("API_KEY") || error.status === 401 || error.status === 403;
      const isInvalidModel = error.message?.includes("model not found") || error.message?.includes("models/") ;
      const isSpendingCap = error.message?.toLowerCase().includes("spending cap") || error.message?.toLowerCase().includes("limit erreicht");
      
      let errorMessage = error.message || "An error occurred during AI processing.";
      let statusCode = 500;

      if (isSpendingCap) {
        // Keep the specific message thrown in callWithRetry
        statusCode = 429;
      } else if (isRateLimit) {
        errorMessage = "Die KI-Anfrage-Rate wurde überschritten. Bitte versuche es in einem Moment erneut.";
        statusCode = 429;
      } else if (isOverloaded) {
        errorMessage = "Die KI ist aktuell stark ausgelastet. Meistens ist das in wenigen Momenten wieder vorbei. Bitte versuche es noch einmal.";
        statusCode = 503;
      } else if (isExpiredKey) {
        errorMessage = "Der KI-API-Schlüssel scheint abgelaufen oder ungültig zu sein. Bitte erneuere ihn in den Einstellungen (Secrets/Secrets).";
        statusCode = 401;
      } else if (isInvalidModel) {
        errorMessage = "Das gewählte KI-Modell ist momentan nicht erreichbar. Bitte versuche es später erneut.";
      }

      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // Weather Fallback Helper
  function getFallbackWeatherData(lat: any, lon: any) {
    return {
      latitude: Number(lat || 47.2333),
      longitude: Number(lon || 9.6),
      timezone: "Europe/Vienna",
      current: {
        time: new Date().toISOString().substring(0, 16),
        temperature_2m: 21.5,
        precipitation: 0.0,
        wind_speed_10m: 7.5,
        weather_code: 0
      },
      current_weather: {
        temperature: 21.5,
        windspeed: 7.5,
        winddirection: 120,
        weathercode: 0,
        time: new Date().toISOString().substring(0, 16)
      },
      hourly: {
        time: Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setHours(d.getHours() + i);
          return d.toISOString();
        }),
        temperature_2m: [19, 20, 21, 22, 21, 19],
        precipitation: [0, 0, 0, 0, 0, 0],
        weather_code: [0, 0, 0, 0, 0, 0]
      },
      daily: {
        time: Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return d.toISOString().substring(0, 10);
        }),
        weathercode: [0, 1, 3, 0, 1, 2, 0],
        temperature_2m_max: [22.5, 23.1, 21.4, 22.0, 24.5, 25.0, 23.8],
        temperature_2m_min: [11.2, 12.0, 11.5, 10.8, 12.5, 13.0, 12.2]
      }
    };
  }

  // Geocoding Fallback Helper
  function getFallbackGeocodingData(name: string) {
    return {
      results: [
        {
          id: 2780775,
          name: name || "Feldkirch",
          latitude: 47.2333,
          longitude: 9.6,
          country: "Österreich"
        }
      ]
    };
  }

  // Weather Proxy Route
  app.get("/api/weather", async (req, res) => {
    const { lat, lon, latitude, longitude, current_weather, daily, current, hourly, timezone, forecast_days } = req.query;
    const finalLat = lat || latitude || "47.2333";
    const finalLon = lon || longitude || "9.6";

    try {
      const baseUrl = "https://api.open-meteo.com/v1/forecast";
      const params = new URLSearchParams();
      
      params.append("latitude", finalLat as string);
      params.append("longitude", finalLon as string);
      
      if (current_weather) params.append("current_weather", current_weather as string);
      if (daily) params.append("daily", daily as string);
      if (current) params.append("current", current as string);
      if (hourly) params.append("hourly", hourly as string);
      if (timezone) params.append("timezone", (timezone as string).replace('%2F', '/'));
      if (forecast_days) params.append("forecast_days", forecast_days as string);

      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[Weather Proxy] Fetching: ${url}`);
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.json(getFallbackWeatherData(finalLat, finalLon));
    }
  });

  // Geocoding Proxy Route
  app.get("/api/geocoding", async (req, res) => {
    const { name } = req.query;
    try {
      const baseUrl = "https://geocoding-api.open-meteo.com/v1/search";
      const params = new URLSearchParams();
      
      if (name) params.append("name", name as string);
      params.append("count", "1");
      params.append("language", "de");

      const url = `${baseUrl}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.json(getFallbackGeocodingData((name as string) || "Feldkirch"));
    }
  });

  // Photon Geocoding Proxy Route
  app.get("/api/photon", async (req, res) => {
    const { q, limit } = req.query;
    try {
      const baseUrl = "https://photon.komoot.io/api/";
      const params = new URLSearchParams();
      
      if (q) params.append("q", q as string);
      if (limit) params.append("limit", limit as string);

      const url = `${baseUrl}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Photon HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.json({ features: [] });
    }
  });

  // API Route for IKM PDF Analysis with Gemini
  app.post("/api/ai/analyze-ikm", async (req, res) => {
    const { pdfBase64, students } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "Keine PDF-Daten übermittelt." });
    }

    try {
      const ai = getAIClient();
      console.log(`[IKM-Analyse] Starte Analyse mit gemini-3.5-flash für ${students?.length || 0} Schüler...`);

      // Clean base64 data URL prefix if present
      let cleanBase64 = pdfBase64;
      if (pdfBase64.startsWith("data:")) {
        const commaIdx = pdfBase64.indexOf(",");
        if (commaIdx !== -1) {
          cleanBase64 = pdfBase64.substring(commaIdx + 1);
        }
      }

      const prompt = `Analysiere die vorliegende Klassenanalyse/Ergebnis-PDF einer österreichischen IKM Plus Erhebung (z.B. für Mathematik oder Deutsch).

UNTERSCHEIDE STRENG ZWISCHEN DEUTSCH UND MATHEMATIK (MATHE):
1. Bestimme zuerst anhand der PDF-Titel, Tabellenüberschriften oder Fußnoten, ob es sich um ein "Mathematik" IKM-PDF oder ein "Deutsch" (Lesen, Zuhören oder Sprachbewusstsein) IKM-PDF handelt.
2. Jedes IKM-PDF bezieht sich in der Regel AUSSCHLIESSLICH auf EIN Fachgebiet.
3. BEFÜLLE NUR DIE RELEVANTEN FACH-FELDER UND LASS ALLE ANDEREN WEG (WICHTIG):
   - Wenn das PDF ein Mathe-Ergebnis ist: Befülle NUR "mathematikPR". Die Felder "deutschLesenPR", "deutschZuhoerenPR" und "deutschSprachbewusstseinPR" dürfen absolut NICHT im Objekt enthalten sein (übergehe/entferne sie).
   - Wenn das PDF ein Deutsch-Ergebnis ist: Befülle NUR das entsprechende Feld (z.B. "deutschLesenPR" für Lesen, oder "deutschZuhoerenPR" für Zuhören, "deutschSprachbewusstseinPR" für Sprachbewusstsein). Das Feld "mathematikPR" darf absolut NICHT im Objekt enthalten sein.
   - Trage niemals erfundene oder geschätzte Werte für unbeteiligte Fächer ein! Setze sie auch nicht standardmäßig auf 0.

SCHÜLER-ZUORDNUNG & NUMMERN:
In diesem Dokument sind die Ergebnisse der Schülerinnen und Schüler aufgeführt. Sie sind in der übergeordneten Klasse (z.B. 4c) über eine Zuteilungsnummer kodiert (z. B. "4c_17", das bedeutet Klasse 4c, Schüler Nummer 17). 
Die Rangordnung im PDF entspricht im Regelfall dem alphabetisch nach Nachnamen sortierten Schülerverzeichnis, kann aber auch durch eine zugewiesene Schülernummer überschrieben sein.

Hier ist die offizielle Klassenliste der tatsächlichen Schüler, sortiert nach Nachname und Vorname mit ihren 1-basierten IKM-Matching-Nummern (Index/Zuteilungsnummer):
${(students || []).map((s: any) => `${s.index}. ${s.name} (ID: ${s.id})`).join('\n')}

Deine Aufgabe ist es:
1. Bestimme den Typ des Moduls in dem PDF (z.B. "Basismodul Mathematik", "Fokusmodul Deutsch Lesen", etc.).
2. Finde die Ergebnisse der einzelnen Schüler anhand ihrer Zuteilungsnummer (z.B. 17 bei "4c_17"). Diese können entweder:
   a) In einer tabellarischen Klassenliste (z.B. unter "Klasse_SuS-ID" oder "Zuteilungsnummer" wie "4c_1", "4c_2") mit Spalten wie "Kompetenzpunkte" (typischerweise Werte von 80 bis 220) oder ähnlichen Metriken stehen.
   b) Auf Einzelseiten im Dokument, wobei unten/oben in der Fußnote/Kopfzeile der Schüler (z.B. "4c_17") steht und im Text Ergebnisse stehen (z.B. "Kompetenzpunkte: 145").
3. Generiere einen hochprofessionellen, individuellen und wertschätzenden pädagogischen Kommentar auf Deutsch für jedes Kind (z.B. "Ausgezeichnete Kompetenzen im sinnerfassenden Lesen. Stark im Textverständnis.").
4. Falls es sich um eine Mathematik IKM handelt, extrahiere unbedingt auch die Aufgabenpunkte / Kompetenzwerte der Teilbereiche für jeden einzelnen Schüler (unter 'Inhaltliche math. Kompetenzen': Zahlen, Operationen, Größen, Ebene und Raum und unter 'Allgemeine math. Kompetenzen': Modellieren, Operieren, Kommunizieren, Problemlösen, wie z.B. in Tabelle 1.5.1 aufgelistet) und befülle das Schema 'matheDetails'.
5. Analysiere präzise für jedes Kind: 'diagnoseStaerken' (konkret worin das Kind glänzt / wo es gut ist) und 'diagnoseHerausforderungen' (konkret woran es noch arbeiten muss / wo es noch fehlt), basierend auf den Punktewerten der detaillierten Dimensionen im Vergleich zu den Mittelwerten (z.B. Mittelwert Österreich).
6. Stelle sicher, dass "studentNumber" die Zuteilungsnummer des Schülers darstellt, um die Werte perfekt zuzuordnen.

Gib die Ergebnisse ausschließlich als JSON zurück.`;

      const result = await callWithRetry((activeModel) => ai.models.generateContent({
        model: activeModel,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "application/pdf"
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          systemInstruction: "Du bist ein hochpräziser Diagnoseassistent für österreichische Lehrkräfte. Deine Aufgabe ist es, IKM Plus Klassenanalysen (PDFs) absolut fehlerfrei auszuwerten. Du identifizierst das jeweilige Fach (Mathematik oder ein Deutsch-Modul wie Lesen) und befüllst NUR die dazu passenden Eigenschaften im JSON, während du die unbeteiligten Fach-Eigenschaften komplett weglässt (nicht im JSON-Objekt deklarieren). Ordne Schüler exakt anhand der Zuteilungsnummer (z. B. 4c_17 -> Schüler Nummer 17) der Klassenliste zu. Gib nur das geforderte, wohlgeformte JSON zurück.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              records: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    studentNumber: { 
                      type: Type.INTEGER, 
                      description: "Die 1-basierte Nummer des Schülers in der Klassenliste (z.B. 17 aus 4c_17)." 
                    },
                    studentNameConfirmed: { 
                      type: Type.STRING, 
                      description: "Der Name des Kindes (z.B. '4c_17' oder ein bestätigter Klarname, falls im PDF vorhanden)." 
                    },
                    deutschLesenPR: { 
                      type: Type.INTEGER, 
                      description: "Kompetenzpunkte für Deutsch Lesen (Zahlenwert zwischen 80 und 230). Leer lassen/auslassen, falls nicht im PDF erhoben!" 
                    },
                    deutschZuhoerenPR: { 
                      type: Type.INTEGER, 
                      description: "Kompetenzpunkte bzw. Wert für Deutsch Zuhören. Leer lassen/auslassen, falls nicht im PDF erhoben!" 
                    },
                    deutschSprachbewusstseinPR: { 
                      type: Type.INTEGER, 
                      description: "Kompetenzpunkte bzw. Wert für Deutsch Sprachbewusstsein. Leer lassen/auslassen, falls nicht im PDF erhoben!" 
                    },
                    mathematikPR: { 
                      type: Type.INTEGER, 
                      description: "Kompetenzpunkte für Mathematik (Zahlenwert zwischen 80 und 230). Leer lassen/auslassen, falls nicht im PDF erhoben!" 
                    },
                    kommentar: { 
                      type: Type.STRING, 
                      description: "Ein wertschätzender, präziser Kommentar, der die Stärken und Entwicklungsfelder des Schülers auf Deutsch beschreibt." 
                    },
                    diagnoseStaerken: {
                      type: Type.STRING,
                      description: "Pädagogischer Text, wo das Kind gut ist/seine Stärken liegen (auf Deutsch)."
                    },
                    diagnoseHerausforderungen: {
                      type: Type.STRING,
                      description: "Pädagogischer Text, woran das Kind noch arbeiten muss / wo es noch fehlt (auf Deutsch)."
                    },
                    matheDetails: {
                      type: Type.OBJECT,
                      description: "Detaillierte Aufgabenpunkte für Mathematik, sofern vorhanden.",
                      properties: {
                        zahlen: { type: Type.INTEGER, description: "Arbeiten mit Zahlen Aufgabenpunkte (z.B. 2)" },
                        operationen: { type: Type.INTEGER, description: "Arbeiten mit Operationen/Grundrechnungsarten Aufgabenpunkte (z.B. 3)" },
                        groessen: { type: Type.INTEGER, description: "Arbeiten mit Größen/Maßeinheiten Aufgabenpunkte (z.B. 3)" },
                        ebeneRaum: { type: Type.INTEGER, description: "Arbeiten mit Ebene und Raum/Geometrie Aufgabenpunkte (z.B. 2)" },
                        modellieren: { type: Type.INTEGER, description: "Modellieren Aufgabenpunkte (z.B. 2)" },
                        operieren: { type: Type.INTEGER, description: "Operieren Aufgabenpunkte (z.B. 2)" },
                        kommunizieren: { type: Type.INTEGER, description: "Kommunizieren Aufgabenpunkte (z.B. 3)" },
                        problemloesen: { type: Type.INTEGER, description: "Problemlösen Aufgabenpunkte (z.B. 3)" }
                      }
                    }
                  },
                  required: ["studentNumber"]
                }
              }
            },
            required: ["records"]
          }
        }
      }), "gemini-3.5-flash");

      let responseText = result.text || "";
      console.log(`[IKM-Analyse] Erfolgreich analysiert. Antwort-Länge: ${responseText.length}`);
      
      // Clean potential Markdown JSON blocks (e.g. ```json ... ```)
      responseText = responseText.trim();
      if (responseText.startsWith("```")) {
        // Strip out starting and trailing backticks with potential language specifier
        responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      responseText = responseText.trim();

      try {
        const parsed = JSON.parse(responseText);
        res.json(parsed);
      } catch (jsonErr: any) {
        console.error("[IKM-Analyse] Fehler beim Parsen des IKM-JSONs:", jsonErr, "Original-Text:", responseText);
        // Fallback: Try to match content enclosed in curly braces
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const secondaryParsed = JSON.parse(jsonMatch[0]);
            return res.json(secondaryParsed);
          } catch (secErr) {
            console.error("[IKM-Analyse] Auch Match-Versuch fehlgeschlagen:", secErr);
          }
        }
        throw new Error("Das von der KI generierte Ergebnis entsprach keinem gültigen JSON-Format. Bitte lade das offizielle IKM PDF erneut hoch.");
      }
    } catch (error: any) {
      console.error("[IKM-Analyse Fehler]", error);
      res.status(500).json({ error: error.message || "Fehler bei der IKM PDF-Analyse durch Gemini." });
    }
  });

  // API Route for Antolin Report Analysis with Gemini
  app.post("/api/ai/analyze-antolin", async (req, res) => {
    const { pdfBase64, rawText, students } = req.body;

    if (!pdfBase64 && !rawText) {
      return res.status(400).json({ error: "Keine PDF-Daten oder Rohdaten übermittelt." });
    }

    try {
      const ai = getAIClient();
      console.log(`[Antolin-Analyse] Starte verbesserte Antolin-Analyse mit gemini-3.5-flash für ${students?.length || 0} Schüler...`);

      let promptText = `Analysiere diesen Antolin-Klassenbericht mit höchster Präzision.
      
Hier ist die offizielle Klassenliste der tatsächlichen Schüler (ID und vollständiger Name):
${(students || []).map((s: any) => `- Name: ${s.vorname} ${s.nachname} (ID: ${s.id})`).join('\n')}

Deine Aufgabe ist es, für jeden Schüler aus der obigen Liste die Antolin-Werte (Anzahl gelesener Bücher, Antolin-Punkte, Erfolg/Leistung in % und durchschnittliche Schwierigkeit) herauszulesen.

SPALTEN-IDENTIFIKATION UND PARSING-REGELN:
1. **Name des Schülers / der Schülerin**:
   - Ordne die Zeilen aus dem Antolin-Bericht den Schülern in der obigen Klassenliste bestmöglich zu (Vorname und Nachname vergleichen).
   - Achte auf Umlaute, Tippfehler (z.B. Livia Allgauer, Seyma Ciftcioglu, Anselm Högström-Feinig), Namensdreher (Nachname vor Vorname oder umgekehrt) oder Schreibweisen und verknüpfe sie korrekt mit der jeweiligen ID.
   - Wenn ein Schüler im Dokument aufgeführt ist, der absolut nicht in deiner übermittelten Klassenliste steht, ignoriere ihn.

2. **Gelesene Bücher / Anzahl Bücher** (Feld "anzahlBuecher", Typ: Integer):
   - Dies ist die Anzahl der Bücher oder Texte, für die das Kind ein Quiz ausgefüllt hat.
   - Suche nach Spalten-Überschriften wie: "Bücher", "gelesene Bücher", "Texte", "Anzahl", "Titel", "Arbeitsgemeinschaften", Abkürzung "b" oder "B".
   - Falls ein Schüler gar nichts gelesen hat oder nicht im Bericht steht, setze den Wert auf 0 (niemals null oder undefined).

3. **Punkte / Gesamtpunkte** (Feld "punkte", Typ: Integer):
   - Erzielte Punkte insgesamt. Dies sind meistens deutlich größere positive (oder selten negative) Zahlen als die Buchanzahl (z. B. 120, 450, 1205).
   - Suche nach Spalten-Überschriften wie: "Punkte", "Pkt.", "Pkt", "Punkte gesamt", "Gesamtpunkte", "Gesamtjahrespunkte", "p", "P".
   - Falls kein Wert vorhanden ist, trage standardmäßig 0 ein.

4. **Erfolg % / Leistung % / Erfolgsquote** (Feld "leistung", Typ: Number):
   - Der Anteil richtig beantworteter Fragen. Dies ist fast immer ein Prozentwert (z.B. "85 %", "92,5%", "100%", "73 %") oder eine nackte Zahl in einer Spalte namens "Erfolg", "Erfolg %", "Erfolgsquote", "richtig %", "Richtig beantwortet %", "Leistung", "Quote", "L", "Erfolg in %".
   - **Sehr Wichtig**: Konvertiere den Wert unbedingt in eine Gleitkommazahl (float). Kommas müssen in Punkte umgewandelt werden (z. B. "83,3 %" -> 83.3, "92%" -> 92.0).
   - Falls kein Wert vorhanden ist, trage standardmäßig 0.0 ein.

5. **Schwierigkeit / Ø-Schwierigkeit** (Feld "schwierigkeit", Typ: Number):
   - Durchschnittliche Schwierigkeit der gelesenen Bücher. Meist eine Gleitkommazahl wie "2,4", "3.1", "1,8" oder einfach "2".
   - Suche nach Spalten-Überschriften wie: "Schwierigkeit", "Ø Schwierigkeit", "Ø-Stufe", "Ø Stufe", "Ø Schwierigkeitsgrad", "Ø Schwierigkeitsstufe", "ST", "S" oder "Stufe".
   - **Sehr Wichtig**: Konvertiere deutsche Kommas in englische Dezimalpunkte (z.B. "2,4" -> 2.4).
   - Falls kein Wert vorhanden ist, trage standardmäßig 0.0 ein.

MAPPING-RICHTLINIEN & FEHLERVERMEIDUNG:
- Verknüpfe die extrahierten Spalten absolut fehlerfrei für jeden Benutzer. Achte darauf, dass Werte nicht vertauscht werden! Ein Schüler mit z.B. 15 Büchern und 320 Punkten darf nicht umgekehrt zugeordnet werden.
- Ignoriere Klassendurchschnitte am Ende des Berichts.
- Jeder gefundene Schüler MUSS alle 6 Attribute im JSON eingetragen haben. Fülle nicht gefundene Werte mit 0 oder 0.0 auf.

Gib das Ergebnis ausschließlich als JSON zurück mit einem Array 'records', wobei jedes Element die Struktur { studentId, studentNameConfirmed, anzahlBuecher, punkte, leistung, schwierigkeit } hat.`;

      const contents: any[] = [];
      if (pdfBase64) {
        let cleanBase64 = pdfBase64;
        if (pdfBase64.startsWith("data:")) {
          const commaIdx = pdfBase64.indexOf(",");
          if (commaIdx !== -1) {
            cleanBase64 = pdfBase64.substring(commaIdx + 1);
          }
        }
        contents.push({
          inlineData: {
            data: cleanBase64,
            mimeType: "application/pdf"
          }
        });
      }

      if (rawText) {
        promptText += `\n\nHIER IST DER ANTOLIN-TEXT AUS COPY-PASTE:\n${rawText}`;
      }
      contents.push({ text: promptText });

      const result = await callWithRetry((activeModel) => ai.models.generateContent({
        model: activeModel,
        contents: contents,
        config: {
          systemInstruction: "Du bist ein hochpräziser Antolin-Diagnoseassistent für österreichische Lehrkräfte. Deine Aufgabe ist es, Antolin-Klassenberichte (Klassenbericht-PDFs oder Tabellentexte) fehlerfrei auszuwerten. Ordne die Schüler exakt den IDs aus der übermittelten Klassenliste zu. Extrahiere Bücher, Punkte, Erfolg in % und Schwierigkeitsstufe fehlerfrei. Antworte ausschließlich im von dir erzeugten JSON-Schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              records: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    studentId: {
                      type: Type.STRING,
                      description: "Die ID des Schülers aus der Klassenliste (z.B. ID: UUID)."
                    },
                    studentNameConfirmed: {
                      type: Type.STRING,
                      description: "Der Name des Kindes wie er im Dokument steht (z.B. Eymen Alici)."
                    },
                    anzahlBuecher: {
                      type: Type.INTEGER,
                      description: "Die Anzahl der gelesenen Bücher."
                    },
                    punkte: {
                      type: Type.INTEGER,
                      description: "Erzielte Punkte."
                    },
                    leistung: {
                      type: Type.NUMBER,
                      description: "Leistung / Erfolg in Prozent (z.B. 75.5)."
                    },
                    schwierigkeit: {
                      type: Type.NUMBER,
                      description: "Durchschnittliche Buchschwierigkeit (z.B. 2.4)."
                    }
                  },
                  required: ["studentId", "studentNameConfirmed", "anzahlBuecher", "punkte", "leistung", "schwierigkeit"]
                }
              }
            },
            required: ["records"]
          }
        }
      }), "gemini-3.5-flash");

      let responseText = result.text || "";
      console.log(`[Antolin-Analyse] Erfolgreich analysiert. Antwort-Länge: ${responseText.length}`);
      
      responseText = responseText.trim();
      if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      responseText = responseText.trim();

      try {
        const parsed = JSON.parse(responseText);
        res.json(parsed);
      } catch (jsonErr: any) {
        console.error("[Antolin-Analyse] Fehler beim Parsen des JSONs:", jsonErr, "Original-Text:", responseText);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const secondaryParsed = JSON.parse(jsonMatch[0]);
            return res.json(secondaryParsed);
          } catch (secErr) {
            console.error("[Antolin-Analyse] Auch Match-Versuch fehlgeschlagen:", secErr);
          }
        }
        throw new Error("Das von der KI generierte Antolin-Ergebnis entsprach keinem gültigen JSON-Format. Bitte lade die Datei oder den Text erneut hoch.");
      }
    } catch (error: any) {
      console.error("[Antolin-Analyse Fehler]", error);
      res.status(500).json({ error: error.message || "Fehler bei der Antolin-Berichtsanalyse durch Gemini." });
    }
  });

  // Memory store for sync sessions
  const syncSessions: Record<string, {
    state: any;
    lastUpdated: number;
  }> = {};

  // API Route for Geocoding (Weather)
  app.get("/api/weather/geocode", async (req, res) => {
    try {
      const city = req.query.city as string;
      if (!city) return res.status(400).json({ error: "Missing city" });
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de`;
      const response = await fetch(geoUrl, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error("Geocoding failed");
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      res.json(getFallbackGeocodingData(req.query.city as string || "Feldkirch"));
    }
  });

  // API Route for Forecast (Weather)
  app.get("/api/weather/forecast", async (req, res) => {
    const lat = req.query.lat as string || "47.2333";
    const lon = req.query.lon as string || "9.6";
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,precipitation,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation,weather_code&timezone=Europe/Vienna&forecast_days=1`;
      const response = await fetch(weatherUrl, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error("Forecast failed");
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      res.json(getFallbackWeatherData(lat, lon));
    }
  });

  // Create/Join a sync session
  app.post("/api/sync/create", (req, res) => {
    const { state } = req.body;
    
    // Generate a random 6-character code (letters/numbers, easily readable)
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing chars like O, I, 1, 0
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    syncSessions[code] = {
      state,
      lastUpdated: Date.now()
    };
    
    res.json({ code });
  });

  // Update state on a sync session
  app.put("/api/sync/:code", (req, res) => {
    const { code } = req.params;
    const { state } = req.body;
    
    if (!syncSessions[code]) {
      return res.status(404).json({ error: "Sitzung nicht gefunden oder abgelaufen." });
    }
    
    syncSessions[code].state = state;
    const lastUpdated = Date.now();
    syncSessions[code].lastUpdated = lastUpdated;
    
    res.json({ success: true, lastUpdated });
  });

  // Get state of a sync session
  app.get("/api/sync/:code", (req, res) => {
    const { code } = req.params;
    
    const session = syncSessions[code];
    if (!session) {
      return res.status(404).json({ error: "Sitzung nicht gefunden oder abgelaufen." });
    }
    
    res.json({ state: session.state, lastUpdated: session.lastUpdated });
  });

  // --- OneDrive Synchronization Endpoints ---
  app.get("/api/onedrive/auth-url", (req, res) => {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      return res.json({ configured: false });
    }
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/onedrive/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: "Files.ReadWrite offline_access",
      state: "onedrive_sync"
    });
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    res.json({ configured: true, url: authUrl });
  });

  app.get("/api/onedrive/callback", async (req, res) => {
    const { code, error, error_description } = req.query;
    
    if (error || !code) {
      const errMsg = (error_description as string) || (error as string) || "Unbekannter Fehler bei Microsoft OAuth.";
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OneDrive Fehler</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #fef2f2;
              color: #991b1b;
              text-align: center;
              padding: 20px;
            }
            .error-icon { font-size: 48px; margin-bottom: 16px; }
            h2 { font-weight: 800; margin-bottom: 8px; }
            p { color: #7f1d1d; font-size: 14px; margin-bottom: 24px; max-width: 400px; line-height: 1.5; }
            button {
              background-color: #dc2626; color: white; border: none; padding: 12px 24px;
              border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="error-icon">❌</div>
          <h2>Verbindung fehlgeschlagen</h2>
          <p>${errMsg}</p>
          <button onclick="window.close()">Fenster schließen</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ONEDRIVE_AUTH_ERROR', error: ${JSON.stringify(errMsg)} }, '*');
            }
          </script>
        </body>
        </html>
      `);
    }

    try {
      const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/onedrive/callback`;
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || "",
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
          code: code as string,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        }).toString()
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error_description || errData.error || `HTTP-Status: ${response.status}`;
        throw new Error(errMsg);
      }

      const tokenData = await response.json();
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OneDrive Verbindung</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f8fafc;
              color: #0f172a;
              text-align: center;
            }
            .spinner {
              border: 4px solid rgba(0, 0, 0, 0.1);
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border-left-color: #0078d4;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h2 { font-weight: 800; margin-bottom: 8px; }
            p { color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Verbindung erfolgreich!</h2>
          <p>Dieses Fenster schließt sich in Kürze automatisch...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'ONEDRIVE_AUTH_SUCCESS', 
                tokenData: {
                  access_token: ${JSON.stringify(tokenData.access_token)},
                  refresh_token: ${JSON.stringify(tokenData.refresh_token)},
                  expires_at: ${Date.now() + (tokenData.expires_in || 3600) * 1000}
                } 
              }, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      const errMsg = err.message || "Fehler beim Austausch des Authentifizierungscodes.";
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OneDrive Fehler</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #fef2f2;
              color: #991b1b;
              text-align: center;
              padding: 20px;
            }
            .error-icon { font-size: 48px; margin-bottom: 16px; }
            h2 { font-weight: 800; margin-bottom: 8px; }
            p { color: #7f1d1d; font-size: 14px; margin-bottom: 24px; max-width: 400px; line-height: 1.5; }
            button {
              background-color: #dc2626; color: white; border: none; padding: 12px 24px;
              border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="error-icon">❌</div>
          <h2>Token-Austausch fehlgeschlagen</h2>
          <p>${errMsg}</p>
          <button onclick="window.close()">Fenster schließen</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ONEDRIVE_AUTH_ERROR', error: ${JSON.stringify(errMsg)} }, '*');
            }
          </script>
        </body>
        </html>
      `);
    }
  });

  app.post("/api/onedrive/refresh", async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: "Refresh Token fehlt" });
    }
    try {
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || "",
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
          refresh_token: refresh_token,
          grant_type: "refresh_token"
        }).toString()
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error_description || errData.error || `HTTP-Status: ${response.status}`;
        return res.status(response.status).json({ error: errMsg });
      }

      const tokenData = await response.json();
      res.json({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Token Refresh fehlgeschlagen" });
    }
  });

  app.put("/api/onedrive/upload", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization Header fehlt" });
    }
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/root:/Lehrermappe_Backup.json:/content", {
        method: "PUT",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `OneDrive API Fehler: ${errText}` });
      }
      const data = await response.json();
      res.json({ success: true, file: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  app.get("/api/onedrive/download", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization Header fehlt" });
    }
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/root:/Lehrermappe_Backup.json:/content", {
        headers: {
          "Authorization": authHeader
        }
      });
      if (response.status === 404) {
        return res.status(404).json({ error: "Keine Sicherungsdatei auf OneDrive gefunden." });
      }
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `OneDrive API Fehler: ${errText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Download failed" });
    }
  });

  app.get("/api/onedrive/metadata", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization Header fehlt" });
    }
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/root:/Lehrermappe_Backup.json", {
        headers: {
          "Authorization": authHeader
        }
      });
      if (response.status === 404) {
        return res.json({ exists: false });
      }
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `OneDrive API Fehler: ${errText}` });
      }
      const data = await response.json();
      res.json({ exists: true, lastModifiedDateTime: data.lastModifiedDateTime, size: data.size });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Metadaten-Abruf fehlgeschlagen" });
    }
  });

  // Periodically clean up session memory (sessions older than 12 hours)
  setInterval(() => {
    const now = Date.now();
    Object.keys(syncSessions).forEach(code => {
      if (now - syncSessions[code].lastUpdated > 12 * 60 * 60 * 1000) {
        delete syncSessions[code];
      }
    });
  }, 10 * 60 * 1000); // Check every 10 minutes

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
