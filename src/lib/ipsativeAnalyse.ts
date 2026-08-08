export interface IpsativesErgebnis {
  fach: string;
  aktuellerDurchschnitt: number;
  vorherigerDurchschnitt: number;
  fortschrittProzent: number; // positiv = Verbesserung
  trend: 'steigend' | 'stabil' | 'fallend';
  ipsativerScore: number; // 0-100, Fortschritt 70% gewichtet
  datenpunkte: number;
}

export function berechneIpsativ(
  noten: { wert: number; datum: string; fach: string }[],
  gewichtungFortschritt = 70
): IpsativesErgebnis[] {
  // Group by subject (fach)
  const fächerMap: Record<string, typeof noten> = {};
  for (const n of noten) {
    if (!n.fach) continue;
    const f = n.fach;
    if (!fächerMap[f]) {
      fächerMap[f] = [];
    }
    fächerMap[f].push(n);
  }

  const ergebnisse: IpsativesErgebnis[] = [];

  for (const [fach, fachNoten] of Object.entries(fächerMap)) {
    // Sort chronologically (oldest to newest)
    const sorted = [...fachNoten].sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    const totalCount = sorted.length;

    if (totalCount < 6) {
      ergebnisse.push({
        fach,
        aktuellerDurchschnitt: 0,
        vorherigerDurchschnitt: 0,
        fortschrittProzent: 0,
        trend: 'stabil',
        ipsativerScore: 0,
        datenpunkte: totalCount
      });
      continue;
    }

    // "gleitender Durchschnitt der letzten 3 vs. der 3 davor"
    const letztenDrei = sorted.slice(-3);
    const dreiDavor = sorted.slice(-6, -3);

    const aktuellerDurchschnitt = letztenDrei.reduce((sum, n) => sum + n.wert, 0) / 3;
    const vorherigerDurchschnitt = dreiDavor.reduce((sum, n) => sum + n.wert, 0) / 3;

    // Fortschritt = ((alt - neu) / alt) × 100;
    // Division durch Null abfangen
    let fortschrittProzent = 0;
    if (vorherigerDurchschnitt !== 0) {
      fortschrittProzent = ((vorherigerDurchschnitt - aktuellerDurchschnitt) / vorherigerDurchschnitt) * 100;
    }

    // Trend: steigend > 5%, fallend < -5%, sonst stabil
    let trend: 'steigend' | 'stabil' | 'fallend' = 'stabil';
    if (fortschrittProzent > 5) {
      trend = 'steigend';
    } else if (fortschrittProzent < -5) {
      trend = 'fallend';
    }

    // ipsativerScore kombiniert Fortschritts-Score und absoluten Noten-Score gewichtet
    // We map grade [1, 5] where 1 is 100 and 5 is 0
    const absoluteScore = Math.max(0, Math.min(100, ((5 - aktuellerDurchschnitt) / 4) * 100));
    
    // We map progress percent [-50%, 50%] to progressScore [0, 100]
    const progressScore = Math.max(0, Math.min(100, 50 + fortschrittProzent * 2));

    const wProgress = gewichtungFortschritt;
    const wAbsolute = 100 - wProgress;
    const ipsativerScore = Math.round((progressScore * wProgress + absoluteScore * wAbsolute) / 100);

    ergebnisse.push({
      fach,
      aktuellerDurchschnitt: Math.round(aktuellerDurchschnitt * 100) / 100,
      vorherigerDurchschnitt: Math.round(vorherigerDurchschnitt * 100) / 100,
      fortschrittProzent: Math.round(fortschrittProzent * 10) / 10,
      trend,
      ipsativerScore,
      datenpunkte: totalCount
    });
  }

  return ergebnisse;
}
