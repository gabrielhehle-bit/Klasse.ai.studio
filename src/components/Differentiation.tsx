
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wand2, Sparkles, Target, Layers, Copy, RotateCcw, PenTool, Check, Save, Archive, Info, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askAI } from '../services/aiService';
import { useMaterialLibrary, calculateStorageSize } from './Materialbibliothek';
import { FAECHER_ALLE } from '../constants';
import Markdown from 'react-markdown';
import FesteGruppen from './FesteGruppen';

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

    const title = topic ? (topic.length > 40 ? topic.substring(0, 37) + '...' : topic) : 'KI-Differenzierung';

    addMaterialFromAI({
      titel: title,
      beschreibung: `Generiert am ${new Date().toLocaleDateString('de-DE')} via KI-Helfer.`,
      typ: 'stundenentwurf',
      inhaltText: content,
      faecher: fach ? [fach] : [],
      schulstufen: [stufe],
      tags: ['KI', 'Differenzierung'],
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
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${isSaved ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
      >
        {isSaved ? <Check size={14} /> : <Save size={14} />}
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

export default function Differentiation() {
  const [topic, setTopic] = useState('');
  const [targetGroup, setTargetGroup] = useState('DaZ');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'ki' | 'gruppen'>('ki');

  const generate = async () => {
    if (!topic) return;
    setLoading(true);
    
    let targetPrompt = '';
    switch (targetGroup) {
      case 'DaZ':
        targetPrompt = 'Schüler mit Deutsch als Zweitsprache (DaZ) - einfacher Wortschatz, klare Sätze, visuelle Vorgaben.';
        break;
      case 'Förderbedarf':
        targetPrompt = 'Schüler mit erhöhtem Förderbedarf (SPF) - sehr reduzierte Komplexität, Fokus auf Basiskonzepte, stark geführte Aufgaben.';
        break;
      case 'Standard':
        targetPrompt = 'Schüler auf regulärem Klassenniveau - Standardanforderungen nach Lehrplan.';
        break;
      case 'Begabung':
        targetPrompt = 'Schüler mit besonderen Begabungen - Transferleistungen, offene Fragestellungen, kognitive Herausforderungen.';
        break;
    }

    const userPrompt = `
THEMA / KONTEXT: ${topic}
ZIELGRUPPE: ${targetPrompt}

Bitte erstelle differenzierte Arbeitsblätter, Texte oder Aufgabenstellungen exakt für diese Zielgruppe.
Füge – falls zutreffend – konkrete Hilfestellungen für die DaZ/Förderkinder hinzu.

WICHTIGSTE REGELN FÜR DIE AUSGABE:
- Die Aufgabe muss EXAKT 1 Seite einnehmen.
- Die Lösung (falls zutreffend) muss EXAKT 1 separate Seite einnehmen.
- Nutze am Ende der 1. Seite \`---\` oder HTML Page-Breaks zur sauberen Trennung, ABER schreibe NIEMALS "Hier abschneiden" oder ähnliche Trennlinienhinweise hin.
- Erzeuge KEINE "Schülerverifizierung" oder ähnliche Header.
- Lass alle Meta-Informationen wie "Nicht benötigte Wörter", "Fokus Differenzierung:", "Kreativaufgabe:" KOMPLETT weg! Liefere NUR den fertig formatierten Text / das Material.
`.trim();

    try {
      const text = await askAI('ki-differenzierung', userPrompt);
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
    <div className="h-full overflow-y-auto custom-scrollbar w-full flex flex-col">
      <div className="px-3 md:px-6 py-6 border-b border-slate-100 flex gap-4 overflow-x-auto no-scrollbar shrink-0">
        <button 
          onClick={() => setActiveMainTab('ki')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[0.75rem] font-black uppercase tracking-widest transition-all ${activeMainTab === 'ki' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          <Sparkles size={16} /> KI-Differenzierung
        </button>
        <button 
          onClick={() => setActiveMainTab('gruppen')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[0.75rem] font-black uppercase tracking-widest transition-all ${activeMainTab === 'gruppen' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          <Users size={16} /> Feste Gruppen
        </button>
      </div>

      <div className="flex-1 px-3 md:px-6 py-6 md:py-8 max-w-full xl:max-w-7xl mx-auto w-full">
        {activeMainTab === 'ki' ? (
          <div className="space-y-6 md:space-y-8">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Layers className="text-sky-600 shrink-0" size={28} />
                <h2 className="text-[1.5rem] leading-normal md:text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Differenzierung KI</h2>
              </div>
              <p className="text-slate-500 font-medium tracking-tight text-[0.8125rem] md:text-[0.9375rem]">
                Erstelle blitzschnell passende Aufgabenstellungen und adaptiere Materialien (DaZ, Förderbedarf).
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[400px_1fr] gap-6 md:gap-8 items-start">
              {/* Existing Form */}
              <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-900/5 space-y-8">
            <div className="space-y-3">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Grobthema / Kontext</label>
              <textarea 
                className="input-field h-40 py-4 resize-none"
                placeholder="z.B. Schriftliche Multiplikation mit zweistelligen Zahlen, oder: Der Wasserkreislauf (Evaporation, Kondensation)..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Zielgruppe auswählen</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'DaZ', label: 'Deutsch als Zweitsprache', desc: 'Sprachlich entlastet, visuelle Unterstützung' },
                  { id: 'Förderbedarf', label: 'Erhöhter Förderbedarf', desc: 'SPF, Reduzierte Komplexität, Basisfokus' },
                  { id: 'Standard', label: 'Reguläres Niveau', desc: 'Standardanforderungen nach Lehrplan' },
                  { id: 'Begabung', label: 'Begabtenförderung', desc: 'Transferaufgaben, Herausforderung' }
                ].map(l => (
                  <button 
                    key={l.id}
                    onClick={() => setTargetGroup(l.id)}
                    className={`p-4 rounded-2xl flex flex-col items-start transition-all border text-left ${targetGroup === l.id ? 'bg-sky-600 border-sky-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-sky-200'}`}
                  >
                    <span className="text-[0.75rem] font-black uppercase">{l.label}</span>
                    <span className={`text-[0.625rem] font-bold ${targetGroup === l.id ? 'text-sky-100' : 'text-slate-400'}`}>{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={generate}
              disabled={loading || !topic}
              className="btn w-full h-16 text-[0.8125rem] shadow-xl shadow-sky-500/20 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-2xl"
            >
              {loading ? (
                <>
                  <RotateCcw className="animate-spin" size={20} />
                  Aufgaben werden differenziert...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Aufgaben generieren
                </>
              )}
            </button>
          </div>
        </div>

        <div className={`transition-all duration-500 ${result ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98] pointer-events-none'}`}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/5 flex flex-col min-h-[400px] lg:min-h-[600px]">
             <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center"><PenTool size={16} /></div>
                  <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Differenzierte Aufgabenstellungen</span>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={copyToClipboard}
                    className={`btn btn-sm h-10 px-4 rounded-xl transition-all ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-900'}`}
                  >
                    {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                    {copySuccess ? 'Kopiert!' : 'Kopieren'}
                  </button>
                </div>
             </div>
             <div className="flex-1 p-10 text-[1rem] leading-[1.8] text-slate-800 scrollbar-hide overflow-y-auto max-h-[600px] markdown-body">
                {result ? <Markdown>{result}</Markdown> : 'Wähle links die Parameter aus und klicke auf "Aufgaben generieren"...'}
             </div>
             {result && (
               <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex justify-center gap-4">
                  <AISaveButton content={result} topic={topic} />
               </div>
             )}
          </div>
        </div>
      </div>
          </div>
        ) : (
          <FesteGruppen />
        )}
      </div>
    </div>
  );
}

