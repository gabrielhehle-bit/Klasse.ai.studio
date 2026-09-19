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
export function extractSpeechResults(event: any, committedIndices: Set<number>) {
  let finalText = '';
  let interimText = '';
  for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
    const result = event.results[i];
    const spokenText = String(result?.[0]?.transcript || '').trim();
    if (!spokenText) continue;
    if (result.isFinal) {
      if (!committedIndices.has(i)) {
        committedIndices.add(i);
        finalText = [finalText, spokenText].filter(Boolean).join(' ');
      }
    } else {
      interimText = [interimText, spokenText].filter(Boolean).join(' ');
    }
  }
  return { finalText, interimText };
}

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
  const [status, setStatus] = useState<'idle' | 'preparing' | 'recording' | 'stopping'>('idle');
  const [mode, setMode] = useState<'local' | 'browser' | null>(null);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const activeRef = useRef(false);
  const onFinalRef = useRef(onFinalText);
  const sessionRef = useRef(0);
  const committedIndicesRef = useRef(new Set<number>());
  onFinalRef.current = onFinalText;

  const stop = useCallback(() => {
    activeRef.current = false;
    const recognition = recognitionRef.current;
    if (recognition) {
      // Do NOT detach onresult here: Chrome can still deliver the final phrase
      // after stop() and before onend. Saving stays disabled in this phase.
      setStatus('stopping');
      try { recognition.stop(); } catch {
        recognitionRef.current = null;
        setStatus('idle');
        setInterim('');
      }
    } else {
      sessionRef.current += 1; // cancel pending availability / language downloads
      setStatus('idle');
      setInterim('');
    }
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
    committedIndicesRef.current = new Set<number>();
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
        const { finalText, interimText } = extractSpeechResults(event, committedIndicesRef.current);
        if (finalText) onFinalRef.current(finalText);
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
