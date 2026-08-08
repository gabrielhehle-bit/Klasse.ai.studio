import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, ArrowLeft, AlertCircle, CheckCircle2, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TestProps {
  studentId: string;
  initialGrade: number;
  onClose: () => void;
  onSave: (result: {
    testId: string;
    score: number; // number of unauffällig
    foerderbedarf: boolean;
    note: string;
    meta?: any;
  }) => void;
}

interface Category {
  id: string;
  label: string;
  options: { value: string; rating: 'Unauffällig' | 'Teilweise auffällig' | 'Auffällig' }[];
}

const CATEGORIES: Category[] = [
  {
    id: 'stifthaltung',
    label: 'Stifthaltung',
    options: [
      { value: 'Dreipunktgriff', rating: 'Unauffällig' },
      { value: 'Faustgriff', rating: 'Auffällig' },
      { value: 'Verkrampft / Übergreifend', rating: 'Teilweise auffällig' }
    ]
  },
  {
    id: 'schreibdruck',
    label: 'Schreibdruck',
    options: [
      { value: 'Angemessen (gut lesbar, kein Durchdrücken)', rating: 'Unauffällig' },
      { value: 'Zu stark (sichtbares Durchdrücken/Risse)', rating: 'Auffällig' },
      { value: 'Zu schwach (kaum lesbare, blasse Linien)', rating: 'Teilweise auffällig' }
    ]
  },
  {
    id: 'laufrichtung',
    label: 'Laufrichtung',
    options: [
      { value: 'Korrekt (links nach rechts, Buchstaben von oben)', rating: 'Unauffällig' },
      { value: 'Falscher Richtungsaufbau (z.B. Kreis von unten)', rating: 'Teilweise auffällig' },
      { value: 'Spiegelschrift / Desorientiert im Buchstabenschreiben', rating: 'Auffällig' }
    ]
  },
  {
    id: 'sitzhaltung',
    label: 'Sitzhaltung und Blattlage',
    options: [
      { value: 'Stabil & ergonomisch (angemessene Kopf-Blatt-Distanz)', rating: 'Unauffällig' },
      { value: 'Leichte Haltungsfehler (Blatt extrem schräg, leichtes Reinkriechen)', rating: 'Teilweise auffällig' },
      { value: 'Enorme Fehlhaltung / Kopf liegt fast auf Tisch auf', rating: 'Auffällig' }
    ]
  },
  {
    id: 'schreibfluss',
    label: 'Schreibfluss',
    options: [
      { value: 'Flüssig (gleichmäßiger Bewegungsverlauf)', rating: 'Unauffällig' },
      { value: 'Stockend (häufiges und unbegründetes Absetzen beim Schreiben)', rating: 'Teilweise auffällig' },
      { value: 'Zittrig / Stark abgehacktes Schriftbild', rating: 'Auffällig' }
    ]
  },
  {
    id: 'verkrampfung',
    label: 'Verkrampfung / Ermüdung',
    options: [
      { value: 'Keine (schreibt Übung mühelos durch)', rating: 'Unauffällig' },
      { value: 'Gelegentliches Hand-Ausschütteln oder Reiben', rating: 'Teilweise auffällig' },
      { value: 'Klagt über Schmerzen, verweigert Weiterschreiben', rating: 'Auffällig' }
    ]
  }
];

const GRADE_EXERCISES: Record<number, { title: string; content: string; info: string }> = {
  1: {
    title: 'Schwungübungen und einzelne Buchstaben',
    content: '🖊️ Vorlage für das Papier:\n1. Schlangenlinien & große Schleifen über eine Zeile\n2. Buchstabenreihen schreiben lassen: L L L, a a a, M M M, e e e',
    info: 'Beobachten Sie besonders die Stifthaltung beim Zeichnen der Bögen sowie den Richtungsaufbau bei "a" und "e".'
  },
  2: {
    title: 'Wörter in Druckschrift / Übergang Schreibschrift',
    content: '🖊️ Vorlage für das Papier:\n"der Hund bellt laut" - "die bunte Blume blüht"\nSchulmotto/Namen in Schreibschrift üben.',
    info: 'Achten Sie darauf, ob Buchstabenverbindungen im flüssigen Übergang gelingen und der Schreibdruck konstant bleibt.'
  },
  3: {
    title: 'Zusammenhängende Sätze in Schreibschrift',
    content: '🖊️ Vorlage für das Papier:\n"Susi und Leo gehen an einem herrlich warmen Nachmittag zum blauen See. Dort sehen sie einen kleinen, verspielten Hund."',
    info: 'Beobachten Sie den allgemeinen Schreibfluss über einen längeren Satzabschnitt hinweg.'
  },
  4: {
    title: 'Längerer Text mit Zeitvorgabe (3 Minuten)',
    content: '🖊️ Vorlage für das Papier:\n"Oma sitzt zufrieden im Garten. Die Frühlingssonne scheint herrlich warm auf das grüne Moos. Eine flinke Katze schleicht leise durch das dichte Gras. Sie fängt eine bunte Hummel. Es ist ein sehr schöner Tag."',
    info: 'Zeitvorgabe von 3 Minuten. Beobachten Sie gezielt Hände-Ausschütteln, Haltungswechsel oder Abfall des Schriftbads durch rasche Ermüdung.'
  }
};

export const Test9Graphomotorik: React.FC<TestProps> = ({ studentId, initialGrade, onClose, onSave }) => {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === studentId);

  const [grade, setGrade] = useState<number>(initialGrade || 1);
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  
  // Selection map: categoryId -> optionValue
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [globalComment, setGlobalComment] = useState<string>('');

  // Premium Digital Canvas Drawing states & refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#2563eb');
  const [brushWidth, setBrushWidth] = useState(3);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundPattern();
  };

  const drawBackgroundPattern = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw guide lines (school lined paper)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let y = 30; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (phase === 'test' && canvasRef.current) {
      // Small timeout to allow element to render and bound
      setTimeout(() => {
        drawBackgroundPattern();
      }, 50);
    }
  }, [phase]);

  const isCompleted = Object.keys(selections).length === CATEGORIES.length;

  const handleSelect = (catId: string, val: string) => {
    setSelections(prev => ({ ...prev, [catId]: val }));
  };

  const handleNoteChange = (catId: string, val: string) => {
    setNotes(prev => ({ ...prev, [catId]: val }));
  };

  const currentExercise = GRADE_EXERCISES[grade] || GRADE_EXERCISES[1];

  // Calculate results
  const counts = {
    Unauffällig: 0,
    'Teilweise auffällig': 0,
    Auffällig: 0
  };

  CATEGORIES.forEach(cat => {
    const selVal = selections[cat.id];
    const option = cat.options.find(o => o.value === selVal);
    if (option) {
      counts[option.rating]++;
    }
  });

  const isTherapyRecommended = counts.Auffällig >= 3;

  const handleSave = () => {
    if (!student) return;

    // Build notes block
    const itemsSummary = CATEGORIES.map(cat => {
      const selVal = selections[cat.id];
      const opt = cat.options.find(o => o.value === selVal);
      const catNote = notes[cat.id] ? ` (${notes[cat.id]})` : '';
      return `- **${cat.label}**: ${selVal} [${opt?.rating}]${catNote}`;
    }).join('\n');

    const therapyNotice = isTherapyRecommended 
      ? '**Mehrere Beobachtungshinweise: im Unterricht erneut beobachten und mögliche nächste Schritte gemeinsam besprechen**\n'
      : '';

    const summaryReport = `### Graphomotorik & Schreibablauf (Klasse ${grade})\n\n` +
      therapyNotice +
      `**Ergebnis-Zusammenfassung**:\n` +
      `- Unauffällig: ${counts.Unauffällig}\n` +
      `- Teilweise auffällig: ${counts['Teilweise auffällig']}\n` +
      `- Auffällig: ${counts.Auffällig}\n\n` +
      `**Detaillierte Beobachtungen**:\n` +
      itemsSummary + (globalComment ? `\n\n**Allgemeiner Kommentar**: ${globalComment}` : '');

    onSave({
      testId: 'live-grapho',
      score: counts.Unauffällig, // count of fully unauffällig parameters as score (out of 6)
      foerderbedarf: counts.Auffällig >= 2 || counts['Teilweise auffällig'] >= 4,
      note: summaryReport,
      meta: {
        grade,
        counts,
        selections,
        notes,
        globalComment,
        therapyNotice: isTherapyRecommended
      }
    });
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-[2rem] text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-md text-left">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[0.5625rem] font-black uppercase tracking-widest rounded-full mb-1">
            Geführtes Beobachtungsraster
          </span>
          <h2 className="text-[1.25rem] font-black tracking-tight flex items-center gap-2">
            ✏️ Graphomotorik & Schreibablauf
          </h2>
          <p className="text-[0.75rem] text-amber-50/80">
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-[1.25rem] font-bold text-slate-800">Diagnostische Stufe auswählen</h3>
            <p className="text-xs text-slate-500">
              Welches Schreibmaterial soll dem Kind bereitgestellt werden? Wählen Sie die passende Schulstufe.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-sm mx-auto">
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center transition-all border ${grade === g ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 text-left max-w-lg mx-auto space-y-2">
            <h4 className="font-bold text-amber-800 text-[0.875rem] flex items-center gap-2">
              <FileText size={16} /> Benötigtes Material für Stufe {grade}
            </h4>
            <p className="text-xs text-amber-700 font-sans leading-relaxed">
              Bitte legen Sie ein Blatt Papier (mit entsprechende Lineaturen für Klasse {grade}) und einen Standard-Stift (Bleistift, Füller oder ergonomischen Dreikantstift) für das Kind bereit.
            </p>
          </div>

          <button
            onClick={() => setPhase('test')}
            className="px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all"
          >
            Beobachtung starten
          </button>
        </motion.div>
      )}

      {phase === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          {/* TASK CARD FOR TEACHER */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-orange-50/50 rounded-3xl border border-orange-100 p-6 space-y-4">
              <div>
                <span className="text-[0.625rem] font-black text-orange-600 uppercase tracking-widest block">Übungsanweisung</span>
                <h3 className="text-lg font-black text-slate-800 mt-1">{currentExercise.title}</h3>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-orange-100 font-mono text-xs whitespace-pre-line text-slate-700 leading-normal">
                {currentExercise.content}
              </div>

              <div className="p-3 bg-white/70 rounded-xl border border-orange-100 text-[0.6875rem] text-slate-600 leading-relaxed font-sans">
                💡 <strong>Lehrer-Hinweis</strong>: {currentExercise.info}
              </div>
            </div>

            {/* DIGITAL CANVAS DRAWING BOARD */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Interaktives Zeichenbrett</span>
                  <h4 className="text-xs font-bold text-slate-850">Digitale Schreibspur testen</h4>
                </div>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition-all"
                >
                  Löschen
                </button>
              </div>

              {/* The actual canvas */}
              <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[200px] cursor-crosshair touch-none"
                />
              </div>

              {/* Tools */}
              <div className="flex justify-between items-center gap-2">
                {/* Colors */}
                <div className="flex gap-1.5">
                  {['#2563eb', '#16a34a', '#dc2626', '#1e293b'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBrushColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${brushColor === c ? 'scale-110 shadow-sm border-white ring-2 ring-slate-800/10' : 'opacity-60 hover:opacity-100 border-transparent'}`}
                      style={{ backgroundColor: c }}
                      title={`Stiftfarbe ${c}`}
                    />
                  ))}
                </div>

                {/* Width */}
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <span>Stärke:</span>
                  <div className="flex gap-1">
                    {[1.5, 3, 5].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setBrushWidth(w)}
                        className={`px-2 py-0.5 rounded border text-[9px] transition-all ${brushWidth === w ? 'bg-slate-850 text-white border-slate-850 font-black' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Das Kind kann direkt auf dem iPad/Tablet mit dem Finger oder Eingabestift zeichnen. Der Schreibfluss wird so live digital erfassbar.
              </p>
            </div>
          </div>

          {/* CHECKLIST */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider text-center">Beobachtungsraster ausfüllen</h4>

            <div className="space-y-6">
              {CATEGORIES.map(cat => {
                const completed = !!selections[cat.id];
                return (
                  <div key={cat.id} className="p-4 rounded-2xl border bg-slate-50/40 relative">
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      {cat.label}
                      {completed && <CheckCircle size={16} className="text-emerald-500 shrink-0" />}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
                      {cat.options.map(opt => {
                        const isSelected = selections[cat.id] === opt.value;
                        const ratingColor = opt.rating === 'Unauffällig' ? 'text-emerald-600' : opt.rating === 'Teilweise auffällig' ? 'text-amber-500' : 'text-rose-500';
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleSelect(cat.id, opt.value)}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold leading-snug transition-all flex flex-col justify-between ${isSelected ? 'bg-white border-slate-800 ring-2 ring-slate-800/10 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'}`}
                          >
                            <span>{opt.value}</span>
                            <span className={`text-[0.625rem] font-bold mt-1.5 ${ratingColor}`}>{opt.rating}</span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      value={notes[cat.id] || ''}
                      onChange={e => handleNoteChange(cat.id, e.target.value)}
                      placeholder="Kommentar / Besonderheit (z.B. rechts- vs linkshändig)..."
                      className="w-full mt-3 bg-white border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-600 focus:outline-none focus:border-orange-500 font-sans"
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest pl-2">Zusätzlicher Gesamtkommentar (z.B. Elterngespräch)</label>
              <textarea
                value={globalComment}
                onChange={e => setGlobalComment(e.target.value)}
                placeholder="z.B. Das Schriftbild wird bei Ermüdung extrem groß und kippt nach links..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 min-h-[80px] focus:outline-none focus:border-orange-500 font-sans"
              />
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <button
                onClick={() => setPhase('setup')}
                className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeft size={16} /> Zurück
              </button>

              <button
                disabled={!isCompleted}
                onClick={() => setPhase('result')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${isCompleted ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                Auswertung anzeigen <CheckCircle2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">Messergebnis Graphomotorik</h3>
            <p className="text-xs text-slate-500">Auswertung des geführten Beobachtungsrasters (Klasse {grade})</p>
          </div>

          {/* GRID SUMMARY */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
              <span className="text-[0.625rem] font-black text-emerald-600 uppercase tracking-wider block mb-1">Unauffällig</span>
              <span className="text-2xl font-black text-emerald-700">{counts.Unauffällig}</span>
            </div>
            <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl">
              <span className="text-[0.625rem] font-black text-amber-500 uppercase tracking-wider block mb-1">Teilw. auffällig</span>
              <span className="text-2xl font-black text-amber-700">{counts['Teilweise auffällig']}</span>
            </div>
            <div className="bg-rose-50/60 border border-rose-100 p-4 rounded-2xl">
              <span className="text-[0.625rem] font-black text-rose-500 uppercase tracking-wider block mb-1">Auffällig</span>
              <span className="text-2xl font-black text-rose-700">{counts.Auffällig}</span>
            </div>
          </div>

          {/* THERAPY ADVISORY */}
          {isTherapyRecommended && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 flex items-start gap-3 text-left">
              <AlertTriangle size={24} className="shrink-0 text-rose-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">💡 Beobachtung im Verlauf absichern</h4>
                <p className="text-xs text-rose-600/95 leading-relaxed mt-1">
                  Es wurden mindestens drei Kategorien des Schreib- und Bewegungsablaufs als auffällig markiert. Bitte die Beobachtung in einer weiteren konkreten Schreibsituation wiederholen und mögliche Unterstützung anschließend gemeinsam planen.
                </p>
              </div>
            </div>
          )}

          {/* CATEGORY OVERVIEW LIST WITH FARBCODIERUNG */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left space-y-2.5">
            <p className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 mb-2">Einzelkriterien</p>
            {CATEGORIES.map(cat => {
              const selVal = selections[cat.id];
              const opt = cat.options.find(o => o.value === selVal);
              const rating = opt?.rating || 'Unauffällig';
              
              const badgeClass = rating === 'Unauffällig' 
                ? 'bg-emerald-50 text-emerald-700' 
                : rating === 'Teilweise auffällig' 
                ? 'bg-amber-50 text-amber-700' 
                : 'bg-rose-50 text-rose-700';

              return (
                <div key={cat.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs font-bold text-slate-700">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    {notes[cat.id] && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded italic">Notiz</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{selVal}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={() => {
                setSelections({});
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
              className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center gap-1.5"
            >
              <Save size={16} /> Diagnose speichern
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
