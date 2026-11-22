import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const button = 'min-h-11 rounded-xl border border-current/25 px-3 text-sm font-semibold';
const input = 'min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-text-primary';

export default function AlleZeigen() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'prepare' | 'think' | 'show'>('prepare');
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState(['', '', '']);
  const [count, setCount] = useState(3);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  return <>
    <button type="button" className={button} onClick={() => { setPhase('prepare'); setOpen(true); }}>Alle zeigen</button>
    {open && createPortal(
      <dialog ref={dialog} aria-labelledby="alle-zeigen-title" onClose={() => setOpen(false)}
        onKeyDown={event => event.stopPropagation()}
        className="fixed inset-0 m-auto max-h-[92dvh] w-[min(94vw,54rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-5 text-text-primary shadow-2xl backdrop:bg-black/60">
        <header className="mb-4 flex items-center justify-between gap-2">
          <h2 id="alle-zeigen-title" className="text-xl font-bold">Alle zeigen</h2>
          <button type="button" className={button} onClick={() => dialog.current?.close()}>Schließen</button>
        </header>
        {phase === 'prepare' ? <form className="space-y-3" onSubmit={event => { event.preventDefault(); setPhase('think'); }}>
          <label className="block font-semibold">Frage
            <input className={input} placeholder="Frage mündlich stellen oder hier eintragen" value={question} onChange={event => setQuestion(event.target.value)} />
          </label>
          <label className="block font-semibold">Anzahl der Antworten
            <select className={input} value={count} onChange={event => setCount(Number(event.target.value))}>
              <option value={2}>2 Antworten</option><option value={3}>3 Antworten</option>
            </select>
          </label>
          {answers.slice(0, count).map((answer, index) => <label key={index} className="block">Antwort {index + 1}
            <input className={input} value={answer} placeholder="Optional für die Tafel" onChange={event => {
              const value = event.target.value;
              setAnswers(previous => previous.map((entry, i) => i === index ? value : entry));
            }} />
          </label>)}
          <button className={button + ' bg-accent text-accent-text'}>Denkzeit starten</button>
        </form> : <>
          {question.trim() && <p className="mb-4 break-words text-3xl font-bold">{question}</p>}
          <p role="status" className="mb-4 text-2xl font-bold">{phase === 'think' ? 'Überlege in Ruhe.' : 'Jetzt alle zeigen!'}</p>
          <ol className="mb-5 grid gap-2">
            {answers.slice(0, count).map((answer, index) => <li key={index} className="flex items-center gap-4 rounded-xl border border-border p-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-3xl font-bold text-accent-text">{index + 1}</span>
              <span className="min-w-0 break-words text-2xl">{answer.trim() || (index + 1) + ' Finger'}</span>
            </li>)}
          </ol>
          {phase === 'think' ? <button className={button} onClick={() => setPhase('show')}>Zeichen geben</button>
            : <button className={button} onClick={() => { setQuestion(''); setAnswers(['', '', '']); setPhase('prepare'); }}>Neue Frage</button>}
        </>}
      </dialog>, document.body)}
  </>;
}
