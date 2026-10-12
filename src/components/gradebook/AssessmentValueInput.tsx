import React, { useEffect, useId, useRef, useState } from 'react';
import type { AssessmentMode } from '../../types';
import { parseAssessmentInput } from '../../lib/GradeUtils';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string | number;
  mode: AssessmentMode;
  maxPoints: number;
  onCommit: (text: string) => void;
};

export default function AssessmentValueInput({ value, mode, maxPoints, onCommit, onKeyDown, onBlur, ...props }: Props) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const dirty = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const range = mode === 'grades' ? '1–5' : mode === 'percent' ? '0–100 %' : `0–${maxPoints} Punkte`;
  const message = `Bitte ${range} oder einen gültigen Status eingeben. Die Änderung wurde noch nicht übernommen.`;
  const discard = () => {
    dirty.current = false; setDraft(String(value)); setInvalid(false);
    input.current?.setCustomValidity('');
  };
  useEffect(discard, [value, mode, maxPoints]);
  const commit = (report: boolean) => {
    if (!dirty.current) return true;
    const text = input.current?.value ?? draft;
    const parsed = parseAssessmentInput(text, mode, maxPoints);
    if (!parsed.valid) {
      setInvalid(true); input.current?.setCustomValidity(message);
      if (report) input.current?.reportValidity();
      return false;
    }
    dirty.current = false; setInvalid(false); input.current?.setCustomValidity('');
    setDraft(parsed.value === null ? '' : String(parsed.value));
    onCommit(text);
    return true;
  };
  return <>
    <input {...props} ref={input} type="text" value={draft}
      aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : props['aria-describedby']}
      title={invalid ? message : props.title}
      onChange={event => { dirty.current = true; setDraft(event.target.value); setInvalid(false); event.currentTarget.setCustomValidity(''); }}
      onBlur={event => { commit(false); onBlur?.(event); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); discard(); return; }
        if (['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && !commit(true)) {
          event.preventDefault(); event.stopPropagation(); return;
        }
        onKeyDown?.(event);
      }}
      style={{ ...props.style, ...(invalid ? { outline: '2px solid #be123c' } : {}) }}
    />
    {invalid && <span id={errorId} role="alert" className="sr-only">{message}</span>}
  </>;
}
