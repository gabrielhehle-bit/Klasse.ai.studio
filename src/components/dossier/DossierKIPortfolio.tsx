import React, { useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import {
  AlertCircle, BarChart3, BookOpenCheck, CalendarDays, CheckCircle2,
  ClipboardList, FileText, Heart, Loader2, MessageSquareText, RefreshCcw,
  Sparkles, Stethoscope, Target, Trash2
} from 'lucide-react';
import { Student } from '../../types';
import { FAECHER_ALLE } from '../../constants';
import { useApp } from '../../context/AppContext';
import { generatePortfolioSummary } from '../../services/aiService';
import {
  getStudentAttendanceSummary,
  getStudentGradeSummary,
  getStudentNotes
} from '../../lib/studentMetrics';
import {
  getDiagnosticTestName,
  getValidStudentDiagnostics,
  isDiagnosticAlert
} from '../../lib/diagnosticData';
import {
  loadEncryptedStorageItem,
  removeStorageItem,
  saveEncryptedStorageItem
} from '../../lib/secureStorageService';
import { getActiveVaultKey } from '../../lib/vaultStorage';

interface DossierKIPortfolioProps {
  student: Student;
  semester?: '1' | '2';
  onSemesterChange?: (semester: '1' | '2') => void;
}

const formatDate = (value?: string | number) => {
  if (!value) return 'Datum nicht erfasst';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('de-AT');
};

const getNoteText = (note: any) =>
  note?.inhalt || note?.notiz || note?.text || note?.titel || 'Eintrag ohne Beschreibung';

export default function DossierKIPortfolio({ student, semester, onSemesterChange }: DossierKIPortfolioProps) {
  const { app } = useApp();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioStyle, setPortfolioStyle] = useState('Ausgewogen & professionell');
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>('1');

  useEffect(() => {
    setSelectedSemester('1');
  }, [semester]);

  const subjects = FAECHER_ALLE.filter(subject => !app.faecher || app.faecher.includes(subject));
  const grades = getStudentGradeSummary(app, student.id, subjects, selectedSemester);
  const attendance = getStudentAttendanceSummary(app, student.id);
  const notes = getStudentNotes(app, student.id);
  const diagnostics = getValidStudentDiagnostics(app, student.id)
    .sort((a: any, b: any) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime());
  const diagnosticAlerts = diagnostics.filter(isDiagnosticAlert);

  const latestKel: any = useMemo(() => [...(app.kelGespraeche || [])]
    .filter(item => item.schuelerId === student.id)
    .sort((a, b) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime())[0],
  [app.kelGespraeche, student.id]);

  const kelRatingsCount = latestKel
    ? new Set([
        ...Object.keys(latestKel.selbsteinschaetzungKind || {}).filter(
          key => latestKel.selbsteinschaetzungKind?.[key]?.wert !== undefined
        ),
        ...Object.keys(latestKel.einschaetzungLehrperson || {}).filter(
          key => latestKel.einschaetzungLehrperson?.[key]?.wert !== undefined
        )
      ]).size
    : 0;

  const personalGoals = (app.schuelerGoals || [])
    .filter((goal: any) => goal.schuelerId === student.id && goal.status === 'aktiv');
  const supportGoals = (student.foerderprofil?.foerderziele || [])
    .filter(goal => goal.status === 'offen' || goal.status === 'in Arbeit');
  const linkedDiagnosticIds = new Set(
    supportGoals.map(goal => goal.diagnostikErhebungId).filter(Boolean)
  );
  const unaddressedDiagnosticAlerts = diagnosticAlerts.filter(entry => !linkedDiagnosticIds.has(entry.id));
  const openGoals = [...personalGoals, ...supportGoals];
  const strengths = student.foerderprofil?.staerken || [];
  const supportNeeds = student.foerderprofil?.foerderbedarfBereiche || [];
  const supportMeasures = student.foerderprofil?.massnahmen || [];
  const linkedSupportGoalIds = new Set(
    supportMeasures.map(measure => measure.zielId).filter(Boolean)
  );
  const uncoveredSupportGoals = supportGoals.filter(goal => !linkedSupportGoalIds.has(goal.id));
  const unlinkedMeasures = supportMeasures.filter(measure => !measure.zielId);
  const dueMeasureReviews = supportMeasures.filter(measure =>
    measure.kontrollDatum &&
    measure.wirksamkeit === 'unklar' &&
    new Date(`${measure.kontrollDatum}T23:59:59`).getTime() < Date.now()
  );
  const portfolioEntries = student.portfolio || [];

  const sourceAreas = [
    { label: 'Noten', count: grades.gradedSubjects, ready: grades.hasData, icon: BarChart3 },
    { label: 'Anwesenheit', count: attendance.recordedDays, ready: attendance.hasData, icon: CalendarDays },
    { label: 'Beobachtungen', count: notes.length, ready: notes.length > 0, icon: MessageSquareText },
    { label: 'Diagnostik', count: diagnostics.length, ready: diagnostics.length > 0, icon: Stethoscope },
    { label: 'KEL-Bereiche', count: kelRatingsCount, ready: kelRatingsCount > 0, icon: BookOpenCheck },
    { label: 'Ziele', count: openGoals.length, ready: openGoals.length > 0, icon: Target }
  ];
  const completedAreas = sourceAreas.filter(area => area.ready).length;
  const hasSourceData = completedAreas > 0 || strengths.length > 0 || supportNeeds.length > 0 || portfolioEntries.length > 0;

  const nextStep = unaddressedDiagnosticAlerts.length > 0
    ? `${unaddressedDiagnosticAlerts.length} noch nicht zugeordnete ${unaddressedDiagnosticAlerts.length === 1 ? 'Diagnostik-Erhebung' : 'Diagnostik-Erhebungen'} pädagogisch prüfen.`
    : unlinkedMeasures.length > 0
      ? `${unlinkedMeasures.length} ${unlinkedMeasures.length === 1 ? 'Maßnahme' : 'Maßnahmen'} einem konkreten Förderziel zuordnen.`
      : dueMeasureReviews.length > 0
        ? `Die Wirksamkeit von ${dueMeasureReviews.length === 1 ? 'einer fälligen Maßnahme' : `${dueMeasureReviews.length} fälligen Maßnahmen`} überprüfen und dokumentieren.`
        : uncoveredSupportGoals.length > 0
          ? `Für ${uncoveredSupportGoals.length === 1 ? 'das offene Förderziel' : `die ${uncoveredSupportGoals.length} offenen Förderziele`} eine konkrete Unterstützung festlegen.`
    : openGoals.length > 0
      ? `Den Fortschritt bei ${openGoals.length === 1 ? 'dem offenen Ziel' : `den ${openGoals.length} offenen Zielen`} überprüfen und mit einer Beobachtung belegen.`
      : notes.length === 0
        ? 'Eine konkrete pädagogische Beobachtung erfassen, damit die Entwicklung nachvollziehbar beginnt.'
        : !attendance.hasData
          ? 'Anwesenheitsdaten erfassen, damit Fehlzeiten sachlich einbezogen werden können.'
          : 'Die vorhandenen Daten prüfen und daraus ein beobachtbares nächstes Lernziel ableiten.';

  useEffect(() => {
    let active = true;
    const cacheKey = `ki_portfolio_summary_${student.id}_${selectedSemester}`;
    const loadCachedDraft = async () => {
      const vaultKey = getActiveVaultKey();
      const cached = await loadEncryptedStorageItem<string>(cacheKey, vaultKey);
      if (!active) return;
      setAiSummary(cached || null);
      setError(null);

      // Transparent migration of a legacy plaintext cache to the encrypted cache format.
      if (cached && vaultKey) {
        await saveEncryptedStorageItem(cacheKey, cached, vaultKey);
      }
    };
    void loadCachedDraft().catch(() => {
      if (active) {
        setAiSummary(null);
        setError('Ein früherer KI-Entwurf konnte nicht sicher geladen werden.');
      }
    });
    return () => { active = false; };
  }, [student.id, selectedSemester]);

  const buildPromptData = () => {
    const performanceText = grades.hasData
      ? grades.subjectGrades.map(item => `${item.subject}: ${item.value.toFixed(2)}`).join('\n')
      : 'Keine Noten vorhanden.';
    const meetingText = latestKel
      ? [
          latestKel.vereinbarungen ? `Vereinbarungen: ${latestKel.vereinbarungen}` : '',
          `Bewertete KEL-Bereiche: ${kelRatingsCount}`
        ].filter(Boolean).join('\n')
      : 'Keine KEL-Daten vorhanden.';
    const observationText = notes.length > 0
      ? notes.slice(0, 8).map(note => `${formatDate(note.datum || note.timestamp)}: ${getNoteText(note)}`).join('\n')
      : 'Keine Beobachtungen vorhanden.';
    const attendanceText = attendance.hasData
      ? `${attendance.recordedDays} erfasste Tage; ${attendance.excused} entschuldigte und ${attendance.unexcused} unentschuldigte Fehlstunden.`
      : 'Keine Anwesenheitsdaten vorhanden.';
    const supportText = [
      strengths.length ? `Stärken: ${strengths.join(', ')}` : '',
      supportNeeds.length ? `Förderbereiche: ${supportNeeds.join(', ')}` : '',
      openGoals.length
        ? `Aktive Ziele: ${openGoals.map((goal: any) => goal.zielText || goal.ziel).filter(Boolean).join('; ')}`
        : '',
      supportMeasures.length
        ? `Maßnahmen: ${supportMeasures.map(measure => {
            const goal = supportGoals.find(item => item.id === measure.zielId);
            return [
              measure.bezeichnung || 'Maßnahme',
              goal ? `für Ziel "${goal.ziel}"` : 'ohne Zielzuordnung',
              measure.kontrollDatum ? `Prüftermin ${formatDate(measure.kontrollDatum)}` : '',
              `Wirksamkeit ${measure.wirksamkeit}`
            ].filter(Boolean).join(' · ');
          }).join('; ')}`
        : '',
      diagnostics.length
        ? `Diagnostik: ${diagnostics.map((entry: any) => `${getDiagnosticTestName(entry.testId, app.diagnostikTests || [])} am ${formatDate(entry.datum)}${isDiagnosticAlert(entry) ? ' – pädagogisch prüfen' : ''}`).join('; ')}`
        : ''
    ].filter(Boolean).join('\n') || 'Kein Förderprofil und keine Diagnostik vorhanden.';
    return { performanceText, meetingText, observationText, attendanceText, supportText };
  };

  const generateAiDraft = async () => {
    if (!hasSourceData) return;
    setLoading(true);
    setError(null);
    try {
      const data = buildPromptData();
      const result = await generatePortfolioSummary(
        `${student.vorname} ${student.nachname}`,
        data.performanceText,
        data.meetingText,
        data.observationText,
        data.attendanceText,
        data.supportText,
        portfolioStyle
      );
      if (!result || /fehler|api.?key|nicht eingerichtet/i.test(result)) {
        throw new Error('KI nicht verfügbar');
      }
      setAiSummary(result);
      const vaultKey = getActiveVaultKey();
      if (!vaultKey) {
        throw new Error('Tresor ist nicht entsperrt');
      }
      await saveEncryptedStorageItem(`ki_portfolio_summary_${student.id}_${selectedSemester}`, result, vaultKey);
    } catch {
      setError('Die KI ist nicht eingerichtet oder momentan nicht erreichbar. Die sachliche Datenübersicht bleibt vollständig verfügbar.');
    } finally {
      setLoading(false);
    }
  };

  const clearAiDraft = () => {
    removeStorageItem(`ki_portfolio_summary_${student.id}_${selectedSemester}`);
    setAiSummary(null);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-2 rounded-full bg-purple-500" />
            <h3 className="text-[1.5rem] font-black tracking-tight text-slate-900">Pädagogische Entwicklungsübersicht</h3>
          </div>
          <p className="ml-5 mt-1 text-[0.75rem] font-semibold text-slate-500">
            Sachliche Zusammenfassung aus tatsächlich gespeicherten Dossierdaten. Eine KI-Formulierung ist nur eine optionale Ergänzung.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-[1.75rem] border border-purple-200 bg-purple-50/55 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[0.625rem] font-black uppercase tracking-widest text-purple-700">Datengrundlage</div>
              <div className="mt-1 text-[1.375rem] font-black text-purple-950">{completedAreas} von {sourceAreas.length} Bereichen befüllt</div>
              <p className="mt-1 text-[0.6875rem] font-semibold text-purple-800">Es werden keine fehlenden Informationen geschätzt.</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[0.875rem] font-black text-purple-700 shadow-sm">
              {Math.round((completedAreas / sourceAreas.length) * 100)}%
            </div>
          </div>
        </div>
        <div className={`rounded-[1.75rem] border p-5 ${hasSourceData ? 'border-emerald-200 bg-emerald-50/55' : 'border-amber-200 bg-amber-50/55'}`}>
          <div className="flex items-start gap-3">
            {hasSourceData
              ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={19} />
              : <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={19} />}
            <div>
              <div className={`text-[0.75rem] font-black ${hasSourceData ? 'text-emerald-950' : 'text-amber-950'}`}>
                {hasSourceData ? 'Auswertung möglich' : 'Noch keine Auswertung möglich'}
              </div>
              <p className={`mt-1 text-[0.6875rem] font-semibold leading-relaxed ${hasSourceData ? 'text-emerald-800' : 'text-amber-800'}`}>
                {hasSourceData ? 'Die folgenden Aussagen stammen direkt aus gespeicherten Einträgen.' : 'Beginne mit einer Beobachtung, Note, Diagnose oder einem Ziel.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {sourceAreas.map(area => {
          const Icon = area.icon;
          return (
            <div key={area.label} className={`rounded-2xl border p-4 ${area.ready ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'}`}>
              <Icon size={17} className={area.ready ? 'text-purple-600' : 'text-slate-400'} />
              <div className="mt-2 text-[0.625rem] font-black uppercase tracking-wider text-slate-500">{area.label}</div>
              <div className={`mt-0.5 text-[1.125rem] font-black ${area.ready ? 'text-slate-900' : 'text-slate-400'}`}>
                {area.ready ? area.count : '–'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><BarChart3 size={17} className="text-blue-600" /><h4 className="text-[0.875rem] font-black text-slate-900">Lernstand · Schuljahr</h4></div>
          {grades.hasData ? (
            <div className="space-y-2">
              {grades.subjectGrades.map(item => (
                <div key={item.subject} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="text-[0.75rem] font-bold text-slate-700">{item.subject}</span>
                  <span className="text-[0.75rem] font-black tabular-nums text-slate-900">{item.value.toFixed(2)}</span>
                </div>
              ))}
              <p className="pt-1 text-[0.625rem] font-semibold text-slate-500">Berechnete Werte aus der Notenmappe; keine pädagogische Interpretation.</p>
            </div>
          ) : <p className="text-[0.75rem] font-semibold text-slate-500">Noch keine Leistungsdaten vorhanden.</p>}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><MessageSquareText size={17} className="text-amber-600" /><h4 className="text-[0.875rem] font-black text-slate-900">Letzte Beobachtungen</h4></div>
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.slice(0, 3).map((note: any, index: number) => (
                <div key={note.id || `${note.timestamp}-${index}`} className="border-l-2 border-amber-300 pl-3">
                  <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">{formatDate(note.datum || note.timestamp)}</div>
                  <p className="mt-1 text-[0.75rem] font-medium leading-relaxed text-slate-700">{getNoteText(note)}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-[0.75rem] font-semibold text-slate-500">Noch keine pädagogische Beobachtung dokumentiert.</p>}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><Stethoscope size={17} className="text-cyan-600" /><h4 className="text-[0.875rem] font-black text-slate-900">Diagnostik</h4></div>
          {diagnostics.length > 0 ? (
            <div className="space-y-2">
              {diagnostics.slice(0, 4).map((entry: any) => {
                const linkedGoal = supportGoals.find(goal => goal.diagnostikErhebungId === entry.id);
                return (
                  <div key={entry.id} className={`rounded-xl border p-3 ${
                    linkedGoal ? 'border-emerald-200 bg-emerald-50' : isDiagnosticAlert(entry) ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.75rem] font-black text-slate-800">{getDiagnosticTestName(entry.testId, app.diagnostikTests || [])}</span>
                      <span className="text-[0.5625rem] font-bold text-slate-500">{formatDate(entry.datum)}</span>
                    </div>
                    <p className={`mt-1 text-[0.625rem] font-semibold ${
                      linkedGoal ? 'text-emerald-700' : isDiagnosticAlert(entry) ? 'text-rose-700' : 'text-slate-500'
                    }`}>
                      {linkedGoal
                        ? `In Förderziel übernommen: ${linkedGoal.ziel}`
                        : isDiagnosticAlert(entry) ? 'Ergebnis pädagogisch prüfen.' : 'Erhebung dokumentiert.'}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-[0.75rem] font-semibold text-slate-500">Noch keine diagnostische Erhebung vorhanden.</p>}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><Target size={17} className="text-emerald-600" /><h4 className="text-[0.875rem] font-black text-slate-900">Ziele & Vereinbarungen</h4></div>
          {openGoals.length > 0 || latestKel?.vereinbarungen ? (
            <div className="space-y-2">
              {openGoals.slice(0, 4).map((goal: any) => (
                <div key={goal.id} className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span className="text-[0.75rem] font-semibold leading-relaxed text-emerald-950">{goal.zielText || goal.ziel}</span>
                </div>
              ))}
              {latestKel?.vereinbarungen && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                  <div className="text-[0.5625rem] font-black uppercase tracking-wider text-indigo-600">Letzte KEL-Vereinbarung</div>
                  <p className="mt-1 text-[0.75rem] font-semibold leading-relaxed text-indigo-950">{latestKel.vereinbarungen}</p>
                </div>
              )}
            </div>
          ) : <p className="text-[0.75rem] font-semibold text-slate-500">Noch kein aktives Ziel oder keine Vereinbarung vorhanden.</p>}
        </section>
      </div>

      {(strengths.length > 0 || supportNeeds.length > 0 || supportMeasures.length > 0 || portfolioEntries.length > 0) && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><Heart size={17} className="text-rose-600" /><h4 className="text-[0.875rem] font-black text-slate-900">Förderprofil & Portfolio</h4></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Dokumentierte Stärken</div><p className="mt-1 text-[0.75rem] font-semibold text-slate-700">{strengths.length ? strengths.join(', ') : 'Keine eingetragen'}</p></div>
            <div><div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Förderbereiche</div><p className="mt-1 text-[0.75rem] font-semibold text-slate-700">{supportNeeds.length ? supportNeeds.join(', ') : 'Keine eingetragen'}</p></div>
            <div>
              <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Förderkette</div>
              <p className="mt-1 text-[0.75rem] font-semibold text-slate-700">
                {supportMeasures.length} Maßnahmen · {supportMeasures.length - unlinkedMeasures.length} mit Ziel · {portfolioEntries.length} Portfolio-Einträge
              </p>
            </div>
          </div>
          {supportMeasures.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {supportMeasures.slice(0, 4).map(measure => {
                const goal = supportGoals.find(item => item.id === measure.zielId);
                return (
                  <div key={measure.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[0.75rem] font-black text-slate-800">{measure.bezeichnung || 'Maßnahme'}</span>
                      <span className="text-[0.5625rem] font-black uppercase text-slate-500">
                        Wirksamkeit: {measure.wirksamkeit}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.625rem] font-semibold text-slate-600">
                      {goal ? `Ziel: ${goal.ziel}` : 'Noch keinem Förderziel zugeordnet'}
                      {measure.kontrollDatum ? ` · Prüftermin: ${formatDate(measure.kontrollDatum)}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="rounded-[1.75rem] border border-cyan-200 bg-cyan-50/55 p-5">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 shrink-0 text-cyan-700" size={19} />
          <div><div className="text-[0.75rem] font-black text-cyan-950">Nächster sinnvoller Schritt</div><p className="mt-1 text-[0.75rem] font-semibold leading-relaxed text-cyan-900">{nextStep}</p></div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-purple-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 shrink-0 text-purple-600" size={19} />
            <div>
              <h4 className="text-[0.875rem] font-black text-slate-900">Optionale KI-Formulierung</h4>
              <p className="mt-1 text-[0.6875rem] font-semibold leading-relaxed text-slate-500">Erstellt einen Textentwurf aus den oben sichtbaren Daten. Der Entwurf muss fachlich geprüft werden.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={portfolioStyle} onChange={event => setPortfolioStyle(event.target.value)} disabled={!hasSourceData || loading} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[0.6875rem] font-bold text-slate-700 disabled:opacity-50" aria-label="Stil der KI-Formulierung">
              <option>Ausgewogen & professionell</option><option>Aufbauend & motivierend</option><option>Sachlich & kurz</option><option>Sehr formell</option>
            </select>
            <button onClick={generateAiDraft} disabled={!hasSourceData || loading} className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-[0.625rem] font-black uppercase tracking-wider text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              {aiSummary ? 'Entwurf aktualisieren' : 'KI-Entwurf erstellen'}
            </button>
          </div>
        </div>
        {!hasSourceData && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[0.6875rem] font-semibold text-amber-800">Die KI-Formulierung bleibt deaktiviert, bis mindestens ein belastbarer Dossierbereich befüllt ist.</p>}
        {error && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[0.6875rem] font-semibold text-amber-800">{error}</p>}
        {aiSummary && (
          <div className="mt-5 rounded-[1.5rem] border border-purple-200 bg-purple-50/35 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><div className="text-[0.625rem] font-black uppercase tracking-widest text-purple-700">KI-Entwurf – fachlich prüfen</div><p className="mt-1 text-[0.625rem] font-semibold text-purple-800">Nicht automatisch als fertige Beurteilung übernehmen.</p></div>
              <button onClick={clearAiDraft} className="rounded-lg border border-purple-200 bg-white p-2 text-purple-500 transition hover:bg-rose-50 hover:text-rose-600" title="KI-Entwurf löschen" aria-label="KI-Entwurf löschen"><Trash2 size={14} /></button>
            </div>
            <div className="prose prose-sm max-w-none text-slate-700"><Markdown>{aiSummary}</Markdown></div>
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 text-[0.625rem] font-semibold text-slate-500">
        <FileText size={13} /> Diese Übersicht aktualisiert sich automatisch mit den Dossierdaten.
      </div>
    </div>
  );
}
