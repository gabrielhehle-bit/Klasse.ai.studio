import { AppState, InteraktionsEintrag, Student } from '../types';
import { berechneIpsativ } from './ipsativeAnalyse';

export function getKalenderWoche(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export function berechneWochenEmpfehlung(
  eintraege: InteraktionsEintrag[],
  schueler: Student[],
  appState: AppState,
  heute: Date,
  anzahl: number = 5
): string[] {
  const bisherigeEmpfehlung = appState.interaktionsLog?.wochenEmpfehlung?.schuelerIds || [];
  
  const studentScores = schueler.map(s => {
    let score = 0;
    let bemerkungen: string[] = [];

    // Letzte 1:1 Interaktion
    const student1to1 = eintraege
      .filter(e => e.schuelerId === s.id && e.war1zu1)
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
    
    const letzteInteraktion = student1to1.length > 0 ? new Date(student1to1[0].datum) : null;
    let tageOhne = 999;
    
    if (letzteInteraktion) {
      tageOhne = Math.floor((heute.getTime() - letzteInteraktion.getTime()) / (1000 * 3600 * 24));
    }

    score += Math.min(tageOhne, 100); // Base score from days

    if (tageOhne > 14) {
       score += 30;
       bemerkungen.push(`>14 Tage ohne 1:1`);
    } else if (tageOhne > 7) {
       score += 15;
       bemerkungen.push(`>7 Tage ohne 1:1`);
    } else if (tageOhne === 999) {
       bemerkungen.push(`Noch nie 1:1`);
    }

    // DaZ / SPF
    if (s.notiz?.toLowerCase().includes('daz') || s.notiz?.toLowerCase().includes('spf') || s.espf || s.spf) {
      score += 20;
      bemerkungen.push('DaZ/SPF');
    }

    // Aktiver Förderplan
    const foerderplaene = (s.foerderprofil?.massnahmen || []).filter(f => true); // just check if any massnahmen exist
    if (foerderplaene.length > 0) {
      score += 15;
      bemerkungen.push('Förderplan aktiv');
    }

    // Exekutiv Score
    const exeEintraege = (appState.diagnostikErhebungen || [])
      .filter(e => e.schuelerId === s.id && e.type === 'exekutiv')
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
    
    if (exeEintraege.length > 0) {
      const lastEx = exeEintraege[0];
      const exObj = lastEx.meta;
      if (exObj) {
        const sum = (exObj.arbeitsgedaechtnis || 5) + (exObj.inhibition || 5) + (exObj.flexibilitaet || 5) + (exObj.aktivierung || 5) + (exObj.emotionen || 5);
        if (sum / 5 < 3) {
          score += 10;
          bemerkungen.push('Exekutive Fkt. schwach');
        }
      }
    }

    // Ipsativer Trend
    const userNotes: {wert: number, datum: string, fach: string}[] = [];
    if (appState.noten && appState.noten[s.id]) {
      for (const fachId in appState.noten[s.id]) {
        for (const sem in appState.noten[s.id][fachId]) {
          const g = appState.noten[s.id][fachId][sem];
          if (!g) continue;
          const mapList = (arr: any[], prefix: string) => {
            if (Array.isArray(arr)) {
              arr.forEach((v, idx) => {
                if (typeof v === 'number') userNotes.push({ wert: v, datum: `${sem} ${prefix} ${idx+1}`, fach: fachId });
              });
            }
          };
          mapList(g.sa, 'SA');
          mapList(g.lzk, 'LZK');
          mapList(g.wp, 'WP');
        }
      }
    }
    const ipsativ = berechneIpsativ(userNotes, appState.ipsativeGewichtung ?? 70);
    if (ipsativ.some(i => i.trend === 'fallend')) {
      score += 10;
      bemerkungen.push('Negativer Lern-Trend');
    }

    // Fehltage
    const studentAnwesenheit = appState.anwesenheit?.[s.id] || {};
    let missingDaysCount = 0;
    Object.entries(studentAnwesenheit).forEach(([dateStr, hours]) => {
      const d = new Date(dateStr);
      const daysAgo = Math.floor((heute.getTime() - d.getTime()) / (1000 * 3600 * 24));
      if (daysAgo >= 0 && daysAgo <= 14) {
        const hasA = Object.values(hours).some(v => v === 'a');
        if (hasA) missingDaysCount++;
      }
    });
    
    if (missingDaysCount > 2) {
      score += 10;
      bemerkungen.push(`>2 Fehltage kürzlich (${missingDaysCount})`);
    }

    // Penalty if recommended last week
    if (bisherigeEmpfehlung.includes(s.id)) {
      score -= 50; 
    }

    return { schuelerId: s.id, score, bemerkungen, tageOhne };
  });

  studentScores.sort((a, b) => b.score - a.score);

  return studentScores.slice(0, anzahl).map(s => s.schuelerId);
}
