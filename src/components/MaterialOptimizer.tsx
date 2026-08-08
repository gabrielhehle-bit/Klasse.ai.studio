
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClipboardList, Sparkles, Wand2, Copy, Check, RotateCcw, FileText, Search, Info, Archive, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askAI } from '../services/aiService';
import { useMaterialLibrary, calculateStorageSize } from './Materialbibliothek';
import { FAECHER_ALLE } from '../constants';

function AISaveButton({ content, context }: { content: string; context: string }) {
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
      titel: `KI-Check: ${context.substring(0, 30)}${context.length > 30 ? '...' : ''}`,
      beschreibung: `Optimiert am ${new Date().toLocaleDateString('de-DE')} via KI-Helfer.`,
      typ: 'notiz',
      inhaltText: content,
      faecher: fach ? [fach] : [],
      schulstufen: [stufe],
      tags: ['KI', 'Korrektur'],
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
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${isSaved ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
      >
        {isSaved ? <Check size={14} /> : <Save size={14} />}
        {isSaved ? 'In Bibliothek abgelegt' : 'In Mediathek'}
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
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-[0.625rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all mt-2"
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

export default function MaterialOptimizer() {
  const [text, setText] = useState('');
  const [focus, setFocus] = useState('allgemein');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const options = [
    { id: 'allgemein', label: 'Allgemein optimieren', desc: 'Flüssigkeit & Stil' },
    { id: 'kindgerecht', label: 'Kindgerechte Sprache', desc: 'Einfache Erklärungen' },
    { id: 'rechtschreibung', label: 'Rechtschreibung & Grammatik', desc: 'Fehlerkorrektur' },
    { id: 'kuerzen', label: 'Zusammenfassen / Kürzen', desc: 'Kompakter Inhalt' },
    { id: 'erweitern', label: 'Inhaltlich vertiefen', desc: 'Mehr Details / Beispiele' },
  ];

  const handleOptimize = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);

    const userPrompt = `
TEXT ZUM OPTIMIEREN:
"${text}"

FOKUS: ${options.find(o => o.id === focus)?.label}

Bitte optimiere den Text entsprechend den oben genannten System-Instruktionen für den Modus Korrektur/KI-Check.
`.trim();

    try {
      const optimizedText = await askAI('ki-korrektur', userPrompt);
      if (optimizedText) {
        setResult(optimizedText);
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
          <ClipboardList className="text-slate-600 shrink-0" size={28} />
          <h2 className="text-[1.5rem] leading-normal md:text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight uppercase">Material-Optimierung</h2>
        </div>
        <p className="text-slate-500 font-medium tracking-tight whitespace-pre-line font-serif italic text-[1rem] leading-normal md:text-[1.125rem] leading-normal">
          "Poliere deine Unterrichtsmaterialien, Aufgabenstellungen oder Eltern-Infos auf Knopfdruck."
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Originaltext einfügen</label>
              <textarea 
                className="input-field h-64 py-6 resize-none leading-relaxed"
                placeholder="Füge hier den Text ein, den du optimieren möchtest (Arbeitsblatt-Text, Anleitung, sachlicher Text)..."
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <div className="flex justify-between items-center px-1">
                 <span className="text-[0.625rem] font-bold text-slate-300">{text.length} Zeichen</span>
                 <button onClick={() => setText('')} className="text-[0.625rem] font-black uppercase text-slate-300 hover:text-red-400 transition-colors">Text löschen</button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Optimierungs-Fokus</label>
              <div className="grid grid-cols-1 gap-2">
                {options.map(o => (
                  <button 
                    key={o.id}
                    onClick={() => setFocus(o.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${focus === o.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg translate-x-1' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200'}`}
                  >
                    <div>
                      <div className="text-[0.75rem] font-black uppercase tracking-tight">{o.label}</div>
                      <div className={`text-[0.625rem] ${focus === o.id ? 'text-slate-400' : 'text-slate-400'}`}>{o.desc}</div>
                    </div>
                    {focus === o.id && <Check size={16} className="text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleOptimize}
              disabled={loading || !text.trim()}
              className="btn btn-primary w-full h-16 text-[0.8125rem] shadow-xl shadow-slate-900/20 bg-slate-900 hover:bg-black"
            >
              {loading ? (
                <>
                  <RotateCcw className="animate-spin" size={20} />
                  KI analysiert Text...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Text jetzt optimieren
                </>
              )}
            </button>
          </div>
          
          <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex gap-4">
             <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0"><Info size={20} /></div>
             <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed italic">
               Die KI prüft den Text nicht nur auf Fehler, sondern achtet auch auf didaktische Sinnhaftigkeit und eine zielgruppengerechte Ansprache.
             </p>
          </div>
        </div>

        {/* Optimiertes Ergebnis */}
        <div className={`transition-all duration-700 ${result ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 scale-[0.98] pointer-events-none'}`}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/5 flex flex-col min-h-[400px] lg:min-h-[600px] ">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md"><Sparkles size={16} /></div>
                <span className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-400">Optimierte Version</span>
              </div>
              <div className="flex gap-2">
                <AISaveButton content={result} context={text} />
                <button 
                  onClick={copyToClipboard}
                  className={`btn btn-sm h-10 px-4 rounded-xl transition-all ${copySuccess ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
                >
                  {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  {copySuccess ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
            </div>
            <div className="flex-1 p-10 text-[1rem] leading-[1.8] text-slate-800 whitespace-pre-wrap font-serif select-all scrollbar-hide overflow-y-auto max-h-[700px]">
                {result || 'Der optimierte Text erscheint hier nach der Analyse...'}
            </div>
            {result && (
               <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-[0.625rem] font-bold text-slate-300 uppercase tracking-widest">
                    <Check size={12} className="text-emerald-500" /> KI-Check abgeschlossen
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
