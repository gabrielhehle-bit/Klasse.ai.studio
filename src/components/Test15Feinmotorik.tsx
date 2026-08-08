import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Save, AlertTriangle, CheckCircle2, Scissors, HelpCircle, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number; // count of gelingt gut (out of 3)
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

interface FeinmotorikTaskItem {
  id: string;
  category: string;
  taskTitle: string;
  instructions: string;
  successCriteria: string;
}

export const Test15Feinmotorik: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  
  // Results map: taskId -> 'Gelingt gut' | 'Gelingt teilweise' | 'Gelingt nicht'
  const [assessments, setAssessments] = useState<Record<string, 'Gelingt gut' | 'Gelingt teilweise' | 'Gelingt nicht'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [globalComment, setGlobalComment] = useState<string>('');

  const gradeTasksList = useMemo((): FeinmotorikTaskItem[] => {
    if (grade === 1) {
      return [
        {
          id: 'ausschneiden',
          category: 'Ausschneiden',
          taskTitle: 'Einfache Formen schneiden',
          instructions: 'Lass das Kind ein zuvor stark aufgezeichnetes Viereck oder einen Kreis aus Tonpapier entlang einer breiten schwarzen Konturlinie ausschneiden.',
          successCriteria: 'Ausschneiden gelingt ohne nennenswertes Abweichen von der Konturlinie (max. 5mm Abweichung). Keine zackigen Risse.'
        },
        {
          id: 'falten',
          category: 'Falten',
          taskTitle: 'Blatt mittig falten',
          instructions: 'Das Kind soll ein quadratisches Papier genau einmal in der Mitte Ecke auf Ecke falten.',
          successCriteria: 'Die Ecken treffen mit minimalem Versatz aufeinander (unter 3mm), die Kante wird mit dem Fingernagel glattgestrichen.'
        },
        {
          id: 'greifen_kneten',
          category: 'Greifen & Kneten',
          taskTitle: 'Knetkügelchen rollen',
          instructions: 'Das Kind knetet aus kleineren Plastilin-Portionen erbsengroße Kugeln rein im Pinzetten-Griff (Daumen-Zeigefinger).',
          successCriteria: 'Die Bewegung geschieht sauber über die Fingerkuppen, nicht grob mit der flachen Hand.'
        }
      ];
    } else if (grade === 2) {
      return [
        {
          id: 'ausschneiden',
          category: 'Ausschneiden',
          taskTitle: 'Wellenlinie schneiden',
          instructions: 'Lass das Kind entlang einer vorgezeichneten, sanften Wellenlinie schneiden.',
          successCriteria: 'Die Rundungen der Welle werden flüssig geschnitten, das Papier wird mit der passiven Hand fließend mitgedreht.'
        },
        {
          id: 'falten',
          category: 'Falten',
          taskTitle: 'Briefumschlag falten',
          instructions: 'Ein quadratisches Blatt Papier soll durch zweifaches Falten (Führung zur Mitte) zu einem Umschlag gefaltet werden.',
          successCriteria: 'Die Falten decken sich weitgehend bündig. Das Verständnis für das Umlegen der Ecken ist vorhanden.'
        },
        {
          id: 'auffaedeln',
          category: 'Fädeln / Stecken',
          taskTitle: 'Perlen auffädeln',
          instructions: 'Das Kind fädelt innerhalb von einer Minute 8 kleine Perlen oder Nudeln auf einen dünnen Wollfaden.',
          successCriteria: 'Visuomotorik und Dosierung gelingen koordiniert, der Faden wird zielsicher durch das Loch geführt.'
        }
      ];
    } else if (grade === 3) {
      return [
        {
          id: 'ausschneiden',
          category: 'Ausschneiden',
          taskTitle: 'Zickzack-Linie oder Spirale',
          instructions: 'Das Kind schneidet eine scharfe Zickzack-Linie mit Richtungswechseln oder eine Schnecken-Spirale aus.',
          successCriteria: 'Ecken werden präzise angesteuert. Die Schere verharrt nicht oder schneidet nicht grob über die Grenzen hinweg.'
        },
        {
          id: 'falten',
          category: 'Falten',
          taskTitle: 'Origami Papierbecher',
          instructions: 'Konstruieren Sie mit dem Kind gemeinsam nach einfacher bebilderte Anleitung einen kleinen Trinkbecher aus Papier.',
          successCriteria: 'Das Kind kann mehrfache aufeinanderfolgende Faltungen (4-5 Schritte) koordinativ nachempfinden.'
        },
        {
          id: 'knoten',
          category: 'Knoten / Binden',
          taskTitle: 'Einfachen Knoten binden',
          instructions: 'Das Kind soll an einer Kordel oder einem dickeren Faden einen eigenständigen, festen Einfachknoten über einen Holzstab binden.',
          successCriteria: 'Knotenaufbau wird verstanden (Überkreuzen, Durchziehen, Festziehen), Kraftdosierung ist angemessen.'
        }
      ];
    } else {
      return [
        {
          id: 'ausschneiden',
          category: 'Ausschneiden',
          taskTitle: 'Komplexe Umrisse schneiden',
          instructions: 'Lass das Kind den Umriss eines gezeichneten Kleeblattes oder eines fünfzackigen Sterns präzise ausschneiden.',
          successCriteria: 'Einkerbungen und filigrane Ausläufer werden fehlerlos gemeistert. Flüssiger Hand-in-Hand-Ablauf von Schere und Papier.'
        },
        {
          id: 'falten',
          category: 'Knoten & Schleife',
          taskTitle: 'Schnürsenkelschleife binden',
          instructions: 'Das Kind bindet einen Doppelknoten und eine funktionstüchtige Schleife um ein Modell oder den eigenen Schuh.',
          successCriteria: 'Die Schlaufenkonstruktion gelingt fehlerfrei und hält stabil. Das Kind benötigt keine verbale Führungsunterstützung.'
        },
        {
          id: 'papierreissen',
          category: 'Papierreißen',
          taskTitle: 'Präzisions-Papierreißen',
          instructions: 'Das Kind soll ohne Schere rein mit Daumen und Zeigefinger beider Hände einen runden Kreis aus Zeitungs- oder Tonpapier ausreißen.',
          successCriteria: 'Kleine, kontrollierte Reißbewegungen führen zu einer erkennbar kreisförmigen Form (kein unkontrolliertes Zerfetzen).'
        }
      ];
    }
  }, [grade]);

  const handleSelect = (taskId: string, val: 'Gelingt gut' | 'Gelingt teilweise' | 'Gelingt nicht') => {
    setAssessments(prev => ({ ...prev, [taskId]: val }));
  };

  const handleNote = (taskId: string, text: string) => {
    setNotes(prev => ({ ...prev, [taskId]: text }));
  };

  const allDone = useMemo(() => {
    return gradeTasksList.every(t => !!assessments[t.id]);
  }, [assessments, gradeTasksList]);

  // Statistics
  const counts = useMemo(() => {
    const list = Object.values(assessments);
    return {
      gut: list.filter(v => v === 'Gelingt gut').length,
      teilweise: list.filter(v => v === 'Gelingt teilweise').length,
      nicht: list.filter(v => v === 'Gelingt nicht').length
    };
  }, [assessments]);

  const ergotherapyRecommended = counts.nicht >= 2;

  const handleSave = () => {
    if (!student) return;

    const details = gradeTasksList.map(t => {
      const ass = assessments[t.id] || 'Nicht beurteilt';
      const commentText = notes[t.id] ? ` (Notiz: ${notes[t.id]})` : '';
      return `* **${t.category}** - ${t.taskTitle}: **${ass}**${commentText}`;
    }).join('\n');

    const therapyMessage = ergotherapyRecommended 
      ? '**Beobachtungshinweis: Mehrere Aufgaben gelangen in dieser Situation noch nicht sicher. Wiederholte Beobachtungen mit unterschiedlichen Materialien sind sinnvoll; über eine fachliche Abklärung wird nicht aus diesem Kurzcheck allein entschieden.**\n\n'
      : '';

    const summaryReport = `### Feinmotorik Screening (Klasse ${grade})\n\n` +
      therapyMessage +
      `**Ergebnis-Zusammenfassung**:\n` +
      `- Gelingt gut: ${counts.gut} / 3\n` +
      `- Gelingt teilweise: ${counts.teilweise} / 3\n` +
      `- Gelingt nicht: ${counts.nicht} / 3\n\n` +
      `**Detaillierte Schülerbeobachtung**:\n` +
      details + (globalComment ? `\n\n**Allgemeiner Kommentar**: ${globalComment}` : '');

    onSave({
      testId: 'live-feinmotorik',
      score: counts.gut, // score is number of items executed well
      foerderbedarf: counts.nicht >= 1 || counts.teilweise >= 2,
      note: summaryReport,
      meta: {
        grade,
        counts,
        assessments,
        notes,
        globalComment,
        ergotherapyRecommended
      }
    });

    onClose();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-cyan-500 to-sky-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Geführtes Praxis-Screening
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            ✂️ Feinmotorische Beobachtung
          </h2>
          <p className="text-[0.75rem] text-cyan-50">
            Schüler: <strong>{student?.vorname} {student?.nachname}</strong>
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[0.75rem] font-bold rounded-xl transition-all"
        >
          Beenden
        </button>
      </div>

      {phase === 'setup' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-[1.25rem] font-bold text-slate-800">Schulstufe für das Screening</h3>
            <p className="text-xs text-slate-500 font-sans">
              Die feinmotorischen Aufgaben (Falten, Schneiden, Knoten) sind differenziert nach den feinmotorischen Meilensteinen der 1.–4. Klasse gestaltet.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all border ${grade === g ? 'bg-sky-500 border-sky-500 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 text-left max-w-md mx-auto space-y-2">
            <h4 className="font-bold text-sky-800 text-xs flex items-center gap-1.5">
              <FileText size={16} /> Benötigtes Material für Stufe {grade}
            </h4>
            <ul className="text-[11px] text-sky-700 font-sans leading-relaxed list-disc list-inside space-y-1">
              {grade === 1 && (
                <>
                  <li>Kinderschere (Rechts- / Linkshänder)</li>
                  <li>Dick bedrucktes Tonpapier mit Konturen</li>
                  <li>Knete / Plastilin</li>
                </>
              )}
              {grade === 2 && (
                <>
                  <li>Kinderschere & Wellenlinienschablone</li>
                  <li>Buntes Papier</li>
                  <li>Dünner Faden & 8 Perlen</li>
                </>
              )}
              {grade === 3 && (
                <>
                  <li>Präzisions-Kinderschere & Spiralschablone</li>
                  <li>Origamiquadrate</li>
                  <li>Kordel oder dicke Bändel zum Knoten</li>
                </>
              )}
              {grade === 4 && (
                <>
                  <li>Schere & Sternschablone</li>
                  <li>Schnürsenkel / Schuh zum Schleife-Binden</li>
                  <li>Altpapier zum Reißen</li>
                </>
              )}
            </ul>
          </div>

          <button
            onClick={() => setPhase('test')}
            className="px-10 py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-sky-500/20"
          >
            Aufgaben anzeigen
          </button>
        </motion.div>
      )}

      {phase === 'test' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm text-left space-y-6 max-w-4xl mx-auto">
          <p className="text-xs uppercase font-black tracking-widest text-slate-400 text-center">Screening-Durchlauf Klasse {grade}</p>

          <div className="space-y-6">
            {gradeTasksList.map((t, idx) => {
              const selectedValue = assessments[t.id];
              return (
                <div key={t.id} className="p-5 bg-slate-50/40 rounded-2xl border border-slate-200 space-y-3.5">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider">Station {idx + 1}: {t.category}</span>
                      <h4 className="font-extrabold text-sm text-slate-800">{t.taskTitle}</h4>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-normal font-sans bg-white p-3 rounded-xl border border-slate-100">
                    💡 <strong>Testanleitung</strong>: {t.instructions}
                  </p>

                  <p className="text-[11px] text-slate-500 leading-normal italic font-sans pl-2 border-l-2 border-slate-200">
                    Auswertungskriterium: {t.successCriteria}
                  </p>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                    <div className="flex gap-2">
                      {(['Gelingt gut', 'Gelingt teilweise', 'Gelingt nicht'] as const).map(option => {
                        const isSelected = selectedValue === option;
                        let btnColor = 'bg-white text-slate-600 hover:border-slate-300';
                        if (isSelected) {
                          btnColor = option === 'Gelingt gut' 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                            : option === 'Gelingt teilweise'
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/10'
                            : 'bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/10';
                        }

                        return (
                          <button
                            key={option}
                            onClick={() => handleSelect(t.id, option)}
                            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${btnColor}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={notes[t.id] || ''}
                      onChange={e => handleNote(t.id, e.target.value)}
                      placeholder="Individuelle Beobachtung (z.B. links- o. rechtshändig)..."
                      className="w-full sm:max-w-xs bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-sky-500 font-sans"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Abschlusskommentar für Elterngespräch</label>
            <textarea
              value={globalComment}
              onChange={e => setGlobalComment(e.target.value)}
              placeholder="z.B. Schnitte werden sauber geführt, aber beim Origami-Falten war eine sehr hohe Anspannung spürbar..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-sky-500 min-h-[80px] font-sans"
            />
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <button onClick={() => setPhase('setup')} className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5">
              Zurück
            </button>
            <button
              onClick={() => setPhase('result')}
              disabled={!allDone}
              className={`px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${allDone ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              Auswerten
            </button>
          </div>

        </div>
      )}

      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Ergebnisse Feinmotorik</h3>
            <p className="text-xs text-slate-500 font-sans">Klasse {grade}</p>
          </div>

          {/* SPLIT RATING GRID */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-1">Gelingt gut</span>
              <span className="text-2xl font-black text-emerald-700">{counts.gut}</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block mb-1">Gelingt teilw.</span>
              <span className="text-2xl font-black text-amber-700">{counts.teilweise}</span>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block mb-1">Gelingt nicht</span>
              <span className="text-2xl font-black text-rose-700">{counts.nicht}</span>
            </div>
          </div>

          {/* THERAPY ADVISORY */}
          {ergotherapyRecommended && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 flex items-start gap-3 text-left">
              <AlertTriangle size={24} className="shrink-0 text-rose-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs">💡 Ergotherapeutische Abklärung ansprechen</h4>
                <p className="text-[11px] text-rose-600/95 leading-relaxed mt-1">
                Zwei oder mehr Stationen wurden als „Gelingt nicht“ markiert. Beobachte die Fertigkeiten erneut mit vertrautem Material und dokumentiere konkrete Unterstützungsangebote; dieser Kurzcheck ersetzt keine fachliche Abklärung.
                </p>
              </div>
            </div>
          )}

          {/* INDIVIDUAL SUMMARY LIST */}
          <div className="bg-slate-50 border rounded-2xl p-5 text-left space-y-2.5">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black block border-b pb-1">Aufgabenübersicht</label>
            {gradeTasksList.map(task => {
              const val = assessments[task.id] || 'Nicht beurteilt';
              const bg = val === 'Gelingt gut' ? 'bg-emerald-50 text-emerald-700' : val === 'Gelingt teilweise' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
              return (
                <div key={task.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200/60 last:border-0 pb-1.5">
                  <div className="text-xs">
                    <span className="font-black text-slate-500 mr-1.5">{task.category}:</span>
                    <span className="font-bold text-slate-700">{task.taskTitle}</span>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${bg}`}>{val}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={() => {
                setAssessments({});
                setNotes({});
                setGlobalComment('');
                setPhase('setup');
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Wiederholen
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/15 transition-all flex items-center gap-1.5 animate-pulse"
            >
              <Save size={16} /> Speichern
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
