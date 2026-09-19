
import React, { useState } from 'react';
import { logObservation } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, RefreshCw, Check, BookOpen, Archive, Info, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askAI } from '../services/aiService';
import { FAECHER_ALLE } from '../constants';
import { berechne } from '../lib/GradeUtils';
import { useMaterialLibrary, calculateStorageSize } from './Materialbibliothek';

function AISaveButton({ content, studentName }: { content: string; studentName: string }) {
  const { app } = useApp();
  const { addMaterialFromAI } = useMaterialLibrary();
  const [isSaved, setIsSaved] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [fach, setFach] = useState('');
  const [stufe, setStufe] = useState<number>(app.stufe || 1);

  const storageMB = calculateStorageSize(app.materialien || []);
  const isStorageFull = storageMB > 4.8;

  const handleSave = () => {
    if (isStorageFull) return;

    addMaterialFromAI({
      titel: `Leistungsfeedback: ${studentName}`,
      beschreibung: `Generiert am ${new Date().toLocaleDateString('de-DE')} via KI-Helfer.`,
      typ: 'beurteilung',
      inhaltText: content,
      faecher: fach ? [fach] : [],
      schulstufen: [stufe],
      tags: ['KI', 'Leistungsfeedback', studentName],
      kiGeneriert: true,
      erstelltAm: new Date().toISOString()
    }, 'KI-Helfer');

    setIsSaved(true);
    setShowOverlay(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (isStorageFull) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[0.625rem] font-bold text-rose-500 bg-rose-50 rounded-xl border border-rose-100">
        <Info size={12} />
        Speicher voll
      </div>
    );
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setShowOverlay(true)}
        disabled={isSaved}
        className={`btn btn-sm h-10 px-4 rounded-xl transition-all ${isSaved ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}
      >
        {isSaved ? <Check size={16} /> : <Save size={16} />}
        {isSaved ? 'In Bibliothek abgelegt' : 'In Mediathek speichern'}
      </button>

      <AnimatePresence>
        {showOverlay && (
          <>
            <div className="fixed inset-0 z-[300]" onClick={() => setShowOverlay(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full right-0 mb-2 p-5 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 w-72 z-[301] text-slate-900"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Archive size={16} />
                </div>
                <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Material kategorisieren</div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400 ml-1">Fach wählen</label>
                  <select 
                    value={fach}
                    onChange={(e) => setFach(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl text-[0.75rem] leading-tight font-bold outline-none border border-slate-100 focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="">Allgemein / Kein Fach</option>
                    {FAECHER_ALLE.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400 ml-1">Schulstufe</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(s => (
                      <button
                        key={s}
                        onClick={() => setStufe(s)}
                        className={`py-2 rounded-xl text-[0.625rem] font-black border transition-all ${stufe === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                      >
                        {s}.
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl text-[0.625rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 font-black hover:scale-[1.02] transition-all mt-2"
                >
                  Endgültig speichern
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


/** Shared editor: shorter learning feedback from Gradebook/Dossier, or a separate
 * teacher-reviewed verbal-assessment draft on the legacy 'verbal' route.
 * No student names or automatic behavioural records are included in AI input.
 */
export default function VerbalAssessment({
  initialStudentId,
  initialSubject,
  mode = 'feedback',
  onBack,
}: {
  initialStudentId?: string;
  initialSubject?: string;
  mode?: 'feedback' | 'formal';
  onBack?: () => void;
} = {}) {
  const { app, setApp } = useApp();
  const { showToast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() => initialSubject ? [initialSubject] : []);
  const [focus, setFocus] = useState('');
  const [hasCopiedObservations, setHasCopiedObservations] = useState(false);
  const [reviewedObservations, setReviewedObservations] = useState(false);
  const [result, setResult] = useState('');
  const [resultStudentId, setResultStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedInDossier, setSavedInDossier] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const requestRef = React.useRef(0);
  const isFormal = mode === 'formal';
  const student = app.schueler.find(s => s.id === selectedStudentId);
  const subjectOptions = [...new Set([...(app.faecher?.length ? app.faecher : FAECHER_ALLE), ...(initialSubject ? [initialSubject] : [])])];
  const observations = (app.notes || []).filter(n =>
    n.schuelerId === selectedStudentId &&
    n.quelle !== 'Leistungsfeedback' &&
    n.quelle !== 'Verbale Beurteilung' &&
    Boolean(n.inhalt?.trim())
  ).slice(0, 30);

  React.useEffect(() => {
    requestRef.current += 1;
    setSelectedStudentId(initialStudentId || '');
    setSelectedSubjects(initialSubject ? [initialSubject] : []);
    setFocus('');
    setReviewedObservations(false);
    setHasCopiedObservations(false);
    setResult('');
    setResultStudentId('');
    setSavedInDossier(false);
    setLoading(false);
  }, [app.activeClassId, initialStudentId, initialSubject, mode]);

  React.useEffect(() => () => { requestRef.current += 1; }, []);

  const changeStudent = (id: string) => {
    requestRef.current += 1;
    setSelectedStudentId(id);
    setFocus('');
    setHasCopiedObservations(false);
    setReviewedObservations(false);
    setResult('');
    setResultStudentId('');
    setSavedInDossier(false);
    setLoading(false);
  };

  const copyObservationIntoEditor = (note: { datum: string; inhalt: string }) => {
    // The teacher sees and edits the original text before explicitly submitting it.
    // Never silently transmit journal entries or assume they are anonymised.
    requestRef.current += 1;
    setLoading(false);
    setFocus(previous => [previous.trim(), note.inhalt.trim()].filter(Boolean).join('\n'));
    setResultStudentId('');
    setHasCopiedObservations(true);
    setReviewedObservations(false);
    setResult('');
    setSavedInDossier(false);
  };

  const toggleSubject = (fach: string) => {
    requestRef.current += 1;
    setLoading(false);
    setResultStudentId('');
    setSelectedSubjects(previous => previous.includes(fach)
      ? previous.filter(entry => entry !== fach)
      : [...previous, fach]);
    setResult('');
    setSavedInDossier(false);
  };

  const generate = async () => {
    if (!student || loading || (hasCopiedObservations && !reviewedObservations)) return;
    if (!selectedSubjects.length && !focus.trim()) {
      showToast('Bitte mindestens ein Fach oder eine eigene Beobachtung auswählen.', 'error');
      return;
    }
    const requestId = ++requestRef.current;
    const studentIdAtStart = student.id;
    setLoading(true);
    setResult('');
    setSavedInDossier(false);
    const performanceLines = selectedSubjects.map(fach => {
      const semester = (key: '1' | '2') => {
        const manual = app.noten?.[studentIdAtStart]?.[fach]?.[key]?.endnote;
        if (manual !== undefined && manual !== null && String(manual).trim()) {
          return 'manuell eingetragene Endnote ' + String(manual);
        }
        const calculated = berechne(app, studentIdAtStart, fach, key);
        return calculated === null ? 'keine Daten' : 'berechneter Leistungswert ' + calculated.toFixed(2);
      };
      return '- ' + fach + ': 1. Semester ' + semester('1') + '; 2. Semester ' + semester('2');
    });
    const prompt = [
      'KIND-ALIAS: Kind A',
      'SCHULSTUFE: ' + (app.stufe || 'nicht angegeben'),
      'FACHBEZOGENE LEISTUNGSDATEN:',
      performanceLines.length ? performanceLines.join('\n') : '- Keine fachbezogenen Leistungsdaten ausgewählt.',
      'BEOBACHTUNGEN / GEWÜNSCHTER FOKUS DER LEHRPERSON:',
      focus.trim() || '- Keine Beobachtungen angegeben.',
      'AUFGABE:',
      isFormal
        ? 'Formuliere einen sachlichen Entwurf für eine verbale Beurteilung für die Lehrperson. Keine rechtlich verbindliche Zeugnisbeurteilung oder automatische Notenentscheidung.'
        : 'Formuliere ein kurzes, konkretes und wertschätzendes Leistungsfeedback für die Lehrperson.',
      'Behaupte keine Fortschritte, Fähigkeiten, Eigenschaften oder Verhaltensweisen, die nicht aus den angegebenen Daten hervorgehen. Bei fehlender Datengrundlage benenne die Lücke statt sie zu füllen. Keine Note vorschlagen, kein fachübergreifendes Gesamturteil.',
    ].join('\n\n');
    try {
      const text = await askAI('ki-beurteilung', prompt);
      if (requestRef.current !== requestId) return;
      if (text) {
        setResult(text);
        setResultStudentId(studentIdAtStart);
      }
    } catch (err) {
      if (requestRef.current === requestId) {
        showToast(err instanceof Error ? err.message : 'Feedback konnte nicht erstellt werden.', 'error');
      }
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  };

  const saveToDossier = () => {
    if (!result.trim() || !student || student.id !== resultStudentId || savedInDossier) return;
    // logObservation uses existing encrypted, class-local notes/journal persistence.
    // Saved texts show up in this child's Dossier → Beobachtungen & Verlauf.
    logObservation(setApp, student.id, result.trim(), 'Notiz', isFormal ? 'Verbale Beurteilung' : 'Leistungsfeedback');
    setSavedInDossier(true);
    showToast('Entwurf im Schülerdossier unter Beobachtungen & Verlauf gespeichert.', 'success');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      showToast('Kopieren nicht möglich. Bitte Text manuell markieren.', 'error');
    }
  };

  const canSave = Boolean(result.trim() && student && resultStudentId === student.id);
  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar">
      <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 md:px-6">
        <header className="space-y-2">
          {onBack && <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">← Zurück</button>}
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900"><BookOpen className="text-emerald-600" />{isFormal ? 'Verbale Beurteilung' : 'Leistungsfeedback'}</h2>
          <p className="text-sm text-slate-600">{isFormal ? 'Entwurf für eine umfassendere verbale Beurteilung – du prüfst und entscheidest selbst.' : 'Kurze Rückmeldung aus ausgewählten Leistungsdaten und deinen Beobachtungen.'}</p>
        </header>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div>
              <label htmlFor="feedback-student" className="mb-2 block text-xs font-bold text-slate-600">Kind</label>
              <select id="feedback-student" className="input-field w-full" value={selectedStudentId}
                disabled={Boolean(initialStudentId)}
                onChange={event => changeStudent(event.target.value)}>
                <option value="">Bitte wählen …</option>
                {[...app.schueler].sort((a,b) => a.nachname.localeCompare(b.nachname, 'de')).map(s =>
                  <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                )}
              </select>
            </div>
            <fieldset>
              <legend className="mb-2 text-xs font-bold text-slate-600">Fächer auswählen – nur angekreuzte Fächer werden verwendet</legend>
              <div className="flex flex-wrap gap-2">
                {subjectOptions.map(fach => <label key={fach} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={selectedSubjects.includes(fach)} onChange={() => toggleSubject(fach)} />
                  {fach}
                </label>)}
              </div>
            </fieldset>
            {student && observations.length > 0 && (
              <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-bold text-slate-700">Vorhandene Beobachtungen ansehen und bewusst übernehmen</summary>
                <p className="my-2 text-xs text-slate-600">Nur auf Klick wird der Text ins bearbeitbare Feld kopiert. Entferne andere Namen und sensible Angaben vor der KI-Anfrage.</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {observations.map(note => <button key={note.id} type="button" onClick={() => copyObservationIntoEditor(note)}
                    className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-left text-xs text-slate-700">
                    <span className="block font-bold">{note.datum?.slice(0, 10) || 'Beobachtung'} · Übernehmen</span>
                    <span className="line-clamp-2">{note.inhalt}</span>
                  </button>)}
                </div>
              </details>
            )}
            <div>
              <label htmlFor="feedback-observations" className="mb-2 block text-xs font-bold text-slate-600">Eigene Beobachtungen / gewünschter Fokus</label>
              <textarea id="feedback-observations" className="input-field min-h-32 w-full resize-y p-3" value={focus}
                onChange={event => { requestRef.current += 1; setLoading(false); setFocus(event.target.value); setReviewedObservations(false); setResult(''); setResultStudentId(''); setSavedInDossier(false); }}
                placeholder="Konkrete Beobachtungen – keine Namen, Kontaktdaten oder Gesundheitsangaben eingeben." />
            </div>
            {hasCopiedObservations && <label className="flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={reviewedObservations} onChange={event => setReviewedObservations(event.target.checked)} />
              Ich habe den übernommenen Text geprüft und fremde Namen sowie sensible Angaben entfernt.
            </label>}
            <p className="text-xs text-amber-800">An die KI gehen nur „Kind A“, ausgewählte Fachwerte und der Text im Beobachtungsfeld. Inhalte dieses Feldes werden nicht automatisch anonymisiert; bitte vor dem Senden prüfen. Es wird keine Note festgelegt.</p>
            <button type="button" onClick={generate}
              disabled={!student || loading || (hasCopiedObservations && !reviewedObservations)}
              className="btn btn-primary w-full bg-emerald-600 py-4 text-sm font-bold text-white disabled:opacity-50">
              {loading ? <><RefreshCw size={17} className="animate-spin" /> Text wird formuliert …</> : <><Sparkles size={17} /> {isFormal ? 'Beurteilungsentwurf formulieren' : 'Feedback formulieren'}</>}
            </button>
          </section>
          <section className="flex min-h-96 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <h3 className="mb-2 text-sm font-black text-slate-900">Entwurf zum Bearbeiten</h3>
            <p className="mb-4 text-xs text-slate-500">Erst nach deiner Prüfung ausdrücklich im Schülerdossier speichern.</p>
            <textarea aria-label="Feedback-Entwurf bearbeiten" value={result} disabled={!canSave && !result}
              onChange={event => { setResult(event.target.value); setSavedInDossier(false); }}
              placeholder="Kind auswählen, Fächer ankreuzen oder konkrete Beobachtungen eingeben und Feedback formulieren."
              className="min-h-72 w-full flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={saveToDossier} disabled={!canSave || savedInDossier}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{savedInDossier ? 'Im Dossier gespeichert' : 'Im Schülerdossier speichern'}</button>
              <button type="button" onClick={copyToClipboard} disabled={!canSave}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">{copySuccess ? 'Kopiert' : 'Kopieren'}</button>
              {canSave && <AISaveButton content={result} studentName={student ? student.vorname + ' ' + student.nachname : 'Kind'} />}
            </div>
            <p className="mt-4 text-xs text-slate-500">Dieser Text ist ein überprüfbarer Entwurf. Die pädagogische und rechtliche Beurteilung bleibt bei der Lehrperson.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
