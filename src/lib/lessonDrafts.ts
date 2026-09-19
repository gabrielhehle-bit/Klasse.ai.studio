/** Lossless read projection for manual and AI-generated legacy lesson drafts.
 * The saved objects are never replaced or migrated in place. Unknown fields survive.
 */
export type LessonDraftFields = {
  lernziele: string;
  einleitung: string;
  hauptteil: string;
  schluss: string;
  material: string;
};

export const EMPTY_LESSON_DRAFT: LessonDraftFields = {
  lernziele: '', einleitung: '', hauptteil: '', schluss: '', material: '',
};

const text = (value: unknown): string => typeof value === 'string' ? value : '';
const stepsText = (steps: any[]): string => steps.map(step => {
  const phase = text(step?.phase);
  const action = text(step?.aktion);
  const time = text(step?.zeit);
  const social = text(step?.sozialform);
  const media = text(step?.medien);
  return [phase, time && `[${time}]`, action, social && `(Sozialform: ${social})`, media && `(Medien: ${media})`].filter(Boolean).join(' ');
}).join('\n\n');

export function normalizeLessonDraft(source: any): LessonDraftFields & {
  id: string;
  fach: string;
  thema: string;
  datum: string;
} {
  const raw = source && typeof source === 'object' ? source : {};
  const plan = raw.plan && typeof raw.plan === 'object' ? raw.plan : {};
  const steps = Array.isArray(plan.verlaufsplan) ? plan.verlaufsplan : [];
  const entry = steps.filter((step: any) => /einstieg|einleitung|start/i.test(text(step?.phase)));
  const exit = steps.filter((step: any) => /schluss|sicherung|reflexion|ende/i.test(text(step?.phase)));
  const middle = steps.filter((step: any) => !entry.includes(step) && !exit.includes(step));
  const goals = [plan.lernziele?.kognitiv, plan.lernziele?.affektiv, plan.lernziele?.instrumental]
    .filter((v): v is string => typeof v === 'string' && Boolean(v.trim())).join('\n\n');
  const differentiation = [plan.differenzierung?.starke && `Stärkere Kinder: ${plan.differenzierung.starke}`,
    plan.differenzierung?.schwache && `Kinder mit Unterstützungsbedarf: ${plan.differenzierung.schwache}`]
    .filter(Boolean).join('\n');
  const middleText = [stepsText(middle), differentiation].filter(Boolean).join('\n\n');
  return {
    id: text(raw.id),
    fach: text(raw.fach),
    thema: text(raw.thema),
    datum: text(raw.datum) || text(raw.date).slice(0, 10),
    lernziele: text(raw.lernziele) || goals,
    einleitung: text(raw.einleitung) || stepsText(entry),
    hauptteil: text(raw.hauptteil) || middleText,
    schluss: text(raw.schluss) || stepsText(exit),
    material: text(raw.material) || text(plan.materialien),
  };
}

export function hasLessonDraftContent(draft: LessonDraftFields): boolean {
  return Boolean(draft.lernziele.trim() || draft.einleitung.trim() || draft.hauptteil.trim() || draft.schluss.trim() || draft.material.trim());
}

export function lessonDraftToText(draft: LessonDraftFields): string {
  return [
    ['LERNZIELE', draft.lernziele],
    ['EINSTIEG', draft.einleitung],
    ['HAUPTTEIL', draft.hauptteil],
    ['SCHLUSS', draft.schluss],
    ['MATERIALIEN', draft.material],
  ].map(([heading, value]) => `${heading}:\n${value || '—'}`).join('\n\n');
}

/** A saved library item with structured fields is re-usable; old free text is
 * preserved unmodified in the main part rather than silently discarded.
 */
export function lessonDraftFromMaterial(item: any): ReturnType<typeof normalizeLessonDraft> {
  const plain = text(item?.inhaltText);
  const sections: Record<string, string> = {};
  const matches = [...plain.matchAll(/(?:^|\n)(LERNZIELE|EINSTIEG|HAUPTTEIL|SCHLUSS|MATERIALIEN):\s*\n/gi)];
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index || 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index || plain.length) : plain.length;
    sections[matches[i][1].toUpperCase()] = plain.slice(start, end).trim().replace(/^—$/, '');
  }
  return normalizeLessonDraft({
    id: item?.id,
    fach: Array.isArray(item?.faecher) ? item.faecher[0] : '',
    thema: item?.titel,
    datum: item?.erstelltAm,
    lernziele: sections.LERNZIELE || text(item?.lernziel),
    einleitung: sections.EINSTIEG || '',
    hauptteil: sections.HAUPTTEIL || plain,
    schluss: sections.SCHLUSS || '',
    material: sections.MATERIALIEN || '',
  });
}
