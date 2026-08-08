import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Scan, AlertCircle, BookOpen, CheckCircle2, 
  ChevronRight, Filter, Plus, Trash2, Lightbulb,
  Zap, BrainCircuit, Microscope
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ErrorType {
  id: string;
  label: string;
  category: 'mathematik' | 'deutsch';
  description: string;
  examples: string[];
  recommendations: string[];
}

const PRESET_ERRORS: ErrorType[] = [
  // MATHEMATIK
  {
    id: 'zehner-einer-dreher',
    label: 'Zehner-Einer-Dreher',
    category: 'mathematik',
    description: 'Systematisches Vertauschen von Zehnern und Einern beim Schreiben oder Lesen (z.B. 24 statt 42).',
    examples: ['Schreibt "Dreiundzwanzig" als 32', 'Liest 51 als Fünfzehn'],
    recommendations: ['Stellenwert-Tafel nutzen', 'Zehner-Stangen und Einer-Würfel physisch legen', 'Zahlen diktieren und visualisieren']
  },
  {
    id: 'null-als-platzhalter',
    label: 'Fehlender Null-Platzhalter',
    category: 'mathematik',
    description: 'Null wird in mehrstelligen Zahlen ausgelassen.',
    examples: ['105 -> 15', '2004 -> 24'],
    recommendations: ['Abakus-Übungen', 'Stellenwert-Schieber', 'Bündelungs-Spiele']
  },
  {
    id: 'ueberschreitung-fehler',
    label: 'Zehnerübergang-Unsicherheit',
    category: 'mathematik',
    description: 'Fehler treten gehäuft beim Überschreiten des Zehners/Hunderters auf.',
    examples: ['8 + 7 = 14', '42 - 5 = 38'],
    recommendations: ['Kraft der Fünf nutzen', 'Zerlegungen bis 10 automatisieren', 'Schrittweises Rechnen am Rechenrahmen']
  },
  {
    id: 'inversion-spiegelung',
    label: 'Ziffern-Spiegelung',
    category: 'mathematik',
    description: 'Ziffern werden spiegelverkehrt geschrieben (z.B. 3, 5, 7, 9).',
    examples: ['Schreibt 3 als E', 'Spiegelt die 6'],
    recommendations: ['Körperschreibweise (in die Luft)', 'Sandwanne nutzen', 'Startpunkt-Markierung setzen']
  },
  {
    id: 'analogie-fehler',
    label: 'Mangelnde Analogiebildung',
    category: 'mathematik',
    description: 'Zusammenhang zwischen kleinen und großen Aufgaben wird nicht erkannt.',
    examples: ['3+4=7 bekannt, aber 13+4 muss neu abgezählt werden', '10+6=16, aber 20+6 unklar'],
    recommendations: ['Analogie-Pärchen bilden', 'Zwergen- und Riesenaufgaben', 'Visuelle Stimmigkeit aufzeigen']
  },
  {
    id: 'multiplikation-konzept',
    label: 'Multiplikations-Verständnis',
    category: 'mathematik',
    description: 'Das Konzept der wiederholten Addition oder des Rechteckmodells wird nicht verstanden.',
    examples: ['Rechnet 3 * 4 als 3+4', 'Verliert den Überblick beim Malreihen-Sagen'],
    recommendations: ['Handlung mit Sprungseilen (3 Schritte à 4)', 'Mal-Winkel nutzen', 'Kernaufgaben (2x, 5x, 10x) zuerst festigen']
  },

  // DEUTSCH
  {
    id: 'lauttreue-rechtschreibung',
    label: 'Rein lautliche Rechtschreibung',
    category: 'deutsch',
    description: 'Keine Beachtung von Rechtschreibregeln, Schreibung erfolgt exakt so wie gehört.',
    examples: ['Boot -> Bot', 'Fahren -> Faren'],
    recommendations: ['Silbenklatschen intensivieren', 'Vokal-Detektiv: Kurz oder lang?', 'Arbeit mit dem Grundwortschatz']
  },
  {
    id: 'vokal-verwechslung',
    label: 'Vokal-/Umlaut-Verwechslung',
    category: 'deutsch',
    description: 'Ähnlich klingende Vokalen oder Umlaute werden vertauscht (u/o, e/ä).',
    examples: ['Hunde -> Honde', 'Mädchen -> Medchen'],
    recommendations: ['Ableitungsproben (Maus-Mäuse)', 'Artikulations-Check (Mundstellung)', 'Hörübungen mit Minimalpaaren']
  },
  {
    id: 'p-b-d-t-verwechslung',
    label: 'p/b oder d/t Verwechslung',
    category: 'deutsch',
    description: 'Schwierigkeiten bei der Unterscheidung von harten und weichen Verschlusslauten.',
    examples: ['Blumen -> Plumen', 'Tisch -> Disch'],
    recommendations: ['Hör-Training: Stimmhaft vs. stimmlos', 'Fingertest am Kehlkopf', 'Minimalpaare üben']
  },
  {
    id: 'optische-differenzierung',
    label: 'Optische Differenzierung (b/d)',
    category: 'deutsch',
    description: 'Verwechslung von Buchstaben, die sich nur durch die Raumlage unterscheiden.',
    examples: ['b statt d', 'p statt q'],
    recommendations: ['Körperschema-Übungen', 'Buchstaben in den Sand schreiben', 'Eselsbrücken (b hat den Bauch vorne)']
  },
  {
    id: 'dehnung-schaerfung',
    label: 'Dehnung & Schärfung (h, Doppelkonsonant)',
    category: 'deutsch',
    description: 'Fehler bei der Kennzeichnung von Vokallängen.',
    examples: ['Hase -> Haase', 'Hund -> Hunnd', 'Sonne -> Sone'],
    recommendations: ['Hörproben: Stop-Vokal vs. Fließ-Vokal', 'Silben-Häuschen Modell', 'Wortfamilien-Training']
  },
  {
    id: 'gross-kleinschreibung',
    label: 'Groß-/Kleinschreibung',
    category: 'deutsch',
    description: 'Systematische Fehler bei der Kennzeichnung von Nomen.',
    examples: ['der hund rennt', 'Das spielen macht Spaß'],
    recommendations: ['Artikelprobe (Begleiter)', 'Abstraktprobe (-ung, -heit, -keit)', 'Satzanfänge-Detektiv']
  },
  {
    id: 'konsonantenhaufung',
    label: 'Konsonantenhäufung/-auslassung',
    category: 'deutsch',
    description: 'Buchstaben in komplexen Konsonantengruppen werden vergessen.',
    examples: ['Wurst -> Wust', 'Schwimmen -> Schimmen'],
    recommendations: ['Lautgebärden nutzen', 'Deutlich-Sprech-Training', 'Wort-Bausteine legen']
  },
  {
    id: 'f-v-w-verwechslung',
    label: 'f/v/w-Unsicherheit',
    category: 'deutsch',
    description: 'Vertauschen der "f"-Laute.',
    examples: ['Vater -> Fater', 'Fisch -> Visch'],
    recommendations: ['Wörterlisten mit "Merke-V"', 'Sinnzusammenhänge klären (viel/fiel)', 'Visuelles Einprägen']
  },
  {
    id: 'lese-technik',
    label: 'Mechanische Lesetechnik',
    category: 'deutsch',
    description: 'Stockendes Lesen, mühsame Synthese, Wortgrenzen werden ignoriert.',
    examples: ['Buchstabierendes Lesen', 'Raten des Wortendes nach den ersten Buchstaben'],
    recommendations: ['Blitzlesen von Silben', 'Streichholz-Lesen', 'Lese-Tandems']
  }
];

export default function ErrorDetective() {
  const { app, setApp, setPage } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'mathematik' | 'deutsch'>('all');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);

  const students = app.schueler || [];
  const detectiveRecords = app.errorDetectiveRecords || [];

  const filteredErrors = PRESET_ERRORS.filter(error => {
    const matchesSearch = error.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          error.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || error.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleErrorForStudent = (studentId: string, errorId: string) => {
    const existing = detectiveRecords.find(r => r.studentId === studentId && r.errorId === errorId);
    
    let newRecords;
    if (existing) {
      newRecords = detectiveRecords.filter(r => !(r.studentId === studentId && r.errorId === errorId));
    } else {
      newRecords = [...detectiveRecords, {
        id: crypto.randomUUID(),
        studentId,
        errorId,
        date: new Date().toISOString(),
        resolved: false
      }];
    }
    
    setApp({ ...app, errorDetectiveRecords: newRecords });
  };

  const getActiveErrorsForStudent = (studentId: string) => {
    return detectiveRecords
      .filter(r => r.studentId === studentId && !r.resolved)
      .map(r => r.errorId);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 text-left">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-indigo-600 rounded-[1.25rem] shadow-xl shadow-indigo-200">
                <Microscope size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Detektiv-Check</h1>
                <p className="text-slate-500 font-bold flex items-center gap-2">
                  <Scan size={14} /> Systematische Fehleranalyse & Diagnostik
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-2xl text-[0.625rem] font-black uppercase tracking-wider transition-all border-2 ${selectedCategory === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
            >
              Alle
            </button>
            <button
              onClick={() => setSelectedCategory('mathematik')}
              className={`px-5 py-2.5 rounded-2xl text-[0.625rem] font-black uppercase tracking-wider transition-all border-2 ${selectedCategory === 'mathematik' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
            >
              Mathematik
            </button>
            <button
              onClick={() => setSelectedCategory('deutsch')}
              className={`px-5 py-2.5 rounded-2xl text-[0.625rem] font-black uppercase tracking-wider transition-all border-2 ${selectedCategory === 'deutsch' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
            >
              Deutsch
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Error Catalog */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                  type="text"
                  placeholder="Fehlermuster suchen (z.B. Zehner, Lautgetreu...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredErrors.map((error) => {
                  const isActive = activeErrorId === error.id;
                  return (
                    <motion.div
                      key={error.id}
                      layout
                      className={`group border-2 rounded-[2rem] transition-all cursor-pointer  ${isActive ? 'border-indigo-600 bg-indigo-50/20 ring-4 ring-indigo-500/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                      onClick={() => setActiveErrorId(isActive ? null : error.id)}
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4">
                            <div className={`p-3 rounded-2xl ${error.category === 'mathematik' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              <AlertCircle size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[0.5625rem] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${error.category === 'mathematik' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                  {error.category}
                                </span>
                              </div>
                              <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{error.label}</h3>
                              <p className="text-[0.75rem] leading-tight text-slate-400 font-bold mt-1 line-clamp-1">{error.description}</p>
                            </div>
                          </div>
                          <ChevronRight className={`text-slate-300 transition-transform ${isActive ? 'rotate-90 text-indigo-500' : ''}`} />
                        </div>

                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-6 pt-6 border-t border-slate-100 space-y-6 "
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <h4 className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 flex items-center gap-2">
                                    <Zap size={12} className="text-amber-500" /> Typische Beispiele
                                  </h4>
                                  <ul className="space-y-2">
                                    {error.examples.map((ex, i) => (
                                      <li key={i} className="flex gap-2 text-[0.75rem] leading-tight font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-amber-500 underline underline-offset-4 decoration-2 decoration-amber-200">"{ex}"</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="space-y-3">
                                  <h4 className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 flex items-center gap-2">
                                    <Lightbulb size={12} className="text-indigo-500" /> Handlungsempfehlung
                                  </h4>
                                  <ul className="space-y-2">
                                    {error.recommendations.map((rec, i) => (
                                      <li key={i} className="flex gap-2 text-[0.75rem] leading-tight font-bold text-slate-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                        <CheckCircle2 size={14} className="text-indigo-500 shrink-0" />
                                        <span>{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 flex items-center gap-2 text-indigo-600 bg-indigo-50 p-4 rounded-[1.5rem] border border-indigo-100">
                                  <BookOpen size={18} />
                                  <span className="text-[0.75rem] leading-tight font-black">Passende Fördermaterialien in der Bibliothek verfügbar</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Navigate to AI Assistant with specific context
                                    setPage('ki-helfer');
                                    // Note: In a real app we'd pass state, here we just navigate for now
                                  }}
                                  className="px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[0.75rem] leading-tight font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95"
                                >
                                  <BrainCircuit size={18} className="text-amber-400" />
                                  KI-Förderplan erstellen
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Student Assignment */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200 text-white space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <BrainCircuit size={20} className="text-white" />
                  </div>
                  <h2 className="text-[1.25rem] leading-normal font-black tracking-tight leading-none">Schüler-Check UP</h2>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[0.625rem] font-black tabular-nums">
                  {students.length}
                </div>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {students.map((student) => {
                  const studentErrors = getActiveErrorsForStudent(student.id);
                  const isSelected = selectedStudent === student.id;
                  
                  return (
                    <div 
                      key={student.id}
                      className={`group rounded-2xl transition-all cursor-pointer border-2 ${isSelected ? 'border-white bg-white/10 ring-4 ring-white/5' : 'border-white/5 hover:border-white/20'}`}
                      onClick={() => setSelectedStudent(isSelected ? null : student.id)}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-[0.75rem] leading-tight font-black text-white">{student.vorname} {student.nachname}</p>
                            {studentErrors.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {studentErrors.map(eid => {
                                  const err = PRESET_ERRORS.find(e => e.id === eid);
                                  return (
                                    <span key={eid} title={err?.label} className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  );
                                })}
                                <span className="text-[0.5rem] font-black text-white/40 uppercase tracking-widest ml-1">{studentErrors.length} Muster</span>
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="flex flex-col gap-2">
                              {activeErrorId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleErrorForStudent(student.id, activeErrorId);
                                  }}
                                  className={`p-2 rounded-xl transition-all ${studentErrors.includes(activeErrorId) ? 'bg-rose-500 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                                >
                                  {studentErrors.includes(activeErrorId) ? <Trash2 size={16} /> : <Plus size={16} />}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {!activeErrorId && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-[0.625rem] text-white/50 font-bold text-center leading-relaxed italic">
                  Wähle links ein Fehlermuster aus, um es einem Kind zuzuordnen.
                </div>
              )}
            </div>
            
            {/* Legend Box */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-200 space-y-4">
              <h4 className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400">Status</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                  <span className="text-[0.75rem] leading-tight font-bold text-slate-600">Auffälligkeit dokumentiert</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-[0.75rem] leading-tight font-bold text-slate-600">Behoben / Erledigt</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
