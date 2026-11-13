import React from 'react';
import { LESSON_SLOT_NUMBERS, TAGE_NAMEN } from '../../constants';

type Props = {
  dayIdx: number;
  hourIdx: number;
  timeLabels: string[];
  canRestore: boolean;
  message: string;
  onDayChange: (dayIdx: number) => void;
  onHourChange: (hourIdx: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Works on touchscreens and with the keyboard; actual writes happen only in
 * the parent's guarded restore transaction after rechecking the current data.
 */
export const GarageRestorePicker: React.FC<Props> = ({
  dayIdx, hourIdx, timeLabels, canRestore, message,
  onDayChange, onHourChange, onConfirm, onCancel,
}) => (
  <div data-garage-restore-picker draggable={false}
    className="mt-2 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3"
    onDragStart={event => event.stopPropagation()}>
    <div className="flex items-center justify-between gap-2">
      <h5 className="text-xs font-bold text-slate-800">Stunde einsetzen</h5>
      <button type="button" onClick={onCancel}
        className="min-h-9 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
        Abbrechen
      </button>
    </div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
        Tag
        <select aria-label="Zieltag für geparkte Stunde" value={dayIdx}
          onChange={event => onDayChange(Number(event.target.value))}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900">
          {TAGE_NAMEN.map((tag, index) =>
            <option key={tag} value={index}>{tag}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
        Stunde
        <select aria-label="Zielstunde für geparkte Stunde" value={hourIdx}
          onChange={event => onHourChange(Number(event.target.value))}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900">
          {LESSON_SLOT_NUMBERS.map((slot, index) =>
            <option key={slot} value={index}>
              {slot}. Stunde{timeLabels[index] ? ' · ' + timeLabels[index] : ''}
            </option>)}
        </select>
      </label>
    </div>
    <p role="status" className={`text-xs font-medium leading-relaxed ${canRestore ? 'text-emerald-800' : 'text-rose-800'}`}>
      {message}
    </p>
    <button type="button" data-garage-restore-confirm
      disabled={!canRestore} onClick={onConfirm}
      className="min-h-11 w-full rounded-xl bg-indigo-700 px-3 text-xs font-bold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
      In diese Stunde einsetzen
    </button>
  </div>
);
