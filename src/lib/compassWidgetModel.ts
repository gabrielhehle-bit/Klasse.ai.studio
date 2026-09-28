export type CompassMode = 'explore' | 'practice';
export type CompassDirectionSet = 'cardinal' | 'all';

export interface CompassDirection {
  angle: number;
  label: 'N' | 'NO' | 'O' | 'SO' | 'S' | 'SW' | 'W' | 'NW';
  name: string;
  kind: 'cardinal' | 'intercardinal';
  explanation: string;
}

export interface CompassWidgetSettings {
  mode: CompassMode;
  directionSet: CompassDirectionSet;
  showDegrees: boolean;
}

export const COMPASS_DIRECTIONS: readonly CompassDirection[] = [
  {
    angle: 0,
    label: 'N',
    name: 'Norden',
    kind: 'cardinal',
    explanation: 'Auf den meisten Karten liegt Norden oben. Süden ist die Gegenrichtung.',
  },
  {
    angle: 45,
    label: 'NO',
    name: 'Nordosten',
    kind: 'intercardinal',
    explanation: 'Nordosten liegt genau zwischen Norden und Osten.',
  },
  {
    angle: 90,
    label: 'O',
    name: 'Osten',
    kind: 'cardinal',
    explanation: 'Auf einer nach Norden ausgerichteten Karte liegt Osten rechts. In Österreich geht die Sonne ungefähr im Osten auf; je nach Jahreszeit eher nordöstlich oder südöstlich.',
  },
  {
    angle: 135,
    label: 'SO',
    name: 'Südosten',
    kind: 'intercardinal',
    explanation: 'Südosten liegt genau zwischen Süden und Osten.',
  },
  {
    angle: 180,
    label: 'S',
    name: 'Süden',
    kind: 'cardinal',
    explanation: 'Auf den meisten Karten liegt Süden unten. Norden ist die Gegenrichtung.',
  },
  {
    angle: 225,
    label: 'SW',
    name: 'Südwesten',
    kind: 'intercardinal',
    explanation: 'Südwesten liegt genau zwischen Süden und Westen.',
  },
  {
    angle: 270,
    label: 'W',
    name: 'Westen',
    kind: 'cardinal',
    explanation: 'Auf einer nach Norden ausgerichteten Karte liegt Westen links. In Österreich geht die Sonne ungefähr im Westen unter; je nach Jahreszeit eher nordwestlich oder südwestlich.',
  },
  {
    angle: 315,
    label: 'NW',
    name: 'Nordwesten',
    kind: 'intercardinal',
    explanation: 'Nordwesten liegt genau zwischen Norden und Westen.',
  },
] as const;

export const DEFAULT_COMPASS_WIDGET_SETTINGS: CompassWidgetSettings = {
  mode: 'explore',
  directionSet: 'all',
  showDegrees: true,
};

export function normalizeCompassWidgetSettings(raw: unknown): CompassWidgetSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    mode: value.mode === 'practice' ? 'practice' : 'explore',
    directionSet: value.directionSet === 'cardinal' ? 'cardinal' : 'all',
    showDegrees: typeof value.showDegrees === 'boolean' ? value.showDegrees : true,
  };
}

export function getCompassDirections(directionSet: CompassDirectionSet): readonly CompassDirection[] {
  return directionSet === 'cardinal'
    ? COMPASS_DIRECTIONS.filter(direction => direction.kind === 'cardinal')
    : COMPASS_DIRECTIONS;
}

export function getCompassDirection(angle: number): CompassDirection {
  const normalized = ((Math.round(angle) % 360) + 360) % 360;
  return COMPASS_DIRECTIONS.find(direction => direction.angle === normalized) || COMPASS_DIRECTIONS[0];
}

export function stepCompassAngle(
  angle: number,
  step: -1 | 1,
  directionSet: CompassDirectionSet,
): number {
  const directions = getCompassDirections(directionSet);
  const current = directions.findIndex(direction => direction.angle === getCompassDirection(angle).angle);
  const safeIndex = current >= 0 ? current : 0;
  return directions[(safeIndex + step + directions.length) % directions.length].angle;
}

export interface CompassPracticeRound {
  target: CompassDirection;
}

export function createCompassPracticeRound(
  directions: readonly CompassDirection[] = COMPASS_DIRECTIONS,
  random: () => number = Math.random,
  previousAngle?: number,
): CompassPracticeRound | null {
  if (directions.length === 0) return null;

  const candidates = previousAngle === undefined || directions.length === 1
    ? [...directions]
    : directions.filter(direction => direction.angle !== previousAngle);
  const pool = candidates.length > 0 ? candidates : [...directions];
  const randomValue = Math.max(0, Math.min(0.999999, random()));
  const index = Math.min(pool.length - 1, Math.floor(randomValue * pool.length));
  return { target: pool[index] };
}
