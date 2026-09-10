import { AppState, SchuelerWochenplan, SchuelerWochenplanAufgabe, SchuelerAufgabeTyp } from '../types';
import { kwToMonday, getStartYear, kwYear } from './utils';

export const WOCHENPLAN_TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

export interface AnalyzeOptions {
  includeHomework?: boolean;
  includeZeitunabhaengig?: boolean;
  defaultTyp?: SchuelerAufgabeTyp;
}

/**
 * Erzeugt einen stabilen Hash / Fingerprint aus der Lehrer-Wochenplanung,
 * um spätere Änderungen am Originalplan zuverlässig erkennen zu können.
 */
export function computeWochenplanHash(app: AppState, kw: number): string {
  const plan = app.wochenplanung?.[kw] || {};
  const stamm = app.stammplan || {};
  
  // Wir bilden einen deterministischen String aus Fächern, Themen, Hausaufgaben & Materialien
  const parts: string[] = [];
  WOCHENPLAN_TAGE.forEach(tag => {
    const dayPlan = plan[tag] || {};
    Object.keys(dayPlan).sort().forEach(idxStr => {
      const item = dayPlan[idxStr];
      if (item && typeof item === 'object') {
        parts.push(`${tag}-${idxStr}:${item.fach || ''}|${item.thema || ''}|${item.housework || ''}|${item.material || ''}|${item.type || ''}`);
      }
    });
    // Auch zeitunabhängige Notizen
    const zu = dayPlan.zeitunabhaengig || [];
    zu.forEach((z: any) => {
      parts.push(`${tag}-zu:${z.thema || ''}|${z.type || ''}`);
    });
  });

  const fullStr = parts.join(';;');
  let hash = 0;
  for (let i = 0; i < fullStr.length; i++) {
    const char = fullStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash-${kw}-${Math.abs(hash)}`;
}

/**
 * Prüft, ob der Lehrer-Wochenplan seit der Erstellung des Schüler-Wochenplans verändert wurde.
 */
export function hasWochenplanChanged(savedPlan: SchuelerWochenplan, app: AppState): boolean {
  if (!savedPlan.originalPlanHash) return false;
  const currentHash = computeWochenplanHash(app, savedPlan.kw);
  return currentHash !== savedPlan.originalPlanHash;
}

/**
 * Wandelt einen Fach-Namen in ein passendes Symbol/Icon um.
 */
export function getSubjectIcon(fach: string): string {
  const f = fach.toLowerCase();
  if (f.includes('deutsch') || f.includes('lesen') || f.includes('schreib') || f.includes('sprache')) return 'book';
  if (f.includes('mathe') || f.includes('rechnen')) return 'calculator';
  if (f.includes('sach') || f.includes('su') || f.includes('natur') || f.includes('hsu')) return 'globe';
  if (f.includes('englisch') || f.includes('sprachen')) return 'languages';
  if (f.includes('musik') || f.includes('gesang')) return 'music';
  if (f.includes('kunst') || f.includes('bildnerisch') || f.includes('zeichnen')) return 'palette';
  if (f.includes('werk') || f.includes('werken')) return 'scissors';
  if (f.includes('sport') || f.includes('bewegung') || f.includes('turnen')) return 'activity';
  if (f.includes('religion') || f.includes('ethik')) return 'heart';
  if (f.includes('zusatz') || f.includes('knobel') || f.includes('stern')) return 'star';
  return 'clipboard';
}

/**
 * Erkennt didaktische Kategorien aus dem Text (Buch, Arbeitsblatt, Heft, Projekt, etc.)
 */
export function detectCategory(text: string, material: string, lessonType?: string): SchuelerWochenplanAufgabe['kategorie'] {
  const combined = `${text} ${material} ${lessonType || ''}`.toLowerCase();
  if (lessonType === 'projekt' || combined.includes('projekt')) return 'projekt';
  if (lessonType === 'stationen' || combined.includes('station')) return 'stationen';
  if (lessonType === 'wochenplan' || combined.includes('wochenplan')) return 'wochenplan';
  if (lessonType === 'freiarbeit' || combined.includes('freiarbeit')) return 'freiarbeit';
  if (combined.includes('arbeitsblatt') || combined.includes(' ab ') || combined.startsWith('ab ') || combined.includes('kopierblatt') || combined.includes('zettel')) return 'arbeitsblatt';
  if (combined.includes('buch') || combined.includes('seite') || combined.includes(' s.') || combined.includes('lesebuch') || combined.includes('mathebuch')) return 'buch';
  if (combined.includes('heft') || combined.includes('schreibheft') || combined.includes('ins heft')) return 'heft';
  if (combined.includes('lernziel') || combined.includes('kompetenz')) return 'lernziel';
  return 'sonstiges';
}

/**
 * Wandelt Lehrereinträge regelbasiert in kindgerechte, verständliche Aufgaben um.
 * Erfindet keine Inhalte, sondern formuliert klar, aktiv und freundlich für Schüler.
 */
export function makeChildFriendlyTask(fach: string, rawTitle: string, material?: string, isHomework = false): { titel: string; detail?: string } {
  let title = rawTitle.trim();
  let detail: string | undefined = undefined;

  // Wenn bereits mit Zeilenumbruch formatiert:
  const lines = title.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    title = lines[0];
    detail = lines.slice(1).join(' • ');
  }

  // Entferne typische Lehrer-Kürzel am Anfang
  title = title
    .replace(/^(h[üu]:|hausaufgabe:|hausübung:|hu:)\s*/i, '')
    .replace(/^(ea:|pa:|ga:|plenum:)\s*/i, '')
    .replace(/^(einführung|erarbeitung|vertiefung|wiederholung)\s*[:–-]\s*/i, '')
    .trim();

  // Erkenntnisse für Buchseiten (z.B. "Buch S. 24–25" oder "S. 38 Nr. 1-4")
  const pageMatch = title.match(/(?:(?:buch|lesebuch|mathebuch|arbeitsbuch|sb|sprachbuch)\s+)?(?:s\.|seite)\s*(\d+[-–—\d\s,\.a-z]*)/i);
  const exerciseMatch = title.match(/(?:nr\.|nr|nummer|aufgabe|aufgaben)\s*([0-9\s,\-–—und+]+)/i);

  const lowerFach = fach.toLowerCase();

  // Spezifische kindgerechte Reformulierungen je nach Kontext:
  if (isHomework) {
    title = `Hausübung: ${title}`;
  } else if (lowerFach.includes('deutsch') || lowerFach.includes('lesen')) {
    if (pageMatch && (title.toLowerCase().includes('les') || lowerFach.includes('lesen'))) {
      const pageInfo = pageMatch[1].trim();
      title = `Lesebuch Seite ${pageInfo} aufmerksam lesen`;
    } else if (title.toLowerCase().includes('lernwörter') || title.toLowerCase().includes('lernwoerter')) {
      title = `Lernwörter üben und ins Heft schreiben`;
    } else if (title.toLowerCase().includes('aufsatz') || title.toLowerCase().includes('geschichte') || title.toLowerCase().includes('text')) {
      title = `${title} verfassen`;
    }
  } else if (lowerFach.includes('mathe')) {
    if (title.toLowerCase().includes('arbeitsblatt') || title.toLowerCase().includes('ab ')) {
      title = `Arbeitsblatt zu ${title.replace(/arbeitsblatt|ab\s*\d*/gi, '').trim() || 'den Rechenaufgaben'} lösen`;
    } else if (title.toLowerCase().includes('einmaleins') || title.toLowerCase().includes('1x1')) {
      title = `Einmaleins (1x1) üben und festigen`;
    } else if (pageMatch && exerciseMatch) {
      title = `Buch Seite ${pageMatch[1].trim()}, Aufgabe ${exerciseMatch[1].trim()} rechnen`;
    } else if (pageMatch) {
      title = `Buch Seite ${pageMatch[1].trim()} bearbeiten`;
    }
  } else if (lowerFach.includes('sach') || lowerFach.includes('su')) {
    if (title.toLowerCase().includes('plakat') || title.toLowerCase().includes('poster')) {
      title = `${title} gestalten und fertigstellen`;
    } else if (title.toLowerCase().includes('forschen') || title.toLowerCase().includes('experiment')) {
      title = `${title} durchführen`;
    }
  } else if (lowerFach.includes('sport') || lowerFach.includes('bewegung')) {
    if (title.toLowerCase().includes('spiel') || title.toLowerCase().includes('lauf')) {
      title = `Beim ${title} mitmachen und aktiv bewegen`;
    }
  }

  // Materialhinweis als zusätzliches Detail einhängen, falls vorhanden und nicht doppelt
  if (material && material.trim() && !detail) {
    if (!title.toLowerCase().includes(material.toLowerCase())) {
      detail = `Material: ${material.trim()}`;
    }
  }

  return { titel: title, detail };
}

/**
 * Hauptanalyse: Scannt den bestehenden Wochenplan und generiert Kandidaten-Aufgaben
 * für den Schüler-Wochenplan.
 */
export function analyzeWochenplanForStudents(
  app: AppState,
  kw: number,
  options: AnalyzeOptions = {}
): SchuelerWochenplanAufgabe[] {
  const plan = app.wochenplanung?.[kw] || {};
  const stamm = app.stammplan || {};
  const tasks: SchuelerWochenplanAufgabe[] = [];
  let orderCounter = 0;

  WOCHENPLAN_TAGE.forEach(tag => {
    const dayPlan = plan[tag] || {};

    // 1. Stunden-basierte Einträge (1. bis 8. Stunde)
    const stdIndices = [0, 1, 2, 3, 4, 5, 6, 7];
    stdIndices.forEach(idx => {
      const stdNum = idx + 1;
      const item = dayPlan[idx];
      const stammFach = stamm[tag]?.[stdNum];

      const fach = (item?.fach || stammFach || '').trim();
      const thema = (item?.thema || '').trim();
      const housework = (item?.housework || '').trim();
      const material = (item?.material || '').trim();
      const lessonType = item?.type || 'standard';

      // Leere oder reine Pausen-/Freistunden überspringen
      if (!fach && !thema && !housework) return;
      if (fach.toLowerCase() === 'frei' || fach.toLowerCase() === 'pause' || fach.toLowerCase() === 'mittagspause') return;
      if (!thema && !housework && !item?.material) {
        // Reine Stammplan-Stunde ohne Notiz/Thema -> nicht automatisch als Schüleraufgabe anlegen
        return;
      }

      // Prüfen, ob es sich um eine Zusatz-/Freiarbeits-Aufgabe handelt
      let taskType: SchuelerAufgabeTyp = 'pflicht';
      const combinedText = `${thema} ${lessonType}`.toLowerCase();
      if (
        lessonType === 'freiarbeit' ||
        combinedText.includes('zusatz') ||
        combinedText.includes('knobel') ||
        combinedText.includes('bonus') ||
        combinedText.includes('stern')
      ) {
        taskType = 'zusatz';
      } else if (combinedText.includes('freiwillig')) {
        taskType = 'freiwillig';
      }

      const kat = detectCategory(thema, material, lessonType);
      const icon = getSubjectIcon(fach);

      // Falls mehrere Zeilen vorhanden sind (z.B. "Lesebuch S. 24–25\nFragen 1–4 ins Heft"),
      // teilen wir diese auf, damit das Kind einzelne klare Checkboxen hat
      const splitLines = thema.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      if (splitLines.length > 1) {
        splitLines.forEach((line, subIdx) => {
          const friendly = makeChildFriendlyTask(fach, line, subIdx === 0 ? material : undefined);
          orderCounter++;
          tasks.push({
            id: `swp-${tag}-${stdNum}-${subIdx}-${Date.now()}-${orderCounter}`,
            fach: fach || 'Allgemein',
            tag,
            stunde: stdNum,
            titel: friendly.titel,
            detail: friendly.detail,
            typ: taskType,
            originalThema: line,
            originalMaterial: material,
            kategorie: kat,
            differenzierung: 'alle',
            zeitAufwandMin: 20,
            icon,
            selected: true,
            order: orderCounter
          });
        });
      } else if (thema) {
        const friendly = makeChildFriendlyTask(fach, thema, material);
        orderCounter++;
        tasks.push({
          id: `swp-${tag}-${stdNum}-${Date.now()}-${orderCounter}`,
          fach: fach || 'Allgemein',
          tag,
          stunde: stdNum,
          titel: friendly.titel,
          detail: friendly.detail,
          typ: taskType,
          originalThema: thema,
          originalMaterial: material,
          kategorie: kat,
          differenzierung: 'alle',
          zeitAufwandMin: 25,
          icon,
          selected: true,
          order: orderCounter
        });
      }

      // Falls eine separate Hausübung im Stundenfeld eingetragen ist:
      if (housework && options.includeHomework !== false) {
        const hwFriendly = makeChildFriendlyTask(fach, housework, undefined, true);
        orderCounter++;
        tasks.push({
          id: `swp-hw-${tag}-${stdNum}-${Date.now()}-${orderCounter}`,
          fach: fach || 'Allgemein',
          tag,
          stunde: stdNum,
          titel: hwFriendly.titel,
          detail: hwFriendly.detail || 'Hausübung',
          typ: 'pflicht',
          originalHousework: housework,
          kategorie: 'arbeitsblatt',
          differenzierung: 'alle',
          zeitAufwandMin: 15,
          icon: 'home',
          selected: true,
          order: orderCounter
        });
      }
    });

    // 2. Zeitunabhängige Aufgaben des Tages
    if (options.includeZeitunabhaengig !== false && Array.isArray(dayPlan.zeitunabhaengig)) {
      dayPlan.zeitunabhaengig.forEach((zu: any, zIdx: number) => {
        if (!zu || !zu.thema || !zu.thema.trim()) return;
        const zuThema = zu.thema.trim();
        const zuType = zu.type || 'sonstiges';

        let typ: SchuelerAufgabeTyp = 'pflicht';
        if (zuType === 'freiarbeit' || zuThema.toLowerCase().includes('zusatz') || zuThema.toLowerCase().includes('knobel')) {
          typ = 'zusatz';
        } else if (zuThema.toLowerCase().includes('freiwillig')) {
          typ = 'freiwillig';
        }

        orderCounter++;
        tasks.push({
          id: `swp-zu-${tag}-${zIdx}-${Date.now()}-${orderCounter}`,
          fach: zuType === 'wochenplan' ? 'Wochenplan' : 'Aufgabe',
          tag,
          titel: zuThema,
          detail: zu.ganztaegig ? 'Tagesaufgabe' : undefined,
          typ,
          originalThema: zuThema,
          kategorie: zuType === 'wochenplan' ? 'wochenplan' : 'sonstiges',
          differenzierung: 'alle',
          zeitAufwandMin: 20,
          icon: 'star',
          selected: true,
          order: orderCounter
        });
      });
    }
  });

  return tasks;
}

/**
 * Erstellt ein neues leeres oder initial befülltes SchuelerWochenplan-Objekt für die gegebene KW.
 */
export function createInitialSchuelerWochenplan(app: AppState, kw: number): SchuelerWochenplan {
  const currentYear = kwYear(kw, getStartYear(app.schuljahr || ''));
  const monday = kwToMonday(kw, currentYear);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()}`;
  };

  const tasks = analyzeWochenplanForStudents(app, kw);
  const planHash = computeWochenplanHash(app, kw);

  return {
    id: `swp-kw${kw}-${currentYear}`,
    kw,
    schuljahr: app.schuljahr || `${currentYear}/${currentYear + 1}`,
    datumVon: formatDate(monday),
    datumBis: formatDate(friday),
    titel: 'WOCHENPLAN',
    untertitel: app.klasse || app.klassenbezeichnung || 'Klasse',
    motto: 'Das schaffe ich Schritt für Schritt!',
    showNameField: true,
    showKw: true,
    showDatum: true,
    showReflexion: true,
    showUnterschrift: true,
    darstellung: 'fach',
    fontSize: 'normal',
    orientierung: 'portrait',
    differenzierungFilter: 'alle',
    aufgaben: tasks,
    erstelltAm: new Date().toISOString(),
    aktualisiertAm: new Date().toISOString(),
    originalPlanHash: planHash
  };
}
