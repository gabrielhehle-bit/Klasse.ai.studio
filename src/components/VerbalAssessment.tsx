
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, User, RefreshCw, Copy, Check, FileText, BookOpen, Archive, Info, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askAI } from '../services/aiService';
import { FAECHER_ALLE } from '../constants';
import { berechne } from '../lib/GradeUtils';
import { useMaterialLibrary, calculateStorageSize } from './Materialbibliothek';
import Markdown from 'react-markdown';

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
      titel: `Beurteilung: ${studentName}`,
      beschreibung: `Generiert am ${new Date().toLocaleDateString('de-DE')} via KI-Helfer.`,
      typ: 'beurteilung',
      inhaltText: content,
      faecher: fach ? [fach] : [],
      schulstufen: [stufe],
      tags: ['KI', 'Beurteilung', studentName],
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

export default function VerbalAssessment() {
  const { app } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subjects, setSubjects] = useState('Deutsch, Mathematik, Sachunterricht');
  const [focus, setFocus] = useState('Besonderes Engagement, Lernfortschritt, Sozialverhalten');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const student = app.schueler.find(s => s.id === selectedStudentId);

  const generate = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    
    // Gather some context about the student
    let gradeValues: number[] = [];
    FAECHER_ALLE.forEach(fach => {
      ['1', '2'].forEach(sem => {
        const grade = berechne(app, selectedStudentId, fach, sem);
        if (grade !== null) gradeValues.push(grade);
      });
    });

    const avgGrade = gradeValues.length > 0 
      ? (gradeValues.reduce((acc, curr) => acc + curr, 0) / gradeValues.length).toFixed(1)
      : 'Keine Noten';
      
    const studentInfo = `${student?.vorname} ${student?.nachname}, ${app.stufe}. Schulstufe. Durchschnittsnote: ${avgGrade}.`;
    
    const userPrompt = `
SCHÜLER: ${studentInfo}
FÄCHER/BEREICHE: ${subjects}
FOKUS/SCHWERPUNKTE: ${focus}

Bitte erstelle eine wertschätzende verbale Beurteilung.
`.trim();

    try {
      const text = await askAI('ki-beurteilung', userPrompt);
      if (text) {
        setResult(text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar w-full">
      <div className="px-3 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 max-w-full xl:max-w-7xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <BookOpen className="text-emerald-600 shrink-0" size={28} />
          <h2 className="text-[1.5rem] leading-normal md:text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Verbale Beurteilung KI</h2>
        </div>
        <p className="text-slate-500 font-medium tracking-tight whitespace-pre-line text-[0.8125rem] md:text-[0.9375rem]">
          Erstelle wertschätzende und differenzierte Zeugnistexte auf Basis deiner Schülerdaten.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">
        {/* Settings Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Schüler/in auswählen</label>
              <select 
                className="input-field h-14"
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
              >
                <option value="">Bitte wählen...</option>
                {[...app.schueler].sort((a,b) => a.nachname.localeCompare(b.nachname)).map(s => (
                  <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Fächer / Bereiche</label>
              <input 
                type="text"
                className="input-field h-14"
                value={subjects}
                onChange={e => setSubjects(e.target.value)}
                placeholder="z.B. Deutsch, Mathematik..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Fokus / Schwerpunkte</label>
              <textarea 
                className="input-field h-32 py-4 resize-none"
                value={focus}
                onChange={e => setFocus(e.target.value)}
                placeholder="z.B. Besondere Stärken in der Rechtschreibung, Verbesserungsbedarf beim Kopfrechnen..."
              />
            </div>

            <button 
              onClick={generate}
              disabled={loading || !selectedStudentId}
              className="btn btn-primary w-full h-16 text-[0.8125rem] shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Text wird formuliert...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Beurteilung generieren
                </>
              )}
            </button>
          </div>

          <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50 flex gap-4">
             <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0"><Sparkles size={20} /></div>
             <p className="text-[0.75rem] text-emerald-800/70 font-medium leading-relaxed italic">
               Die KI nutzt vorhandene Noten und Verhaltensnotizen (falls vorhanden), um ein stimmiges Gesamtbild zu entwerfen.
             </p>
          </div>
        </div>

        {/* Result Area */}
        <div className={`transition-all duration-500 ${result ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98] pointer-events-none'}`}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/5 flex flex-col min-h-[400px] lg:min-h-[500px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><FileText size={16} /></div>
                <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Vorschlagtext</span>
              </div>
              <div className="flex gap-2">
                <AISaveButton content={result} studentName={student ? `${student.vorname} ${student.nachname}` : 'Schüler'} />
                <button 
                  onClick={copyToClipboard}
                  className={`btn btn-sm h-10 px-4 rounded-xl transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}
                >
                  {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  {copySuccess ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
            </div>
            <div className="flex-1 p-10 text-[1rem] leading-[1.8] text-slate-800 whitespace-pre-wrap font-serif select-all scrollbar-hide overflow-y-auto max-h-[500px] markdown-body">
                {result ? <Markdown>{result}</Markdown> : 'Wähle einen Schüler aus und klicke auf "Beurteilung generieren"...'}
            </div>
            {result && (
               <div className="p-6 border-t border-slate-50 bg-slate-50/30">
                  <p className="text-[0.625rem] font-bold text-slate-300 uppercase tracking-widest text-center">
                    Dieser Text dient als Entwurf und sollte pädagogisch geprüft werden.
                  </p>
               </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
