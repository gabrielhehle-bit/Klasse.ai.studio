import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Save, AlertCircle, FileText, CheckCircle2, TrendingUp, Sparkles, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

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

interface BehaviorItem {
  id: string;
  label: string;
  lowLabel: string;
  highLabel: string;
}

const ITEMS: BehaviorItem[] = [
  { id: 'arbeitsbeginn', label: 'Arbeitsbeginn', lowLabel: 'Braucht Anleitung / Aufforderung', highLabel: 'Startet sofort selbstständig' },
  { id: 'ausdauer', label: 'Ausdauer', lowLabel: 'Bricht schnell ab / ablenkbar', highLabel: 'Bleibt fokussiert dran' },
  { id: 'frustration', label: 'Frustrationstoleranz', lowLabel: 'Gibt schnell auf / wird wütend', highLabel: 'Probiert beharrlich weiter' },
  { id: 'tempo', label: 'Arbeitstempo', lowLabel: 'Extrem hastig oder sehr langsam', highLabel: 'Zügig, aber angemessen' },
  { id: 'sorgfalt', label: 'Sorgfalt', lowLabel: 'Flüchtig / viele Fehler', highLabel: 'Sehr sauber & genau' },
  { id: 'selbst', label: 'Selbstständigkeit', lowLabel: 'Fragt ständig / unsicher', highLabel: 'Arbeitet eigenständig' },
  { id: 'hilfe', label: 'Hilfeannahme', lowLabel: 'Lehnt ab o. unbelehrbar', highLabel: 'Nimmt Tipps dankend an' }
];

const GRADE_GUIDELINES: Record<number, string> = {
  1: '🏫 Entwicklungsstufe Klasse 1: Flatterhafte Aufmerksamkeit (ca. 10 Min.) und häufige Rückfragen sind absolut altersgerecht. Fokus liegt auf der Freude am Arbeitsbeginn und der emotionalen Regulation bei Frustration.',
  2: '🏫 Entwicklungsstufe Klasse 2: Erste selbstständige Arbeitsphasen von ca. 15 Minuten werden erwartet. Das Kind sollte einfache Fehler korrigieren können und grundlegende Arbeitsanweisungen allein erfassen.',
  3: '🏫 Entwicklungsstufe Klasse 3: Eigenständiges Arbeiten über 20-30 Minuten ohne ständige Lehrerpräsenz ist Standard. Zielstrebige Fehlersuche und strukturierte Heftführung rücken in den Fokus.',
  4: '🏫 Entwicklungsstufe Klasse 4: Ausdauerndes, planvolles Arbeiten über 30-40 Minuten. Eine gesunde Frustrationstoleranz und das proaktive, zielgerichtete Anfordern und Nutzen von Hilfsmitteln zeichnen diese Stufe aus.'
};

export const Test11Verhalten: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  
  // Scoring values (1 to 5)
  const [scores, setScores] = useState<Record<string, number>>({});
  const [itemComments, setItemComments] = useState<Record<string, string>>({});
  const [generalComment, setGlobalComment] = useState<string>('');

  const handleScore = (id: string, val: number) => {
    setScores(prev => ({ ...prev, [id]: val }));
  };

  const handleComment = (id: string, text: string) => {
    setItemComments(prev => ({ ...prev, [id]: text }));
  };

  const isCompleted = Object.keys(scores).length === ITEMS.length;

  // Average calculation
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const average = isCompleted ? parseFloat((totalScore / ITEMS.length).toFixed(1)) : 0;

  // Let's check for conspicuous items (Threshold adapts to grade)
  // Grade 1: score <= 2 is a concern. Grade 4: score <= 3 might be a concern.
  const criticalThreshold = grade <= 2 ? 2 : 3;
  const criticalItems = ITEMS.filter(item => scores[item.id] <= criticalThreshold);

  // Generate parent-friendly formulation suggestions
  const generateAppreciativeReport = () => {
    if (!student) return [];
    return ITEMS.map(item => {
      const s = scores[item.id] || 3;
      const detail = itemComments[item.id] ? ` (${itemComments[item.id]})` : '';
      
      if (s >= 4) {
        if (item.id === 'arbeitsbeginn') return `${student.vorname} zeigt eine hervorragende Selbstorganisation und startet stets zügig und motiviert mit neuen Aufgaben${detail}.`;
        if (item.id === 'ausdauer') return `${student.vorname} glänzt durch eine hohe Ausdauer und arbeitet über längere Zeiträume hinweg hochkonzentriert an einer Sache${detail}.`;
        if (item.id === 'frustration') return `Bei anspruchsvollen Problemstellungen beweist ${student.vorname} eine bemerkenswerte Frustrationstoleranz und bleibt beharrlich am Ball${detail}.`;
        if (item.id === 'tempo') return `Das Arbeitstempo ist optimal austariert, sodass Quantität und Qualität der Arbeiten in bester Balance stehen${detail}.`;
        if (item.id === 'sorgfalt') return `Schriftliche Arbeiten und Zeichnungen werden von ${student.vorname} stets sehr sorgfältig, strukturiert und sauber ausgeführt${detail}.`;
        if (item.id === 'selbst') return `Das selbstständige Arbeiten gelingt bereits hervorragend, womit eigene Lösungswege sicher gefunden werden${detail}.`;
        return `${student.vorname} kann konstruktive Hilfestellungen und Tipps äußerst produktiv annehmen und sofort in die Tat umsetzen${detail}.`;
      } else if (s <= criticalThreshold) {
        if (item.id === 'arbeitsbeginn') return `Beim Arbeitsstart benötigt ${student.vorname} derzeit noch wohlwollende Impulse und eine engere Begleitung, um den Einstieg zu finden${detail}.`;
        if (item.id === 'ausdauer') return `Das Ausdauern über längere Zeiträume fällt ${student.vorname} noch etwas schwer. Hier helfen kurze Auflockerungspausen sehr${detail}.`;
        if (item.id === 'frustration') return `Bei unerwarteten Fehlern oder Hindernissen reagiert ${student.vorname} schnell entmutigt. Eine stärkende Begleitung hilft ihm/ihr, dranzubleiben${detail}.`;
        if (item.id === 'tempo') return `Das Arbeitstempo weicht häufiger vom Durchschnitt ab (entweder sehr impulsiv-hastig oder stark verzögernd). Eine Strukturierung ist hier wertvoll${detail}.`;
        if (item.id === 'sorgfalt') return `Die formale Ausführung und Genauigkeit dürfen in nächster Zeit noch gezielter verfeinert werden (z.B. durch Selbstkontrolle mit Checklisten)${detail}.`;
        if (item.id === 'selbst') return `In Arbeitsphasen fragt ${student.vorname} zur Absicherung noch sehr häufig nach und profitiert von einer Erhöhung des Selbstvertrauens${detail}.`;
        return `Das Annehmen von Ratschlägen stellt manchmal noch eine Hürde dar. Hier üben wir das gemeinsame Reflektieren von Alternativen${detail}.`;
      } else {
        // Average scores
        if (item.id === 'arbeitsbeginn') return `${student.vorname} findet meist nach kurzer Zeit eigenständig in die Arbeitsphase hinein${detail}.`;
        if (item.id === 'ausdauer') return `Größtenteils arbeitet ${student.vorname} ausdauernd, schwenkt jedoch an manchen Tagen noch zu Ablenkungen ab${detail}.`;
        if (item.id === 'frustration') return `Bei üblichem Niveau wird ausdauernd gearbeitet; extreme Schwierigkeiten bedürfen manchmal eines Zuspruchs${detail}.`;
        if (item.id === 'tempo') return `Das Arbeitstempo pendelt sich meist im guten Mittelfeld ein${detail}.`;
        if (item.id === 'sorgfalt') return `Die Form und Genauigkeit der Ausarbeitungen entsprechen weitgehend den altersgemäßen Kriterien${detail}.`;
        if (item.id === 'selbst') return `Die Selbstständigkeit gelingt in bekannten Lernumgebungen bereits recht gut${detail}.`;
        return `Gemeinsam erarbeitete Tipps werden nach Rücksprache meist gut umgesetzt${detail}.`;
      }
    });
  };

  // Prepare chart data format
  const chartData = ITEMS.map(item => ({
    subject: item.label,
    Wert: scores[item.id] || 0,
    fullMark: 5
  }));

  const handleSave = () => {
    if (!student) return;

    // Build markdown documentation
    const textBlocks = generateAppreciativeReport();
    const suggestionsMarkdown = textBlocks.map(tb => `* ${tb}`).join('\n');
    
    const summary = `### Arbeits- & Lernverhalten Screening (Stufe ${grade})\n\n` +
      `**Ergebnis-Zusammenfassung**:\n` +
      `- Gesamt-Durchschnitt: **${average} / 5.0**\n` +
      `- Auffällige Kategorien (Kriterium <= ${criticalThreshold}): ${criticalItems.length > 0 ? criticalItems.map(c => c.label).join(', ') : 'Keine'}\n\n` +
      `**Pädagogische Formulierungshilfen (Elterngespräch)**:\n` +
      suggestionsMarkdown + (generalComment ? `\n\n**Ergänzender Kommentar**: ${generalComment}` : '');

    onSave({
      testId: 'live-verhalten',
      score: average,
      foerderbedarf: criticalItems.length >= 2 || average < 3.0,
      note: summary,
      meta: {
        grade,
        average,
        scores,
        itemComments,
        generalComment,
        criticalCount: criticalItems.length
      }
    });

    onClose();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Prozessdiagnostik Arbeitsverhalten
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            📊 Arbeits- & Lernverhalten (Beobachtung)
          </h2>
          <p className="text-[0.75rem] text-teal-50">
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
            <h3 className="text-[1.25rem] font-bold text-slate-800">Schulstufe für Auswertung festlegen</h3>
            <p className="text-xs text-slate-500 font-sans">
              Die Verhaltens-Auswertung passt die Einstufung, was als altersgemäß bzw. auffällig gewertet wird, an das jeweilige Alter an.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all border ${grade === g ? 'bg-teal-600 border-teal-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="max-w-lg mx-auto bg-teal-50/50 rounded-2xl border border-teal-100/60 p-5 text-left text-xs text-teal-800 leading-relaxed font-sans font-medium">
            {GRADE_GUIDELINES[grade]}
          </div>

          <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-2xl border text-[11px] text-slate-500 leading-normal text-left">
            💡 <strong>Ablauf</strong>: Geben Sie dem Kind eine Schulübung auf (z.B. Schreiben, Rechnen oder Malen) und beobachten Sie es ca. 10-15 Min. Füllen Sie anschließend das Raster aus.
          </div>

          <button
            onClick={() => setPhase('test')}
            className="px-12 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-teal-600/20"
          >
            Zur Beobachtung
          </button>
        </motion.div>
      )}

      {phase === 'test' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8 text-left">
          
          <div className="bg-amber-50/50 text-amber-800 rounded-2xl border border-amber-100/50 p-4 text-xs font-sans font-medium flex items-start gap-2 max-w-3xl">
            <AlertCircle size={18} className="shrink-0 text-amber-500" />
            <p>
              <strong>Beobachtung läuft...</strong> Nutzen Sie die Zeit, das Kind beim selbstständigen Werken ungestört zu beobachten, und füllen Sie das folgende Raster nach eigenem Empfinden aus.
            </p>
          </div>

          <div className="space-y-6 max-w-4xl">
            {ITEMS.map((item, idx) => {
              const currentScore = scores[item.id] || 0;
              return (
                <div key={item.id} className="p-5 rounded-2xl border bg-slate-50/40 border-slate-200/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="font-extrabold text-slate-800 text-sm">{idx + 1}. {item.label}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{item.lowLabel} ── {item.highLabel}</span>
                  </div>

                  {/* 1-5 SCORING BUBBLES */}
                  <div className="flex justify-between items-center gap-1.5 max-w-md">
                    <span className="text-[10px] font-bold text-rose-500 shrink-0">Wenig ausgeprägt</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          onClick={() => handleScore(item.id, v)}
                          className={`w-10 h-10 rounded-full font-black text-xs transition-all border flex items-center justify-center ${currentScore === v ? 'bg-teal-600 border-teal-600 text-white transform scale-105 shadow-md shadow-teal-600/10' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 shrink-0">Sehr ausgeprägt</span>
                  </div>

                  <input
                    type="text"
                    value={itemComments[item.id] || ''}
                    onChange={e => handleComment(item.id, e.target.value)}
                    placeholder="Konkrete Lernsituation im Screeningnotieren (z.B. gibt nach 3 Versuchen auf)..."
                    className="w-full bg-white border border-slate-200/80 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 font-sans"
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2 max-w-4xl">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Zusammenfassender Kommentar für Schülerakte</label>
            <textarea
              value={generalComment}
              onChange={e => setGlobalComment(e.target.value)}
              placeholder="z.B. Ein sehr verlässliches Arbeitsverhalten, benötigt jedoch emotionale Verstärkung bei herannahenden Erfolgskontrollen..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs focus:outline-none focus:border-teal-500 min-h-[90px] font-sans"
            />
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <button onClick={() => setPhase('setup')} className="text-slate-500 hover:text-slate-800 text-xs font-bold leading-none flex items-center gap-1">
              Zurück
            </button>
            <button
              onClick={() => setPhase('result')}
              disabled={!isCompleted}
              className={`px-10 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${isCompleted ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/15' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              Ergebnis berechnen
            </button>
          </div>

        </div>
      )}

      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-6 sm:p-10 shadow-md max-w-3xl mx-auto space-y-8 text-center">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Auswertung Profile: Arbeits- & Lernverhalten</h3>
            <p className="text-xs text-slate-400 font-sans">Schulstufe {grade} • {student?.vorname} {student?.nachname}</p>
          </div>

          {/* VISUAL RECHARTS RADAR/BAR */}
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest text-left">Profil-Visualisierung</p>
            <div className="h-64 bg-slate-50 p-4 border border-slate-100 rounded-3xl">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="subject" tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip wrapperStyle={{ fontFamily: 'sans-serif', fontSize: '12px' }} />
                  <Bar dataKey="Wert" fill="#0d9488" radius={[8, 8, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PROFILE SUMMARY SCORE */}
          <div className="p-4 bg-teal-50/60 border border-teal-100/60 rounded-2xl flex justify-between items-center px-6 max-w-md mx-auto text-left">
            <div>
              <span className="text-[10px] font-black text-teal-600 uppercase">Beurteilungs-Mittel</span>
              <p className="text-3xl font-black text-slate-800">{average} <span className="text-slate-400 text-sm">/ 5.0</span></p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase">Kritische Kategorien</span>
              <p className="text-xl font-black text-slate-700">{criticalItems.length}</p>
            </div>
          </div>

          {/* PARENT CHAT READY BLOCK IN WARM VALUE STYLE */}
          <div className="text-left space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Sparkles size={14} className="text-yellow-500" /> Wertschätzende Sprachbausteine (Elterngespräch)
            </h4>
            
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-3.5 max-h-80 overflow-y-auto">
              {generateAppreciativeReport().map((tText, i) => (
                <div key={i} className="flex gap-3 leading-relaxed text-xs text-slate-700 items-start">
                  <MessageSquare size={16} className="text-teal-500 shrink-0 mt-0.5" />
                  <p>{tText}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DIALOG COMMMENT REPLACEMENT */}
          <div className="text-left space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest pl-1">Abschlussbemerkung / Ergänzungen</label>
            <textarea
              value={generalComment}
              onChange={e => setGlobalComment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-teal-500 font-sans"
            />
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={() => {
                setScores({});
                setItemComments({});
                setGlobalComment('');
                setPhase('setup');
              }}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Wiederholen
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Save size={16} /> In Schülerakt sichern
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
