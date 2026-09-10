/**
 * F21 – Klassenglas / Gemeinsames Klassenziel
 * Reines, deterministisches Berechnungs- und Migrationsmodul ohne externe Abhängigkeiten.
 * 
 * Pädagogische Grundsätze:
 * - Nur gemeinsames Klassenziel (Wir-Gefühl)
 * - Keine individuelle Schülereinstufung oder Rangliste
 * - Minus-Schaltfläche dient ausschließlich der Korrektur von Fehleingaben (keine Strafe)
 * - 100% offline & deterministisch
 */

export type RewardVisualizationStyle = 'jar' | 'thermometer' | 'barometer';

export interface ClassRewardState {
  count: number;
  goal: number;
  rewardTitle: string;
  symbol: string;
  style: RewardVisualizationStyle;
}

export interface LegacyRewardCandidate {
  source: 'klassenglas' | 'thermometer' | 'classtarget' | 'piggybank';
  count?: number;
  goal?: number;
  title?: string;
  symbol?: string;
}

export const DEFAULT_REWARD_STATE: ClassRewardState = {
  count: 0,
  goal: 20,
  rewardTitle: 'Gemeinsame Spielzeit',
  symbol: '💎',
  style: 'jar',
};

/**
 * Erhöht den Zähler um den angegebenen Betrag (Standard: +1).
 */
export function incrementReward(
  state: ClassRewardState,
  amount: number = 1
): { nextState: ClassRewardState; justReachedGoal: boolean } {
  const safeAmount = Math.max(1, Math.floor(amount));
  const oldCount = Math.max(0, state.count);
  const nextCount = oldCount + safeAmount;
  const wasAlreadyReached = oldCount >= state.goal;
  const justReachedGoal = !wasAlreadyReached && nextCount >= state.goal;

  return {
    nextState: {
      ...state,
      count: nextCount,
    },
    justReachedGoal,
  };
}

/**
 * Korrigiert den Zähler nach unten (-1).
 * Pädagogisch verbindlich: Dient ausschließlich der Rücknahme von Versehens-Klicks (Korrektur).
 * Zähler kann niemals unter 0 fallen.
 */
export function correctDecrementReward(
  state: ClassRewardState
): { nextState: ClassRewardState; corrected: boolean } {
  if (state.count <= 0) {
    return { nextState: { ...state, count: 0 }, corrected: false };
  }

  return {
    nextState: {
      ...state,
      count: state.count - 1,
    },
    corrected: true,
  };
}

/**
 * Setzt das Ziel der Klasse neu (Mindestens 1, Maximum 1000).
 */
export function setRewardGoal(state: ClassRewardState, newGoal: number): ClassRewardState {
  const safeGoal = Math.max(1, Math.min(1000, Math.floor(newGoal) || 20));
  return {
    ...state,
    goal: safeGoal,
  };
}

/**
 * Ändert den Belohnungstitel (z.B. "Gemeinsame Spielestunde").
 */
export function setRewardTitle(state: ClassRewardState, newTitle: string): ClassRewardState {
  const cleanTitle = (newTitle || '').trim().slice(0, 100) || DEFAULT_REWARD_STATE.rewardTitle;
  return {
    ...state,
    rewardTitle: cleanTitle,
  };
}

/**
 * Ändert das Sammelsymbol (z.B. 💎, ⭐, 🪙, 🍬, 🍪, 🎈, 🍎, 🐾).
 */
export function setRewardSymbol(state: ClassRewardState, newSymbol: string): ClassRewardState {
  const cleanSymbol = (newSymbol || '').trim() || '💎';
  return {
    ...state,
    symbol: cleanSymbol,
  };
}

/**
 * Ändert den Darstellungsstil (Glas, Thermometer oder Barometer).
 * Bezieht sich immer auf dieselbe kanonische Datenquelle.
 */
export function setRewardStyle(
  state: ClassRewardState,
  newStyle: RewardVisualizationStyle
): ClassRewardState {
  return {
    ...state,
    style: newStyle,
  };
}

/**
 * Setzt den Stand auf 0 zurück (z.B. nach erfolgreicher Zielerreichung für ein neues Projekt).
 * Erfordert in der UI eine explizite Bestätigung.
 */
export function resetRewardCount(state: ClassRewardState): ClassRewardState {
  return {
    ...state,
    count: 0,
  };
}

/**
 * Berechnet den prozentualen Fortschritt (0–100%).
 */
export function calculateProgressPercent(count: number, goal: number): number {
  if (goal <= 0) return 0;
  const ratio = count / goal;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

/**
 * Prüft, ob das Klassenziel erreicht ist.
 */
export function isGoalReached(count: number, goal: number): boolean {
  return goal > 0 && count >= goal;
}

/**
 * Konfliktfreie Migration von alten/parallelen Belohnungssystemen:
 * Prioritätsregel:
 * 1. Kanonisches Klassenglas (app.klassenglas_*) hat stets höchste Priorität.
 * 2. Wenn das Klassenglas noch auf 0 steht und Legacy-Widgets eigene Werte besaßen:
 *    Übernehme den Wert des relevantesten Legacy-Widgets (thermometer > classtarget > piggybank).
 * 3. Es wird NIEMALS heimlich summiert (kein unkontrolliertes Addieren mehrerer Altsysteme).
 */
export function resolveRewardMigration(
  canonical: { count?: number; goal?: number; rewardTitle?: string; symbol?: string },
  legacyCandidates: LegacyRewardCandidate[] = []
): ClassRewardState {
  // Wenn kanonische Daten bereits vorhanden/aktiv sind (>0 oder Ziel angepasst):
  if ((canonical.count && canonical.count > 0) || (canonical.goal && canonical.goal !== 20)) {
    return {
      count: Math.max(0, canonical.count || 0),
      goal: Math.max(1, canonical.goal || 20),
      rewardTitle: canonical.rewardTitle || DEFAULT_REWARD_STATE.rewardTitle,
      symbol: canonical.symbol || DEFAULT_REWARD_STATE.symbol,
      style: 'jar',
    };
  }

  // Prioritätsordnung für Legacy-Systeme:
  const priorityOrder: Array<LegacyRewardCandidate['source']> = [
    'klassenglas',
    'thermometer',
    'classtarget',
    'piggybank',
  ];

  for (const source of priorityOrder) {
    const candidate = legacyCandidates.find((c) => c.source === source && (c.count || 0) > 0);
    if (candidate) {
      let chosenStyle: RewardVisualizationStyle = 'jar';
      let chosenSymbol = canonical.symbol || DEFAULT_REWARD_STATE.symbol;

      if (candidate.source === 'thermometer') {
        chosenStyle = 'thermometer';
      } else if (candidate.source === 'classtarget') {
        chosenStyle = 'barometer';
        chosenSymbol = '⭐';
      } else if (candidate.source === 'piggybank') {
        chosenSymbol = '🪙';
      }

      return {
        count: Math.max(0, candidate.count || 0),
        goal: Math.max(1, candidate.goal || canonical.goal || 20),
        rewardTitle: candidate.title || canonical.rewardTitle || DEFAULT_REWARD_STATE.rewardTitle,
        symbol: candidate.symbol || chosenSymbol,
        style: chosenStyle,
      };
    }
  }

  return {
    count: Math.max(0, canonical.count || 0),
    goal: Math.max(1, canonical.goal || 20),
    rewardTitle: canonical.rewardTitle || DEFAULT_REWARD_STATE.rewardTitle,
    symbol: canonical.symbol || DEFAULT_REWARD_STATE.symbol,
    style: 'jar',
  };
}

/**
 * Pädagogische Validierung:
 * Garantiert, dass keine Schülernamen, IDs, Noten oder öffentliche Ranglisten vorhanden sind.
 */
export function validatePedagogicalGuard(state: Record<string, any>): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if ('students' in state || 'schueler' in state || 'ranking' in state || 'leaderboard' in state) {
    violations.push('Individuelle Schülereinstufung oder Rangliste im Klassenziel unzulässig');
  }

  if ('grades' in state || 'noten' in state || 'strafen' in state || 'penalties' in state) {
    violations.push('Noten, Bewertungen oder Strafmechanismen unzulässig');
  }

  if (state.count < 0) {
    violations.push('Zähler darf nicht negativ sein (Strafabzug untersagt)');
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
