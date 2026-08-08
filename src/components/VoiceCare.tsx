import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Smile, Check, ShieldAlert, Award, Droplet } from 'lucide-react';

interface VoiceExercise {
  id: string;
  title: string;
  duration: number; // in seconds
  description: string;
  pedagogicalTip: string;
  icon: string;
}

const VOICE_EXERCISES: VoiceExercise[] = [
  {
    id: 'lippenflattern',
    title: 'Lippenflattern (Pffff)',
    duration: 10,
    description: 'Atme locker ein und blase die Luft durch die entspannten Lippen aus, sodass sie flattern wie ein Pferd.',
    pedagogicalTip: 'Lockert die Gesichtsmuskeln und versetzt die Stimmbänder ganz sanft in Schwingung, ohne sie zu belasten.',
    icon: '🐴'
  },
  {
    id: 'summen',
    title: 'Kauen & Summen (Mmmm)',
    duration: 15,
    description: 'Stelle dir ein leckeres Essen vor. Summe ein entspanntes "Mmmm" und bewege den Kiefer dabei kauend auf und ab.',
    pedagogicalTip: 'Bringt den Klang in die Resonanzräume (Nase, Nebenhöhlen) und entlastet den direkten Druck auf den Kehlkopf.',
    icon: '🐝'
  },
  {
    id: 'gaehnen',
    title: 'Der Gähn-Seufzer OOOh',
    duration: 12,
    description: 'Gähne herzhaft mit weit geöffnetem Mund und lasse die Stimme am Ende sanft von oben nach unten abgleiten.',
    pedagogicalTip: 'Weitet den Rachenraum, senkt den Kehlkopf ab und schafft Platz für eine vollere, entspanntere Stimme.',
    icon: '🥱'
  },
  {
    id: 'haltung',
    title: 'Haltungs-Check',
    duration: 10,
    description: 'Stelle dich aufrecht hin, lasse die Schultern locker kreisen und atme tief in den Bauch ein.',
    pedagogicalTip: 'Eine aufrechte Haltung ist das Fundament der Stimme. Nur ein entspannter Körper kann frei klingen.',
    icon: '🧘'
  }
];

export default function VoiceCare() {
  const [selectedEx, setSelectedEx] = useState<VoiceExercise>(VOICE_EXERCISES[0]);
  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(VOICE_EXERCISES[0].duration);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setTimeLeft(selectedEx.duration);
    setFinished(false);
    setActive(false);
  }, [selectedEx]);

  useEffect(() => {
    let timer: any = null;
    if (active && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setActive(false);
            setFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [active, timeLeft]);

  const handleStart = () => {
    setFinished(false);
    setTimeLeft(selectedEx.duration);
    setActive(true);
  };

  const handleReset = () => {
    setActive(false);
    setFinished(false);
    setTimeLeft(selectedEx.duration);
  };

  const progressPercentage = (timeLeft / selectedEx.duration) * 100;

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between h-full font-sans">
      
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Smile size={24} />
          </div>
          <div>
            <h3 className="text-[1.125rem] leading-normal font-black text-slate-800">Der Stimm-Schoner</h3>
            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Lockerung & Voice Care für Lehrkräfte</p>
          </div>
        </div>

        <p className="text-[0.75rem] leading-tight text-slate-500 leading-normal">
          Deine Stimme ist dein kostbarstes Werkzeug. Mache zwischen zwei Stunden eine kurze Lockerung, um Heiserkeit vorzubeugen.
        </p>
      </div>

      {/* Tabs / Selection */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-100/50 my-4">
        {VOICE_EXERCISES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setSelectedEx(ex)}
            className={`flex-1 shrink-0 px-3 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedEx.id === ex.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span className="mr-1">{ex.icon}</span> {ex.title.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Body Area */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100/60 p-4 flex-1 flex flex-col md:flex-row items-center gap-4 min-h-[160px]">
        {/* Visual Progress ring circle */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="38"
              className="stroke-slate-100"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r="38"
              className={`stroke-amber-400 transition-all duration-1000 ease-linear`}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 38}`}
              strokeDashoffset={`${((100 - progressPercentage) / 100) * (2 * Math.PI * 38)}`}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute text-center">
            {finished ? (
              <span className="text-amber-500 font-extrabold text-[1.25rem] leading-normal">🎉</span>
            ) : (
              <span className="text-slate-800 font-mono font-black text-[1.25rem] leading-normal">{timeLeft}s</span>
            )}
          </div>
        </div>

        {/* Text descriptions */}
        <div className="flex-1 space-y-2">
          <h4 className="text-[0.875rem] leading-snug font-black text-slate-800 flex items-center gap-1.5">
            <span>{selectedEx.icon}</span> {selectedEx.title}
          </h4>
          <p className="text-[0.75rem] leading-tight text-slate-600 leading-normal">
            {selectedEx.description}
          </p>
          <div className="text-[0.625rem] text-slate-500 font-medium leading-relaxed bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 italic">
            <strong>Pädagogischer Tipp:</strong> {selectedEx.pedagogicalTip}
          </div>
        </div>
      </div>

      {/* Trigger Button foot */}
      <div className="flex items-center justify-between mt-4">
        {/* Quick reminder message */}
        <div className="flex items-center gap-1.5 text-slate-400 font-black uppercase tracking-wider text-[0.5625rem]">
          <Droplet size={14} className="text-sky-500 animate-bounce" />
          <span>Schluck Wasser getrunken? 💧</span>
        </div>

        {active ? (
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw size={12} /> Stoppen
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-md hover:shadow-amber-500/10 active:scale-95 cursor-pointer"
          >
            <Play size={12} fill="currentColor" /> {finished ? 'Erneut starten' : 'Beginnen'}
          </button>
        )}
      </div>

    </div>
  );
}
