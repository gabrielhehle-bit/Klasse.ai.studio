// Client-side AI Service calling the server proxy
import { pseudonymisiere, depseudonymisiere, PseudonymMap } from '../lib/pseudonymisierung';
import { AppState } from '../types';

export interface LessonSuggestion {
  thema: string;
  material: string;
  method: string;
  social: string;
}

export interface DetailedLessonPlan {
  lernziele: {
    kognitiv: string;
    affektiv: string;
    instrumental: string;
  };
  verlaufsplan: {
    phase: string;
    zeit: string;
    aktion: string;
    sozialform: string;
    medien: string;
  }[];
  materialien: string;
  differenzierung: {
    starke: string;
    schwache: string;
  };
}

export interface DailyInsight {
  greeting: string;
  focus: string;
  tip: string;
  quote: string;
  actionItems?: string[];
  recommendation?: string;
  focusedStudentName?: string;
  studentSupportArea?: string;
  studentSupportExample?: string;
}

let pseudonymizationWarningShown = false;

async function callServerAI(action: string, params: any): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

  let map: PseudonymMap = {};
  try {
    let stateStr = localStorage.getItem('hehle_v3_namen');
    if (!stateStr) {
      stateStr = localStorage.getItem('hehle_v3_fallback');
      if (!stateStr) {
        if (!pseudonymizationWarningShown) {
          console.warn('[Datenschutz] Pseudonymisierung nicht möglich – Namensliste fehlt');
          pseudonymizationWarningShown = true;
        }
      }
    }
    
    if (stateStr) {
      const parsedData = JSON.parse(stateStr);
      const appState: Partial<AppState> = {
         schueler: parsedData.schueler || [],
         classes: [],
         lehrerProfil: { 
           vorname: '', 
           nachname: '', 
           schule: parsedData.schule || (parsedData.lehrerProfil?.schule) || '' 
         } as any,
         pseudonymisierungAktiv: parsedData.pseudonymisierungAktiv
      };
      
      // Before pseudonymization, strip birthdates from params if any
      // A simple regex approach to mask dates like DD.MM.YYYY
      // Exclude imageBase64 from pseudonymization to avoid regex performance issues on large base64 strings
      const { imageBase64, ...restParams } = params;
      let paramsStr = JSON.stringify(restParams);
      paramsStr = paramsStr.replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, "[Datum entfernt]");

      const result = pseudonymisiere(paramsStr, appState as AppState);
      params = { ...JSON.parse(result.text), ...(imageBase64 ? { imageBase64 } : {}) };
      map = result.map;
    }
  } catch (e) {
    console.warn("Pseudonymization step failed", e);
  }

  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, params }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error("Rate Limit überschritten: Die KI braucht eine kurze Pause. Bitte versuche es in 10-20 Sekunden erneut.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("KI-Authentifizierungsfehler: Dein API-Schlüssel ist abgelaufen oder ungültig. Bitte erneuere ihn in den App-Einstellungen.");
      }
      throw new Error(errorData.error || "KI momentan nicht erreichbar");
    }

    const data = await response.json();
    let resultText = data.text;
    if (Object.keys(map).length > 0) {
      resultText = depseudonymisiere(resultText, map);
    }
    return resultText;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`[AI Service Error] ${action}:`, error);
    if (error.name === 'AbortError') {
      throw new Error("Timeout: Die KI hat zu lange für eine Antwort gebraucht.");
    }
    throw new Error(error.message || "KI momentan nicht erreichbar");
  }
}

export interface AiWeeklyPlanSubjectAssignment {
  tag: string;
  idx: number;
  thema: string;
  buch: string;
  subCategory?: string;
  subCategories?: string[];
  type?: string;
}

export async function checkWeeklyPlanAlignmentAI(
  yearlyPlanTopics: Record<string, any>,
  weeklyPlan: Record<string, any>
): Promise<string> {
  try {
    const text = await callServerAI("generateContent", {
      contents: `Rolle: Du bist ein präziser, hilfreicher Assistent für Lehrkräfte.
Aufgabe: Prüfe, ob die in der Jahresplanung festgelegten Themen und Lehrplanziele dieser Woche vollständig und korrekt im Stundenplan abgebildet sind.

Jahresplan (Soll):
${JSON.stringify(yearlyPlanTopics, null, 2)}

Wochenplan (Ist):
${JSON.stringify(weeklyPlan, null, 2)}

Analysiere die Daten und gib konstruktives Feedback in kurzen Stichpunkten:
- Fehlt ein Thema aus der Jahresplanung im Wochenplan?
- Wurden Unterkategorien (wie 'Lesen', 'Verfassen von Texten' in Deutsch) korrekt zugeordnet?
- Gibt es Diskrepanzen?
- Halte die Antwort prägnant und freundlich (max 4-5 Sätze). Formatiere es als unkomplizierten Text, gerne mit Emojis zur Auflockerung.`,
      config: {
        responseMimeType: "text/plain"
      }
    });

    return text;
  } catch (error: any) {
    return "Fehler bei der KI-Prüfung: " + error.message;
  }
}

export async function generateWeeklyPlanFromYearlyPlan(
  stufe: number,
  yearlyPlanTopics: Record<string, any>,
  weeklyTimetableTemplate: Record<string, any>
): Promise<AiWeeklyPlanSubjectAssignment[] | string> {
  try {
    const text = await callServerAI("generateContent", {
      contents: `Rolle: Du bist ein strukturierter Lehrer, der die Wochenthemen aus dem Jahresplan sinnvoll auf den konkreten Stundenplan einer Schulwoche verteilt.
Stufe: ${stufe}. Schulstufe (VS Österreich).

Jahresplan Themen dieser Woche (JSON):
${JSON.stringify(yearlyPlanTopics)}

Stundenplan Raster (JSON):
${JSON.stringify(weeklyTimetableTemplate)}

Aufgabe:
Verteile die Themen aus dem Jahresplan auf die passenden Fächer im Stundenplan Raster.
Beachte dabei:
- Deutsch-Unterricht sollte sinnvoll in Teilbereiche aufgeteilt werden, wie z.B.: 'Deutsch (Lesen)', 'Deutsch (Verfassen von Texten)', 'Deutsch (Rechtschreibung)', 'Deutsch (Sprache)'. Verwende dafür das Feld "subCategories" als Array. Wenn in der Jahresplanung "items" existieren, verwende diese bevorzugt.
- Ein Thema kann auch über mehrere Stunden desselben Faches gestreckt werden.
- Nutze das 'tag' (z.B. Montag, Dienstag...) und 'idx' (Stunden-Index, beginnend bei 0) aus dem Stundenplan.
- Behalte 'thema' und 'buch' bei.
- type sollte z.B. 'standard' sein.

Gib ein Array mit Zuweisungen zurück. Jede Zuweisung verknüpft ein Thema mit einem konkreten Tag (tag) und einer Stunde (idx).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              tag: { type: "STRING" },
              idx: { type: "INTEGER" },
              thema: { type: "STRING" },
              buch: { type: "STRING" },
              subCategory: { type: "STRING" },
              subCategories: { type: "ARRAY", items: { type: "STRING" } },
              type: { type: "STRING" }
            },
            required: ["tag", "idx", "thema"]
          }
        }
      }
    });

    return JSON.parse(text) as AiWeeklyPlanSubjectAssignment[];
  } catch (error: any) {
    return error.message;
  }
}

export async function getLessonSuggestion(fach: string, thema: string, stufe: number, schwerpunkte: string[] = []): Promise<LessonSuggestion | string | null> {
  if (!fach || (!thema && schwerpunkte.length === 0)) return "Eingabe zu kurz für einen sinnvollen Vorschlag.";

  const schwerpunkteText = schwerpunkte.length > 0 ? `Schwerpunkte: ${schwerpunkte.join(', ')}` : '';

  try {
    const text = await callServerAI("generateContent", {
      contents: `Erstelle einen Vorschlag für eine Unterrichtseinheit in der Volksschule (${stufe}. Schulstufe).
        Fach: ${fach}
        ${schwerpunkteText}
        Grobthema: ${thema || 'Aktueller Lehrplan'}
        
        Bitte generiere ein konkretes Unterrichtsziel/Thema, das zu den Schwerpunkten (falls angegeben) und dem Grobthema passt.
        
        Gib mir:
        1. Ein konkretes Thema/Lernziel (kurz, prägnant)
        2. Benötigte Materialien (kurz)
        3. Eine methodische Idee (kurz)
        4. Die am besten passende Sozialform (Einzelarbeit, Partnerarbeit oder Gruppenarbeit)`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            thema: { type: "STRING" },
            material: { type: "STRING" },
            method: { type: "STRING" },
            social: { 
              type: "STRING", 
              enum: ["single", "partner", "group"],
            },
          },
          required: ["thema", "material", "method", "social"],
        },
      }
    });

    return JSON.parse(text) as LessonSuggestion;
  } catch (error: any) {
    return error.message;
  }
}

export async function generateDetailedLessonPlan(
  fach: string, 
  thema: string, 
  zeitrahmen: string,
  lernziel: string,
  stufe: number,
  classContext: string,
  availableMaterials: string = "",
  socialForm: string = "Flexibel"
): Promise<DetailedLessonPlan | string | null> {
  if (!fach || !thema) return "Eingabe zu kurz.";

  try {
    const text = await callServerAI("generateContent", {
      contents: `Rolle: Du bist ein erfahrener Fachdidaktiker und Unterrichtsplaner aus Vorarlberg, Österreich.
Fach: ${fach}
Thema: ${thema}
Stufe: ${stufe}. Schulstufe. 
Zeitrahmen: ${zeitrahmen}.
Lernziel: ${lernziel}
Materialien: ${availableMaterials || "Nur Standard-Basis-Ausstattung."}
Kontext: ${classContext}

Erstelle einen direkt umsetzbaren Entwurf.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            lernziele: {
              type: "OBJECT",
              properties: {
                kognitiv: { type: "STRING" },
                affektiv: { type: "STRING" },
                instrumental: { type: "STRING" },
              },
              required: ["kognitiv", "affektiv", "instrumental"]
            },
            verlaufsplan: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  phase: { type: "STRING" },
                  zeit: { type: "STRING" },
                  aktion: { type: "STRING" },
                  sozialform: { type: "STRING" },
                  medien: { type: "STRING" },
                },
                required: ["phase", "zeit", "aktion", "sozialform", "medien"]
              }
            },
            materialien: { type: "STRING" },
            differenzierung: {
              type: "OBJECT",
              properties: {
                starke: { type: "STRING" },
                schwache: { type: "STRING" },
              },
              required: ["starke", "schwache"]
            }
          },
          required: ["lernziele", "verlaufsplan", "materialien", "differenzierung"],
        },
      }
    });

    return JSON.parse(text) as DetailedLessonPlan;
  } catch (error: any) {
    return error.message;
  }
}

export async function getDailyInsight(name: string, stufe: number, count: number, contextData?: any): Promise<DailyInsight | string | null> {
  const today = new Date().toLocaleDateString('de-DE');
  const cacheKey = `ki_daily_insight_${name}_v2_${today}`;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    // If contextData is provided, we might want to bypass cache or merge. 
    // For now, let's allow forcing a refresh if context changed significantly, 
    // but typically one refresh per day is enough.
    if (cached && !contextData) return JSON.parse(cached);

    const userMessage = contextData 
      ? `Briefing für: Lehrkraft ${name}, ${stufe}. Stufe, ${count} Schüler. 
         Aktueller Kontext: ${JSON.stringify(contextData)}`
      : `Fasst kurz zusammen: Lehrkraft ${name}, ${stufe}. Stufe, ${count} Schüler.`;

    const result = await callServerAI("askAI", {
      modusId: 'ki-daily-insight',
      userMessage: userMessage,
    });
    
    const parsed = JSON.parse(result) as DailyInsight;
    localStorage.setItem(cacheKey, JSON.stringify(parsed));
    return parsed;
  } catch (error: any) {
    console.warn("getDailyInsight failed, using quiet fallback:", error);
    return {
      greeting: `Hallo ${name || 'Lehrkraft'} 🌟`,
      focus: "Fokus & Balance",
      tip: "Achte heute besonders auf klare Übergänge zwischen den Unterrichtsphasen. Das gibt den Schülern Sicherheit.",
      quote: "Ein strukturierter Tag bringt Ruhe in den Klassenraum.",
      recommendation: "Gönn dir in der 2. großen Pause 5 Min. frische Luft.",
      actionItems: ["Pausenaufsicht prüfen", "Material für morgen vorbereiten"],
      focusedStudentName: "Samy",
      studentSupportArea: "Konzentration",
      studentSupportExample: "Einem Schüler, der unruhig ist, könnte heute eine kleine Sonderaufgabe (z.B. 'Materialdienst') helfen, um sich wieder zu fokussieren."
    } as DailyInsight;
  }
}

export async function generateParentEmail(topic: string, points: string, tonality: string): Promise<string | null> {
  if (!topic || topic.length < 3) return null;
  try {
    return await callServerAI("generateContent", {
      contents: `Erstelle einen professionellen Elternbrief für einen Vorarlberger Volksschullehrer. Thema: ${topic}, Punkte: ${points}, Ton: ${tonality}.`
    });
  } catch (error) {
    return null;
  }
}

export async function generateVerbalAssessment(studentName: string, studentInfo: string, subjects: string, focus: string): Promise<string | null> {
  if (!studentName || studentName.length < 2) return null;
  try {
    return await askAI('ki-beurteilung', `
SCHÜLER: ${studentName}
KONTEXT: ${studentInfo}
FÄCHER: ${subjects}
FOKUS: ${focus}

Bitte erstelle die Beurteilung gemäß den System-Regeln.
    `.trim());
  } catch (error) {
    return null;
  }
}

export async function generateDifferentiation(studentName: string, topic: string, level: string): Promise<string | null> {
  if (!topic) return null;
  try {
    return await askAI('ki-differenzierung', `
SCHÜLER: ${studentName || 'Die Klasse'}
THEMA: ${topic}
NIVEAU: ${level}

Bitte erstelle Differenzierungsvorschläge.
    `.trim());
  } catch (error) {
    return null;
  }
}

export interface QAItem {
  question: string;
  options: string[];
  correctIndex: number;
}

export async function generateQuiz(topic: string, stufe: number, difficulty: string = "Mittel"): Promise<QAItem[] | null> {
  if (!topic) return null;
  try {
    const text = await callServerAI("generateContent", {
      contents: `Rolle: Du bist ein begeisternder Quiz-Master für eine ${stufe}. Volksschulklasse.
Thema: ${topic}
Schwierigkeitsgrad: ${difficulty}
Erstelle ein kindgerechtes Quiz mit 5 Fragen. Zu jeder Frage brauche ich 4 Antwortmöglichkeiten (A, B, C, D), wobei genau eine richtig ist.

Formatiere die Antwort strikt als JSON (ein Array aus Objekten).
Folge genau diesem Schema für jedes Objekt:
{
  "question": "Fragetext",
  "options": ["A", "B", "C", "D"],
  "correctIndex": <Index der richtigen Antwort, 0-3>
}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: { type: "STRING" },
              options: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              correctIndex: { type: "NUMBER" }
            },
            required: ["question", "options", "correctIndex"]
          }
        }
      }
    });
    return JSON.parse(text) as QAItem[];
  } catch (error) {
    console.error("AI Quiz generation failed", error);
    return null;
  }
}

export async function generateTeachingMaterial(fach: string, thema: string, stufe: number, art: string, differenzierung: boolean): Promise<string | null> {
  const prompt = `Erstelle ein Unterrichtsmaterial für die Volksschule Österreich.
Fach: ${fach}
Thema: ${thema}
Schulstufe: ${stufe}. Klasse

Art des Materials: ${art}
${differenzierung ? 'Bitte differenziere in 3 Niveaustufen (Leicht, Mittel, Anspruchsvoll) und gliedere den Text sichtbar.' : 'Bitte erstelle ein allgemeines Material für die ganze Klasse.'}

Regeln:
1. Das Material soll direkt einsetzbar sein (kein Stundenentwurf, sondern das echte Material für die Schüler!).
2. Schreibe kindgerecht, aber pädagogisch wertvoll.
3. Formatiere den Text sauber und übersichtlich mit Absätzen und Markdown.
4. Vermeide ausschweifende Einleitungen, produziere direkt das Material.`;

  try {
    return await askAI('ki-helfer', prompt);
  } catch (error) {
    return null;
  }
}

export async function generateExcuse(topic: string): Promise<string | null> {
  const prompt = `Du bist ein hilfreicher Assistent für Lehrkräfte. Die Lehrkraft wurde gebeten, folgende Zusatzaufgabe zu übernehmen: "${topic}".
Die Lehrkraft möchte diese Aufgabe ablehnen, da sie bereits überlastet ist oder sich auf andere Dinge konzentrieren muss.
Schreibe eine sehr kurze, hochprofessionelle, aber charmante und diplomatische Absage-E-Mail (an die Schulleitung oder Kollegin), die das Nein freundlich aber bestimmt formuliert.
Maximal 4-5 Sätze.`;
  return await askAI('ki-helfer', prompt);
}

export async function polishText(text: string): Promise<string | null> {
  if (!text || text.length < 5) return null;
  try {
    return await askAI('ki-korrektur', `Poliere diesen Text: "${text}"`);
  } catch (error) {
    return null;
  }
}

export async function generateMeetingGuide(studentName: string, performanceData: string): Promise<string | null> {
  if (!studentName) return null;
  try {
    return await askAI('ki-beurteilung', `
SCHÜLER: ${studentName}
LEISTUNGSDATEN: ${performanceData}
ZWECK: KEL-Gesprächsvorbereitung.

Erstelle 3-5 prägnante Bullet Points (Stärken/Entwicklungsfelder).
    `.trim());
  } catch (error) {
    return null;
  }
}

export async function generateFoerderziel(keywords: string): Promise<string | null> {
  if (!keywords) return null;
  try {
    return await askAI('ki-beurteilung', `Formuliere ein konkretes Förderziel (Volksschule Österreich) aus: "${keywords}". Nur das Ziel, ein Satz.`);
  } catch (error) {
    return null;
  }
}

export async function generateKELAssessment(bereich: string, keywords: string): Promise<string | null> {
  if (!keywords) return null;
  try {
    return await askAI('ki-beurteilung', `Formuliere eine Einschätzung zu ${bereich} (Volksschule Österreich) für ein KEL-Gespräch. Stichworte: ${keywords}. Maximal 2 Sätze, Ich-Form.`);
  } catch (error) {
    return null;
  }
}

export async function generateKELAgreement(keywords: string): Promise<string | null> {
  if (!keywords) return null;
  try {
    return await askAI('ki-beurteilung', `Formuliere KEL-Vereinbarungen (Volksschule Österreich) aus: ${keywords}. Maximal 3 Sätze.`);
  } catch (error) {
    return null;
  }
}

export async function getNiveauSuggestion(performanceData: string, notes: string): Promise<{ suggestion: number; reason: string } | null> {
  if (!performanceData && !notes) return null;
  try {
    const text = await callServerAI("generateContent", {
      contents: `Analysiere die vorliegenden Leistungen und Notizen dieses Schülers und schlage ein passendes Sprach-/Leistungsniveau (1-5) vor. 
        Hierbei gilt: 1 = sehr geringe Kenntnisse/Leistung, 5 = sehr hohe Kenntnisse/Leistung.
        
        Leistungen: ${performanceData}
        Letzte Notizen/Beobachtungen: ${notes}
        
        Beantworte im JSON-Format mit 'suggestion' (Zahl 1-5) und 'reason' (ein kurzer Satz Begründung).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            suggestion: { type: "NUMBER" },
            reason: { type: "STRING" },
          },
          required: ["suggestion", "reason"],
        },
      }
    });

    return JSON.parse(text) as { suggestion: number; reason: string };
  } catch (error) {
    console.error("AI Niveau Suggestion failed", error);
    return null;
  }
}

export async function generatePortfolioSummary(studentName: string, performanceData: string, meetingsData: string, behaviorData: string, absenceData?: string, foerderAndErlauterungData?: string, focusStyle: string = "Ausgewogen & Professionell"): Promise<string | null> {
  if (!studentName) return null;
  try {
    return await askAI('ki-beurteilung', `
SCHÜLER: ${studentName}

LEISTUNGSDATEN / NOTEN:
${performanceData}

ELTERNGESPRÄCHE / NOTIZEN:
${meetingsData}

VERHALTEN / SOZIALES:
${behaviorData}

${absenceData ? `FEHLZEITEN / ANWESENHEIT:\n${absenceData}\n` : ''}

${foerderAndErlauterungData ? `FÖRDERPROFIL & DIAGNOSTIK / MATRIX:\n${foerderAndErlauterungData}\n` : ''}
ZWECK: Zusammenfassendes Schülerportfolio-Dossier (pädagogisch, wertschätzend, mit konkreten Beobachtungen von Lernfortschritten, dem Förderprofil, Erläuterungen, Testergebnissen, detaillierten 1:1 Live-Diagnosen und nächsten Entwicklungsschritten).

STIL-VORGABE: ${focusStyle}. Passe deinen Schreibstil exakt an diesen Tonfall an.

Bitte erstelle ein professionelles, kurzes und übersichtliches Schülerprofil-Portfolio in 3 strukturierten Abschnitten auf Deutsch (Verwende Markdown für eine angenehme Formatierung):
1. Pädagogische Gesamtbeurteilung (2-3 Sätze, inklusive kurzer Würdigung von Verhalten, Förderprofil, IKM Plus, diagnostischen Testergebnissen [inkl. 1:1 Live-Protokolle falls vorhanden], Erläuterungen, Noten, Beobachtungen und Anwesenheit. Gehe explizit auf Stärken und Herausforderungen ein, die sich aus den Testergebnissen ableiten lassen!)
2. Größte Stärken & Potenziale (Stichpunkte, basierend auf Noten, Tests/Diagnostik, Verhalten und Engagement)
3. Empfohlene nächste Entwicklungsschritte (Stichpunkte, inklusive konkreter Förderempfehlungen basierend auf erkannten Defiziten in Diagnostik-Ergebnissen und den Zielen im Förderprofil falls vorhanden)
    `.trim());
  } catch (error) {
    return null;
  }
}

export async function generateStudentPortfolioEntriesSummary(studentName: string, portfolioEntries: any[]): Promise<string | null> {
  if (!studentName || portfolioEntries.length === 0) return "Keine Portfolio-Einträge vorhanden.";
  try {
    return await callServerAI("portfolioSummary", { portfolioEntries, studentName });
  } catch (error) {
    return null;
  }
}

export async function analyzePortfolioEntryForGoals(
  titel: string,
  beschreibung: string,
  availableGoals: {id: string, text: string, fach: string}[]
): Promise<string[] | null> {
  const prompt = `Welche der folgenden Lernziele (ID und Text) werden durch dieses Portfolio-Stück potenziell erreicht?
Titel: ${titel}
Beschreibung: ${beschreibung || 'Keine Beschreibung'}

Verfügbare Lernziele (Auswahl):
${availableGoals.map(g => `[ID: ${g.id}] ${g.fach}: ${g.text}`).join('\n')}

Antworte NUR mit einem gültigen JSON-Array von Strings, das die IDs der passenden Lernziele enthält (maximal 2). Keine Erklärungen, kein Markdown-Codeblock, nur das pure Array ["id1", "id2"]. Wenn keines passt, gib [] zurück.`;

  try {
    const response = await callServerAI("askAI", { modusId: 'ki-beurteilung', userMessage: prompt, history: [] });
    if (!response) return null;
    const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned);
    if (Array.isArray(result)) return result;
    return null;
  } catch (e) {
    console.error("Error analyzing goals:", e);
    return null;
  }
}

export async function askAI(modusId: string, userMessage: string, history: { role: 'user' | 'ai', content: string }[] = [], imageBase64?: { data: string, mimeType: string }): Promise<string | null> {
  if (userMessage.trim().length < 2) return "Bitte gib eine längere Nachricht ein.";

  try {
    return await callServerAI("askAI", { modusId, userMessage, history, imageBase64 });
  } catch (error: any) {
    return error.message;
  }
}




export async function generateHangmanWord(topic: string, stufe: number): Promise<string | null> {
  const prompt = `Generiere ein einzelnes, passendes Hauptwort für ein kindgerechtes Hangman-Spiel in der Volksschule (${stufe}. Schulstufe) zum Thema "${topic}". 
Antworte NUR mit diesem einen Wort in GROSSBUCHSTABEN. Keine Satzzeichen, keine Erklärungen. Nur das Wort (z.B. BLUME oder FREUNDSCHAFT).`;
  try {
    const response = await askAI('ki-helfer', prompt);
    if (!response) return null;
    return response.trim().toUpperCase().replace(/[^A-ZÄÖÜß-]/g, '');
  } catch (error) {
    return null;
  }
}

export async function generateClassPetMission(contextData: any): Promise<{ message: string, missions: any[] } | null> {
  try {
    const text = await callServerAI("askAI", {
      modusId: 'ki-classpet-mission',
      userMessage: `Bitte generiere maßgeschneiderte Missionen für das Klassenhaustier. Aktueller Kontext: ${JSON.stringify(contextData)}`,
    });
    return JSON.parse(text);
  } catch (error) {
    console.error("AI ClassPet Mission generation failed", error);
    return null;
  }
}

export async function generatePetChatResponse(params: {
  petName: string,
  petType: string,
  energy: number,
  mood: number,
  userMessage: string,
  history?: { role: 'user' | 'ai', content: string }[],
  currentActivity?: string,
  activeWidgets?: string[]
}): Promise<string | null> {
  try {
    return await callServerAI("petChat", params);
  } catch (error) {
    console.error("AI Pet Chat failed", error);
    return null;
  }
}

export async function generatePetSpeech(text: string, voiceName: string = "Kore"): Promise<string | null> {
  try {
    return await callServerAI("petSpeech", { text, voiceName });
  } catch (error) {
    console.error("AI Pet Speech failed", error);
    return null;
  }
}

export async function generateParentDiagnosticSummary(
  studentName: string,
  diagnosticData: string,
  focusStyle: string = "Ausgewogen & Professionell"
): Promise<string | null> {
  const prompt = `
Du bist ein erfahrener Lernberater und Volksschullehrer. Hier sind die diagnostischen Testergebnisse für das Kind ${studentName}.
Deine Aufgabe: Schreibe eine zusammenfassende Auswertung dieser Leistungen.
STIL-VORGABE: ${focusStyle}. Passe deinen Schreibstil zwingend an diese Vorgabe an (z.B. extrem lobend/motivierend oder sehr sachlich/kompakt, je nachdem was gewählt wurde).

Gliedere deine Antwort in folgende Bereiche auf (verwende Markdown, kurze knackige Sätze, gerne auch Aufzählungen):

1. **Ein tolles Gesamtbild:** (Wertschätzende Einleitung, was das Kind ausmacht)
2. **Besondere Stärken & Erfolge:** (Fasse die Tests zusammen, die positiv waren, in einfachen Worten leicht verständlich für Eltern)
3. **Konkrete Fokusbereiche:** (Wo braucht das Kind noch etwas Übung? Was sind die konkreten Fokusbereiche laut Diagnose, ohne dramatisch zu klingen?)
4. **Tipps für zu Hause:** (Praktische, konkrete Tipps, was die Eltern niederschwellig tun können, um genau diese Fokusbereiche zu unterstützen)

Hier sind die rohen Diagnosedaten:
${diagnosticData}
`;

  return await askAI('ki-beurteilung', prompt);
}

export async function generateWidgetTasks(
  widgetType: "wordscramble" | "alphabetsoup" | "patternmaker",
  stufe: number,
  averageNiveau: number,
  difficulty: "leicht" | "mittel" | "schwer" | "extrem"
): Promise<any | null> {
  try {
    const text = await callServerAI("generateWidgetTasks", {
      widgetType,
      stufe,
      averageNiveau,
      difficulty
    });
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Widget Task generation failed", error);
    return null;
  }
}

export async function parseVoiceCommand(transcript: string, students: any[]): Promise<any | null> {
  const studentsContext = students.map(s => `${s.vorname} ${s.nachname} (ID: ${s.id})`).join(', ');
  try {
    const text = await callServerAI("generateContent", {
      contents: `Du bist eine KI, die Sprachbefehle für eine Lehrer-App verarbeitet. 
Befehl der Lehrkraft: "${transcript}"

Folgende Schüler sind in der Klasse: ${studentsContext}

Analysiere den Befehl und extrahiere die intendierte Aktion in JSON.
Unterstützte Aktionen: 
1. ADD_MITARBEIT (Mitarbeitspunkte geben, z.B. "Plus für Anna", "Mitarbeitspunkte für Max")
2. ADD_BEHAVIOR (Verhaltensrückmeldung, z.B. "Anna hat heute super mitgearbeitet", "Max war unruhig")
3. ADD_NOTE (Allgemeine Notiz, z.B. "Erinnere mich daran, dass...")

JSON Schema:
{
  "action": "ADD_MITARBEIT" | "ADD_BEHAVIOR" | "ADD_NOTE",
  "studentIds": ["id1", "id2"], // Liste der betroffenen Schüler-IDs
  "content": "Kurze Zusammenfassung oder Notiz",
  "points": 1 // (optional, bei ADD_MITARBEIT z.B. 1 oder -1)
}

Gib nur das JSON zurück, keine Markdown-Blöcke.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            action: { type: "STRING" },
            studentIds: { type: "ARRAY", items: { type: "STRING" } },
            content: { type: "STRING" },
            points: { type: "NUMBER" }
          },
          required: ["action", "studentIds"]
        }
      }
    });
    return JSON.parse(text);
  } catch (error) {
    console.error("parseVoiceCommand failed", error);
    return null;
  }
}
export async function generateMetakognitionFeedback(
  studentName: string,
  stufe: string | number,
  strategien: string[],
  minutes: number,
  einschaetzung: number, // 1-5
  note: number,
  reaktion: string,
  wirksam: string
): Promise<string | null> {
  try {
    const prompt = `System-Prompt: Du bist ein erfahrener Volksschulpädagoge in Österreich. Du gibst wertschätzendes, prozessorientiertes Feedback, das ausschließlich die Lernstrategie und den Einsatz lobt oder reflektiert – NIEMALS die angeborene Intelligenz. Antworte auf Deutsch, in 2–3 Sätzen, direkt an die Lehrerin gerichtet als Formulierungsvorschlag für das Feedback an das Kind.

User-Prompt:
Kind: ${studentName}, Klasse ${stufe}.
Lernstrategien: ${strategien.join(', ')}.
Lernzeit: ${minutes} Minuten.
Selbsteinschätzung vorher (1 sehr gut bis 5 sehr unsicher): ${einschaetzung}.
Ergebnis: Note ${note}.
Kindreaktion: ${reaktion}.
Strategie wirksam: ${wirksam}.

Generiere ein prozessorientiertes Feedback-Statement für die Lehrerin.`;
    return await askAI('ki-beurteilung', prompt);
  } catch (error) {
    console.error("AI Metakognition Feedback error:", error);
    return null;
  }
}

export async function generateMagicPlanning(
  stufe: number,
  fach: string,
  thema: string,
  extraPrompt: string = ""
): Promise<any> {
  const text = await callServerAI("magicPlanner", {
    stufe,
    fach,
    thema,
    extraPrompt
  });
  return JSON.parse(text);
}

