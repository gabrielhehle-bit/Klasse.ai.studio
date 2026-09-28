export type FlagQuizContinent =
  | 'africa'
  | 'asia'
  | 'europe'
  | 'northAmerica'
  | 'southAmerica'
  | 'oceania';

export type FlagQuizDifficulty = 'easy' | 'medium' | 'hard';
export type FlagQuizContinentFilter = 'all' | FlagQuizContinent;
export type FlagQuizDifficultyFilter = 'all' | FlagQuizDifficulty;

export interface FlagQuizCountry {
  code: string;
  name: string;
  continent: FlagQuizContinent;
  difficulty: FlagQuizDifficulty;
}

export interface FlagQuizSettings {
  continent: FlagQuizContinentFilter;
  difficulty: FlagQuizDifficultyFilter;
}

export interface FlagQuizQuestion {
  country: FlagQuizCountry;
  choices: readonly FlagQuizCountry[];
}

export const FLAG_QUIZ_CONTINENT_LABELS: Record<FlagQuizContinentFilter, string> = {
  all: 'Alle Kontinente',
  africa: 'Afrika',
  asia: 'Asien',
  europe: 'Europa',
  northAmerica: 'Nordamerika',
  southAmerica: 'Südamerika',
  oceania: 'Ozeanien',
};

export const FLAG_QUIZ_DIFFICULTY_LABELS: Record<FlagQuizDifficultyFilter, string> = {
  all: 'Alle Stufen',
  easy: 'Einfach',
  medium: 'Mittel',
  hard: 'Schwer',
};

export const FLAG_ICON_VERSION = '7.5.0';

export const DEFAULT_FLAG_QUIZ_SETTINGS: FlagQuizSettings = {
  continent: 'all',
  difficulty: 'easy',
};

/**
 * 195 states: 193 UN members plus the Holy See/Vatican City and Palestine.
 * Continental assignment follows UN M49's one-region-per-country convention.
 * North America combines Northern America, Central America and the Caribbean.
 */
export const FLAG_QUIZ_COUNTRIES: readonly FlagQuizCountry[] = [
  { code: 'DZ', name: 'Algerien', continent: 'africa', difficulty: 'easy' },
  { code: 'AO', name: 'Angola', continent: 'africa', difficulty: 'medium' },
  { code: 'BJ', name: 'Benin', continent: 'africa', difficulty: 'hard' },
  { code: 'BW', name: 'Botsuana', continent: 'africa', difficulty: 'medium' },
  { code: 'BF', name: 'Burkina Faso', continent: 'africa', difficulty: 'medium' },
  { code: 'BI', name: 'Burundi', continent: 'africa', difficulty: 'hard' },
  { code: 'CV', name: 'Cabo Verde', continent: 'africa', difficulty: 'hard' },
  { code: 'CM', name: 'Kamerun', continent: 'africa', difficulty: 'medium' },
  { code: 'CF', name: 'Zentralafrikanische Republik', continent: 'africa', difficulty: 'hard' },
  { code: 'TD', name: 'Tschad', continent: 'africa', difficulty: 'hard' },
  { code: 'KM', name: 'Komoren', continent: 'africa', difficulty: 'hard' },
  { code: 'CD', name: 'Demokratische Republik Kongo', continent: 'africa', difficulty: 'medium' },
  { code: 'CG', name: 'Republik Kongo', continent: 'africa', difficulty: 'hard' },
  { code: 'CI', name: 'Elfenbeinküste', continent: 'africa', difficulty: 'medium' },
  { code: 'DJ', name: 'Dschibuti', continent: 'africa', difficulty: 'hard' },
  { code: 'EG', name: 'Ägypten', continent: 'africa', difficulty: 'easy' },
  { code: 'GQ', name: 'Äquatorialguinea', continent: 'africa', difficulty: 'hard' },
  { code: 'ER', name: 'Eritrea', continent: 'africa', difficulty: 'hard' },
  { code: 'SZ', name: 'Eswatini', continent: 'africa', difficulty: 'hard' },
  { code: 'ET', name: 'Äthiopien', continent: 'africa', difficulty: 'easy' },
  { code: 'GA', name: 'Gabun', continent: 'africa', difficulty: 'medium' },
  { code: 'GM', name: 'Gambia', continent: 'africa', difficulty: 'medium' },
  { code: 'GH', name: 'Ghana', continent: 'africa', difficulty: 'easy' },
  { code: 'GN', name: 'Guinea', continent: 'africa', difficulty: 'medium' },
  { code: 'GW', name: 'Guinea-Bissau', continent: 'africa', difficulty: 'hard' },
  { code: 'KE', name: 'Kenia', continent: 'africa', difficulty: 'easy' },
  { code: 'LS', name: 'Lesotho', continent: 'africa', difficulty: 'hard' },
  { code: 'LR', name: 'Liberia', continent: 'africa', difficulty: 'medium' },
  { code: 'LY', name: 'Libyen', continent: 'africa', difficulty: 'medium' },
  { code: 'MG', name: 'Madagaskar', continent: 'africa', difficulty: 'medium' },
  { code: 'MW', name: 'Malawi', continent: 'africa', difficulty: 'hard' },
  { code: 'ML', name: 'Mali', continent: 'africa', difficulty: 'medium' },
  { code: 'MR', name: 'Mauretanien', continent: 'africa', difficulty: 'hard' },
  { code: 'MU', name: 'Mauritius', continent: 'africa', difficulty: 'medium' },
  { code: 'MA', name: 'Marokko', continent: 'africa', difficulty: 'easy' },
  { code: 'MZ', name: 'Mosambik', continent: 'africa', difficulty: 'medium' },
  { code: 'NA', name: 'Namibia', continent: 'africa', difficulty: 'medium' },
  { code: 'NE', name: 'Niger', continent: 'africa', difficulty: 'medium' },
  { code: 'NG', name: 'Nigeria', continent: 'africa', difficulty: 'easy' },
  { code: 'RW', name: 'Ruanda', continent: 'africa', difficulty: 'medium' },
  { code: 'ST', name: 'São Tomé und Príncipe', continent: 'africa', difficulty: 'hard' },
  { code: 'SN', name: 'Senegal', continent: 'africa', difficulty: 'medium' },
  { code: 'SC', name: 'Seychellen', continent: 'africa', difficulty: 'hard' },
  { code: 'SL', name: 'Sierra Leone', continent: 'africa', difficulty: 'hard' },
  { code: 'SO', name: 'Somalia', continent: 'africa', difficulty: 'hard' },
  { code: 'ZA', name: 'Südafrika', continent: 'africa', difficulty: 'easy' },
  { code: 'SS', name: 'Südsudan', continent: 'africa', difficulty: 'hard' },
  { code: 'SD', name: 'Sudan', continent: 'africa', difficulty: 'medium' },
  { code: 'TZ', name: 'Tansania', continent: 'africa', difficulty: 'medium' },
  { code: 'TG', name: 'Togo', continent: 'africa', difficulty: 'hard' },
  { code: 'TN', name: 'Tunesien', continent: 'africa', difficulty: 'easy' },
  { code: 'UG', name: 'Uganda', continent: 'africa', difficulty: 'medium' },
  { code: 'ZM', name: 'Sambia', continent: 'africa', difficulty: 'medium' },
  { code: 'ZW', name: 'Simbabwe', continent: 'africa', difficulty: 'medium' },
  { code: 'AF', name: 'Afghanistan', continent: 'asia', difficulty: 'medium' },
  { code: 'AM', name: 'Armenien', continent: 'asia', difficulty: 'medium' },
  { code: 'AZ', name: 'Aserbaidschan', continent: 'asia', difficulty: 'medium' },
  { code: 'BH', name: 'Bahrain', continent: 'asia', difficulty: 'hard' },
  { code: 'BD', name: 'Bangladesch', continent: 'asia', difficulty: 'medium' },
  { code: 'BT', name: 'Bhutan', continent: 'asia', difficulty: 'medium' },
  { code: 'BN', name: 'Brunei', continent: 'asia', difficulty: 'hard' },
  { code: 'KH', name: 'Kambodscha', continent: 'asia', difficulty: 'medium' },
  { code: 'CN', name: 'China', continent: 'asia', difficulty: 'easy' },
  { code: 'CY', name: 'Zypern', continent: 'asia', difficulty: 'medium' },
  { code: 'GE', name: 'Georgien', continent: 'asia', difficulty: 'medium' },
  { code: 'IN', name: 'Indien', continent: 'asia', difficulty: 'easy' },
  { code: 'ID', name: 'Indonesien', continent: 'asia', difficulty: 'easy' },
  { code: 'IR', name: 'Iran', continent: 'asia', difficulty: 'medium' },
  { code: 'IQ', name: 'Irak', continent: 'asia', difficulty: 'medium' },
  { code: 'IL', name: 'Israel', continent: 'asia', difficulty: 'easy' },
  { code: 'JP', name: 'Japan', continent: 'asia', difficulty: 'easy' },
  { code: 'JO', name: 'Jordanien', continent: 'asia', difficulty: 'medium' },
  { code: 'KZ', name: 'Kasachstan', continent: 'asia', difficulty: 'medium' },
  { code: 'KW', name: 'Kuwait', continent: 'asia', difficulty: 'medium' },
  { code: 'KG', name: 'Kirgisistan', continent: 'asia', difficulty: 'hard' },
  { code: 'LA', name: 'Laos', continent: 'asia', difficulty: 'hard' },
  { code: 'LB', name: 'Libanon', continent: 'asia', difficulty: 'medium' },
  { code: 'MY', name: 'Malaysia', continent: 'asia', difficulty: 'medium' },
  { code: 'MV', name: 'Malediven', continent: 'asia', difficulty: 'hard' },
  { code: 'MN', name: 'Mongolei', continent: 'asia', difficulty: 'medium' },
  { code: 'MM', name: 'Myanmar', continent: 'asia', difficulty: 'medium' },
  { code: 'NP', name: 'Nepal', continent: 'asia', difficulty: 'medium' },
  { code: 'KP', name: 'Nordkorea', continent: 'asia', difficulty: 'easy' },
  { code: 'OM', name: 'Oman', continent: 'asia', difficulty: 'medium' },
  { code: 'PK', name: 'Pakistan', continent: 'asia', difficulty: 'medium' },
  { code: 'PS', name: 'Palästina', continent: 'asia', difficulty: 'hard' },
  { code: 'PH', name: 'Philippinen', continent: 'asia', difficulty: 'medium' },
  { code: 'QA', name: 'Katar', continent: 'asia', difficulty: 'medium' },
  { code: 'SA', name: 'Saudi-Arabien', continent: 'asia', difficulty: 'easy' },
  { code: 'SG', name: 'Singapur', continent: 'asia', difficulty: 'easy' },
  { code: 'KR', name: 'Südkorea', continent: 'asia', difficulty: 'easy' },
  { code: 'LK', name: 'Sri Lanka', continent: 'asia', difficulty: 'medium' },
  { code: 'SY', name: 'Syrien', continent: 'asia', difficulty: 'medium' },
  { code: 'TJ', name: 'Tadschikistan', continent: 'asia', difficulty: 'hard' },
  { code: 'TH', name: 'Thailand', continent: 'asia', difficulty: 'easy' },
  { code: 'TL', name: 'Timor-Leste', continent: 'asia', difficulty: 'hard' },
  { code: 'TR', name: 'Türkei', continent: 'asia', difficulty: 'easy' },
  { code: 'TM', name: 'Turkmenistan', continent: 'asia', difficulty: 'hard' },
  { code: 'AE', name: 'Vereinigte Arabische Emirate', continent: 'asia', difficulty: 'easy' },
  { code: 'UZ', name: 'Usbekistan', continent: 'asia', difficulty: 'hard' },
  { code: 'VN', name: 'Vietnam', continent: 'asia', difficulty: 'easy' },
  { code: 'YE', name: 'Jemen', continent: 'asia', difficulty: 'hard' },
  { code: 'AL', name: 'Albanien', continent: 'europe', difficulty: 'medium' },
  { code: 'AD', name: 'Andorra', continent: 'europe', difficulty: 'hard' },
  { code: 'AT', name: 'Österreich', continent: 'europe', difficulty: 'easy' },
  { code: 'BY', name: 'Belarus', continent: 'europe', difficulty: 'medium' },
  { code: 'BE', name: 'Belgien', continent: 'europe', difficulty: 'easy' },
  { code: 'BA', name: 'Bosnien und Herzegowina', continent: 'europe', difficulty: 'medium' },
  { code: 'BG', name: 'Bulgarien', continent: 'europe', difficulty: 'medium' },
  { code: 'HR', name: 'Kroatien', continent: 'europe', difficulty: 'easy' },
  { code: 'CZ', name: 'Tschechien', continent: 'europe', difficulty: 'easy' },
  { code: 'DK', name: 'Dänemark', continent: 'europe', difficulty: 'easy' },
  { code: 'EE', name: 'Estland', continent: 'europe', difficulty: 'medium' },
  { code: 'FI', name: 'Finnland', continent: 'europe', difficulty: 'easy' },
  { code: 'FR', name: 'Frankreich', continent: 'europe', difficulty: 'easy' },
  { code: 'DE', name: 'Deutschland', continent: 'europe', difficulty: 'easy' },
  { code: 'GR', name: 'Griechenland', continent: 'europe', difficulty: 'easy' },
  { code: 'VA', name: 'Vatikanstadt', continent: 'europe', difficulty: 'medium' },
  { code: 'HU', name: 'Ungarn', continent: 'europe', difficulty: 'easy' },
  { code: 'IS', name: 'Island', continent: 'europe', difficulty: 'medium' },
  { code: 'IE', name: 'Irland', continent: 'europe', difficulty: 'easy' },
  { code: 'IT', name: 'Italien', continent: 'europe', difficulty: 'easy' },
  { code: 'LV', name: 'Lettland', continent: 'europe', difficulty: 'medium' },
  { code: 'LI', name: 'Liechtenstein', continent: 'europe', difficulty: 'hard' },
  { code: 'LT', name: 'Litauen', continent: 'europe', difficulty: 'medium' },
  { code: 'LU', name: 'Luxemburg', continent: 'europe', difficulty: 'hard' },
  { code: 'MT', name: 'Malta', continent: 'europe', difficulty: 'hard' },
  { code: 'MD', name: 'Moldau', continent: 'europe', difficulty: 'hard' },
  { code: 'MC', name: 'Monaco', continent: 'europe', difficulty: 'hard' },
  { code: 'ME', name: 'Montenegro', continent: 'europe', difficulty: 'hard' },
  { code: 'NL', name: 'Niederlande', continent: 'europe', difficulty: 'easy' },
  { code: 'MK', name: 'Nordmazedonien', continent: 'europe', difficulty: 'medium' },
  { code: 'NO', name: 'Norwegen', continent: 'europe', difficulty: 'easy' },
  { code: 'PL', name: 'Polen', continent: 'europe', difficulty: 'easy' },
  { code: 'PT', name: 'Portugal', continent: 'europe', difficulty: 'easy' },
  { code: 'RO', name: 'Rumänien', continent: 'europe', difficulty: 'easy' },
  { code: 'RU', name: 'Russland', continent: 'europe', difficulty: 'easy' },
  { code: 'SM', name: 'San Marino', continent: 'europe', difficulty: 'hard' },
  { code: 'RS', name: 'Serbien', continent: 'europe', difficulty: 'medium' },
  { code: 'SK', name: 'Slowakei', continent: 'europe', difficulty: 'medium' },
  { code: 'SI', name: 'Slowenien', continent: 'europe', difficulty: 'medium' },
  { code: 'ES', name: 'Spanien', continent: 'europe', difficulty: 'easy' },
  { code: 'SE', name: 'Schweden', continent: 'europe', difficulty: 'easy' },
  { code: 'CH', name: 'Schweiz', continent: 'europe', difficulty: 'easy' },
  { code: 'UA', name: 'Ukraine', continent: 'europe', difficulty: 'easy' },
  { code: 'GB', name: 'Vereinigtes Königreich', continent: 'europe', difficulty: 'easy' },
  { code: 'AG', name: 'Antigua und Barbuda', continent: 'northAmerica', difficulty: 'hard' },
  { code: 'BS', name: 'Bahamas', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'BB', name: 'Barbados', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'BZ', name: 'Belize', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'CA', name: 'Kanada', continent: 'northAmerica', difficulty: 'easy' },
  { code: 'CR', name: 'Costa Rica', continent: 'northAmerica', difficulty: 'easy' },
  { code: 'CU', name: 'Kuba', continent: 'northAmerica', difficulty: 'easy' },
  { code: 'DM', name: 'Dominica', continent: 'northAmerica', difficulty: 'hard' },
  { code: 'DO', name: 'Dominikanische Republik', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'SV', name: 'El Salvador', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'GD', name: 'Grenada', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'GT', name: 'Guatemala', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'HT', name: 'Haiti', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'HN', name: 'Honduras', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'JM', name: 'Jamaika', continent: 'northAmerica', difficulty: 'easy' },
  { code: 'MX', name: 'Mexiko', continent: 'northAmerica', difficulty: 'easy' },
  { code: 'NI', name: 'Nicaragua', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'PA', name: 'Panama', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'KN', name: 'St. Kitts und Nevis', continent: 'northAmerica', difficulty: 'hard' },
  { code: 'LC', name: 'St. Lucia', continent: 'northAmerica', difficulty: 'hard' },
  { code: 'VC', name: 'St. Vincent und die Grenadinen', continent: 'northAmerica', difficulty: 'hard' },
  { code: 'TT', name: 'Trinidad und Tobago', continent: 'northAmerica', difficulty: 'medium' },
  { code: 'US', name: 'USA', continent: 'northAmerica', difficulty: 'easy' },
  { code: 'AR', name: 'Argentinien', continent: 'southAmerica', difficulty: 'easy' },
  { code: 'BO', name: 'Bolivien', continent: 'southAmerica', difficulty: 'medium' },
  { code: 'BR', name: 'Brasilien', continent: 'southAmerica', difficulty: 'easy' },
  { code: 'CL', name: 'Chile', continent: 'southAmerica', difficulty: 'easy' },
  { code: 'CO', name: 'Kolumbien', continent: 'southAmerica', difficulty: 'easy' },
  { code: 'EC', name: 'Ecuador', continent: 'southAmerica', difficulty: 'medium' },
  { code: 'GY', name: 'Guyana', continent: 'southAmerica', difficulty: 'medium' },
  { code: 'PY', name: 'Paraguay', continent: 'southAmerica', difficulty: 'medium' },
  { code: 'PE', name: 'Peru', continent: 'southAmerica', difficulty: 'easy' },
  { code: 'SR', name: 'Suriname', continent: 'southAmerica', difficulty: 'hard' },
  { code: 'UY', name: 'Uruguay', continent: 'southAmerica', difficulty: 'medium' },
  { code: 'VE', name: 'Venezuela', continent: 'southAmerica', difficulty: 'easy' },
  { code: 'AU', name: 'Australien', continent: 'oceania', difficulty: 'easy' },
  { code: 'FJ', name: 'Fidschi', continent: 'oceania', difficulty: 'easy' },
  { code: 'KI', name: 'Kiribati', continent: 'oceania', difficulty: 'hard' },
  { code: 'MH', name: 'Marshallinseln', continent: 'oceania', difficulty: 'hard' },
  { code: 'FM', name: 'Mikronesien', continent: 'oceania', difficulty: 'hard' },
  { code: 'NR', name: 'Nauru', continent: 'oceania', difficulty: 'hard' },
  { code: 'NZ', name: 'Neuseeland', continent: 'oceania', difficulty: 'easy' },
  { code: 'PW', name: 'Palau', continent: 'oceania', difficulty: 'hard' },
  { code: 'PG', name: 'Papua-Neuguinea', continent: 'oceania', difficulty: 'medium' },
  { code: 'WS', name: 'Samoa', continent: 'oceania', difficulty: 'medium' },
  { code: 'SB', name: 'Salomonen', continent: 'oceania', difficulty: 'hard' },
  { code: 'TO', name: 'Tonga', continent: 'oceania', difficulty: 'medium' },
  { code: 'TV', name: 'Tuvalu', continent: 'oceania', difficulty: 'hard' },
  { code: 'VU', name: 'Vanuatu', continent: 'oceania', difficulty: 'medium' },
] as const;

export function normalizeFlagQuizSettings(raw: unknown): FlagQuizSettings {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const continentValues: FlagQuizContinentFilter[] = [
    'all', 'africa', 'asia', 'europe', 'northAmerica', 'southAmerica', 'oceania',
  ];
  const difficultyValues: FlagQuizDifficultyFilter[] = ['all', 'easy', 'medium', 'hard'];

  return {
    continent: continentValues.includes(value.continent as FlagQuizContinentFilter)
      ? value.continent as FlagQuizContinentFilter
      : 'all',
    difficulty: difficultyValues.includes(value.difficulty as FlagQuizDifficultyFilter)
      ? value.difficulty as FlagQuizDifficultyFilter
      : 'easy',
  };
}

export function filterFlagQuizCountries(
  settings: FlagQuizSettings,
): readonly FlagQuizCountry[] {
  return FLAG_QUIZ_COUNTRIES.filter(country =>
    (settings.continent === 'all' || country.continent === settings.continent)
    && (settings.difficulty === 'all' || country.difficulty === settings.difficulty),
  );
}

function clampRandom(value: number): number {
  return Math.max(0, Math.min(0.999999, value));
}

function takeRandom<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(clampRandom(random()) * items.length)];
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clampRandom(random()) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createFlagQuizQuestion(
  settings: FlagQuizSettings,
  random: () => number = Math.random,
  previousCode?: string,
): FlagQuizQuestion | null {
  const eligible = filterFlagQuizCountries(settings);
  if (eligible.length === 0) return null;

  const correctPool = previousCode && eligible.length > 1
    ? eligible.filter(country => country.code !== previousCode)
    : eligible;
  const country = takeRandom(correctPool, random);

  const sameContinentDistractors = FLAG_QUIZ_COUNTRIES.filter(candidate =>
    candidate.code !== country.code && candidate.continent === country.continent,
  );
  const otherDistractors = FLAG_QUIZ_COUNTRIES.filter(candidate =>
    candidate.code !== country.code && candidate.continent !== country.continent,
  );

  const candidates = [
    ...shuffled(sameContinentDistractors, random),
    ...shuffled(otherDistractors, random),
  ];

  const distractors: FlagQuizCountry[] = [];
  const seen = new Set<string>([country.code]);
  for (const candidate of candidates) {
    if (seen.has(candidate.code)) continue;
    seen.add(candidate.code);
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }

  return {
    country,
    choices: shuffled([country, ...distractors], random),
  };
}

export function getFlagIconUrl(code: string): string {
  return `https://cdn.jsdelivr.net/npm/flag-icons@${FLAG_ICON_VERSION}/flags/4x3/${code.toLowerCase()}.svg`;
}
