// Landeshauptstädte: migration.gv.at, „Geografie und Bevölkerung“.
export const AUSTRIAN_STATES = [
  { name: 'Burgenland', capital: 'Eisenstadt' },
  { name: 'Kärnten', capital: 'Klagenfurt' },
  { name: 'Niederösterreich', capital: 'St. Pölten' },
  { name: 'Oberösterreich', capital: 'Linz' },
  { name: 'Salzburg', capital: 'Salzburg' },
  { name: 'Steiermark', capital: 'Graz' },
  { name: 'Tirol', capital: 'Innsbruck' },
  { name: 'Vorarlberg', capital: 'Bregenz' },
  { name: 'Wien', capital: 'Wien' },
] as const;

export function matchesAustrianCapital(guess: string, capital: string): boolean {
  const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase('de-AT')
    .trim().replace(/^sankt\b/, 'st').replace(/[.\s]+/g, '');
  const normalized = normalize(guess);
  return normalized === normalize(capital)
    || (capital === 'Klagenfurt' && normalized === 'klagenfurtamwörthersee');
}
