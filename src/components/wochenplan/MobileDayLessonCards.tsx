import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STUNDEN_INFO, MAX_LESSON_SLOTS } from '../../constants';
import { getFachHexColor } from '../../lib/fachColorUtils';
import { getChildTaskProgress, weekTaskKey } from '../../lib/classroomWeeklyPlan';
import { configuredLessonTime, isWeeklyLessonSlotCovered } from '../../lib/weeklyPlanData';

type Props = {
  day: string;
  plan: Record<string, any>;
  activeKW: number;
  isCurrent: (day: string, idx: number) => boolean;
  onOpen: (day: string, idx: number) => void;
  onToggleDone: (event: React.MouseEvent, day: string, idx: number) => void;
  onPark: (day: string, idx: number) => void;
  onToggleChildPlan: (day: string, idx: number) => void;
  onCopyLesson: (lesson: any) => void;
  copiedLesson: any | null;
  onPasteLesson: (event: React.MouseEvent, day: string, idx: number) => void;
  canPasteLesson: (day: string, idx: number) => boolean;
};

/** Read-only summaries plus explicit, separate actions. Never nest buttons or
 * create phantom free slots within a long or all-day teaching block.
 */
export const MobileDayLessonCards: React.FC<Props> = ({
  day, plan, activeKW, isCurrent, onOpen, onToggleDone, onPark,
  onToggleChildPlan, onCopyLesson, copiedLesson, onPasteLesson, canPasteLesson,
}) => {
  const { app } = useApp();
  const dayPlan = plan?.[day];
  const students = (app.schueler || []).filter(student => !student.id.startsWith('demo-'));
  return (
    <div className="space-y-2.5" data-weekly-day-cards>
      {Array.from({ length: MAX_LESSON_SLOTS }, (_, idx) => {
        if (isWeeklyLessonSlotCovered(dayPlan, idx)) return null;
        const item = dayPlan?.[idx];
        const subject = item?.fach || app.stammplan?.[day]?.[idx + 1] || '';
        const hasSavedLesson = Boolean(item && typeof item === 'object' && (item.fach || item.thema));
        const isDone = item?.erledigt === true || item?.completed === true;
        const mayPublishToChildren = Boolean(
          String(item?.fach || '').trim() && String(item?.thema || '').trim(),
        );
        const isPublished = item?.imKinderWochenplan === true;
        const canPasteHere = !hasSavedLesson && !!copiedLesson && canPasteLesson(day, idx);
        const current = isCurrent(day, idx);
        const materialsCount = Array.isArray(item?.materialIds) ? item.materialIds.length : 0;
        const childKey = weekTaskKey(app.schuljahr || '', activeKW, day, idx);
        const childDone = item?.imKinderWochenplan === true
          ? students.filter(student => getChildTaskProgress(student, childKey)?.done === true).length : 0;
        const accent = getFachHexColor(app.fachConfig?.[subject]?.color || subject);
        return (
          <div key={idx} data-weekly-day-card
            className={`overflow-hidden rounded-2xl border shadow-sm ${current
              ? 'border-emerald-400 bg-emerald-50/70 ring-1 ring-emerald-200'
              : hasSavedLesson ? 'border-slate-200 bg-white'
                : 'border-dashed border-slate-200 bg-slate-50/40'}`}
            style={{ borderLeftWidth: hasSavedLesson ? 5 : undefined,
              borderLeftColor: hasSavedLesson ? accent : undefined }}>
            <button type="button" onClick={() => onOpen(day, idx)}
              aria-label={`${idx + 1}. Stunde ${subject || 'ohne Fach'}: ${item?.thema || 'Planung öffnen'} bearbeiten`}
              className="flex min-h-16 w-full min-w-0 items-center gap-3 px-3 py-3 text-left hover:bg-indigo-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600">
              <span className="flex w-[5.25rem] shrink-0 flex-col gap-1 border-r border-slate-200 pr-2 text-xs font-extrabold text-slate-800">
                {idx + 1}. Stunde
                <span className="text-[0.6875rem] font-medium leading-tight text-slate-500">
                  {configuredLessonTime(app.stundenZeiten, STUNDEN_INFO, idx + 1)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-slate-600">{subject || 'Noch nicht belegt'}</span>
                <span className={`mt-0.5 block break-words text-[0.9375rem] font-semibold leading-snug ${isDone
                  ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                  {item?.thema || (subject ? 'Unterrichtsinhalt ergänzen' : '+ Stunde planen')}
                </span>
              </span>
              {current && <span className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-[0.6875rem] font-bold text-emerald-800">Jetzt</span>}
              <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            </button>
            {!hasSavedLesson && copiedLesson && (
              <div className="border-t border-indigo-100 px-3 py-2.5">
                <button type="button"
                  data-weekly-mobile-paste
                  disabled={!canPasteHere}
                  onClick={event => onPasteLesson(event, day, idx)}
                  aria-label={`Kopierte Stunde in ${idx + 1}. Stunde am ${day} einfügen`}
                  title={canPasteHere
                    ? 'Kopierte Unterrichtsstunde sicher hier einfügen'
                    : 'Dieser Platz ist durch eine andere Unterrichtseinheit belegt'}
                  className="min-h-11 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                  {canPasteHere
                    ? `Kopierte Stunde hier einfügen`
                    : 'Einfügen hier nicht möglich'}
                </button>
              </div>
            )}
            {hasSavedLesson && (
              <div className="border-t border-slate-100 px-3 pb-2.5 pt-2">
                <div data-weekly-day-badges className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`rounded-md px-2 py-1 text-[0.6875rem] font-bold ${isDone
                    ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                    {isDone ? 'Erledigt' : 'Geplant'}
                  </span>
                  {item.duration === 'all'
                    ? <span className="rounded-md bg-indigo-50 px-2 py-1 text-[0.6875rem] font-bold text-indigo-800">Restlicher Tag</span>
                    : typeof item.duration === 'number' && item.duration > 1
                      ? <span className="rounded-md bg-indigo-50 px-2 py-1 text-[0.6875rem] font-bold text-indigo-800">{item.duration} Stunden</span>
                      : null}
                  {(item.housework || item.hue) && (
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-[0.6875rem] font-bold text-teal-800">Hausübung</span>
                  )}
                  {(materialsCount > 0 || item.material) && (
                    <span className="rounded-md bg-sky-50 px-2 py-1 text-[0.6875rem] font-bold text-sky-800">
                      {materialsCount > 0 ? `${materialsCount} Materialien` : 'Material'}
                    </span>
                  )}
                  {isPublished && (
                    <span className="rounded-md bg-violet-50 px-2 py-1 text-[0.6875rem] font-bold text-violet-800">
                      Für Kinder sichtbar{students.length ? ` · ${childDone}/${students.length} fertig` : ''}
                    </span>
                  )}
                </div>
                {(item.housework || item.hue) && (
                  <p className="mt-2 line-clamp-2 break-words text-xs text-slate-600">
                    Hausübung: {item.housework || item.hue}
                  </p>
                )}
                {Array.isArray(item.schwerpunkte) && item.schwerpunkte.length > 0 && (
                  <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-600">
                    {item.schwerpunkte.join(' · ')}
                  </p>
                )}
                {item.halves?.enabled && (
                  <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-600">
                    1. Hälfte: {item.halves.first?.thema || '—'} · 2. Hälfte: {item.halves.second?.thema || '—'}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2" data-weekly-day-actions>
                  {mayPublishToChildren && (
                    <button type="button"
                      data-weekly-mobile-child-toggle
                      aria-pressed={isPublished}
                      aria-label={isPublished ? 'Aus Kinderplan entfernen' : 'Zum Kinderplan hinzufügen'}
                      title={isPublished
                        ? 'Aufgabe aus dem Kinder-Wochenplan nehmen – vorhandene Rückmeldungen bleiben gespeichert'
                        : 'Aufgabe für den Kinder-Wochenplan freigeben'}
                      onClick={() => onToggleChildPlan(day, idx)}
                      className={`min-h-11 rounded-xl border px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${isPublished
                        ? 'border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100'
                        : 'border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100'}`}>
                      {isPublished ? 'Aus Kinderplan nehmen' : 'Für Kinder freigeben'}
                    </button>
                  )}
                  <button type="button"
                    data-weekly-mobile-copy
                    onClick={() => onCopyLesson(item)}
                    aria-label={`${idx + 1}. Stunde kopieren`}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                    Kopieren
                  </button>
                  <button type="button"
                    onClick={event => onToggleDone(event, day, idx)}
                    aria-label={isDone ? `${idx + 1}. Stunde als unerledigt markieren`
                      : `${idx + 1}. Stunde als erledigt markieren`}
                    className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
                    {isDone ? 'Wieder öffnen' : 'Als erledigt markieren'}
                  </button>
                  <button type="button"
                    onClick={() => {
                      if (window.confirm('Diese Unterrichtsstunde in die Parkgarage verschieben? Sie bleibt dort vollständig erhalten.')) {
                        onPark(day, idx);
                      }
                    }}
                    aria-label={`${idx + 1}. Stunde in die Parkgarage verschieben`}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                    Parken
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
