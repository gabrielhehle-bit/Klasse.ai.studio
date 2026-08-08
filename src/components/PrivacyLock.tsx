import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, ShieldAlert, Key, RefreshCw, Delete } from 'lucide-react';

export default function PrivacyLock() {
  const { app, setApp, screenLocked, setScreenLocked } = useApp();
  const { showToast } = useToast();
  
  // Get active PIN from settings or default to empty
  const savedPin = app.settings?.privacyPin || '';
  const isPinSetupNeeded = !savedPin || savedPin.length !== 4;

  const [enteredPin, setEnteredPin] = useState('');
  const [setupStep, setSetupStep] = useState(1); // 1 = Enter new PIN, 2 = Confirm new PIN
  const [newPin, setNewPin] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [shake, setShake] = useState(false);

  // If the app is not locked, we render nothing
  if (!screenLocked) return null;

  const handleKeyPress = (num: string) => {
    if (isPinSetupNeeded) {
      if (setupStep === 1) {
        if (newPin.length < 4) {
          const next = newPin + num;
          setNewPin(next);
          if (next.length === 4) {
            setSetupStep(2);
            showToast('PIN bitte bestätigen', 'info');
          }
        }
      } else {
        if (enteredPin.length < 4) {
          const next = enteredPin + num;
          setEnteredPin(next);
          if (next.length === 4) {
            if (next === newPin) {
              // Successfully set
              setApp(prev => ({
                ...prev,
                settings: {
                  ...prev.settings,
                  privacyPin: next
                }
              }));
              setEnteredPin('');
              setNewPin('');
              setSetupStep(1);
              showToast('Datenschutz-PIN erfolgreich eingerichtet! 🎉', 'success');
              setScreenLocked(false);
            } else {
              // Confirmation failed
              setShake(true);
              setTimeout(() => setShake(false), 500);
              setEnteredPin('');
              setSetupStep(1);
              setNewPin('');
              showToast('PIN stimmt nicht überein. Bitte noch einmal versuchen.', 'error');
            }
          }
        }
      }
    } else {
      if (enteredPin.length < 4) {
        const next = enteredPin + num;
        setEnteredPin(next);
        
        if (next.length === 4) {
          if (next === savedPin) {
            // Correct PIN!
            setEnteredPin('');
            setErrorCount(0);
            setScreenLocked(false);
            showToast('Willkommen zurück! Bildschirm entsperrt.', 'success');
          } else {
            // Wrong PIN
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setEnteredPin('');
            const nextErrors = errorCount + 1;
            setErrorCount(nextErrors);
            if (nextErrors >= 3) {
              showToast('Falsche PIN. Sicherheitshinweis: Daten sind geschützt.', 'error');
            } else {
              showToast('Falsche PIN. Bitte erneut versuchen.', 'error');
            }
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (isPinSetupNeeded) {
      if (setupStep === 1) {
        setNewPin(prev => prev.slice(0, -1));
      } else {
        setEnteredPin(prev => prev.slice(0, -1));
      }
    } else {
      setEnteredPin(prev => prev.slice(0, -1));
    }
  };

  const activeValue = isPinSetupNeeded 
    ? (setupStep === 1 ? newPin : enteredPin) 
    : enteredPin;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-8">
        
        {/* Header Visual */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            {isPinSetupNeeded ? <Key size={28} /> : <Lock size={28} />}
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-white">
              {isPinSetupNeeded 
                ? 'PIN Einrichten' 
                : 'Datenschutz-Sperre'}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isPinSetupNeeded 
                ? (setupStep === 1 ? 'Wähle eine neue 4-stellige PIN' : 'Bitte bestätige die PIN')
                : 'Bildschirm zum Schülerschutz gesperrt'}
            </p>
          </div>
        </motion.div>

        {/* DOTS INDICATORS */}
        <motion.div 
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-4 py-3"
        >
          {[0, 1, 2, 3].map((idx) => {
            const filled = activeValue.length > idx;
            return (
              <motion.div 
                key={idx}
                animate={{ 
                  scale: filled ? 1.25 : 1,
                  backgroundColor: filled ? '#6366f1' : '#334155'
                }}
                className={`w-4.5 h-4.5 rounded-full border border-slate-700`}
              />
            );
          })}
        </motion.div>

        {/* KEYPAD GRID */}
        <div className="w-full grid grid-cols-3 gap-3 max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-16 w-16 mx-auto rounded-full bg-slate-900/60 hover:bg-indigo-600 transition-all border border-slate-850 hover:border-indigo-500 flex items-center justify-center font-black text-lg select-none active:scale-90 cursor-pointer shadow-sm text-slate-100"
            >
              {num}
            </button>
          ))}
          
          {/* Bottom Row */}
          <button
            onClick={() => {
              if (isPinSetupNeeded) {
                setNewPin('');
                setEnteredPin('');
                setSetupStep(1);
                showToast('Einrichtung zurückgesetzt', 'info');
              } else {
                setEnteredPin('');
              }
            }}
            className="h-16 w-16 mx-auto rounded-full hover:bg-slate-800 transition-all flex items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400 active:scale-90 cursor-pointer"
          >
            C
          </button>
          
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 w-16 mx-auto rounded-full bg-slate-900/60 hover:bg-indigo-600 transition-all border border-slate-850 hover:border-indigo-500 flex items-center justify-center font-black text-lg select-none active:scale-90 cursor-pointer shadow-sm text-slate-100"
          >
            0
          </button>
          
          <button
            onClick={handleBackspace}
            className="h-16 w-16 mx-auto rounded-full hover:bg-slate-850 transition-all flex items-center justify-center text-slate-400 active:scale-90 cursor-pointer"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Info Footnote */}
        <div className="text-center">
          <p className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest max-w-[260px] mx-auto leading-relaxed">
            {isPinSetupNeeded 
              ? 'Wähle einen Code, den du dir leicht merken kannst. Mit diesem sperrst und entsperrst du die App jederzeit.' 
              : 'Verhindert unbefugte Blicke von Schülern auf Noten & Förderdaten, wenn du vom Lehrertisch weggehst.'}
          </p>
          
          {!isPinSetupNeeded && (
            <button
              onClick={() => {
                if (window.confirm('Möchtest du eine neue Datenschutz-PIN festlegen?')) {
                  setApp(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      privacyPin: ''
                    }
                  }));
                  setEnteredPin('');
                  setNewPin('');
                  setSetupStep(1);
                  showToast('Bitte richte eine neue PIN ein.', 'info');
                }
              }}
              className="mt-6 inline-flex items-center gap-1 text-[0.625rem] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 hover:underline cursor-pointer"
            >
              <RefreshCw size={10} className="animate-spin-slow" />
              PIN zurücksetzen / ändern
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
