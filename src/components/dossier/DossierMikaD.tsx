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
  Save
} from 'lucide-react';

interface DossierMikaDProps {
  student: Student;
}

type MikaResult = 'ausreichend' | 'mangelhaft' | 'ungenuegend' | 'nicht erhoben';

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
    description: 'Die erhobene Deutschkompetenz reicht aus, um dem Unterricht zu folgen.',
    consequence: 'Ein Wechsel beziehungsweise eine Aufnahme in den ordentlichen Status ist möglich.',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    dot: 'bg-emerald-500'
  },
  {
    id: 'mangelhaft',
    label: 'Mangelhaft',
    description: 'Es besteht weiterer Deutschförderbedarf.',
    consequence: 'Die schulische Maßnahme richtet sich nach dem bisherigen Status und den geltenden Bestimmungen.',
    classes: 'border-amber-200 bg-amber-50 text-amber-950',
    dot: 'bg-amber-500'
  },
  {
    id: 'ungenuegend',
    label: 'Ungenügend',
    description: 'Es besteht erheblicher Deutschförderbedarf.',
    consequence: 'Die weitere Förderung und schulrechtliche Folge sind nach den geltenden Vorgaben festzulegen.',
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

export default function DossierMikaD({ student }: DossierMikaDProps) {
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

  useEffect(() => {
    setSelectedResult(normalizeLegacyResult(student.foerderprofil?.mikaDStatus));
    setAssessmentDate(student.foerderprofil?.mikaDDatum || new Date().toISOString().split('T')[0]);
    setVersion(student.foerderprofil?.mikaDVersion || recommendedVersion);
    setNote(student.foerderprofil?.mikaDNotiz || '');
    setSaved(false);
  }, [student.id, student.foerderprofil?.mikaDStatus, student.foerderprofil?.mikaDDatum, student.foerderprofil?.mikaDVersion, student.foerderprofil?.mikaDNotiz, recommendedVersion]);

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

  return (
    <div className="flex h-full flex-col space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-2 rounded-full bg-orange-500" />
          <h3 className="text-[1.5rem] font-black tracking-tight text-slate-900">MIKA-D Ergebnis</h3>
        </div>
        <p className="ml-5 mt-1 text-[0.75rem] font-semibold text-slate-500">
          Dokumentation einer tatsächlich durchgeführten Sprachstandsfeststellung – keine freie pädagogische Einschätzung.
        </p>
      </div>

      <div className={`rounded-[1.75rem] border p-5 ${
        currentResult ? currentResult.classes : 'border-slate-200 bg-slate-50 text-slate-800'
      }`}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="text-[0.625rem] font-black uppercase tracking-widest opacity-70">Aktuell gespeichert</div>
              <h4 className="mt-1 text-[1.25rem] font-black">
                {currentResult?.label || 'Nicht erhoben'}
              </h4>
              <p className="mt-1 text-[0.75rem] font-semibold">
                {currentResult?.description || 'Es ist kein MIKA-D Ergebnis dokumentiert.'}
              </p>
            </div>
          </div>
          {storedResult !== 'nicht erhoben' && (
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-[0.6875rem] font-bold">
              <div className="flex items-center gap-1.5"><Calendar size={13} /> {profile.mikaDDatum ? new Date(`${profile.mikaDDatum}T00:00:00`).toLocaleDateString('de-AT') : 'Datum fehlt'}</div>
              <div className="mt-1 flex items-center gap-1.5"><FileCheck2 size={13} /> {profile.mikaDVersion || 'Altdaten – Version nicht erfasst'}</div>
            </div>
          )}
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[0.75rem] font-bold text-emerald-800">
          <CheckCircle2 size={17} /> Das MIKA-D Ergebnis wurde im Förderprofil und Schülerdossier gespeichert.
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-7">
        <div className="mb-5">
          <h4 className="text-[1rem] font-black text-slate-900">Ergebnis dokumentieren</h4>
          <p className="mt-1 text-[0.6875rem] font-semibold text-slate-500">
            Wähle das Ergebnis aus dem offiziellen Ergebnisblatt und kontrolliere das Erhebungsdatum vor dem Speichern.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {RESULTS.map(result => {
            const selected = selectedResult === result.id;
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => setSelectedResult(result.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected ? `${result.classes} ring-2 ring-offset-2 ring-slate-400/30` : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                aria-pressed={selected}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${result.dot}`} />
                    <span className="text-[0.8125rem] font-black">{result.label}</span>
                  </div>
                  {selected && <CheckCircle2 size={16} />}
                </div>
                <p className="mt-2 text-[0.6875rem] font-semibold leading-relaxed opacity-80">{result.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">Erhebungsdatum</label>
            <input
              type="date"
              value={assessmentDate}
              onChange={event => setAssessmentDate(event.target.value)}
              disabled={selectedResult === 'nicht erhoben'}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-[0.75rem] font-bold text-slate-900 outline-none focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">Verwendete Version</label>
            <select
              value={version}
              onChange={event => setVersion(event.target.value as 'MIKA-D' | 'MIKA-D 2.0')}
              disabled={selectedResult === 'nicht erhoben'}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-[0.75rem] font-bold text-slate-900 outline-none focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="MIKA-D 2.0">MIKA-D 2.0</option>
              <option value="MIKA-D">MIKA-D (bisherige Version)</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">Sachliche Notiz zur Erhebung (optional)</label>
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            disabled={selectedResult === 'nicht erhoben'}
            placeholder="z. B. verwendete Module oder organisatorische Hinweise – keine freie Umdeutung des Ergebnisses"
            className="min-h-[82px] w-full rounded-xl border border-slate-300 bg-white p-3 text-[0.75rem] font-medium leading-relaxed text-slate-900 outline-none focus:border-orange-500 disabled:bg-slate-100"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => setSelectedResult('nicht erhoben')}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[0.625rem] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
          >
            Als nicht erhoben markieren
          </button>
          <button
            type="button"
            onClick={saveResult}
            disabled={!isDirty || (selectedResult !== 'nicht erhoben' && !assessmentDate)}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-[0.625rem] font-black uppercase tracking-wider text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={14} /> Ergebnis speichern
          </button>
        </div>
      </section>

      {selectedResult !== 'nicht erhoben' && (
        <section className={`rounded-[1.5rem] border p-5 ${RESULTS.find(result => result.id === selectedResult)?.classes}`}>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 shrink-0" size={18} />
            <div>
              <h4 className="text-[0.75rem] font-black">Einordnung des ausgewählten Ergebnisses</h4>
              <p className="mt-1 text-[0.6875rem] font-semibold leading-relaxed">
                {RESULTS.find(result => result.id === selectedResult)?.consequence}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50/55 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0 text-cyan-700" size={18} />
          <div>
            <h4 className="text-[0.75rem] font-black text-cyan-950">Offizielle Grundlage</h4>
            <p className="mt-1 text-[0.6875rem] font-semibold leading-relaxed text-cyan-900">
              MIKA-D dient der standardisierten Feststellung, ob die Deutschkompetenz für die Teilnahme am Unterricht ausreicht oder zusätzlicher Förderbedarf besteht. Ab dem Schuljahr 2026/27 ersetzt MIKA-D 2.0 das bisherige Instrument.
            </p>
            <a
              href="https://www.iqs.gv.at/themen/nationale-kompetenzerhebung/mika-d"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-wider text-cyan-800 underline"
            >
              Informationen des IQS <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
