import { CLASSROOM_WEEKLY_TASK_KINDS, type ClassroomWeeklyTaskDetails, type ClassroomWeeklyTaskKind } from '../../lib/classroomWeeklyPlan';

export function ChildWeekTaskFields({ details, onChange }: {
  details: ClassroomWeeklyTaskDetails;
  onChange: (details: ClassroomWeeklyTaskDetails) => void;
}) {
  return <div className="space-y-3 text-sm font-semibold text-slate-800">
    <label className="block">
      Aufgabenart
      <select value={details.wochenplanAufgabenart}
        onChange={event => onChange({ ...details, wochenplanAufgabenart: event.target.value as ClassroomWeeklyTaskKind })}
        className="mt-1 block min-h-11 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm">
        {Object.entries(CLASSROOM_WEEKLY_TASK_KINDS).map(([kind, label]) => (
          <option key={kind} value={kind}>{label}</option>
        ))}
      </select>
    </label>
    <label className="block">
      Auftrag für die Kinder (optional)
      <textarea value={details.wochenplanAuftrag} onChange={event => onChange({ ...details, wochenplanAuftrag: event.target.value })}
        rows={2} placeholder="z. B. Lege 15 Plättchen und zeichne sie ins Heft."
        className="mt-1 block min-h-16 w-full rounded-xl border border-indigo-200 bg-white p-3 text-sm" />
    </label>
  </div>;
}
