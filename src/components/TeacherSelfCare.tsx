import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Coffee, Smile, Ghost, Play, Square, Settings as SettingsIcon, Trash2, 
  Sparkles, ShieldCheck, Heart, UserCheck, RefreshCw, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { generateExcuse } from '../services/aiService';

// Module sub-components
import AtemPause from './AtemPause';
import VoiceCare from './VoiceCare';
import SchoolDayReflector from './SchoolDayReflector';

interface ExcuseResponse {
  humor: string;
  pedagogic: string;
  winwin: string;
}

const PRESET_GEGEN_AUSREDEN: Record<string, ExcuseResponse> = {
  hund: {
    humor: "🐺 'Ich hoffe, dein Hund hat guten Musikgeschmack – deine Noten sind nämlich tierisch gut! Hoffentlich hat er sich nicht am Papier verschluckt.'",
    pedagogic: "🍎 'Bring mir morgen einfach die Speichelproben-Befreiung deines Tierarztes mit, dann tragen wir das gemeinsam nach!'",
    winwin: "🤝 'Ein intelligenter Hund! Bis morgen schreibst du es einfach noch mal sauber ab – du bekommst ein Fleißsternchen, er ein Leckerli.'"
  },
  vergessen: {
    humor: "🗄️ 'Ach, dein Schreibtisch wollte sie bestimmt auch mal korrigieren! Werden die Noten dort eigentlich auch besser?'",
    pedagogic: "❤️ 'Atme tief durch, Vergessen ist menschlich. Mach nachher ein Foto davon, schick es mir per Mail und die Sache ist geritzt!'",
    winwin: "📝 'Kein Problem! Zeig sie mir morgen unaufgefordert vor der ersten Stunde am Pult, dann zähle ich sie voll mit.'"
  },
  bruder: {
    humor: "👶 'Dein Bruder übt wohl schon für den Aktenvernichter-Beruf! Wollte er deine Genialität vor uns geheim halten?'",
    pedagogic: "🩹 'Das ist ärgerlich, aber kein Drama. Schnapp dir Tesafilm, wir kleben das morgen wie ein historisches Puzzle zusammen!'",
    winwin: "📋 'Zeige mir morgen die Schnipsel – oder schreibe die drei Kernideen kurz auf einen Zettel auf. Hauptsache, du hast dich damit befasst!'"
  },
  tinte: {
    humor: "🐙 'Ein echtes Drama in blau-schwarz! Hat der Tintenfisch gestreikt oder lag es an der Schwerkraft im Zimmer?'",
    pedagogic: "✍️ 'Das schont die Augen! Nimm beim nächsten Mal einfach einen Bleistift oder tippe die Sätze ein.'",
    winwin: "✏️ 'Leih dir im Klassenzimmer einen Reserve-Stift für einen frischen Start aus, und schreibe die Übung bis morgen fertig.'"
  },
  internet: {
    humor: "📡 'Das Internet hatte wohl gestern auch schon Feierabend! Bestimmt hat es sich auch eine Tasse Tee gegönnt.'",
    pedagogic: "🌳 'Eine gesunde digitale Pause für dein Gehirn. Nimm es als Anlass, beim nächsten Mal ganz oldschool analog im Heft zu arbeiten.'",
    winwin: "💻 'Schicke es mir einfach, sobald deine Leitung wieder steht, oder hole es ganz entspannt bis morgen auf Papier nach.'"
  }
};

export default function TeacherSelfCare() {
  const { app, setApp } = useApp();
  
  // Anekdoten
  const anekdoten = app.lehrerProfil?.anekdoten || [];
  const [newAnekdote, setNewAnekdote] = useState('');

  // Meditations Timer (Door-Closed Pausentimer)
  const [meditationTime, setMeditationTime] = useState(3 * 60);
  const [meditationActive, setMeditationActive] = useState(false);
  const [timerInterval, setTimerInterval] = useState<any>(null);

  // Excuse Generator
  const [excuseTopic, setExcuseTopic] = useState('');
  const [generatedExcuse, setGeneratedExcuse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Gegen-Ausreden states
  const [selectedExcuseKey, setSelectedExcuseKey] = useState<string>('hund');

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  const toggleMeditation = () => {
    if (meditationActive) {
      clearInterval(timerInterval);
      setMeditationActive(false);
    } else {
      setMeditationActive(true);
      const iv = setInterval(() => {
        setMeditationTime((prev) => {
          if (prev <= 1) {
            clearInterval(iv);
            setMeditationActive(false);
            
            // Auto check-off "silence" selfcare task!
            setApp(p => {
              const currentChecks = p.lehrerProfil?.selfCareChecks || [];
              if (!currentChecks.includes('silence')) {
                return {
                  ...p,
                  lehrerProfil: {
                    ...(p.lehrerProfil || {}),
                    selfCareChecks: [...currentChecks, 'silence']
                  }
                };
              }
              return p;
            });
            
            // Play a gentle sound when done
            try {
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioCtx) {
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 1.0);
              }
            } catch (e) {}

            return 3 * 60; // reset
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(iv);
    }
  };

  const DEFAULT_SELF_CARE_ITEMS = [
    { id: 'silence', label: '🧘 60s Atem-Pause / Meditation', desc: 'Meditations-Timer genutzt oder kurz durchgeatmet' },
    { id: 'tea', label: '☕ Achtsame Tasse Tee oder Kaffee', desc: 'In Ruhe und ohne Ablenkung getrunken' },
    { id: 'no', label: '🙅 Gesundes "Nein" gesetzt', desc: 'Konsequent Grenzen gezogen & Überlastung vermieden' },
    { id: 'voice', label: '🐝 Eine Stimm-Schoner Übung', desc: 'Lippenflattern oder Summen eingebaut' },
    { id: 'reflector', label: '📝 Ein positives Wort im Journal', desc: 'Den Schultags-Reflektor am Mittag ausgefüllt' }
  ];

  const checkedChecks = app.lehrerProfil?.selfCareChecks || [];

  const handleToggleCheck = (id: string) => {
    const isChecked = checkedChecks.includes(id);
    const updatedChecks = isChecked 
      ? checkedChecks.filter((c: string) => c !== id)
      : [...checkedChecks, id];
    
    setApp(prev => ({
      ...prev,
      lehrerProfil: {
        ...(prev.lehrerProfil || {}),
        selfCareChecks: updatedChecks
      }
    }));
  };

  const handleAddAnekdote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnekdote.trim()) return;

    setApp(prev => ({
      ...prev,
      lehrerProfil: {
        ...prev.lehrerProfil,
        anekdoten: [
          {
            id: crypto.randomUUID(),
            datum: new Date().toISOString(),
            text: newAnekdote
          },
          ...(prev.lehrerProfil?.anekdoten || [])
        ]
      }
    }));
    setNewAnekdote('');
  };

  const handleGenerateExcuse = async () => {
    if(!excuseTopic) return;
    setIsGenerating(true);
    const res = await generateExcuse(excuseTopic);
    setGeneratedExcuse(res || '');
    setIsGenerating(false);
  };

  // Calculating self-care health percentage
  const selfCareScore = checkedChecks.length;
  const healthPercent = Math.round((selfCareScore / DEFAULT_SELF_CARE_ITEMS.length) * 100);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* Dynamic Health Barometer / Stress-Oasis Banner */}
      <div className="bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-600 text-white p-6 rounded-[2.5rem] shadow-lg relative  flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/15 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10 text-center md:text-left max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[0.625rem] font-black uppercase tracking-wide">
            <Heart size={12} className="text-red-300 animate-pulse" /> Self-Care & Magie Cockpit
          </span>
          <h2 className="text-[1.5rem] leading-normal font-black tracking-tight">Deine persönliche Oase im Schulalltag</h2>
          <p className="text-[0.75rem] leading-tight text-white/95 font-medium leading-relaxed">
            Eine glückliche, entspannte Lehrkraft ist das beste Fundament für eine tolle Klasse. Nimm dir hier bewusst Auszeiten, pflege deine Stimme und fange positive Rituale ein.
          </p>
        </div>

        {/* Dynamic Energy Barometer */}
        <div className="bg-white/10 backdrop-blur-md border border-white/25 rounded-3xl p-5 w-full md:w-80 shrink-0 relative z-10 flex flex-col justify-between">
          <div className="flex items-center justify-between font-black uppercase text-[0.625rem] tracking-widest text-emerald-100">
            <span>Wöchentliches Energie-Soll</span>
            <span className="text-white bg-white/20 px-2 py-0.5 rounded-full">{healthPercent}%</span>
          </div>
          <div className="mt-2.5 h-3 bg-white/20 rounded-full ">
            <div 
              className="bg-gradient-to-r from-teal-300 to-emerald-400 h-full rounded-full transition-all duration-700" 
              style={{ width: `${healthPercent}%` }}
            />
          </div>
          <p className="text-[0.59375rem] text-teal-100 font-bold mt-1.5 uppercase tracking-widest leading-none">
            {selfCareScore === 0 ? 'Mache eine kurze Übung! 👇' : `${selfCareScore} von ${DEFAULT_SELF_CARE_ITEMS.length} Oasen gemeistert!`}
          </p>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE LOCKERUNGS ENGINE (60s Atem-Pause & Stimm-Schoner) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Breathing pacer */}
        <div className="min-h-[350px]">
          <AtemPause />
        </div>
        
        {/* Voice exercises */}
        <div className="min-h-[350px]">
          <VoiceCare />
        </div>
      </div>

      {/* SECTION 2: DIGITAL DIARY & POSITIVE RECOLLECTIONS (Anekdoten & 3-Satz Reflektor) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Schultags-Reflektor (3-Sentence Journal) */}
        <div className="min-h-[460px]">
          <SchoolDayReflector />
        </div>

        {/* Anekdoten Tagebuch: "Best-of Klasse" */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[460px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                  <Coffee size={24} />
                </div>
                <div>
                  <h3 className="text-[1.125rem] leading-normal font-black text-slate-800">Best-of Klasse Anekdoten</h3>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Lustige Sprüche & herzerwärmende Momente</p>
                </div>
              </div>
            </div>

            <p className="text-[0.75rem] leading-tight text-slate-505 leading-normal">
              Schreibe witzige Aussagen, tolle Ideen oder rührende Erkenntnisse deiner Schüler:innen auf. Es ist ein wunderbarer Seelenwärmer an stressigen Tagen!
            </p>
            
            <form onSubmit={handleAddAnekdote} className="flex gap-2 pt-2">
              <input 
                value={newAnekdote}
                onChange={e => setNewAnekdote(e.target.value)}
                placeholder="Was hat heute ein Kind gesagt oder getan? 📒"
                className="flex-1 bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 rounded-2xl px-4 py-3.5 text-[0.75rem] leading-tight font-semibold text-slate-705 outline-none transition-all placeholder:text-slate-400"
                required
              />
              <button 
                type="submit" 
                disabled={!newAnekdote.trim()} 
                className="px-6 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-2xl font-black text-[0.75rem] leading-tight transition-all cursor-pointer flex-none shadow-sm active:scale-95"
              >
                Speichern
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[260px] space-y-3 pr-1 mt-4 custom-scrollbar">
            {anekdoten.map(a => (
              <div key={a.id} className="p-4 rounded-2xl bg-amber-50/20 border border-amber-100/50 group relative animate-fade-in">
                <p className="text-[0.75rem] leading-tight font-semibold text-slate-700 leading-relaxed italic">"{a.text}"</p>
                <div className="mt-2 text-[0.5625rem] font-black uppercase text-amber-500 tracking-widest">{format(new Date(a.datum), "dd. MMMM yyyy", { locale: de })}</div>
                
                <button 
                  onClick={() => {
                    setApp(prev => ({
                      ...prev,
                      lehrerProfil: {
                        ...prev.lehrerProfil,
                        anekdoten: (prev.lehrerProfil?.anekdoten || []).filter(an => an.id !== a.id)
                      }
                    }))
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-500 p-2 cursor-pointer transition-opacity"
                  title="Anekdote löschen"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {anekdoten.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 font-medium text-[0.75rem] leading-tight">
                <span>🎒</span>
                <p className="font-bold uppercase tracking-wider text-[0.625rem] mt-2 mb-0.5 text-slate-400">Keine Anekdoten gespeichert</p>
                <p className="text-[0.6875rem] text-slate-500">Wenn ein Kind heute ein Worträtsel genial gelöst hat, halte es hier fest!</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: ADMINISTRATIVE WIZARDRY (KI-Ausredengenerator & Witzige „Gegen-Ausreden“ für die Hosentasche) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Witzige "Gegen-Ausreden" für die Hosentasche */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between h-full min-h-[440px]">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                <Zap size={24} className="text-indigo-500" />
              </div>
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black text-slate-800">Gegen-Ausreden für die Hosentasche</h3>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Pädagogisch wertvolle & humorvolle Konter</p>
              </div>
            </div>

            <p className="text-[0.75rem] leading-tight text-slate-500 leading-normal">
              Der Schüler liefert eine klassische Ausrede? Lass dich nicht verunsichern! Schnappe dir eine charmante, spielerische Antwort für jede Standardausrede.
            </p>

            {/* Select student excuse */}
            <div className="space-y-2 pt-2">
              <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 block">Wähle die Ausrede des Schülers:</label>
              <select 
                value={selectedExcuseKey} 
                onChange={(e) => setSelectedExcuseKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-[0.75rem] leading-tight text-slate-700 outline-none focus:border-indigo-500 font-bold cursor-pointer transition-all appearance-none"
              >
                <option value="hund">🐕 "Der Hund hat meine Hausübung gefressen!"</option>
                <option value="vergessen">🏠 "Ich habe die Hausübung gemacht, aber auf meinem Tisch vergessen."</option>
                <option value="bruder">👶 "Mein kleiner Bruder hat mein Heft zerrissen!"</option>
                <option value="tinte">✒️ "Im Heft ist gestern Abend die Tinte komplett leer geworden."</option>
                <option value="internet">🌐 "Das Internet hat gestern Abend bei uns absolut nicht funktioniert."</option>
              </select>
            </div>
          </div>

          {/* Render the 3 preset options */}
          <div className="space-y-3 mt-5 flex-1 min-h-[160px]">
            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-1">
              <span className="text-[0.53125rem] font-black text-amber-600 uppercase tracking-wider">Option A: Der Schlagfertige Konter</span>
              <p className="text-[0.75rem] leading-tight text-slate-700 font-medium leading-relaxed italic">{PRESET_GEGEN_AUSREDEN[selectedExcuseKey].humor}</p>
            </div>

            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-1">
              <span className="text-[0.53125rem] font-black text-emerald-600 uppercase tracking-wider">Option B: Der Pädagogische Impuls</span>
              <p className="text-[0.75rem] leading-tight text-slate-700 font-medium leading-relaxed italic">{PRESET_GEGEN_AUSREDEN[selectedExcuseKey].pedagogic}</p>
            </div>

            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-1">
              <span className="text-[0.53125rem] font-black text-indigo-600 uppercase tracking-wider">Option C: Der Clevere Win-Win-Vorschlag</span>
              <p className="text-[0.75rem] leading-tight text-slate-700 font-medium leading-relaxed italic">{PRESET_GEGEN_AUSREDEN[selectedExcuseKey].winwin}</p>
            </div>
          </div>
        </div>

        {/* KI-Ausredengenerator for Teachers */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between h-full min-h-[440px]">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                <Ghost size={24} />
              </div>
              <div>
                <h3 className="text-[1.125rem] leading-normal font-black text-slate-800">KI-Ausredengenerator</h3>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Mühelos und hochprofessionell "Nein" sagen</p>
              </div>
            </div>

            <p className="text-[0.75rem] leading-tight text-slate-500 leading-normal">
              Sollst du schon wieder die Schulbibliothek sortieren oder das Sommerfest am Wochenende leiten? Lass dir eine diplomatische und freundliche Absage-Mail für die Direktion formulieren.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 block">Zu übernehmende Zusatzaufgabe:</label>
                <input 
                  value={excuseTopic}
                  onChange={e => setExcuseTopic(e.target.value)}
                  placeholder="Z.B.: Leitung des Herbstbasars oder Konferenzprotokoll..."
                  className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-rose-500 rounded-2xl px-4 py-3.5 text-[0.75rem] leading-tight font-semibold text-slate-705 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <button 
                onClick={handleGenerateExcuse}
                disabled={isGenerating || !excuseTopic}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-2xl font-black text-[0.75rem] leading-tight transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/5 active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Lade höfliche Absage...</span>
                  </>
                ) : (
                  <span>Diplomatische Absage generieren ✨</span>
                )}
              </button>
            </div>
          </div>

          {generatedExcuse ? (
            <div className="mt-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-[0.75rem] leading-tight font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed italic shadow-inner">
              {generatedExcuse}
            </div>
          ) : (
            <div className="mt-4 p-4 border border-dashed border-slate-200 rounded-2xl flex flex-col justify-center items-center text-center text-slate-400 text-[0.75rem] leading-tight py-8">
              <span>✉️</span>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-400 mt-1">Warte auf Eingabe</span>
            </div>
          )}
        </div>

      </div>

      {/* SECTION 4: GENERAL ENERGY TARGETS (Self-Care Checkliste card) */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-[1.125rem] leading-normal font-black text-slate-800">Self-Care & Magie Checkliste</h3>
            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Dein Energie-Soll im Schulalltag</p>
          </div>
        </div>
        
        <p className="text-[0.75rem] leading-tight text-slate-500">
          Kleine Gesten und achtsame Pausen bewirken Wunder. Wenn du eine Übung absolvierst, setze hier einen Haken, um dein Wohlbefinden messbar zu steigern.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {DEFAULT_SELF_CARE_ITEMS.map(item => {
            const isChecked = checkedChecks.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleToggleCheck(item.id)}
                className="w-full flex items-start gap-4 p-4 text-left rounded-2xl hover:bg-slate-50 transition-all border border-slate-100 text-slate-700 cursor-pointer"
              >
                <div className="pt-0.5">
                  <div className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-all ${isChecked ? 'bg-teal-500 border-teal-500 text-white shadow-sm' : 'border-slate-300 bg-white'}`}>
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <p className={`text-[0.75rem] leading-tight font-black transition-all ${isChecked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.label}</p>
                  <p className="text-[0.625rem] text-slate-405 font-bold">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
