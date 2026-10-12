import React, { useEffect, useId, useRef, useState } from 'react';
import { parseParticipationPointsDraft } from '../../lib/participationPointsDraft';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onFocus' | 'type'> & {
  value: number;
  onCommit: (value: number) => void;
};
const format = (value: number) => value === 0 ? '' : String(value);
const message = 'Bitte eine ganze Zahl ab 0 eingeben. Die Änderung wurde noch nicht gespeichert.';

export default function ParticipationPointsInput({ value, onCommit, onKeyDown, ...props }: Props) {
  const [draft, setDraft] = useState(() => format(value));
  const [invalid, setInvalid] = useState(false);
  const dirty = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  // External counter updates are authoritative, including a concurrent +/- edit.
  useEffect(() => {
    dirty.current = false;
    setDraft(format(value)); setInvalid(false);
    input.current?.setCustomValidity('');
  }, [value]);
  const discard = () => {
    dirty.current = false;
    setDraft(format(value)); setInvalid(false);
    input.current?.setCustomValidity('');
  };
  const commit = (showValidation: boolean) => {
    if (!dirty.current) return true;
    if (!draft.trim()) { discard(); return true; }
    const parsed = parseParticipationPointsDraft(draft);
    if (parsed === null) {
      setInvalid(true); input.current?.setCustomValidity(message);
      if (showValidation) input.current?.reportValidity();
      return false;
    }
    dirty.current = false;
    setDraft(format(parsed)); setInvalid(false);
    input.current?.setCustomValidity('');
    if (parsed !== value) onCommit(parsed);
    return true;
  };
  return <>
    <input {...props} ref={input} type="text" inputMode="numeric" value={draft}
      aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : props['aria-describedby']}
      title={invalid ? message : 'Enter übernimmt, Escape verwirft. Leere Eingaben ändern den Zähler nicht.'}
      onChange={event => { dirty.current = true; setDraft(event.target.value); setInvalid(false); event.currentTarget.setCustomValidity(''); }}
      onBlur={() => { commit(false); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); discard(); return; }
        if (['Enter', 'ArrowUp', 'ArrowDown'].includes(event.key) && !commit(true)) {
          event.preventDefault(); event.stopPropagation(); return;
        }
        onKeyDown?.(event);
      }}
      style={{ ...props.style, ...(invalid ? { color: '#be123c', outline: '2px solid #be123c' } : {}) }}
    />
    {invalid && <span id={errorId} role="alert" className="sr-only">{message}</span>}
  </>;
}
