
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Sparkles, Send, Copy, RotateCcw, FileText, Check, Archive, Info, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askAI } from '../services/aiService';
import { useMaterialLibrary, calculateStorageSize } from './Materialbibliothek';
import Markdown from 'react-markdown';
import { FAECHER_ALLE } from '../constants';

function AISaveButton({ content, topic }: { content: string; topic: string }) {
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
      titel: (topic.length > 40 ? topic.substring(0, 37) + '...' : topic) || 'Elternbrief',
      beschreibung: `Generiert am ${new Date().toLocaleDateString('de-DE')} via KI-Helfer.`,
      typ: 'elternbrief',
      inhaltText: content,
      faecher: fach ? [fach] : [],
      schulstufen: [stufe],
      tags: ['KI', 'Elternbrief'],
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
        className={`btn btn-sm h-10 px-4 rounded-xl transition-all ${isSaved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}
      >
        {isSaved ? <Check size={16} /> : <Save size={16} />}
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

export default function EmailAssistant() {
  const [topic, setTopic] = useState('');
  const [points, setPoints] = useState('');
  const [tonality, setTonality] = useState('freundlich');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const generate = async () => {
    if (!topic || !points) return;
    setLoading(true);
    
    const userPrompt = `
ERSTELLE ELTERNKOMMUNIKATION:
THEMA: ${topic}
WICHTIGE PUNKTE:
${points}

TONALITÄT: ${tonality}

Erstelle auf Basis dieser Informationen eine angemessene, gut verständliche Elternkommunikation (z.B. Elternbrief, Mitteilungsheft-Eintrag, E-Mail).
Der Text sollte dabei helfen, Eltern optimal zu informieren oder das Kind zuhause zu fördern.
`.trim();

    try {
      const text = await askAI('ki-elternbrief', userPrompt);
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
      <div className="hidden">
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">
        {/* Left Side: Inputs */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Betreff / Thema</label>
              <input 
                type="text"
                placeholder="z.B. Einladung zum Elternabend, Ausflug in den Zoo..."
                className="input-field h-14"
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Wichtige Inhalte (Stichpunkte)</label>
              <textarea 
                className="input-field h-48 py-4 resize-none"
                placeholder="z.B. 
- Termin: 12.05., 18:00 Uhr
- Ort: Klassenzimmer 3b
- Thema: Schullandwoche"
                value={points}
                onChange={e => setPoints(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Tonalität</label>
              <div className="flex flex-wrap gap-2">
                {['höflich', 'freundlich', 'direkt', 'empathisch', 'sachlich'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setTonality(t)}
                    className={`px-5 py-2.5 rounded-full text-[0.75rem] font-black uppercase tracking-[0.1em] transition-all ${tonality === t ? 'bg-indigo-600 border border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={generate}
              disabled={loading || !topic || !points}
              className="btn w-full h-16 text-[0.8125rem] shadow-xl shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl"
            >
              {loading ? (
                <>
                  <RotateCcw className="animate-spin" size={20} />
                  Text wird generiert...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Entwurf erstellen
                </>
              )}
            </button>
          </div>

          <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 flex gap-4">
             <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0"><Check size={20} /></div>
             <p className="text-[0.75rem] text-blue-800/70 font-medium leading-relaxed italic">Unser AI-Modell berücksichtigt deine Tonalität und bereitet den Brief so vor, dass du ihn direkt in eine E-Mail oder ein PDF kopieren kannst.</p>
          </div>
        </div>

        {/* Right Side: Result */}
        <div className={`transition-all duration-500 ${result ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98] pointer-events-none'}`}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/5 flex flex-col min-h-[400px] lg:min-h-[600px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center"><FileText size={16} /></div>
                <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Generierter Entwurf</span>
              </div>
              <div className="flex items-center gap-2">
                <AISaveButton content={result} topic={topic} />
                <button 
                  onClick={copyToClipboard}
                  className={`btn btn-sm h-10 px-4 rounded-xl transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}
                >
                  {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  {copySuccess ? 'Kopieren' : 'Kopieren'}
                </button>
              </div>
            </div>
            <div className="flex-1 p-10 text-[1rem] leading-[1.8] text-slate-800 whitespace-pre-wrap font-serif select-all scrollbar-hide overflow-y-auto max-h-[600px] markdown-body">
                {result ? <Markdown>{result}</Markdown> : 'Gib links die Eckdaten ein und klicke auf "Entwurf erstellen"...'}
            </div>
            {result && (
               <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex justify-center">
                  <p className="text-[0.625rem] font-bold text-slate-300 uppercase tracking-widest">Bitte prüfe den Entwurf vor dem Versand auf Richtigkeit.</p>
               </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
