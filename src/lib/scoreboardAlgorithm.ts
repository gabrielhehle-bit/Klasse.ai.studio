/**
 * F22 – Scoreboard Algorithmus & State Management
 * 
 * Reines, deterministisches Modul für das Team-Scoreboard:
 * - 2 bis maximal 6 Teams
 * - Punkteerhöhung (+1, optional +2 / +5)
 * - Korrekturfunktion (-1, stoppt strikt bei 0, keine negativen Werte)
 * - "Neue Runde" (Punktestand auf 0, Teamnamen bleiben erhalten)
 * - "Teams zurücksetzen" (vollständiger Reset auf Standardteams)
 * - "Runde beenden" mit Gewinnerermittlung & Gleichstandshandhabung
 * - Pädagogischer Guard: Keine Verhaltensbewertung, keine Schüler-Rangliste
 * - 100% offline, keine externen Abhängigkeiten, kein Klassenglas-Bezug
 */

export interface ScoreboardTeam {
  id: string;
  name: string;
  score: number;
  colorKey: 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'orange';
  icon?: string;
}

export interface ScoreboardSettings {
  teams: ScoreboardTeam[];
  roundFinished: boolean;
  stepSize?: 1 | 2 | 5;
  soundEnabled?: boolean;
}

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export interface TeamColorConfig {
  key: ScoreboardTeam['colorKey'];
  label: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  bgLight: string;
  bgDark: string;
  accent: string;
  dot: string;
  icon: string;
  defaultName: string;
}

export const TEAM_COLOR_PRESETS: Record<ScoreboardTeam['colorKey'], TeamColorConfig> = {
  red: {
    key: 'red',
    label: 'Rot',
    badgeBg: 'bg-rose-500',
    badgeText: 'text-white',
    border: 'border-rose-400/50 dark:border-rose-500/40',
    bgLight: 'bg-rose-50/70',
    bgDark: 'dark:bg-rose-950/20',
    accent: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    icon: '🦊',
    defaultName: 'Team Rot',
  },
  blue: {
    key: 'blue',
    label: 'Blau',
    badgeBg: 'bg-sky-500',
    badgeText: 'text-white',
    border: 'border-sky-400/50 dark:border-sky-500/40',
    bgLight: 'bg-sky-50/70',
    bgDark: 'dark:bg-sky-950/20',
    accent: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    icon: '🐬',
    defaultName: 'Team Blau',
  },
  green: {
    key: 'green',
    label: 'Grün',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    border: 'border-emerald-400/50 dark:border-emerald-500/40',
    bgLight: 'bg-emerald-50/70',
    bgDark: 'dark:bg-emerald-950/20',
    accent: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    icon: '🐸',
    defaultName: 'Team Grün',
  },
  amber: {
    key: 'amber',
    label: 'Gelb',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-amber-950',
    border: 'border-amber-400/50 dark:border-amber-500/40',
    bgLight: 'bg-amber-50/70',
    bgDark: 'dark:bg-amber-950/20',
    accent: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    icon: '🦁',
    defaultName: 'Team Gelb',
  },
  purple: {
    key: 'purple',
    label: 'Lila',
    badgeBg: 'bg-purple-500',
    badgeText: 'text-white',
    border: 'border-purple-400/50 dark:border-purple-500/40',
    bgLight: 'bg-purple-50/70',
    bgDark: 'dark:bg-purple-950/20',
    accent: 'text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
    icon: '🦉',
    defaultName: 'Team Lila',
  },
  orange: {
    key: 'orange',
    label: 'Orange',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
    border: 'border-orange-400/50 dark:border-orange-500/40',
    bgLight: 'bg-orange-50/70',
    bgDark: 'dark:bg-orange-950/20',
    accent: 'text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
    icon: '🐯',
    defaultName: 'Team Orange',
  },
};

export const COLOR_KEYS_SEQUENCE: Array<ScoreboardTeam['colorKey']> = [
  'red',
  'blue',
  'green',
  'amber',
  'purple',
  'orange',
];

export const DEFAULT_SCOREBOARD_TEAMS: ScoreboardTeam[] = [
  {
    id: 'team-1',
    name: 'Team Rot',
    score: 0,
    colorKey: 'red',
    icon: '🦊',
  },
  {
    id: 'team-2',
    name: 'Team Blau',
    score: 0,
    colorKey: 'blue',
    icon: '🐬',
  },
];

export const DEFAULT_SCOREBOARD_SETTINGS: ScoreboardSettings = {
  teams: DEFAULT_SCOREBOARD_TEAMS,
  roundFinished: false,
  stepSize: 1,
  soundEnabled: false,
};

/**
 * Validiert und bereinigt den Scoreboard-Zustand sicher.
 * Verhindert ungültige Werte, negative Punkte, Überläufe und stellt 2–6 Teams sicher.
 */
export function sanitizeScoreboardSettings(raw: any): ScoreboardSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SCOREBOARD_SETTINGS };
  }

  let teams: ScoreboardTeam[] = [];

  if (Array.isArray(raw.teams) && raw.teams.length > 0) {
    teams = raw.teams.map((t: any, index: number): ScoreboardTeam => {
      const fallbackKey = COLOR_KEYS_SEQUENCE[index % COLOR_KEYS_SEQUENCE.length];
      const validKey =
        t && t.colorKey && TEAM_COLOR_PRESETS[t.colorKey as ScoreboardTeam['colorKey']]
          ? (t.colorKey as ScoreboardTeam['colorKey'])
          : fallbackKey;
      
      const parsedScore = typeof t?.score === 'number' && !isNaN(t.score) ? Math.floor(t.score) : 0;
      const safeScore = Math.max(0, parsedScore);

      const safeName =
        typeof t?.name === 'string' && t.name.trim().length > 0
          ? t.name.trim().slice(0, 40)
          : TEAM_COLOR_PRESETS[validKey].defaultName;

      const safeIcon =
        typeof t?.icon === 'string' && t.icon.trim().length > 0
          ? t.icon.trim().slice(0, 4)
          : TEAM_COLOR_PRESETS[validKey].icon;

      return {
        id: typeof t?.id === 'string' && t.id.length > 0 ? t.id : `team-${index + 1}-${Date.now()}`,
        name: safeName,
        score: safeScore,
        colorKey: validKey,
        icon: safeIcon,
      };
    });
  }

  // Grenzen erzwingen: min 2, max 6
  if (teams.length < MIN_TEAMS) {
    const existingIds = new Set(teams.map((t) => t.id));
    for (const defTeam of DEFAULT_SCOREBOARD_TEAMS) {
      if (teams.length >= MIN_TEAMS) break;
      if (!existingIds.has(defTeam.id)) {
        teams.push({ ...defTeam });
      } else {
        teams.push({ ...defTeam, id: `team-extra-${Date.now()}` });
      }
    }
  }

  if (teams.length > MAX_TEAMS) {
    teams = teams.slice(0, MAX_TEAMS);
  }

  const roundFinished = Boolean(raw.roundFinished);
  const stepSize: 1 | 2 | 5 = [1, 2, 5].includes(Number(raw.stepSize)) ? (Number(raw.stepSize) as 1 | 2 | 5) : 1;
  const soundEnabled = Boolean(raw.soundEnabled);

  return {
    teams,
    roundFinished,
    stepSize,
    soundEnabled,
  };
}

/**
 * Erhöht den Punktestand eines Teams um den angegebenen Betrag (Standard 1).
 */
export function incrementScore(
  state: ScoreboardSettings,
  teamId: string,
  amount: number = 1
): ScoreboardSettings {
  const current = sanitizeScoreboardSettings(state);
  const add = Math.max(1, Math.floor(amount));

  const updatedTeams = current.teams.map((team) => {
    if (team.id === teamId) {
      return {
        ...team,
        score: team.score + add,
      };
    }
    return team;
  });

  return {
    ...current,
    teams: updatedTeams,
    // Wenn während einer beendeten Runde weitergespielt wird, Status aufheben
    roundFinished: false,
  };
}

/**
 * Korrigiert den Punktestand eines Teams (-1).
 * Ausschließlich zur Fehlerbehebung von Fehlklicks.
 * Zähler stoppt strikt bei 0, wird niemals negativ.
 */
export function correctScore(
  state: ScoreboardSettings,
  teamId: string,
  amount: number = 1
): ScoreboardSettings {
  const current = sanitizeScoreboardSettings(state);
  const sub = Math.max(1, Math.floor(amount));

  const updatedTeams = current.teams.map((team) => {
    if (team.id === teamId) {
      return {
        ...team,
        score: Math.max(0, team.score - sub),
      };
    }
    return team;
  });

  return {
    ...current,
    teams: updatedTeams,
  };
}

/**
 * Fügt ein neues Team hinzu (bis maximal 6 Teams).
 */
export function addTeam(
  state: ScoreboardSettings,
  customName?: string,
  customColorKey?: ScoreboardTeam['colorKey']
): ScoreboardSettings {
  const current = sanitizeScoreboardSettings(state);
  if (current.teams.length >= MAX_TEAMS) {
    return current;
  }

  // Wähle nächste freie Farbe
  const usedColors = new Set(current.teams.map((t) => t.colorKey));
  const nextColor =
    customColorKey ||
    COLOR_KEYS_SEQUENCE.find((c) => !usedColors.has(c)) ||
    COLOR_KEYS_SEQUENCE[current.teams.length % COLOR_KEYS_SEQUENCE.length];

  const preset = TEAM_COLOR_PRESETS[nextColor];
  const newTeam: ScoreboardTeam = {
    id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: customName?.trim() || preset.defaultName,
    score: 0,
    colorKey: nextColor,
    icon: preset.icon,
  };

  return {
    ...current,
    teams: [...current.teams, newTeam],
    roundFinished: false,
  };
}

/**
 * Benennt ein Team um oder ändert dessen Farbe/Icon.
 */
export function updateTeam(
  state: ScoreboardSettings,
  teamId: string,
  updates: Partial<Pick<ScoreboardTeam, 'name' | 'colorKey' | 'icon'>>
): ScoreboardSettings {
  const current = sanitizeScoreboardSettings(state);

  const updatedTeams = current.teams.map((team) => {
    if (team.id !== teamId) return team;

    const nextColorKey = updates.colorKey && TEAM_COLOR_PRESETS[updates.colorKey] ? updates.colorKey : team.colorKey;
    const nextName =
      typeof updates.name === 'string' && updates.name.trim().length > 0
        ? updates.name.trim().slice(0, 40)
        : team.name;
    const nextIcon =
      typeof updates.icon === 'string' && updates.icon.trim().length > 0
        ? updates.icon.trim().slice(0, 4)
        : team.icon;

    return {
      ...team,
      colorKey: nextColorKey,
      name: nextName,
      icon: nextIcon,
    };
  });

  return {
    ...current,
    teams: updatedTeams,
  };
}

/**
 * Entfernt ein Team (mindestens 2 Teams müssen erhalten bleiben).
 */
export function removeTeam(state: ScoreboardSettings, teamId: string): ScoreboardSettings {
  const current = sanitizeScoreboardSettings(state);
  if (current.teams.length <= MIN_TEAMS) {
    return current;
  }

  const updatedTeams = current.teams.filter((t) => t.id !== teamId);
  return {
    ...current,
    teams: updatedTeams,
  };
}

/**
 * "Neue Runde": Setzt alle Punktestände auf 0 zurück.
 * Teamnamen, Farben und Icons bleiben vollständig erhalten!
 * Der Rundenstatus wird neutralisiert.
 */
export function startNewRound(state: ScoreboardSettings): ScoreboardSettings {
  const current = sanitizeScoreboardSettings(state);

  return {
    ...current,
    teams: current.teams.map((team) => ({
      ...team,
      score: 0,
    })),
    roundFinished: false,
  };
}

/**
 * "Runde beenden": Schließt die aktuelle Runde ab und aktiviert die Siegerhervorhebung.
 */
export function finishRound(state: ScoreboardSettings): ScoreboardSettings {
  const current = sanitizeScoreboardSettings(state);
  return {
    ...current,
    roundFinished: true,
  };
}

/**
 * "Teams zurücksetzen": Setzt alle Teams und Punktestände komplett auf die 2 Standardteams zurück.
 */
export function resetAllTeams(): ScoreboardSettings {
  return {
    ...DEFAULT_SCOREBOARD_SETTINGS,
    teams: DEFAULT_SCOREBOARD_TEAMS.map((t) => ({ ...t, score: 0 })),
  };
}

/**
 * Ermittelt den oder die Gewinner (bei Gleichstand mehrere Teams).
 */
export function getWinners(state: ScoreboardSettings): {
  winners: ScoreboardTeam[];
  isTie: boolean;
  maxScore: number;
} {
  const current = sanitizeScoreboardSettings(state);
  if (current.teams.length === 0) {
    return { winners: [], isTie: false, maxScore: 0 };
  }

  const maxScore = Math.max(...current.teams.map((t) => t.score));
  if (maxScore === 0) {
    // Kein Punktestand bisher erzielt -> keine Gewinner
    return { winners: [], isTie: false, maxScore: 0 };
  }

  const winners = current.teams.filter((t) => t.score === maxScore);
  return {
    winners,
    isTie: winners.length > 1,
    maxScore,
  };
}

/**
 * Pädagogischer Schutz:
 * - Verbietet negative Punktestände
 * - Verbietet Schüler-Leaderboards / individuelle Verhaltensbewertungen
 * - Verbietet Kopplung an Disziplinierung / Noten
 */
export function validateScoreboardPedagogicalGuard(data: any): {
  valid: boolean;
  reason?: string;
} {
  if (!data) return { valid: true };

  // 1. Negative Scores unzulässig
  if (Array.isArray(data.teams)) {
    for (const t of data.teams) {
      if (typeof t?.score === 'number' && t.score < 0) {
        return { valid: false, reason: 'Scores dürfen nicht negativ sein' };
      }
      // 2. Verhaltensbezogene Eigenschaften verbieten
      if ('discipline' in t || 'behavior' in t || 'strafe' in t || 'abzug' in t) {
        return { valid: false, reason: 'Keine Verhaltensbewertungen oder Strafen im Scoreboard erlaubt' };
      }
    }
  }

  // 3. Verbot von individuellen Schüler-Ranglisten im Scoreboard-Context
  if (data.isStudentRanking === true || data.targetScope === 'individual_students') {
    return { valid: false, reason: 'Scoreboard ist ausschließlich für Gruppen und Teams, keine Schüler-Rangliste' };
  }

  return { valid: true };
}
