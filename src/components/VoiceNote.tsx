import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, X, Save, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { askAI } from '../services/aiService';
import { logObservation } from '../lib/utils';
import type { AppNote } from '../types';

type SpeechMode = 'local' | 'browser';

const SPEECH_LANGUAGES = ['de-AT', 'de-DE'] as const;

const speechErrorMessage = (errorCode: string, mode: SpeechMode): string => {
  switch (errorCode) {
    case 'network':
      return mode === 'local'
        ? 'Die lokale Spracherkennung konnte nicht gestartet werden. Bitte erneut versuchen.'
        : 'Die Online-Spracherkennung des Browsers ist gerade nicht erreichbar. Klassio prüft beim nächsten Start erneut, ob lokale Spracherkennung verfügbar ist.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Mikrofonzugriff wurde blockiert. Bitte erlaube klassio.at den Mikrofonzugriff in den Browser-Einstellungen und versuche es erneut.';
    case 'audio-capture':
      return 'Kein Mikrofon verfügbar. Bitte prüfe, ob ein Mikrofon angeschlossen und im Browser freigegeben ist.';
    case 'language-not-supported':
      return 'Das deutsche Sprachpaket ist auf diesem Gerät noch nicht verfügbar. Bitte erneut versuchen oder den Browser aktualisieren.';
    case 'aborted':
      return '';
    default:
      return 'Spracherkennung konnte nicht gestartet werden (' + errorCode + '). Bitte erneut versuchen.';
  }
};

export default function VoiceNote() {
  const { app, setApp } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [speechMode, setSpeechMode] = useState<SpeechMode>('browser');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [category, setCategory] = useState<AppNote['kategorie']>('Notiz');

  const recognitionRef = useRef<any>(null);
  const speechRecognitionCtorRef = useRef<any>(null);
  const wantsRecordingRef = useRef(false);
  const speechModeRef = useRef<SpeechMode>('browser');
  const restartTimerRef = useRef<number | null>(null);

  // If no student is selected, it's boolean true. Otherwise, it's the student ID.
  const isModalOpen = !!app.stimmNotizModal;
  const targetStudentId = typeof app.stimmNotizModal === 'string' ? app.stimmNotizModal : undefined;

  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      setError('Sprachaufnahme wird von diesem Browser nicht unterstützt. Bitte verwende einen aktuellen Chrome- oder Edge-Browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    speechRecognitionCtorRef.current = SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'de-AT';
    recognitionRef.current.continuous = false;
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
        setTranscript(prev => [prev.trim(), currentFinal.trim()].filter(Boolean).join(' '));
        setInterimTranscript('');
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      if (event.error === 'no-speech') return;

      if (event.error !== 'aborted') {
        const message = speechErrorMessage(event.error, speechModeRef.current);
        if (message) setError(message);
      }

      wantsRecordingRef.current = false;
      setIsRecording(false);
      setInterimTranscript('');
    };

    recognitionRef.current.onend = () => {
      if (wantsRecordingRef.current && recognitionRef.current) {
        restartTimerRef.current = window.setTimeout(() => {
          if (!wantsRecordingRef.current || !recognitionRef.current) return;
          try {
            recognitionRef.current.start();
            setIsRecording(true);
          } catch {
            wantsRecordingRef.current = false;
            setIsRecording(false);
            setError('Spracherkennung konnte nicht fortgesetzt werden. Bitte erneut starten.');
          }
        }, 180);
        return;
      }

      setIsRecording(false);
    };

    return () => {
      wantsRecordingRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Browser may already have stopped recognition.
        }
      }
    };
  }, []);

  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
  };

  const prepareRecognition = async () => {
    const SpeechRecognition = speechRecognitionCtorRef.current;
    const recognition = recognitionRef.current;

    if (!SpeechRecognition || !recognition) {
      throw new Error('speech-unsupported');
    }

    await requestMicrophonePermission();

    const supportsOnDevice =
      'processLocally' in recognition &&
      typeof SpeechRecognition.available === 'function';

    if (supportsOnDevice) {
      for (const lang of SPEECH_LANGUAGES) {
        try {
          const availability = await SpeechRecognition.available({
            langs: [lang],
            processLocally: true,
          });

          if (availability === 'available') {
            recognition.processLocally = true;
            recognition.lang = lang;
            recognition.continuous = true;
            speechModeRef.current = 'local';
            setSpeechMode('local');
            return;
          }

          if (
            (availability === 'downloadable' || availability === 'downloading') &&
            typeof SpeechRecognition.install === 'function'
          ) {
            const installed = await SpeechRecognition.install({
              langs: [lang],
              processLocally: true,
            });

            if (installed) {
              recognition.processLocally = true;
              recognition.lang = lang;
              recognition.continuous = true;
              speechModeRef.current = 'local';
              setSpeechMode('local');
              return;
            }
          }
        } catch {
          // Experimental on-device API is not available in every Chromium build.
          // Fall through to the browser speech service without breaking dictation.
        }
      }
    }

    if ('processLocally' in recognition) {
      recognition.processLocally = false;
    }
    recognition.lang = 'de-AT';
    // Short browser-managed sessions are more stable than one long continuous cloud session.
    // onend restarts them while the user still wants to dictate.
    recognition.continuous = false;
    speechModeRef.current = 'browser';
    setSpeechMode('browser');
  };

  const toggleRecording = async () => {
    if (isPreparing) return;

    if (isRecording) {
      wantsRecordingRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      try {
        recognitionRef.current?.stop();
      } catch {
        // Already stopped.
      }
      setIsRecording(false);
      setInterimTranscript('');
      return;
    }

    setError('');
    setInterimTranscript('');
    setIsPreparing(true);

    try {
      await prepareRecognition();
      wantsRecordingRef.current = true;
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch (e: any) {
      wantsRecordingRef.current = false;
      setIsRecording(false);

      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        setError(speechErrorMessage('not-allowed', speechModeRef.current));
      } else if (e?.name === 'NotFoundError') {
        setError(speechErrorMessage('audio-capture', speechModeRef.current));
      } else {
        setError('Konnte Mikrofon oder Spracherkennung nicht starten. Bitte prüfe die Mikrofonfreigabe und versuche es erneut.');
      }
    } finally {
      setIsPreparing(false);
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
    const cleanedTranscript = transcript.trim();
    if (!cleanedTranscript) return;

    // Every saved voice note becomes a normal central note as well.
    // stimmNotizen stays as the legacy/audio transcript archive.
    logObservation(
      setApp,
      targetStudentId,
      cleanedTranscript,
      category,
      'Sprachnotiz / Transkription',
    );

    const newNote = {
      id: 'voice-' + Date.now(),
      datum: new Date().toISOString(),
      dauer: 0,
      transkription: cleanedTranscript,
      kategorie: category,
      schuelerId: targetStudentId,
      gespeichertAls: 'Notizen-Hauptbereich'
    };

    setApp(prev => ({
      ...prev,
      stimmNotizen: [...(prev.stimmNotizen || []), newNote],
      stimmNotizModal: false
    }));

    setTranscript('');
    setInterimTranscript('');
    setCategory('Notiz');
  };

  const close = () => {
    wantsRecordingRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Already stopped.
      }
    }
    setApp(prev => ({ ...prev, stimmNotizModal: false }));
    setTranscript('');
    setInterimTranscript('');
    setCategory('Notiz');
    setError('');
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900">Notiz diktieren</h2>
            {targetStudentId && (
              <p className="text-[0.6875rem] uppercase tracking-widest font-bold text-slate-400 mt-1">Für Schüler:in</p>
            )}
          </div>
          <button onClick={close} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 text-rose-700 rounded-2xl mb-5">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-[0.875rem] leading-snug font-medium">{error}</p>
                <p className="text-[0.6875rem] font-bold mt-1 text-rose-500">Du kannst unten direkt erneut versuchen.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <button
              onClick={toggleRecording}
              disabled={isPreparing}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-60 ${
                isRecording ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isRecording && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-75"></span>
                  <span className="absolute -inset-4 rounded-full border border-rose-300 animate-pulse opacity-50"></span>
                </>
              )}
              {isPreparing ? <Loader2 size={32} className="animate-spin" /> : <Mic size={32} />}
            </button>
            <div className="mt-4 text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 text-center">
              {isPreparing
                ? 'Spracherkennung wird vorbereitet ...'
                : isRecording
                  ? `Aufnahme läuft · ${speechMode === 'local' ? 'lokal auf diesem Gerät' : 'Browser-Spracherkennung'}`
                  : 'Klicken um zu sprechen'}
            </div>
            {speechMode === 'local' && !isRecording && !isPreparing && (
              <div className="mt-1 text-[0.625rem] font-bold text-emerald-600">Lokale Spracherkennung verfügbar</div>
            )}
          </div>

          <div className="relative">
            <textarea
              value={transcript + (isRecording && interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '')}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transkription erscheint hier und kann vor dem Speichern korrigiert werden..."
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
                onChange={e => setCategory(e.target.value as AppNote['kategorie'])}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-[0.875rem] leading-snug font-bold text-slate-700 focus:outline-none"
              >
                <option value="Notiz">Notiz</option>
                <option value="Verhalten">Beobachtung / Verhalten</option>
                <option value="Erfolg">Erfolg / Stärke</option>
                <option value="Eltern">Elternkontakt</option>
                <option value="Journal">Klassenjournal</option>
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
