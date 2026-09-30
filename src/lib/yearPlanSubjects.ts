export function resolveJahresplanSubjectId(
  subjectName: string,
  availableSubjects: { id: string; label: string }[],
): string | undefined {
  const lower = subjectName.toLocaleLowerCase('de-AT').trim();
  if (!lower) return undefined;

  const direct = availableSubjects.find(
    s => s.id.toLocaleLowerCase('de-AT') === lower || s.label.toLocaleLowerCase('de-AT') === lower,
  );
  if (direct) return direct.id;

  const partial = availableSubjects.find(s => {
    const label = s.label.toLocaleLowerCase('de-AT');
    return lower.includes(label) || label.includes(lower);
  });
  if (partial) return partial.id;

  const aliases: Array<[RegExp, string[]]> = [
    [/deutsch|sprache|lesen/, ['deutsch_sprache', 'deutsch', 'lesen']],
    [/mathe/, ['mathe_et', 'mathematik']],
    [/sach/, ['sachunterricht']],
    [/englisch/, ['englisch']],
    [/sport|bewegung/, ['bewegung_sport', 'sport']],
    [/musik/, ['musik']],
    [/kunst|zeichen|bildner/, ['bildnerische_erziehung', 'kunst']],
    [/werk/, ['technisches_werken', 'werken']],
    [/religion/, ['religion']],
  ];

  for (const [pattern, ids] of aliases) {
    if (!pattern.test(lower)) continue;
    const match = availableSubjects.find(s => ids.includes(s.id));
    if (match) return match.id;
  }

  return availableSubjects.find(s => s.id === 'sonstiges')?.id;
}
