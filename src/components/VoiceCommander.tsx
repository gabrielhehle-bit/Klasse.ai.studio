import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, MicOff, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseVoiceCommand } from '../services/aiService';

export function VoiceCommander() {
  const { app, setApp } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'de-DE';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onend = () => {
          setIsListening(false);
          // if we have a final transcript, process it
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessing) {
      handleVoiceCommand(transcript);
    }
  }, [isListening, transcript]);

  const handleVoiceCommand = async (text: string) => {
    setIsProcessing(true);
    try {
      const result = await parseVoiceCommand(text, app.schueler || []);
      
      if (result && result.studentIds && result.studentIds.length > 0) {
        setApp(prev => {
          const newState = { ...prev };
          
          if (result.action === 'ADD_MITARBEIT') {
            if (!newState.mitarbeit) newState.mitarbeit = {};
            const term = prev.schuljahr || '2025';
            
            result.studentIds.forEach((id: string) => {
              if (!newState.mitarbeit![id]) newState.mitarbeit![id] = {};
              if (!newState.mitarbeit![id]['Allgemein']) newState.mitarbeit![id]['Allgemein'] = {};
              
              const currentPoints = newState.mitarbeit![id]['Allgemein'][term] || 0;
              newState.mitarbeit![id]['Allgemein'][term] = currentPoints + (result.points || 1);
            });
            setLastAction(`${result.points || 1} Mitarbeitspunkte hinzugefügt`);
          } else if (result.action === 'ADD_BEHAVIOR') {
             if (!newState.journal) newState.journal = [];
             result.studentIds.forEach((id: string) => {
               (newState.journal as any).push({
                 id: crypto.randomUUID(),
                 schuelerId: id,
                 datum: new Date().toISOString(),
                 content: result.content,
                 type: 'behavior'
               });
             });
             setLastAction('Verhalten notiert');
          } else if (result.action === 'ADD_NOTE') {
             if (!newState.notes) newState.notes = [];
             result.studentIds.forEach((id: string) => {
               newState.notes!.push({
                 id: crypto.randomUUID(),
                 schuelerId: id,
                 datum: new Date().toISOString(),
                 inhalt: result.content,
                 kategorie: 'Verhalten', // or some default category
               });
             });
             setLastAction('Notiz gespeichert');
          }
          return newState;
        });
      } else {
        setLastAction("Konnte keinen Schüler zuordnen");
      }
    } catch (e) {
      console.error(e);
      setLastAction("Fehler bei der Verarbeitung");
    } finally {
      setIsProcessing(false);
      setTranscript('');
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setLastAction(null);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!recognitionRef.current) return null; // Browser doesn't support it

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-200 max-w-xs flex items-center gap-3"
          >
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <motion.div 
                  key={i}
                  animate={{ height: ['8px', '16px', '8px'] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  className="w-1.5 bg-indigo-500 rounded-full"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-slate-700 truncate">{transcript || "Ich höre..."}</p>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-200 max-w-xs flex items-center gap-3"
          >
            <Loader2 size={16} className="text-indigo-500 animate-spin" />
            <p className="text-sm font-medium text-slate-700">Verarbeite Befehl...</p>
          </motion.div>
        )}

        {lastAction && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-emerald-50 px-4 py-3 rounded-2xl shadow-xl border border-emerald-200 max-w-xs flex items-center gap-3"
          >
            <Check size={16} className="text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">{lastAction}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleListening}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105'}`}
        title="Sprachsteuerung"
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
      </button>
    </div>
  );
}
