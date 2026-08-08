import React, { useMemo, useState } from 'react';
import { Student, STANDARD_KEL_BEREICHE } from '../../types';
import { useApp } from '../../context/AppContext';
import { FlowerChart, KEL_GRADES_INFO, DEVELOPMENT_DIAGRAM_FIELDS } from '../FlowerChart';
import { generateKELAssessment } from '../../services/aiService';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Compass,
  Info,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';

interface DossierKELReflexionProps {
  student: Student;
  onStartPresentation?: () => void;
}

type KelCategory = 'alle' | 'lernen' | 'arbeitsverhalten' | 'sozialverhalten' | 'interessen';
type Perspective = 'kind' | 'lehrer';

const CATEGORY_OPTIONS: { id: KelCategory; label: string }[] = [
  { id: 'alle', label: 'Alle Bereiche' },
  { id: 'lernen', label: 'Lernen' },
  { id: 'arbeitsverhalten', label: 'Arbeitsverhalten' },
  { id: 'sozialverhalten', label: 'Sozialverhalten' },
  { id: 'interessen', label: 'Interessen' }
];

const CATEGORY_LABELS: Record<Exclude<KelCategory, 'alle'>, string> = {
  lernen: 'Lernen',
  arbeitsverhalten: 'Arbeitsverhalten',
  sozialverhalten: 'Sozialverhalten',
  interessen: 'Interessen'
};

export default function DossierKELReflexion({ student, onStartPresentation }: DossierKELReflexionProps) {
  const { app, setApp } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<KelCategory>('alle');
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [aiLoadingState, setAiLoadingState] = useState<string | null>(null);
  const [newMeetingThema, setNewMeetingThema] = useState('');
  const [newMeetingDatum, setNewMeetingDatum] = useState(new Date().toISOString().split('T')[0]);
  const [newMeetingVereinbarung, setNewMeetingVereinbarung] = useState('');

  const allCriteria = useMemo(() => {
    const criteria = [...STANDARD_KEL_BEREICHE];
    (DEVELOPMENT_DIAGRAM_FIELDS || []).forEach((field: any) => {
      if (!criteria.some(item => item.id === field.id)) {
        criteria.push({
          id: field.id,
          label: field.label,
          kategorie: field.kategorie,
          kindgerecht: field.kindgerecht
        });
      }
    });
    return criteria;
  }, []);

  const latestKel: any = useMemo(() => {
    return [...(app.kelGespraeche || [])]
      .filter(item => item.schuelerId === student.id)
      .sort((a, b) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime())[0];
  }, [app.kelGespraeche, student.id]);

  const meetings = useMemo(() => {
    return [...(app.elterngespraeche || [])]
      .filter(meeting => meeting.schuelerId === student.id)
      .sort((a, b) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime());
  }, [app.elterngespraeche, student.id]);

  const filteredCriteria = selectedCategory === 'alle'
    ? allCriteria
    : allCriteria.filter(item => item.kategorie === selectedCategory);

  const childRatingsCount = allCriteria.filter(item =>
    latestKel?.selbsteinschaetzungKind?.[item.id]?.wert !== undefined
  ).length;
  const teacherRatingsCount = allCriteria.filter(item =>
    latestKel?.einschaetzungLehrperson?.[item.id]?.wert !== undefined
  ).length;
  const ratedCriteriaCount = allCriteria.filter(item =>
    latestKel?.selbsteinschaetzungKind?.[item.id]?.wert !== undefined ||
    latestKel?.einschaetzungLehrperson?.[item.id]?.wert !== undefined
  ).length;

  const createEmptyKelMeeting = (schoolYear: string) => ({
    id: `kel-${Date.now()}`,
    schuelerId: student.id,
    datum: new Date().toISOString().split('T')[0],
    schuljahr: schoolYear,
    teilnehmer: [],
    selbsteinschaetzungKind: {},
    einschaetzungLehrperson: {},
    elternEindruck: '',
    zieleKind: [],
    vereinbarungen: '',
    naechsterTermin: '',
    unterschriftKind: false,
    unterschriftEltern: false,
    unterschriftLehrperson: false,
    notiz: ''
  });

  const updatePerspective = (
    criterionId: string,
    perspective: Perspective,
    update: { wert?: number; kommentar?: string }
  ) => {
    setApp((prev: any) => {
      const records = prev.kelGespraeche || [];
      const index = records.findIndex((record: any) => record.schuelerId === student.id);
      const existing = index >= 0 ? records[index] : createEmptyKelMeeting(prev.schuljahr || '');
      const perspectiveKey = perspective === 'kind' ? 'selbsteinschaetzungKind' : 'einschaetzungLehrperson';
      const updated = {
        ...existing,
        datum: new Date().toISOString().split('T')[0],
        [perspectiveKey]: {
          ...(existing[perspectiveKey] || {}),
          [criterionId]: {
            ...(existing[perspectiveKey]?.[criterionId] || {}),
            ...update
          }
        }
      };

      return {
        ...prev,
        kelGespraeche: index >= 0
          ? records.map((record: any, recordIndex: number) => recordIndex === index ? updated : record)
          : [...records, updated]
      };
    });
  };

  const removeRating = (criterionId: string, perspective: Perspective) => {
    setApp((prev: any) => {
      const records = prev.kelGespraeche || [];
      const perspectiveKey = perspective === 'kind' ? 'selbsteinschaetzungKind' : 'einschaetzungLehrperson';
      return {
        ...prev,
        kelGespraeche: records.map((record: any) => {
          if (record.schuelerId !== student.id) return record;
          const existingEntry = record[perspectiveKey]?.[criterionId] || {};
          const { wert: _removedValue, ...commentOnly } = existingEntry;
          return {
            ...record,
            [perspectiveKey]: {
              ...(record[perspectiveKey] || {}),
              [criterionId]: commentOnly
            }
          };
        })
      };
    });
  };

  const handleGenerateAssessment = async (criterionId: string, label: string, comment: string) => {
    if (!comment.trim()) return;
    try {
      setAiLoadingState(criterionId);
      const result = await generateKELAssessment(label, comment);
      if (result) updatePerspective(criterionId, 'lehrer', { kommentar: result });
    } finally {
      setAiLoadingState(null);
    }
  };

  const handleAddMeeting = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMeetingThema.trim() || !newMeetingVereinbarung.trim()) return;

    const newMeeting = {
      id: `meet-${Date.now()}`,
      schuelerId: student.id,
      thema: newMeetingThema.trim(),
      datum: newMeetingDatum,
      notizen: '',
      vereinbarungen: newMeetingVereinbarung.trim()
    };
    setApp((prev: any) => ({
      ...prev,
      elterngespraeche: [newMeeting, ...(prev.elterngespraeche || [])]
    }));
    setNewMeetingThema('');
    setNewMeetingVereinbarung('');
    setShowAddMeeting(false);
    setHistoryExpanded(true);
  };

  const handleDeleteMeeting = (id: string) => {
    if (!window.confirm('Dieses Gesprächsprotokoll wirklich löschen?')) return;
    setApp((prev: any) => ({
      ...prev,
      elterngespraeche: (prev.elterngespraeche || []).filter((meeting: any) => meeting.id !== id)
    }));
  };

  const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('de-AT');
  };

  const renderPerspective = (
    criterionId: string,
    perspective: Perspective,
    value: number | undefined,
    comment: string,
    label: string
  ) => {
    const isChild = perspective === 'kind';
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-[0.625rem] font-black uppercase tracking-wider ${isChild ? 'text-amber-700' : 'text-indigo-700'}`}>
            {isChild ? 'Perspektive des Kindes' : 'Perspektive der Lehrperson'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[0.625rem] font-bold text-slate-500">
              {value === undefined ? 'Noch nicht eingeschätzt' : `Stufe ${value} von 5`}
            </span>
            {value !== undefined && (
              <button
                type="button"
                onClick={() => removeRating(criterionId, perspective)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                title="Einschätzung entfernen"
                aria-label={`${isChild ? 'Kind-' : 'Lehrperson-'}Einschätzung entfernen`}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4, 5].map(rating => {
            const info = KEL_GRADES_INFO.find(item => item.item === rating);
            const selected = value === rating;
            return (
              <button
                key={rating}
                type="button"
                onClick={() => updatePerspective(criterionId, perspective, { wert: rating })}
                className={`flex h-10 min-w-10 flex-col items-center justify-center rounded-xl border text-[0.6875rem] font-black transition ${
                  selected
                    ? isChild
                      ? 'scale-105 border-amber-500 bg-amber-500 text-white'
                      : 'scale-105 border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
                title={info?.text}
                aria-label={`${isChild ? 'Kind' : 'Lehrperson'}: Stufe ${rating} – ${info?.text || ''}`}
              >
                <span>{rating}</span>
                <span className="text-[0.625rem] leading-none">{info?.icon}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <label className="mb-1 block text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">
            {isChild ? 'Aussage oder Kommentar des Kindes' : 'Pädagogische Beobachtung'}
          </label>
          <textarea
            value={comment}
            onChange={event => updatePerspective(criterionId, perspective, { kommentar: event.target.value })}
            placeholder={isChild ? 'Was sagt das Kind dazu?' : 'Welche konkrete Beobachtung liegt vor?'}
            className={`min-h-[72px] w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-[0.75rem] font-medium leading-relaxed text-slate-800 outline-none ${
              isChild ? 'focus:border-amber-500' : 'focus:border-indigo-500'
            }`}
          />
          {!isChild && (
            <button
              type="button"
              onClick={() => handleGenerateAssessment(criterionId, label, comment)}
              disabled={!comment.trim() || aiLoadingState === criterionId}
              className="absolute bottom-2.5 right-2.5 rounded-lg bg-indigo-100 p-2 text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
              title={comment.trim() ? 'Formulierungshilfe verwenden' : 'Zuerst eine Beobachtung eingeben'}
              aria-label="KI-Formulierungshilfe"
            >
              <Sparkles size={13} className={aiLoadingState === criterionId ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <span className="mb-1 block text-[0.625rem] font-black uppercase tracking-[0.2em] text-indigo-600">Kollaborative Reflexion</span>
          <h2 className="text-[1.5rem] font-black leading-tight tracking-tight text-slate-900">KEL-Entwicklung</h2>
          <p className="mt-1 text-[0.75rem] font-semibold text-slate-500">
            Selbstbild des Kindes und Beobachtung der Lehrperson bleiben getrennt und nachvollziehbar.
          </p>
        </div>
        <button
          onClick={onStartPresentation}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[0.625rem] font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
        >
          <Compass size={16} /> Elternansicht öffnen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Bearbeitete Bereiche</div>
          <div className="mt-1 text-[1.5rem] font-black text-slate-900">{ratedCriteriaCount} / {allCriteria.length}</div>
          <div className="mt-1 text-[0.6875rem] font-semibold text-slate-500">mit mindestens einer Perspektive</div>
        </div>
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/55 p-5">
          <div className="text-[0.625rem] font-black uppercase tracking-widest text-amber-700">Kind-Perspektive</div>
          <div className="mt-1 text-[1.5rem] font-black text-amber-950">{childRatingsCount}</div>
          <div className="mt-1 text-[0.6875rem] font-semibold text-amber-800">bewusst eingeschätzt</div>
        </div>
        <div className="rounded-[1.5rem] border border-indigo-200 bg-indigo-50/55 p-5">
          <div className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-700">Lehrperson-Perspektive</div>
          <div className="mt-1 text-[1.5rem] font-black text-indigo-950">{teacherRatingsCount}</div>
          <div className="mt-1 text-[0.6875rem] font-semibold text-indigo-800">bewusst eingeschätzt</div>
        </div>
      </div>

      {ratedCriteriaCount > 0 ? (
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-2">
          <FlowerChart
            studentId={student.id}
            app={app}
            selectedKats={['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen']}
            isCollaborative={true}
            editable={false}
          />
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <Compass size={26} />
          </div>
          <h3 className="mt-4 text-[1rem] font-black text-slate-800">Noch keine KEL-Einschätzung erfasst</h3>
          <p className="mx-auto mt-2 max-w-xl text-[0.75rem] font-semibold leading-relaxed text-slate-500">
            Das Entwicklungsdiagramm erscheint erst, wenn das Kind oder die Lehrperson mindestens einen Bereich bewusst eingeschätzt hat.
          </p>
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-7">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ClipboardList size={21} />
          </div>
          <div>
            <h3 className="text-[1.125rem] font-black text-slate-900">Reflexionsbereiche</h3>
            <p className="mt-0.5 text-[0.6875rem] font-semibold text-slate-500">
              Öffne nur den Bereich, den du gemeinsam mit dem Kind bearbeiten möchtest.
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map(category => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setSelectedCategory(category.id);
                setExpandedCriterion(null);
              }}
              className={`rounded-full px-3.5 py-2 text-[0.625rem] font-black uppercase tracking-wider transition ${
                selectedCategory === category.id
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredCriteria.map(criterion => {
            const childValue = latestKel?.selbsteinschaetzungKind?.[criterion.id]?.wert;
            const teacherValue = latestKel?.einschaetzungLehrperson?.[criterion.id]?.wert;
            const childComment = latestKel?.selbsteinschaetzungKind?.[criterion.id]?.kommentar || '';
            const teacherComment = latestKel?.einschaetzungLehrperson?.[criterion.id]?.kommentar || '';
            const childInfo = KEL_GRADES_INFO.find(item => item.item === childValue);
            const teacherInfo = KEL_GRADES_INFO.find(item => item.item === teacherValue);
            const expanded = expandedCriterion === criterion.id;

            return (
              <article key={criterion.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/55 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedCriterion(expanded ? null : criterion.id)}
                  className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
                  aria-expanded={expanded}
                >
                  <div>
                    <div className="text-[0.5625rem] font-black uppercase tracking-widest text-indigo-600">
                      {CATEGORY_LABELS[criterion.kategorie]}
                    </div>
                    <h4 className="mt-0.5 text-[0.9375rem] font-black text-slate-900">{criterion.label}</h4>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="text-center">
                        <div className="text-[0.5rem] font-black uppercase text-slate-400">Kind</div>
                        <div className="text-[0.75rem] font-black text-slate-800">
                          {childValue === undefined ? '–' : `${childValue} ${childInfo?.icon || ''}`}
                        </div>
                      </div>
                      <div className="h-7 w-px bg-slate-200" />
                      <div className="text-center">
                        <div className="text-[0.5rem] font-black uppercase text-slate-400">Lehrperson</div>
                        <div className="text-[0.75rem] font-black text-slate-800">
                          {teacherValue === undefined ? '–' : `${teacherValue} ${teacherInfo?.icon || ''}`}
                        </div>
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={17} className="text-slate-400" /> : <ChevronDown size={17} className="text-slate-400" />}
                  </div>
                </button>

                {expanded && (
                  <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/55 p-3">
                      <div className="text-[0.5625rem] font-black uppercase tracking-wider text-indigo-600">Aussage für das Kind</div>
                      <p className="mt-1 text-[0.75rem] font-semibold leading-relaxed text-indigo-950">{criterion.kindgerecht}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {renderPerspective(criterion.id, 'kind', childValue, childComment, criterion.label)}
                      {renderPerspective(criterion.id, 'lehrer', teacherValue, teacherComment, criterion.label)}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex flex-1 items-center gap-3 text-left"
            aria-expanded={historyExpanded}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-[1.0625rem] font-black text-slate-900">Elterngespräche</h3>
              <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-500">
                {meetings.length} {meetings.length === 1 ? 'Kontakt protokolliert' : 'Kontakte protokolliert'}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddMeeting(!showAddMeeting);
                setHistoryExpanded(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-[0.625rem] font-black uppercase tracking-wider text-white transition hover:bg-indigo-700"
            >
              <Plus size={13} /> Gespräch eintragen
            </button>
            <button
              type="button"
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
              aria-label={historyExpanded ? 'Gesprächshistorie schließen' : 'Gesprächshistorie öffnen'}
            >
              {historyExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {historyExpanded && (
          <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
            {showAddMeeting && (
              <form onSubmit={handleAddMeeting} className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/45 p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.5625rem] font-black uppercase tracking-wider text-slate-600">Anlass oder Thema</label>
                    <input
                      value={newMeetingThema}
                      onChange={event => setNewMeetingThema(event.target.value)}
                      placeholder="z. B. KEL-Gespräch oder Beratung"
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-[0.75rem] font-bold text-slate-900 outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.5625rem] font-black uppercase tracking-wider text-slate-600">Datum</label>
                    <input
                      type="date"
                      value={newMeetingDatum}
                      onChange={event => setNewMeetingDatum(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-[0.75rem] font-bold text-slate-900 outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[0.5625rem] font-black uppercase tracking-wider text-slate-600">Konkrete Vereinbarungen</label>
                  <textarea
                    value={newMeetingVereinbarung}
                    onChange={event => setNewMeetingVereinbarung(event.target.value)}
                    placeholder="Was wurde vereinbart, wer übernimmt was und bis wann?"
                    className="min-h-[90px] w-full rounded-xl border border-slate-300 bg-white p-3 text-[0.75rem] font-medium leading-relaxed text-slate-900 outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMeeting(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[0.625rem] font-black uppercase text-slate-700"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[0.625rem] font-black uppercase tracking-wider text-white hover:bg-indigo-700"
                  >
                    Protokoll speichern
                  </button>
                </div>
              </form>
            )}

            {meetings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-[0.75rem] font-semibold text-slate-500">
                Noch kein Elterngespräch protokolliert.
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map(meeting => (
                  <article key={meeting.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[0.8125rem] font-black text-slate-900">{meeting.thema}</h4>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[0.5625rem] font-black uppercase text-slate-500">
                          {formatDate(meeting.datum)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[0.75rem] font-medium leading-relaxed text-slate-600">
                        {meeting.vereinbarungen || 'Keine Vereinbarung dokumentiert.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      title="Gesprächsprotokoll löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/45 p-4">
        <Info className="mt-0.5 shrink-0 text-cyan-700" size={17} />
        <p className="text-[0.6875rem] font-semibold leading-relaxed text-cyan-900">
          Nur bewusst gesetzte Einschätzungen werden im KEL-Diagramm und in der Elternansicht verwendet. Leere Bereiche bleiben ohne Bewertung.
        </p>
      </div>
    </div>
  );
}
