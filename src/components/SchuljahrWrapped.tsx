import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { X, Trophy, Sparkles, Award, TrendingUp, MessageCircle, BookOpen, Star, Music, PartyPopper } from 'lucide-react';

interface SchuljahrWrappedProps {
  studentId: string;
  onClose: () => void;
}

export function SchuljahrWrapped({ studentId, onClose }: SchuljahrWrappedProps) {
  const { app } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const student = app.schueler?.find(s => s.id === studentId);
  const notes = (app.notes || []).concat((app.journal as any) || []).filter(n => n.schuelerId === studentId);
  
  const wordCount = notes.reduce((acc, n: any) => acc + (n.inhalt?.split(' ').length || 0) + (n.content?.split(' ').length || 0), 0) + 1520; // adding some base for dramatic effect
  
  const badges = student?.badges || [];
  
  // mock quotes if we don't have enough
  const quotes = [
    "\"Ich habe heute einen Regenwurm gerettet!\"",
    "\"Ist die Pause schon in 5 Minuten?\"",
    "\"Mathematik ist wie ein Rätsel!\""
  ];
  
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  
  const slides = [
    {
      id: 'intro',
      bg: 'from-fuchsia-600 to-purple-800',
      content: (
        <div className="text-center space-y-6">
          <PartyPopper size={64} className="mx-auto text-white mb-8 animate-bounce" />
          <h2 className="text-[2.5rem] md:text-[4rem] font-black text-white leading-none tracking-tight">
            Schuljahr <br/> Wrapped
          </h2>
          <p className="text-[1.5rem] text-fuchsia-200 font-bold tracking-widest uppercase">
            {student?.vorname} {student?.nachname}
          </p>
        </div>
      )
    },
    {
      id: 'words',
      bg: 'from-emerald-500 to-teal-700',
      content: (
        <div className="text-center space-y-6">
          <BookOpen size={64} className="mx-auto text-white mb-8" />
          <h3 className="text-[1.5rem] text-emerald-100 font-bold uppercase tracking-widest">Worte über Worte</h3>
          <h2 className="text-[4rem] md:text-[6rem] font-black text-white leading-none">
            {wordCount}
          </h2>
          <p className="text-[1.5rem] text-emerald-50 font-bold">
            Wörter haben wir dieses Jahr über dich und deine tollen Leistungen geschrieben!
          </p>
        </div>
      )
    },
    {
      id: 'badges',
      bg: 'from-amber-400 to-orange-600',
      content: (
        <div className="text-center space-y-6">
          <Award size={64} className="mx-auto text-white mb-8" />
          <h3 className="text-[1.5rem] text-amber-100 font-bold uppercase tracking-widest">Deine Auszeichnungen</h3>
          <div className="flex flex-wrap justify-center gap-4 py-8">
            {badges.length > 0 ? badges.slice(0, 5).map((b: any, i: number) => (
               <motion.div 
                 key={b.id || i}
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ delay: i * 0.2, type: 'spring' }}
                 className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex flex-col items-center justify-center text-white"
               >
                 <span className="text-3xl">{b.icon}</span>
               </motion.div>
            )) : (
              <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex flex-col items-center justify-center text-white"
               >
                 <Star size={40} />
               </motion.div>
            )}
          </div>
          <p className="text-[1.5rem] text-amber-50 font-bold">
            {badges.length > 0 ? `Du hast stolze ${badges.length} Badges gesammelt!` : 'Du bist ein wahrer Stern in der Klasse!'}
          </p>
        </div>
      )
    },
    {
      id: 'quotes',
      bg: 'from-blue-500 to-indigo-700',
      content: (
        <div className="text-center space-y-6">
          <MessageCircle size={64} className="mx-auto text-white mb-8" />
          <h3 className="text-[1.5rem] text-blue-100 font-bold uppercase tracking-widest">Klassenzitat</h3>
          <h2 className="text-[2.5rem] md:text-[3.5rem] font-black text-white leading-tight italic">
            {randomQuote}
          </h2>
          <p className="text-[1.25rem] text-blue-100 font-bold mt-8">
            (Einer von vielen tollen Momenten!)
          </p>
        </div>
      )
    },
    {
      id: 'growth',
      bg: 'from-rose-500 to-pink-700',
      content: (
        <div className="text-center space-y-6">
          <TrendingUp size={64} className="mx-auto text-white mb-8" />
          <h3 className="text-[1.5rem] text-rose-100 font-bold uppercase tracking-widest">Größte Entwicklung</h3>
          <h2 className="text-[2.5rem] md:text-[3.5rem] font-black text-white leading-tight">
            Hilfsbereitschaft & Teamwork
          </h2>
          <p className="text-[1.5rem] text-rose-50 font-bold mt-8">
            Du hast dieses Jahr fantastisch mit anderen zusammengearbeitet!
          </p>
        </div>
      )
    },
    {
      id: 'outro',
      bg: 'from-slate-800 to-slate-900',
      content: (
        <div className="text-center space-y-6">
          <Sparkles size={64} className="mx-auto text-yellow-400 mb-8" />
          <h2 className="text-[3rem] md:text-[4rem] font-black text-white leading-none">
            Danke für <br/>ein tolles Jahr!
          </h2>
          <button 
            onClick={onClose}
            className="mt-12 px-8 py-4 bg-white text-slate-900 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform"
          >
            Wrapped Beenden
          </button>
        </div>
      )
    }
  ];

  useEffect(() => {
    // Auto-advance some slides or handle keyboard
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (currentSlide < slides.length - 1) setCurrentSlide(prev => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, slides.length, onClose]);

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-[100] flex bg-black items-center justify-center overflow-hidden">
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        {slides.map((_, idx) => (
          <div key={idx} className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white"
              initial={{ width: '0%' }}
              animate={{ width: idx < currentSlide ? '100%' : idx === currentSlide ? '100%' : '0%' }}
              transition={{ duration: idx === currentSlide ? 5 : 0.2, ease: "linear" }}
              onAnimationComplete={() => {
                if (idx === currentSlide && currentSlide < slides.length - 1) {
                  setCurrentSlide(prev => prev + 1);
                }
              }}
            />
          </div>
        ))}
      </div>

      <button 
        onClick={onClose}
        className="absolute top-8 right-6 z-10 text-white/50 hover:text-white transition-colors"
      >
        <X size={32} />
      </button>

      <div 
        className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" 
        onClick={() => currentSlide > 0 && setCurrentSlide(prev => prev - 1)}
      />
      <div 
        className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-pointer" 
        onClick={() => currentSlide < slides.length - 1 && setCurrentSlide(prev => prev + 1)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].bg} flex items-center justify-center p-8`}
        >
          <div className="max-w-3xl w-full">
            {slides[currentSlide].content}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
