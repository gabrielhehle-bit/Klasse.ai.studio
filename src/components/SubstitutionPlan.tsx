
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Printer, FileText, AlertCircle, Calendar, 
  Map as MapIcon, Users, Clock, Info, CheckCircle2,
  BookOpen, Heart, Coffee, ShieldAlert, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

export default function SubstitutionPlan() {
  const { app } = useApp();
  const [topic, setTopic] = useState('');
  const [remarks, setRemarks] = useState('');
  const [importantInfo, setImportantInfo] = useState('Allergien: Max (Nüsse), Lisa (Asthma)\nAbholer: Julia wird heute von der Tante abgeholt.');
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="py-4 space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end no-print">
        <div className="space-y-1">
          <h2 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Vertretungsplan-Generator</h2>
          <p className="text-slate-500 font-medium tracking-tight">
            Erstelle schnell eine Übersicht für deine Vertretung inkl. aller wichtigen Infos.
          </p>
        </div>
        <button 
          onClick={handlePrint}
          className="btn btn-primary h-14 px-8 rounded-2xl flex items-center gap-3 shadow-xl shadow-slate-900/10"
        >
          <Printer size={20} />
          Plan drucken
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start no-print">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Tag / Datum</label>
                <input 
                  type="text" 
                  className="input-field h-14" 
                  defaultValue={new Date().toLocaleDateString('de-AT')} 
                  onFocus={e => e.target.select()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Unterrichtsfach</label>
                <input 
                  type="text" 
                  className="input-field h-14" 
                  placeholder="z.B. Deutsch / Projektarbeit"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onFocus={e => e.target.select()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Lerninhalte & Ablauf</label>
              <textarea 
                className="input-field h-48 py-4 resize-none"
                placeholder="Was sollen die Kinder heute erarbeiten? Wo finden sie die Materialien?..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                onFocus={e => e.target.select()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Wichtige Hinweise (Allergien, Abholung, etc.)</label>
              <textarea 
                className="input-field h-32 py-4 resize-none text-rose-600 font-bold"
                value={importantInfo}
                onChange={e => setImportantInfo(e.target.value)}
                onFocus={e => e.target.select()}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-amber-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-amber-600/20">
              <h3 className="text-[1.25rem] leading-normal font-black mb-4 flex items-center gap-3">
                 <ShieldAlert size={24} />
                 Checkliste
              </h3>
              <ul className="space-y-4 text-[0.8125rem] font-medium opacity-90">
                 <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    <span>Sitzplan beigelegt/ausgedruckt?</span>
                 </li>
                 <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    <span>Klassenschlüssel liegt im Fach bereit?</span>
                 </li>
                 <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    <span>Material am Pult vorbereitet?</span>
                 </li>
                 <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    <span>Passwörter für PCs notiert?</span>
                 </li>
              </ul>
           </div>
        </div>
      </div>

      {/* PRINT AREA */}
      <div className="hidden print:block bg-white text-slate-950 font-sans p-0">
        <div className="border-b-4 border-slate-950 pb-8 mb-10 flex justify-between items-end">
           <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter">Vertretungsplan</h1>
              <p className="text-[1.25rem] leading-normal font-bold mt-2">{app.stufe}. Klasse {app.klassenbezeichnung} — Volksschule</p>
           </div>
           <div className="text-right">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Datum:</p>
              <p className="text-[1.5rem] leading-normal font-black">{new Date().toLocaleDateString('de-AT')}</p>
           </div>
        </div>

        <div className="grid grid-cols-3 gap-10 mb-12">
           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <div className="flex items-center gap-3 mb-3 text-slate-400">
                 <Users size={18} />
                 <span className="text-[0.625rem] font-black uppercase tracking-widest">Schüleranzahl</span>
              </div>
              <p className="text-[1.875rem] leading-tight font-black">{app.schueler.length}</p>
           </div>
           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <div className="flex items-center gap-3 mb-3 text-slate-400">
                 <Clock size={18} />
                 <span className="text-[0.625rem] font-black uppercase tracking-widest">Zeitrahmen</span>
              </div>
              <p className="text-[1.875rem] leading-tight font-black">Ganztägig</p>
           </div>
           <div className="bg-rose-50 p-6 rounded-3xl border border-rose-200">
              <div className="flex items-center gap-3 mb-3 text-rose-400">
                 <AlertCircle size={18} />
                 <span className="text-[0.625rem] font-black uppercase tracking-widest text-rose-600">Hinweise</span>
              </div>
              <p className="text-[1.125rem] leading-normal font-bold text-rose-700">Siehe unten</p>
           </div>
        </div>

        <div className="space-y-12">
           <section className="space-y-4">
              <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-wider flex items-center gap-4">
                 <div className="w-2 h-6 bg-slate-950" />
                 Unterrichtsinhalt: {topic || 'Heute laut Plan'}
              </h3>
              <div className="p-8 bg-white border-2 border-slate-100 rounded-[3rem] text-[1.25rem] leading-normal leading-relaxed whitespace-pre-wrap">
                 {remarks || 'Keine spezifischen Anweisungen hinterlegt.'}
              </div>
           </section>

           <section className="space-y-4">
              <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-wider flex items-center gap-4 text-rose-600">
                 <div className="w-2 h-6 bg-rose-600" />
                 Wichtige Besonderheiten
              </h3>
              <div className="p-8 bg-rose-50 border-2 border-rose-200 rounded-[3rem] text-[1.25rem] leading-normal font-bold text-rose-900 leading-relaxed whitespace-pre-wrap">
                 {importantInfo}
              </div>
           </section>

           <div className="grid grid-cols-2 gap-10">
              <section className="space-y-4">
                <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest flex items-center gap-3 text-slate-400">
                  <Coffee size={16} /> Pausenaufsicht / Mittag
                </h3>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem]">
                  <p className="font-bold">Standardmäßig im Klassenzimmer oder im Hof.</p>
                </div>
              </section>
              <section className="space-y-4">
                <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest flex items-center gap-3 text-slate-400">
                   <BookOpen size={16} /> Materialien
                </h3>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem]">
                   <p className="font-bold">Arbeitshefte, Kopien am Pult, Tafelmaterial.</p>
                </div>
              </section>
           </div>
        </div>

        <div className="mt-20 pt-10 border-t border-slate-100 text-center">
           <p className="text-slate-300 font-bold uppercase tracking-[0.3em] text-[0.625rem]">Erstellt mit Digitalem Klassenbuch Dashboard</p>
        </div>
      </div>
    </div>
  );
}
