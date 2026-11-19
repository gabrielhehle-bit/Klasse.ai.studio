import {
  COCKPIT_STUDENT_SCOPES,
  normalizeCockpitStudentScope,
  type CockpitStudentScope,
} from '../../lib/cockpitStudentScope';

interface Props {
  scope: CockpitStudentScope;
  present: number;
  open: number;
  currentIsLight: boolean;
  onChange: (scope: CockpitStudentScope) => void;
  disabled?: boolean;
}

export function CockpitStudentScopeControl({ scope, present, open, currentIsLight, onChange, disabled }: Props) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5">
      <select aria-label="Teilnehmende Kinder" value={scope} disabled={disabled}
        onChange={event => onChange(normalizeCockpitStudentScope(event.currentTarget.value))}
        className={`min-h-11 max-w-full rounded-lg border px-2 text-xs font-semibold disabled:opacity-60 ${
          currentIsLight ? 'border-slate-300 bg-white text-slate-800' : 'border-zinc-600 bg-zinc-900 text-zinc-100'
        }`}>
        {COCKPIT_STUDENT_SCOPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <span data-cockpit-check-in-count className="whitespace-nowrap text-xs font-semibold tabular-nums opacity-75"
        aria-live="polite">{present} da · {open} offen</span>
    </div>
  );
}
