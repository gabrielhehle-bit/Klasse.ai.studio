import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Info,
  Save,
  X
} from 'lucide-react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { OBERAU_SPF_STRUCTURE, OBERAU_STANDARD_STRUCTURE } from '../OberauSkala';

interface DossierErlaeuterungsmatrixProps {
  student: Student;
  controlledSemester?: '1' | '2';
  onSemesterChange?: (semester: '1' | '2') => void;
}

const SCALE_GROUPS = [
  { values: [1, 2], short: 'M', label: 'Mindestanforderung', color: 'bg-amber-500', light: 'bg-amber-100 text-amber-800' },
  { values: [3, 4], short: 'E', label: 'Im Wesentlichen erreicht', color: 'bg-blue-600', light: 'bg-blue-100 text-blue-800' },
  { values: [5, 6], short: 'Ü', label: 'Über das Wesentliche hinaus', color: 'bg-emerald-600', light: 'bg-emerald-100 text-emerald-800' }
];

export default function DossierErlaeuterungsmatrix({ student, controlledSemester, onSemesterChange }: DossierErlaeuterungsmatrixProps) {
  const { app, setApp } = useApp();
  const categories: any[] = student.spf ? OBERAU_SPF_STRUCTURE : OBERAU_STANDARD_STRUCTURE;
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || 'de');
  const [expandedSubsection, setExpandedSubsection] = useState<string | null>(null);
  const [semesterEvaluations, setSemesterEvaluations] = useState<Record<'1' | '2', Record<string, number | null>>>({ '1': {}, '2': {} });
  const [semesterRemarks, setSemesterRemarks] = useState<Record<'1' | '2', string>>({ '1': '', '2': '' });
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const [saved, setSaved] = useState(false);
  const [legacyLoaded, setLegacyLoaded] = useState(false);

  useEffect(() => {
    setSemester('1');
  }, [controlledSemester]);

  useEffect(() => {
    const stored = student.erlaeuterungsmatrix;
    if (stored) {
      const storedSemester = stored.semester || '2';
      setSemesterEvaluations({
        '1': stored.semesterBewertungen?.['1'] || (storedSemester === '1' ? stored.bewertungen || {} : {}),
        '2': stored.semesterBewertungen?.['2'] || (storedSemester === '2' ? stored.bewertungen || {} : {})
      });
      setSemesterRemarks({
        '1': stored.semesterBemerkungen?.['1'] || (storedSemester === '1' ? stored.bemerkung || '' : ''),
        '2': stored.semesterBemerkungen?.['2'] || (storedSemester === '2' ? stored.bemerkung || '' : '')
      });
      setSemester(storedSemester);
      setLegacyLoaded(false);
    } else {
      try {
        const legacyEvaluations = localStorage.getItem(`oberau_eval_${student.id}`);
        const legacyRemarks = localStorage.getItem(`oberau_remarks_${student.id}`);
        setSemesterEvaluations({
          '1': {},
          '2': legacyEvaluations ? JSON.parse(legacyEvaluations) : {}
        });
        setSemesterRemarks({
          '1': '',
          '2': legacyRemarks || student.foerderprofil?.zusatzinfo || ''
        });
        setLegacyLoaded(Boolean(legacyEvaluations || legacyRemarks));
      } catch {
        setSemesterEvaluations({ '1': {}, '2': {} });
        setSemesterRemarks({ '1': '', '2': student.foerderprofil?.zusatzinfo || '' });
        setLegacyLoaded(false);
      }
      setSemester('2');
    }
    setSelectedCategoryId((student.spf ? OBERAU_SPF_STRUCTURE : OBERAU_STANDARD_STRUCTURE)[0]?.id || 'de');
    setExpandedSubsection(null);
    setSaved(false);
  }, [student.id, student.spf, student.erlaeuterungsmatrix, student.foerderprofil?.zusatzinfo]);

  const allCriteria = useMemo(() => categories.flatMap(category => [
    ...(category.items || []),
    ...(category.subsections || []).flatMap((subsection: any) => subsection.items || [])
  ]), [categories]);

  const evaluations = semesterEvaluations[semester] || {};
  const remarks = semesterRemarks[semester] || '';
  const previousEvaluations = semester === '2' ? semesterEvaluations['1'] || {} : {};
  const previousEvaluatedCount = semester === '2'
    ? allCriteria.filter(criterion => previousEvaluations[criterion.id] !== null && previousEvaluations[criterion.id] !== undefined).length
    : 0;
  const setEvaluations = (updater: React.SetStateAction<Record<string, number | null>>) => {
    setSemesterEvaluations(previous => {
      const current = previous[semester] || {};
      const next = typeof updater === 'function'
        ? (updater as (value: Record<string, number | null>) => Record<string, number | null>)(current)
        : updater;
      return { ...previous, [semester]: next };
    });
  };
  const setRemarks = (value: string) => {
    setSemesterRemarks(previous => ({ ...previous, [semester]: value }));
  };

  const evaluatedCount = allCriteria.filter(criterion => evaluations[criterion.id] !== null && evaluations[criterion.id] !== undefined).length;
  const selectedCategory = categories.find(category => category.id === selectedCategoryId) || categories[0];
  const selectedCriteria = [
    ...(selectedCategory?.items || []),
    ...(selectedCategory?.subsections || []).flatMap((subsection: any) => subsection.items || [])
  ];
  const selectedEvaluatedCount = selectedCriteria.filter(
    criterion => evaluations[criterion.id] !== null && evaluations[criterion.id] !== undefined
  ).length;

  const setRating = (criterionId: string, value: number) => {
    setEvaluations(previous => ({
      ...previous,
      [criterionId]: previous[criterionId] === value ? null : value
    }));
    setSaved(false);
  };

  const saveMatrix = () => {
    const now = new Date().toISOString();
    setApp(previous => ({
      ...previous,
      schueler: previous.schueler.map(existingStudent => existingStudent.id === student.id
        ? {
            ...existingStudent,
            erlaeuterungsmatrix: {
              bewertungen: evaluations,
              bemerkung: remarks.trim(),
              schuljahr: previous.schuljahr || '',
              semester,
              semesterBewertungen: {
                '1': semesterEvaluations['1'] || {},
                '2': semesterEvaluations['2'] || {}
              },
              semesterBemerkungen: {
                '1': (semesterRemarks['1'] || '').trim(),
                '2': (semesterRemarks['2'] || '').trim()
              },
              schema: student.spf ? 'oberau-spf' : 'oberau-standard',
              aktualisiertAm: now
            },
            foerderprofil: {
              ...existingStudent.foerderprofil,
              zusatzinfo: remarks.trim()
            }
          }
        : existingStudent)
    }));
    setLegacyLoaded(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const RatingScale = ({ criterionId }: { criterionId: string }) => {
    const currentValue = evaluations[criterionId];
    const previousValue = semester === '2' ? previousEvaluations[criterionId] : null;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {SCALE_GROUPS.map(group => (
          <div key={group.short} className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            <span className="flex h-9 w-8 items-center justify-center bg-slate-100 text-[0.625rem] font-black text-slate-500" title={group.label}>
              {group.short}
            </span>
            {group.values.map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(criterionId, value)}
                className={`relative h-9 w-9 border-l border-slate-200 text-[0.75rem] font-black transition ${
                  currentValue !== null && currentValue !== undefined && currentValue >= value
                    ? `${group.color} text-white`
                    : previousValue !== null && previousValue !== undefined && previousValue >= value
                      ? group.light
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
                aria-label={`Stufe ${value}: ${group.label}${previousValue === value ? `; 1. Semester war Stufe ${previousValue}` : ''}`}
                aria-pressed={currentValue === value}
              >
                {value}
                {previousValue === value && (
                  <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                    currentValue !== null && currentValue !== undefined && currentValue >= value ? 'bg-white' : 'bg-slate-600'
                  }`} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        ))}
        {currentValue !== null && currentValue !== undefined && (
          <button
            type="button"
            onClick={() => setEvaluations(previous => ({ ...previous, [criterionId]: null }))}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Bewertung entfernen"
            aria-label="Bewertung entfernen"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  };

  const renderCriterion = (criterion: any) => (
    <div key={criterion.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 xl:flex-row xl:items-center">
      <div className="min-w-0">
        <div className="text-[0.75rem] font-bold leading-relaxed text-slate-800">{criterion.label}</div>
        <div className="mt-1 text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">
          {evaluations[criterion.id] === null || evaluations[criterion.id] === undefined
            ? semester === '2' && previousEvaluations[criterion.id] !== null && previousEvaluations[criterion.id] !== undefined
              ? `2. Semester nicht bewertet · 1. Semester: Stufe ${previousEvaluations[criterion.id]}`
              : 'Nicht bewertet'
            : `Stufe ${evaluations[criterion.id]} von 6${
                semester === '2' && previousEvaluations[criterion.id] !== null && previousEvaluations[criterion.id] !== undefined
                  ? ` · 1. Semester: ${previousEvaluations[criterion.id]}`
                  : ''
              }`}
        </div>
      </div>
      <RatingScale criterionId={criterion.id} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-2 rounded-full bg-emerald-500" />
          <h3 className="text-[1.5rem] font-black tracking-tight text-slate-900">Erläuterungsmatrix</h3>
        </div>
        <p className="ml-5 mt-1 text-[0.75rem] font-semibold text-slate-500">
          Schulinterne Oberau-Vorlage zur ergänzenden Lernstandsbeschreibung – keine automatisch erzeugte Zeugnisnote.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/55 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-700">Bearbeitungsstand</div>
              <div className="mt-1 text-[1.375rem] font-black text-emerald-950">{evaluatedCount} von {allCriteria.length} Kriterien</div>
              <p className="mt-1 text-[0.6875rem] font-semibold text-emerald-800">
                Nicht bearbeitete Kriterien bleiben ohne Bewertung.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[0.75rem] font-black text-emerald-700 shadow-sm">
              {allCriteria.length ? Math.round((evaluatedCount / allCriteria.length) * 100) : 0}%
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <label className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">Bezugszeitraum</label>
          <div className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-[0.75rem] font-bold text-slate-900">
            Schuljahr · {app.schuljahr}
          </div>
        </div>
      </div>

      {legacyLoaded && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <div>
            <div className="text-[0.75rem] font-black text-amber-950">Bisherige Browserdaten wurden geladen</div>
            <p className="mt-1 text-[0.6875rem] font-semibold text-amber-800">
              Speichere die Matrix einmal, damit sie künftig mit dem Schülerdossier und der Datensicherung synchronisiert ist.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {categories.map(category => {
          const criteria = [
            ...(category.items || []),
            ...(category.subsections || []).flatMap((subsection: any) => subsection.items || [])
          ];
          const count = criteria.filter(
            criterion => evaluations[criterion.id] !== null && evaluations[criterion.id] !== undefined
          ).length;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setSelectedCategoryId(category.id);
                setExpandedSubsection(null);
              }}
              className={`rounded-full px-3.5 py-2 text-[0.625rem] font-black uppercase tracking-wider transition ${
                selectedCategoryId === category.id
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {category.label} {count > 0 ? `· ${count}` : ''}
            </button>
          );
        })}
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-slate-50/45 p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-[1.0625rem] font-black text-slate-900">{selectedCategory?.label}</h4>
            <p className="mt-1 text-[0.6875rem] font-semibold text-slate-500">
              {selectedEvaluatedCount} von {selectedCriteria.length} Kriterien bearbeitet
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">
            {semester === '2' && previousEvaluatedCount > 0 && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1.5 normal-case tracking-normal">
                Helle Farbe + Punkt = 1. Semester
              </span>
            )}
            {SCALE_GROUPS.map(group => (
              <span key={group.short} className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5" title={group.label}>
                {group.short}: {group.values.join('–')}
              </span>
            ))}
          </div>
        </div>

        {selectedCategory?.subsections ? (
          <div className="space-y-3">
            {selectedCategory.subsections.map((subsection: any) => {
              const expanded = expandedSubsection === subsection.id;
              const count = subsection.items.filter(
                (criterion: any) => evaluations[criterion.id] !== null && evaluations[criterion.id] !== undefined
              ).length;
              return (
                <div key={subsection.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedSubsection(expanded ? null : subsection.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    aria-expanded={expanded}
                  >
                    <div>
                      <div className="text-[0.8125rem] font-black text-slate-900">{subsection.label}</div>
                      <div className="mt-1 text-[0.5625rem] font-bold uppercase tracking-wider text-slate-400">{count} / {subsection.items.length} bewertet</div>
                    </div>
                    {expanded ? <ChevronUp size={17} className="text-slate-400" /> : <ChevronDown size={17} className="text-slate-400" />}
                  </button>
                  {expanded && <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">{subsection.items.map(renderCriterion)}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">{(selectedCategory?.items || []).map(renderCriterion)}</div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardCheck size={17} className="text-emerald-600" />
          <h4 className="text-[0.875rem] font-black text-slate-900">Ergänzende Erläuterung</h4>
        </div>
        <textarea
          value={remarks}
          onChange={event => {
            setRemarks(event.target.value);
            setSaved(false);
          }}
          placeholder="Konkrete, beobachtbare Hinweise ergänzen – Stärken, Entwicklung und nächste Schritte."
          className="min-h-[110px] w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-[0.75rem] font-medium leading-relaxed text-slate-900 outline-none focus:border-emerald-500"
        />
      </section>

      <div className="flex flex-col justify-between gap-4 rounded-[1.75rem] border border-cyan-200 bg-cyan-50/55 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          {saved
            ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
            : <Info className="mt-0.5 shrink-0 text-cyan-700" size={18} />}
          <div>
            <div className="text-[0.75rem] font-black text-cyan-950">{saved ? 'Im Dossier gespeichert' : 'Zentral speichern'}</div>
            <p className="mt-1 text-[0.6875rem] font-semibold text-cyan-900">
              Bewertungen und Freitext werden gemeinsam mit den übrigen Schülerdaten gesichert.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={saveMatrix}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-[0.625rem] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700"
        >
          <Save size={14} /> Matrix speichern
        </button>
      </div>
    </div>
  );
}
