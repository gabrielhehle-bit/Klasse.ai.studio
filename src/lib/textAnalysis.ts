export type GermanTextAnalysis = {
  characters: number;
  letters: number;
  words: number;
  sentences: number;
  syllables: number;
  averageSentenceLength: number;
  averageWordLength: number;
  averageSyllablesPerWord: number;
  longWordPercent: number;
  multiSyllablePercent: number;
  monosyllablePercent: number;
  fleschGerman: number;
  fleschLabel: string;
  wienerSachtextformel1: number;
  wstfLabel: string;
  longestWords: string[];
};

const WORD_RE = /[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*/gu;
const VOWEL_GROUP_RE = /[aeiouyäöü]+/g;

export function countGermanSyllables(word: string): number {
  const normalized = word
    .toLocaleLowerCase('de-AT')
    .normalize('NFC')
    .replace(/[^a-zäöüß]/g, '')
    // In German "qu" normally represents /kv/; the u is not a syllable nucleus.
    .replace(/qu/g, 'q');

  if (!normalized) return 0;
  const groups = normalized.match(VOWEL_GROUP_RE);
  return Math.max(1, groups?.length || 1);
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function getGermanFleschLabel(score: number): string {
  if (score >= 90) return 'sehr leicht';
  if (score >= 80) return 'leicht';
  if (score >= 70) return 'eher leicht';
  if (score >= 60) return 'mittel';
  if (score >= 50) return 'eher anspruchsvoll';
  if (score >= 30) return 'schwierig';
  return 'sehr schwierig';
}

export function getWstfLabel(score: number): string {
  if (score < 4) return 'unterhalb der WSTF-Schulstufenskala (sehr leichter Text)';
  if (score > 15) return 'oberhalb der WSTF-Skala (sehr anspruchsvoller Sachtext)';
  return `etwa Schwierigkeitsstufe ${round(score, 1)} – nur als Sachtext-Orientierung`;
}

export function analyzeGermanText(input: string): GermanTextAnalysis | null {
  const text = input.trim();
  const words: string[] = Array.from(text.matchAll(WORD_RE), match => match[0]);
  if (words.length === 0) return null;

  const sentenceSegments = text
    .split(/[.!?]+(?:\s+|$)/u)
    .map(segment => segment.trim())
    .filter(Boolean);
  const sentenceCount = Math.max(1, sentenceSegments.length);

  const syllableCounts = words.map(countGermanSyllables);
  const syllables = syllableCounts.reduce((sum, value) => sum + value, 0);
  const letters = words.reduce(
    (sum, word) => sum + (word.match(/[\p{L}\p{M}]/gu)?.length || 0),
    0,
  );
  const longWords = words.filter(word => (word.match(/[\p{L}\p{M}]/gu)?.length || 0) > 6).length;
  const multiSyllableWords = syllableCounts.filter(value => value >= 3).length;
  const monosyllables = syllableCounts.filter(value => value === 1).length;

  const averageSentenceLength = words.length / sentenceCount;
  const averageWordLength = letters / words.length;
  const averageSyllablesPerWord = syllables / words.length;
  const longWordPercent = (longWords / words.length) * 100;
  const multiSyllablePercent = (multiSyllableWords / words.length) * 100;
  const monosyllablePercent = (monosyllables / words.length) * 100;

  // Amstad's German adaptation of Flesch Reading Ease:
  // RE = 180 - average sentence length - 58.5 * average syllables per word.
  const fleschGerman = 180 - averageSentenceLength - (58.5 * averageSyllablesPerWord);

  // Wiener Sachtextformel 1 (Bamberger/Vanecek):
  // 0.1935*MS + 0.1672*SL + 0.1297*IW - 0.0327*ES - 0.875
  const wienerSachtextformel1 =
    (0.1935 * multiSyllablePercent) +
    (0.1672 * averageSentenceLength) +
    (0.1297 * longWordPercent) -
    (0.0327 * monosyllablePercent) -
    0.875;

  const uniqueLongest = Array.from(new Set(words.map(word => word.replace(/[’']/g, ''))))
    .sort((a, b) => b.length - a.length || a.localeCompare(b, 'de-AT'))
    .slice(0, 8);

  return {
    characters: text.length,
    letters,
    words: words.length,
    sentences: sentenceCount,
    syllables,
    averageSentenceLength: round(averageSentenceLength),
    averageWordLength: round(averageWordLength),
    averageSyllablesPerWord: round(averageSyllablesPerWord, 2),
    longWordPercent: round(longWordPercent),
    multiSyllablePercent: round(multiSyllablePercent),
    monosyllablePercent: round(monosyllablePercent),
    fleschGerman: round(fleschGerman),
    fleschLabel: getGermanFleschLabel(fleschGerman),
    wienerSachtextformel1: round(wienerSachtextformel1, 1),
    wstfLabel: getWstfLabel(wienerSachtextformel1),
    longestWords: uniqueLongest,
  };
}

export function buildTextAnalysisHints(analysis: GermanTextAnalysis): string[] {
  const hints: string[] = [];
  if (analysis.averageSentenceLength > 18) {
    hints.push('Viele Sätze sind lang. Prüfe, ob einzelne Sätze geteilt werden können.');
  }
  if (analysis.multiSyllablePercent > 20) {
    hints.push('Der Text enthält viele Wörter mit drei oder mehr Silben. Fachwörter gegebenenfalls erklären.');
  }
  if (analysis.longWordPercent > 30) {
    hints.push('Viele Wörter sind länger als sechs Buchstaben. Kürzere Alternativen können den Einstieg erleichtern.');
  }
  if (analysis.fleschGerman < 60) {
    hints.push('Der Flesch-Wert weist auf einen eher anspruchsvollen Text hin. Für Lernende können Vorentlastung oder Abschnitte helfen.');
  }
  if (hints.length === 0) {
    hints.push('Die formalen Lesbarkeitsmerkmale wirken unauffällig. Inhalt, Vorwissen und Fachwortschatz trotzdem separat beurteilen.');
  }
  return hints;
}
