import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, X, Save, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askAI } from '../services/aiService';

export default function VoiceNote() {
  const { app, setApp } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [category, setCategory] = useState('Unterricht');
  
  const recognitionRef = useRef<any>(null);
  
  // If no student is selected, it's boolean true. Otherwise, it's the student ID.
  const isModalOpen = !!app.stimmNotizModal;
  const targetStudentId = typeof app.stimmNotizModal === 'string' ? app.stimmNotizModal : undefined;

  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      setError('Sprachaufnahme wird von diesem Browser nicht unterstützt');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'de-AT';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event: any) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentFinal += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(currentInterim);
      if (currentFinal) {
        setTranscript(prev => prev + ' ' + currentFinal);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
         setError('Fehler bei der Aufnahme: ' + event.error);
         setIsRecording(false);
      }
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (error) return;
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setInterimTranscript('');
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
         setError('Konnte Mikrofon nicht starten.');
      }
    }
  };

  const enhanceWithAI = async () => {
    if (!transcript.trim()) return;
    setIsProcessingAI(true);
    try {
      const response = await askAI(
        'ki-helfer',
        'Du bist ein Assistent für Lehrerinnen und Lehrer. Bereinige folgenden transkribierten Sprachtext: korrigiere offensichtliche Erkennungsfehler, füge Satzzeichen hinzu, behalte den Inhalt vollständig. Antworte nur mit dem verbesserten Text, ohne Kommentare.\n\n' + transcript
      );
      if (response) {
        setTranscript(response.trim());
      }
    } catch (e: any) {
      console.error(e);
      alert('KI-Verbesserung nicht möglich: ' + e.message);
    }
    setIsProcessingAI(false);
  };

  const saveNote = () => {
    if (!transcript.trim()) return;
    const newNote = {
      id: 'voice-' + Date.now(),
      datum: new Date().toISOString(),
      dauer: 0,
      transkription: transcript.trim(),
      kategorie: category,
      schuelerId: targetStudentId
    };
    
    setApp(prev => ({
      ...prev,
      stimmNotizen: [...(prev.stimmNotizen || []), newNote],
      stimmNotizModal: false
    }));
    
    // reset
    setTranscript('');
    setCategory('Unterricht');
  };

  const close = () => {
    if (isRecording) recognitionRef.current?.stop();
    setApp(prev => ({ ...prev, stimmNotizModal: false }));
    setTranscript('');
    setError('');
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg  border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900">Sprachnotiz aufnehmen</h2>
            {targetStudentId && (
              <p className="text-[0.6875rem] uppercase tracking-widest font-bold text-slate-400 mt-1">Für Schüler:in</p>
            )}
          </div>
          <button onClick={close} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {error ? (
            <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl mb-6">
              <AlertCircle size={20} />
              <p className="text-[0.875rem] leading-snug font-medium">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-6">
              <button 
                onClick={toggleRecording}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isRecording ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isRecording && (
                   <>
                     <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-75"></span>
                     <span className="absolute -inset-4 rounded-full border border-rose-300 animate-pulse opacity-50"></span>
                   </>
                )}
                <Mic size={32} />
              </button>
              <div className="mt-4 text-[0.6875rem] font-black uppercase tracking-widest text-slate-400">
                {isRecording ? 'Aufnahme läuft ... (Klicken zum Stoppen)' : 'Klicken um zu sprechen'}
              </div>
            </div>
          )}

          <div className="relative">
             <textarea 
               value={transcript + (isRecording ? interimTranscript : '')}
               onChange={(e) => setTranscript(e.target.value)}
               placeholder="Transkription erscheint hier..."
               className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[0.875rem] leading-snug text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/20"
               disabled={isRecording}
             />
             {!isRecording && transcript && (
               <button 
                 onClick={enhanceWithAI}
                 disabled={isProcessingAI}
                 className="absolute top-2 right-2 p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all shadow-sm flex items-center gap-2 text-[0.75rem] leading-tight font-bold"
                 title="Mit KI verbessern (Rechtschreibung/Satzzeichen)"
               >
                 {isProcessingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                 <span>KI-Verbesserung</span>
               </button>
             )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
             <div className="flex-1">
               <select 
                 value={category}
                 onChange={e => setCategory(e.target.value)}
                 className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-[0.875rem] leading-snug font-bold text-slate-700 focus:outline-none"
               >
                 <option value="Unterricht">Unterricht</option>
                 <option value="Kind">Kind</option>
                 <option value="Eltern">Eltern</option>
                 <option value="Sonstiges">Sonstiges</option>
               </select>
             </div>
             <button 
               onClick={saveNote}
               disabled={!transcript.trim() || isRecording}
               className="flex-1 h-12 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[0.6875rem] rounded-2xl transition-colors disabled:opacity-50"
             >
               <Save size={16} /> Speichern
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
