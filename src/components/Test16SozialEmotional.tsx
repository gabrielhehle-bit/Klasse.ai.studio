import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Save, AlertTriangle, CheckCircle2, User, HelpCircle, FileText, ArrowLeftRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number; // average score out of 5
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

interface SocialItem {
  id: string;
  label: string;
  desc: string;
  lowLabel: string;
  highLabel: string;
}

const ITEMS: SocialItem[] = [
  {
    id: 'frust',
    label: 'Frustrationstoleranz & Verlieren',
    desc: 'Umgang mit Misserfolgen, Niederlagen beim Spielen oder Zurückweisung in der Kindergruppe.',
    lowLabel: 'Reagiert mit Wut o. Rückzug',
    highLabel: 'Kann gelassen umgehen'
  },
  {
    id: 'koop',
    label: 'Kooperationsfähigkeit',
    desc: 'Bereitschaft zur Teamarbeit, Teilen von Gemeinschaftsmaterialien und Zurückhalten eigener Wünsche.',
    lowLabel: 'Zwingt eigene Absicht auf',
    highLabel: 'Sehr kompromissbereit'
  },
  {
    id: 'empathie',
    label: 'Empathie & Hilfsbereitschaft',
    desc: 'Erkennt Gefühle anderer Kinder (Trauer, Wut, Schmerz) und reagiert proaktiv tröstend oder unterstützend.',
    lowLabel: 'Nimmt kaum Anteil',
    highLabel: 'Äußerst empathisch'
  },
  {
    id: 'selbst',
    label: 'Konstruktive Selbstbehauptung',
    desc: 'Sagt gewaltfrei "Nein", weicht Grenzüberschreitungen aus und meldet Konflikte ohne zu petzen.',
    lowLabel: 'Wird handgreiflich o. unterwürfig',
    highLabel: 'Souveräne Grenzziehung'
  },
  {
    id: 'impuls',
    label: 'Impulskontrolle & Gesprächsregeln',
    desc: 'Hält sich an Spiel- und Klassenregeln, wartet ab, platzt nicht störend in Gespräche.',
    lowLabel: 'Extrem impulsiv / stört',
    highLabel: 'Besitzt hohe Selbstkontrolle'
  },
  {
    id: 'konflikt',
    label: 'Konfliktlösungsstrategie',
    desc: 'Sucht in Streitsituationen nach Kompromissen und nutzt verbale Deeskalation anstatt physischer Aggression.',
    lowLabel: 'Schnelle Eskalation / Gewalt',
    highLabel: 'Findet friedliche Lösungen'
  }
];

const GRADE_INTERPRETATION: Record<number, string> = {
  1: '🤝 Entwicklungsbereich Klasse 1: Ein leicht egozentrisches Weltbild, laute emotionale Ausbruchsmomente bei starker Frustration und Besitzansprüche ("mein Spielzeug!") sind in Stufe 1 teilweise noch entwicklungstypisch. Die Regulationsfähigkeit bildet sich erst mit Unterstützung aus.',
  2: '🤝 Entwicklungsbereich Klasse 2: Erste gefestigte Teamarbeitsphasen sollten gelingen. Spielregeln werden in der Regel freiwillig eingehalten, und Kinder können Konflikte mit kurzen Moderationshilfen zunehmend sprachlich schlichten.',
  3: '🤝 Entwicklungsbereich Klasse 3: Empathisches Erfassen von Gruppenprozessen gelingt stabil. Einhalten von Gesprächsregeln im Stuhlkreis ohne ständige Lehrermahnung wird erwartet. Ausgrenzungen in Kleingruppen bedürfen der Beobachtung.',
  4: '🤝 Entwicklungsbereich Klasse 4: Komplexe, eigenständige Kompromissbildungen bei Gruppenprojekten sind Standard. Ein verfeinertes Regel- und Gerechtigkeitsbewusstsein liegt vor. Gewaltfreie Konfliktlösung und Zivilcourage sollten klar etabliert sein.'
};

export const Test16SozialEmotional: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  
  // Results map behaviorId -> rating: 1 to 5
  const [scores, setScores] = useState<Record<string, number>>({});
  // Comparison state: id -> 'besser' | 'gleich' | 'schlechter'
  const [trends, setTrends] = useState<Record<string, 'besser' | 'gleich' | 'schlechter'>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [globalComment, setGlobalComment] = useState<string>('');

  const handleScore = (id: string, val: number) => {
    setScores(prev => ({ ...prev, [id]: val }));
  };

  const handleTrend = (id: string, val: 'besser' | 'gleich' | 'schlechter') => {
    setTrends(prev => ({ ...prev, [id]: val }));
  };

  const handleComment = (id: string, val: string) => {
    setComments(prev => ({ ...prev, [id]: val }));
  };

  const allDone = useMemo(() => {
    return ITEMS.every(item => !!scores[item.id] && !!trends[item.id]);
  }, [scores, trends]);

  // Calculations
  const averageScore = useMemo(() => {
    const list = Object.values(scores);
    if (list.length === 0) return 0;
    return parseFloat((list.reduce((a, b) => a + b, 0) / list.length).toFixed(1));
  }, [scores]);

  // Notice for Support/Counseling (Depends on Grade)
  // Grade 1-2: score <= 2 in 2 or more areas is highly critical, in grade 3-4 score <= 3 is of concern.
  const criticalVal = grade <= 2 ? 2 : 3;
  const criticalItemsList = useMemo(() => {
    return ITEMS.filter(item => (scores[item.id] || 0) <= criticalVal);
  }, [scores, criticalVal]);

  const handleSave = () => {
    if (!student) return;

    const criticalCount = criticalItemsList.length;
    const isCritical = criticalCount >= 2;

    const details = ITEMS.map(item => {
      const s = scores[item.id];
      const t = trends[item.id];
      const c = comments[item.id] ? ` (Notiz: ${comments[item.id]})` : '';
      const trendSymbol = t === 'besser' ? '📈 Verbessert' : t === 'schlechter' ? '📉 Verschlechtert' : '➡️ Unverändert';
      return `* **${item.label}**: **${s}/5** [Trend: ${trendSymbol}]${c}`;
    }).join('\n');

    const alertText = isCritical 
      ? `**Auffälligkeit: Vermehrt kritische Bewertung im sozial-emotionalen Gruppenverhalten (Stufe ${grade}).**\n*Gezielte pädagogische Begleitung im Klassenverband oder Elterngespräch zu Unterstützungsmaßnahmen ratsam.*\n\n` 
      : '';

    const summaryReport = `### Sozial-Emotional Screening (Stufe ${grade})\n\n` +
      alertText +
      `**Ergebnis-Zusammenfassung**:\n` +
      `- Gesamtbeurteilungs-Mittelwert: **${averageScore} / 5.0**\n` +
      `- Kritische Verhaltensmuster (Wert <= ${criticalVal}): ${criticalCount} von ${ITEMS.length}\n\n` +
      `**Detaillierte Verhaltensdaten**:\n` +
      details + (globalComment ? `\n\n**Weiterer pädagogischer Kommentar**: ${globalComment}` : '');

    onSave({
      testId: 'live-sozialemotional',
      score: averageScore,
      foerderbedarf: isCritical || averageScore < 3.0,
      note: summaryReport,
      meta: {
        grade,
        averageScore,
        scores,
        trends,
        comments,
        globalComment,
        isCritical
      }
    });

    onClose();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Geführtes Gruppenraster
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            🤝 Sozial-Emotional Screening
          </h2>
          <p className="text-[0.75rem] text-emerald-50">
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
              Die Beurteilungskriterien, was im Klassenverband als altersgemäße Selbstregulation bzw. auffällig bewertet wird, passen sich der Schulstufe an.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all border ${grade === g ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="max-w-lg mx-auto bg-emerald-50/50 rounded-2xl border border-emerald-100 p-5 text-left text-xs text-emerald-800 leading-relaxed font-sans font-medium">
            {GRADE_INTERPRETATION[grade]}
          </div>

          <button
            onClick={() => setPhase('test')}
            className="px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-emerald-500/20"
          >
            Zur Beobachtung
          </button>
        </motion.div>
      )}

      {phase === 'test' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm text-left max-w-4xl mx-auto space-y-8">
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-sans font-medium">
            💡 <strong>Hinweis zur Befüllung:</strong> Bewerten Sie das Kind anhand Ihrer Beobachtungen im alltäglichen Klassen- und Pausengeschehen der letzten 2-4 Wochen.
          </div>

          <div className="space-y-6">
            {ITEMS.map((item, idx) => {
              const currentScore = scores[item.id] || 0;
              const currentTrend = trends[item.id] || '';
              
              return (
                <div key={item.id} className="p-5 rounded-2xl border bg-slate-50/40 border-slate-200 space-y-4">
                  
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Kriterium {idx + 1}</span>
                    <h4 className="font-extrabold text-sm text-slate-800 mt-0.5">{item.label}</h4>
                    <p className="text-[11px] text-slate-500 font-sans mt-1 leading-normal">{item.desc}</p>
                  </div>

                  {/* 1-5 SCORING BUBBLES */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 max-w-sm w-full">
                      <span className="text-[9px] font-bold text-rose-500 shrink-0">Auffällig / Selten</span>
                      <div className="flex gap-1.5 mx-auto">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button
                            key={v}
                            onClick={() => handleScore(item.id, v)}
                            className={`w-9 h-9 rounded-full font-black text-xs transition-all border flex items-center justify-center ${currentScore === v ? 'bg-emerald-500 border-emerald-500 text-white transform scale-105 shadow shadow-emerald-500/20' : 'bg-white border-slate-200 text-slate-600'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 shrink-0">Altersgerecht / Häufig</span>
                    </div>

                    {/* INTERACTIVE COMPRESSED TREND BUTTONS */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Verlauf / Trend:</span>
                      <div className="flex gap-1">
                        {[
                          { val: 'besser', label: '📈 Besser', color: 'bg-emerald-550 border-emerald-550 text-white' },
                          { val: 'gleich', label: '➡️ Gleich', color: 'bg-slate-700 border-slate-700 text-white' },
                          { val: 'schlechter', label: '📉 Schlechter', color: 'bg-rose-500 border-rose-500 text-white' }
                        ].map(t => {
                          const isSelected = currentTrend === t.val;
                          return (
                            <button
                              key={t.val}
                              onClick={() => handleTrend(item.id, t.val as any)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${isSelected ? t.color : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={comments[item.id] || ''}
                    onChange={e => handleComment(item.id, e.target.value)}
                    placeholder="Konkrete Situation im Klassenalltag skizzieren..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Zusammenfassender Förderkommentar (z.B. für Elterngespräch)</label>
            <textarea
              value={globalComment}
              onChange={e => setGlobalComment(e.target.value)}
              placeholder="z.B. Verhält sich im Zweierteam unauffällig, die Integration in freie Pausenspiele fällt ihm jedoch schwer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-emerald-500 min-h-[90px] font-sans"
            />
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <button onClick={() => setPhase('setup')} className="text-slate-500 hover:text-slate-800 text-xs font-bold leading-none flex items-center gap-1">
              Zurück
            </button>
            <button
              onClick={() => setPhase('result')}
              disabled={!allDone}
              className={`px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${allDone ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              Auswerten
            </button>
          </div>

        </div>
      )}

      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Testergebnis Sozial-Emotional Screening</h3>
            <p className="text-xs text-slate-400 font-sans">Klasse {grade}</p>
          </div>

          {/* OVERVIEW SCORE */}
          <div className="p-4 bg-slate-50 border rounded-2xl inline-block px-8 text-center">
            <span className="text-[9px] uppercase tracking-wider font-black text-slate-400 block mb-1">Mittelwert</span>
            <span className="text-3xl font-black text-slate-800">{averageScore}</span>
            <span className="text-slate-400 text-xs font-bold"> / 5.0</span>
          </div>

          {criticalItemsList.length >= 2 && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 flex items-start gap-3 text-left">
              <AlertTriangle size={24} className="shrink-0 text-rose-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs">💡 Sozial-emotionaler Unterstützungsbedarf</h4>
                <p className="text-[11px] text-rose-600 leading-relaxed mt-1">
                  Es wurden multiple Bereiche des Sozialverhaltens als kritisch markiert. Eine engere pädagogische Moderation im Klassenraum, Streitschlichterübungen oder ein vertiefendes Elterngespräch zu Unterstützungsmaßnahmen werden empfohlen.
                </p>
              </div>
            </div>
          )}

          {/* DETAILED RATINGS LIST */}
          <div className="bg-slate-50 border rounded-2xl p-5 text-left space-y-2.5">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block border-b pb-1">Kriterien & Entwicklung</label>
            {ITEMS.map(item => {
              const val = scores[item.id] || 3;
              const tr = trends[item.id] || 'gleich';
              const bg = val <= criticalVal ? 'bg-rose-50 text-rose-700' : val >= 4 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600';
              const trSymbol = tr === 'besser' ? '📈 besser' : tr === 'schlechter' ? '📉 schlechter' : '➡️ gleichbleibend';
              
              return (
                <div key={item.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200/60 last:border-0 pb-1.5">
                  <div className="text-xs">
                    <p className="font-bold text-slate-700 leading-none">{item.label}</p>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold">{trSymbol}</span>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${bg}`}>{val} / 5</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={() => {
                setScores({});
                setTrends({});
                setComments({});
                setGlobalComment('');
                setPhase('setup');
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Wiederholen
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <Save size={16} /> Speichern
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
