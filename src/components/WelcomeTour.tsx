import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  Play, 
  Bot, 
  Settings, 
  X, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TourStep {
  targetId: string;
  title: string;
  text: string;
  icon: React.ReactNode;
}

export default function WelcomeTour() {
  const { app, setApp } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; isMobile: boolean }>({ top: 0, left: 0, isMobile: false });
  const [highlightCoords, setHighlightCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const shouldRender = !app.tourAbgeschlossen && !app.firstLogin && app.currentPage !== 'cockpit';

  const steps: TourStep[] = [
    {
      targetId: 'tour-dashboard',
      title: 'Dashboard',
      text: 'Hier findest du alle Module der App. Fange mit dem Dashboard an.',
      icon: <LayoutDashboard className="text-emerald-500" size={24} />
    },
    {
      targetId: 'tour-schueler',
      title: 'Schülerliste',
      text: 'Verwalte deine Schüler:innen, erfasse Noten und Anwesenheit.',
      icon: <Users className="text-emerald-500" size={24} />
    },
    {
      targetId: 'tour-cockpit',
      title: 'Lehrer-Cockpit',
      text: 'Das Lehrer-Cockpit begleitet dich live im Unterricht – mit Timer, Ampel und Werkzeugen.',
      icon: <Play className="text-emerald-500" size={24} />
    },
    {
      targetId: 'tour-ki-helfer',
      title: 'KI-Helfer',
      text: 'Der KI-Helfer unterstützt dich bei Texten, Förderempfehlungen und Unterrichtsideen.',
      icon: <Bot className="text-emerald-500" size={24} />
    },
    {
      targetId: 'tour-settings',
      title: 'Einstellungen',
      text: 'Hier kannst du Klasse, Schüler:innen und Themes jederzeit anpassen.',
      icon: <Settings className="text-emerald-500" size={24} />
    }
  ];

  const activeStep = steps[currentStep];

  // Helper hook to track step element positioning securely on the screen
  useEffect(() => {
    if (!shouldRender || !activeStep) return;

    const updatePosition = () => {
      const isMobileSize = window.innerWidth < 1024;
      if (isMobileSize) {
        setCoords({ top: 0, left: 0, isMobile: true });
        setHighlightCoords(null);
        return;
      }

      const element = document.getElementById(activeStep.targetId);
      if (!element) {
        // Fallback to centered modal/card placement if targeted element didn't mount yet
        setCoords({ top: 0, left: 0, isMobile: true });
        setHighlightCoords(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      
      // Calculate placement: on desktop, sidebar target coordinates are on left, tooltip to the right
      const top = rect.top + rect.height / 2;
      const left = rect.right + 16;

      setCoords({ top, left, isMobile: false });
      setHighlightCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    // Poll to keep placement robust during sidebar expansions or animations
    const interval = setInterval(updatePosition, 150);

    return () => {
      window.removeEventListener('resize', updatePosition);
      clearInterval(interval);
    };
  }, [currentStep, activeStep.targetId]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setApp(prev => ({
      ...prev,
      tourAbgeschlossen: true
    }));
  };

  if (!shouldRender || !activeStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none">
      {/* Semi-transparent background overlay with safe pointer events */}
      <div 
        className="fixed inset-0 bg-slate-900/15 pointer-events-auto z-[150] transition-all" 
        onClick={handleComplete} 
      />

      {/* Target element highlight border and glow (desktop only) */}
      {!coords.isMobile && highlightCoords && (
        <div 
          style={{
            position: 'fixed',
            top: highlightCoords.top - 6,
            left: highlightCoords.left - 6,
            width: highlightCoords.width + 12,
            height: highlightCoords.height + 12,
          }}
          className="border-[3px] border-emerald-500 rounded-2xl bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)] pointer-events-none z-[151] transition-all duration-300 animate-[pulse_1.5s_infinite_ease-in-out]"
        />
      )}

      {/* Tooltip Popup panel wrapper */}
      <div 
        style={
          coords.isMobile 
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' }
            : { top: `${coords.top}px`, left: `${coords.left}px`, transform: 'translateY(-50%)', position: 'fixed' }
        }
        className="z-[152] w-[320px] max-w-[calc(100vw-32px)] pointer-events-auto transition-all duration-300"
      >
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl relative p-6 space-y-4">
          
          {/* Triangular pointer arrow (desktop only) */}
          {!coords.isMobile && (
            <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white drop-shadow-[-2px_0_1px_rgba(0,0,0,0.02)]" />
          )}

          {/* Tour Panel Content Header */}
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              {activeStep.icon}
            </div>
            
            <button
              onClick={handleComplete}
              title="Tour überspringen"
              className="text-slate-400 hover:text-slate-600 font-medium text-[0.75rem] leading-tight flex items-center gap-1 py-1 focus:outline-none cursor-pointer"
            >
              <span>Überspringen</span>
              <X size={14} />
            </button>
          </div>

          {/* Text and Title */}
          <div className="space-y-1">
            <h3 className="font-extrabold text-[0.9375rem] text-slate-800 leading-tight">
              {activeStep.title}
            </h3>
            <p className="text-[0.75rem] leading-tight text-slate-500 font-medium leading-relaxed">
              {activeStep.text}
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-2">
            
            {/* Steps tracker indicator dots */}
            <div className="flex gap-1">
              {steps.map((_, sIdx) => (
                <div 
                  key={sIdx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${sIdx === currentStep ? 'w-4 bg-emerald-500' : 'w-1.5 bg-slate-200'}`} 
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="p-1 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 font-bold text-[0.6875rem] uppercase tracking-wide flex items-center gap-0.5 transition-all cursor-pointer"
                >
                  <ChevronLeft size={12} />
                  <span>Zurück</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="p-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[0.6875rem] uppercase tracking-wide flex items-center gap-0.5 shadow-sm transition-all cursor-pointer"
              >
                <span>{currentStep === steps.length - 1 ? 'Beenden' : 'Weiter'}</span>
                <ChevronRight size={12} />
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
