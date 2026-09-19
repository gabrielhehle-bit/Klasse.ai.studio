import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = {
  new (): RecognitionInstance;
  available?: (args: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (args: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
};
const errorMessage = (code: string): string => {
  switch (code) {
    case 'not-allowed': case 'service-not-allowed':
      return 'Mikrofonzugriff blockiert. Bitte klassio.at in den Browser-Einstellungen den Mikrofonzugriff erlauben und erneut versuchen.';
    case 'audio-capture': return 'Kein Mikrofon erkannt. Bitte Mikrofon anschließen und die Systemfreigabe prüfen.';
    case 'network': return 'Der Spracherkennungsdienst ist nicht erreichbar. Du kannst den Text direkt eintippen oder erneut versuchen.';
    case 'language-not-supported': return 'Das deutsche Sprachpaket wird auf diesem Gerät nicht unterstützt.';
    case 'no-speech': return 'Keine Sprache erkannt. Bitte erneut sprechen.';
    case 'aborted': return '';
    default: return 'Spracherkennung fehlgeschlagen. Bitte Mikrofonfreigabe prüfen und erneut versuchen.';
  }
};

/** Dictation is a text input, never a separate persisted note. The caller saves once via its usual workflow. */
export function useInlineDictation(onFinalText: (text: string) => void) {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'recording'>('idle');
  const [mode, setMode] = useState<'local' | 'browser' | null>(null);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const activeRef = useRef(false);
  const onFinalRef = useRef(onFinalText);
  const sessionRef = useRef(0);
  onFinalRef.current = onFinalText;

  const stop = useCallback(() => {
    sessionRef.current += 1;
    activeRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch { /* already stopped */ }
    }
    setStatus('idle');
    setInterim('');
  }, []);

  useEffect(() => () => {
    sessionRef.current += 1;
    activeRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch { /* already ended */ }
    }
  }, []);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    const Constructor = ((window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition) as RecognitionConstructor | undefined;
    if (!Constructor) {
      setError('Spracherkennung ist in diesem Browser nicht verfügbar. Bitte einen aktuellen Chrome- oder Edge-Browser verwenden oder den Text eintippen.');
      return;
    }
    const session = ++sessionRef.current;
    activeRef.current = true;
    setStatus('preparing');
    setError('');
    setInterim('');
    let speechMode: 'local' | 'browser' = 'browser';
    let language = 'de-AT';
    const recognition = new Constructor();
    recognitionRef.current = recognition;
    try {
      if ('processLocally' in recognition && typeof Constructor.available === 'function') {
        for (const lang of ['de-AT', 'de-DE']) {
          try {
            let availability = await Constructor.available({ langs: [lang], processLocally: true });
            if ((availability === 'downloadable' || availability === 'downloading') && typeof Constructor.install === 'function') {
              const installed = await Constructor.install({ langs: [lang], processLocally: true });
              if (installed) availability = 'available';
            }
            if (availability === 'available') {
              speechMode = 'local';
              language = lang;
              recognition.processLocally = true;
              break;
            }
          } catch { /* experimental on-device API may be unavailable */ }
        }
      }
      if (session !== sessionRef.current) return;
      if (speechMode === 'browser') {
        // Browser speech APIs can transmit audio to an external recognition service.
        const approved = window.confirm('Lokale Spracherkennung ist hier nicht verfügbar. Die Browser-Spracherkennung kann Audio an einen externen Dienst übertragen. Keine vertraulichen Schülerdaten diktieren. Trotzdem Browser-Spracherkennung starten?');
        if (!approved) {
          activeRef.current = false;
          recognitionRef.current = null;
          setStatus('idle');
          setError('Diktieren wurde nicht gestartet. Du kannst die Notiz direkt eintippen.');
          return;
        }
        if ('processLocally' in recognition) recognition.processLocally = false;
      }
      recognition.lang = language;
      recognition.continuous = speechMode === 'local';
      recognition.interimResults = true;
      recognition.onresult = event => {
        if (session !== sessionRef.current) return;
        let finalText = '';
        let interimText = '';
        // Process only the changed results to avoid repeating earlier finalized words.
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
        if (finalText.trim()) onFinalRef.current(finalText.trim());
        setInterim(interimText);
      };
      recognition.onerror = event => {
        if (session !== sessionRef.current) return;
        setError(errorMessage(event.error));
        activeRef.current = false;
        recognitionRef.current = null;
        setStatus('idle');
        setInterim('');
      };
      recognition.onend = () => {
        if (session !== sessionRef.current) return;
        activeRef.current = false;
        recognitionRef.current = null;
        setStatus('idle');
        setInterim('');
      };
      recognition.start();
      setMode(speechMode);
      setStatus('recording');
    } catch (cause: any) {
      if (session !== sessionRef.current) return;
      activeRef.current = false;
      recognitionRef.current = null;
      setStatus('idle');
      setError(cause?.name === 'NotAllowedError'
        ? errorMessage('not-allowed')
        : cause?.name === 'NotFoundError' ? errorMessage('audio-capture') : errorMessage('unknown'));
    }
  }, []);

  return { start, stop, status, mode, interim, error };
}
