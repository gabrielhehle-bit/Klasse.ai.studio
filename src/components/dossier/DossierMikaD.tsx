import React, { useEffect, useMemo, useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Info,
  Save,
  Plus,
  ArrowRight,
  Clock,
  HeartHandshake
} from 'lucide-react';

interface DossierMikaDProps {
  student: Student;
  onNavigateTab?: (tab: string, extra?: any) => void;
}

export type MikaResult = 'ausreichend' | 'mangelhaft' | 'ungenuegend' | 'nicht erhoben';

const RESULTS: {
  id: Exclude<MikaResult, 'nicht erhoben'>;
  label: string;
  description: string;
  consequence: string;
  classes: string;
  dot: string;
}[] = [
  {
    id: 'ausreichend',
    label: 'Ausreichend',
    description: 'Die erhobene Deutschkompetenz reicht aus, um dem Regelunterricht zu folgen.',
    consequence: 'Ein Wechsel bzw. Verbleib im ordentlichen Status ist möglich. Keine gesonderte Deutschförderklasse erforderlich.',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    dot: 'bg-emerald-500'
  },
  {
    id: 'mangelhaft',
    label: 'Mangelhaft',
    description: 'Es besteht weiterer gezielter Deutschförderbedarf.',
    consequence: 'Zuweisung zu einem Deutschförderkurs oder begleitende Sprachförderung gemäß Schulorganisationsgesetz.',
    classes: 'border-amber-200 bg-amber-50 text-amber-950',
    dot: 'bg-amber-500'
  },
  {
    id: 'ungenuegend',
    label: 'Ungenügend',
    description: 'Es besteht erheblicher Deutschförderbedarf.',
    consequence: 'Einstufung als außerordentliche/r Schüler/in mit Zuweisung zu einer Deutschförderklasse.',
    classes: 'border-rose-200 bg-rose-50 text-rose-950',
    dot: 'bg-rose-500'
  }
];

const normalizeLegacyResult = (value?: string): MikaResult => {
  if (value === 'ausreichend' || value === 'mangelhaft' || value === 'ungenuegend' || value === 'nicht erhoben') return value;
  if (value === 'ordentlich' || value === '1') return 'ausreichend';
  if (value === '2') return 'mangelhaft';
  if (value === '3') return 'ungenuegend';
  return 'nicht erhoben';
};

export default function DossierMikaD({ student, onNavigateTab }: DossierMikaDProps) {
  const { app, setApp } = useApp();
  const profile = student.foerderprofil || {};
  const storedResult = normalizeLegacyResult(profile.mikaDStatus);
  const currentSchoolYear = app.schuljahr || '';
  const recommendedVersion = currentSchoolYear >= '2026/27' ? 'MIKA-D 2.0' : 'MIKA-D';

  const [selectedResult, setSelectedResult] = useState<MikaResult>(storedResult);
  const [assessmentDate, setAssessmentDate] = useState(profile.mikaDDatum || new Date().toISOString().split('T')[0]);
  const [version, setVersion] = useState<'MIKA-D' | 'MIKA-D 2.0'>(profile.mikaDVersion || recommendedVersion);
  const [note, setNote] = useState(profile.mikaDNotiz || '');
  const [saved, setSaved] = useState(false);
  const [showDocumentationForm, setShowDocumentationForm] = useState(false);

  useEffect(() => {
    setSelectedResult(normalizeLegacyResult(student.foerderprofil?.mikaDStatus));
    setAssessmentDate(student.foerderprofil?.mikaDDatum || new Date().toISOString().split('T')[0]);
    setVersion(student.foerderprofil?.mikaDVersion || recommendedVersion);
    setNote(student.foerderprofil?.mikaDNotiz || '');
    setSaved(false);
  }, [student.id, student.foerderprofil?.mikaDStatus, student.foerderprofil?.mikaDDatum, student.foerderprofil?.mikaDVersion, student.foerderprofil?.mikaDNotiz, recommendedVersion]);

  // Check diagnostic screenings related to MIKA-D or Sprachstand
  const mikaScreenings = useMemo(() => {
    const erhebungen = app.diagnostikErhebungen || [];
    return erhebungen
      .filter(e => e.schuelerId === student.id && (e.testId === 'mika-d' || (e as any).kategorie === 'sprache'))
      .sort((a, b) => new Date(b.datum || '').getTime() - new Date(a.datum || '').getTime());
  }, [app.diagnostikErhebungen, student.id]);

  // Determine relevance strictly without sensitive assumptions
  const isMikaRelevant = Boolean(
    (profile.mikaDStatus && profile.mikaDStatus !== 'nicht erhoben') ||
    student.daz === true ||
    (student as any).status === 'ao' ||
    student.espf === true ||
    mikaScreenings.length > 0
  );

  const currentResult = useMemo(
    () => RESULTS.find(result => result.id === storedResult),
    [storedResult]
  );

  const isDirty =
    selectedResult !== storedResult ||
    (selectedResult !== 'nicht erhoben' && assessmentDate !== (profile.mikaDDatum || '')) ||
    version !== (profile.mikaDVersion || recommendedVersion) ||
    note !== (profile.mikaDNotiz || '');

  const saveResult = () => {
    if (selectedResult !== 'nicht erhoben' && !assessmentDate) return;
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(existingStudent => existingStudent.id === student.id
        ? {
            ...existingStudent,
            foerderprofil: {
              ...existingStudent.foerderprofil,
              mikaDStatus: selectedResult,
              mikaDDatum: selectedResult === 'nicht erhoben' ? '' : assessmentDate,
              mikaDVersion: version,
              mikaDNotiz: selectedResult === 'nicht erhoben' ? '' : note.trim()
            }
          }
        : existingStudent)
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Calm empty state when MIKA-D is not relevant for this child
  if (!isMikaRelevant && !showDocumentationForm && storedResult === 'nicht erhoben') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200">
            <GraduationCap size={28} />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800">
            Keine MIKA-D Sprachstandsfeststellung erforderlich
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs font-normal leading-relaxed text-slate-500">
            Für {student.vorname} {student.nachname} liegt derzeit kein dokumentiertes MIKA-D-Ergebnis vor. MIKA-D wird ausschließlich zur Feststellung des Deutschförderbedarfs bei außerordentlichen Schülerinnen und Schülern herangezogen und ist keine allgemeine Fachnote.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setShowDocumentationForm(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Plus size={14} /> Sprachstandserhebung dokumentieren
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header with clear pedagogical boundary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-1.5 rounded-full bg-amber-600" />
            <h3 className="text-lg font-bold text-slate-900">Sprachstandsfeststellung (MIKA-D)</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Standardisiertes Messinstrument zur Feststellung des Deutschförderbedarfs – getrennt von den Fachnoten.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            <FileCheck2 size={13} className="text-slate-400" />
            {profile.mikaDVersion || recommendedVersion}
          </span>
        </div>
      </div>

      {/* Current Result Card */}
      <div className={`rounded-2xl border p-5 transition-all ${
        currentResult ? currentResult.classes : 'border-slate-200 bg-slate-50 text-slate-800'
      }`}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/80 border border-slate-200/40 shadow-xs">
              <GraduationCap size={24} className="text-slate-700" />
            </div>
            <div>
              <div className="text-[0.625rem] font-bold uppercase tracking-wider opacity-70">Aktueller Sprachstand</div>
              <h4 className="mt-0.5 text-xl font-black">
                {currentResult?.label || 'Nicht erhoben'}
              </h4>
              <p className="mt-1 text-xs leading-relaxed opacity-90 max-w-xl">
                {currentResult?.description || 'Für dieses Schulkind ist aktuell kein MIKA-D Ergebnis hinterlegt.'}
              </p>
            </div>
          </div>
          {storedResult !== 'nicht erhoben' && (
            <div className="shrink-0 rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <Calendar size={13} className="text-slate-400" />
                {profile.mikaDDatum ? new Date(`${profile.mikaDDatum}T00:00:00`).toLocaleDateString('de-AT') : 'Datum nicht erfasst'}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-slate-500">
                <FileCheck2 size={12} className="text-slate-400" />
                {profile.mikaDVersion || 'Standardversion'}
              </div>
            </div>
          )}
        </div>

        {/* Legal and pedagogical consequence */}
        {currentResult && (
          <div className="mt-4 border-t border-black/5 pt-3 text-xs leading-relaxed font-medium">
            <span className="font-bold">Pädagogische Folge: </span>
            {currentResult.consequence}
          </div>
        )}

        {/* Existing Note */}
        {profile.mikaDNotiz && (
          <div className="mt-2 text-xs opacity-80 italic">
            „{profile.mikaDNotiz}“
          </div>
        )}
      </div>

      {/* Requirement 16: Querverbindung zur Förderung bei Förderbedarf */}
      {(storedResult === 'mangelhaft' || storedResult === 'ungenuegend' || selectedResult === 'mangelhaft' || selectedResult === 'ungenuegend') && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <HeartHandshake className="mt-0.5 shrink-0 text-amber-700" size={18} />
            <div>
              <div className="text-xs font-bold text-amber-900">Sprachförderung im Förderprofil</div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Aufgrund des festgestellten Deutschförderbedarfs werden spezifische Maßnahmen und Förderziele im Förderbereich dokumentiert.
              </p>
            </div>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('foerderung')}
              className="inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition cursor-pointer"
            >
              Förderung öffnen <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* Requirement 15: Historische Erhebungen / Verlauf */}
      {mikaScreenings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-slate-500" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Erhebungsverlauf</h4>
          </div>
          <div className="space-y-2">
            {mikaScreenings.map((screening, idx) => (
              <div key={screening.id || idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span className="font-semibold text-slate-800">{screening.datum || 'Ohne Datum'}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{(screening as any).testName || screening.testId || 'MIKA-D Erhebung'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">
                    {(screening as any).rawScore !== undefined ? `${(screening as any).rawScore} Punkte` : (screening as any).stufe || (screening as any).status || `${screening.rohwert ?? screening.ergebniswert ?? 'Erfasst'}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          <CheckCircle2 size={16} /> Das MIKA-D Ergebnis wurde im Förderprofil gespeichert.
        </div>
      )}

      {/* Documentation Form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-900">Sprachstandsfeststellung erfassen / aktualisieren</h4>
          <p className="mt-1 text-xs text-slate-500">
            Wähle das offizielle Ergebnisblatt-Ergebnis und bestätige das Datum vor dem Speichern.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {RESULTS.map(result => {
            const selected = selectedResult === result.id;
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => setSelectedResult(result.id)}
                className={`rounded-xl border p-3.5 text-left transition cursor-pointer ${
                  selected ? `${result.classes} ring-2 ring-slate-400/20` : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                aria-pressed={selected}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${result.dot}`} />
                    <span className="text-xs font-bold">{result.label}</span>
                  </div>
                  {selected && <CheckCircle2 size={15} />}
                </div>
                <p className="mt-1.5 text-[0.6875rem] leading-relaxed opacity-80">{result.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">Erhebungsdatum</label>
            <input
              type="date"
              value={assessmentDate}
              onChange={event => setAssessmentDate(event.target.value)}
              disabled={selectedResult === 'nicht erhoben'}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-amber-600 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">Verwendete Version</label>
            <select
              value={version}
              onChange={event => setVersion(event.target.value as 'MIKA-D' | 'MIKA-D 2.0')}
              disabled={selectedResult === 'nicht erhoben'}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-amber-600 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="MIKA-D 2.0">MIKA-D 2.0</option>
              <option value="MIKA-D">MIKA-D (bisherige Version)</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">Sachliche Notiz zur Erhebung (optional)</label>
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            disabled={selectedResult === 'nicht erhoben'}
            placeholder="z. B. organisatorische Hinweise oder durchgeführte Module"
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium leading-relaxed text-slate-900 outline-none focus:border-amber-600 disabled:bg-slate-50"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setSelectedResult('nicht erhoben')}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Als nicht erhoben markieren
          </button>
          <button
            type="button"
            onClick={saveResult}
            disabled={!isDirty || (selectedResult !== 'nicht erhoben' && !assessmentDate)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <Save size={14} /> Ergebnis speichern
          </button>
        </div>
      </section>

      {/* Official basis info */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 shrink-0 text-slate-500" size={16} />
          <div className="text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Gesetzliche Grundlage: </span>
            MIKA-D dient der bundesweit einheitlichen Sprachstandsfeststellung gemäß § 8 lit. h SchOG zur Zuweisung in Deutschförderklassen oder Deutschförderkurse. Es erfolgt keine künstliche Berechnung oder Vermischung mit regulären Unterrichtsnoten.
            <div className="mt-1.5">
              <a
                href="https://www.iqs.gv.at/themen/nationale-kompetenzerhebung/mika-d"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:underline"
              >
                Offizielle Fachinformationen des IQS <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
