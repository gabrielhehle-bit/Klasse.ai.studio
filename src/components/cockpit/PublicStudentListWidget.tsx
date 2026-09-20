import React, { useEffect, useMemo, useState } from 'react';
import type { AppState, Student } from '../../types';
import { getDisplayStudentName } from './studentSelectionUtils';
import { useRef } from 'react';
import { useWidgetSize } from './widgetLayout';
import { getStudentGridLayout } from '../../lib/studentWidgetGrid';

interface Props {
  app: AppState;
  getTodayPoints: (studentId: string) => number;
  addParticipation: (studentId: string, event?: React.MouseEvent) => void;
  removeParticipation: (studentId: string) => void;
  /** Provided only inside the movable CockpitWidget, never for the narrow sidebar. */
  onExpand?: () => void;
}

/**
 * Nur für die öffentliche, duplizierte Unterrichtsfläche. Interne Status,
 * Notizen, Diagnosen, Abwesenheitsgründe und negative Verhaltensbewertungen
 * werden weder aus app gelesen noch als Props an diese Komponente gereicht.
 *
 * Korrekturen werden ausschließlich nach einem bewussten Plus-Klick in dieser
 * Ansicht angeboten; bestehende Mitarbeitspunkte bleiben im AppState.
 */
export function PublicStudentListWidget({
  app,
  getTodayPoints,
  addParticipation,
  removeParticipation,
  onExpand,
}: Props) {
  const students = app.schueler ?? [];
  const containerRef = useRef<HTMLElement>(null);
  const size = useWidgetSize(containerRef);
  const grid = getStudentGridLayout(size.width, size.height, students.length, { reservedHeight: 92, minCardWidth: 170, minCardHeight: 58, gap: 6 });
  const gridMode = Boolean(onExpand);
  const [compact, setCompact] = useState(false);
  const [lastAwardedId, setLastAwardedId] = useState<string | null>(null);
  const [recentlyAwardedId, setRecentlyAwardedId] = useState<string | null>(null);

  useEffect(() => {
    setLastAwardedId(null);
    setRecentlyAwardedId(null);
  }, [app.activeClassId]);

  const labels = useMemo(() => {
    const result = new Map<string, string>();
    const previous = new Map<string, number>();
    const baseNames = students.map(student => getDisplayStudentName(student, students));
    const multiplicity = new Map<string, number>();
    baseNames.forEach(label => multiplicity.set(label, (multiplicity.get(label) || 0) + 1));
    students.forEach((student, index) => {
      const base = baseNames[index];
      const number = (previous.get(base) || 0) + 1;
      previous.set(base, number);
      result.set(student.id, (multiplicity.get(base) || 0) > 1 ? `${base} ${number}` : base);
    });
    return result;
  }, [students]);

  if (!app.activeClassId) {
    return <div role="status" className="flex h-full items-center justify-center p-5 text-center text-sm text-slate-700">
      Bitte zuerst eine Klasse auswählen.
    </div>;
  }

  if (students.length === 0) {
    return <div role="status" className="flex h-full items-center justify-center p-5 text-center text-sm text-slate-700">
      In dieser Klasse sind noch keine Kinder angelegt.
    </div>;
  }

  return (
    <section ref={containerRef} aria-label="Öffentliche Schülerliste und Pluspunkte" className="flex h-full min-h-0 flex-col gap-2 p-2 text-slate-900">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Unsere Pluspunkte</h3>
        <button
          type="button"
          aria-pressed={compact}
          onClick={() => setCompact(value => !value)}
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          {compact ? 'Große Ansicht' : 'Kompakt'}
        </button>
      </div>
      {gridMode && !grid.fits ? (
        <div role="status" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 p-4 text-center">
          <p className="text-sm font-semibold">{students.length} Kinder benötigen eine größere Widget-Fläche, damit alle Pluspunkte sichtbar und bedienbar sind.</p>
          <button type="button" onClick={onExpand}
            className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">
            Alle {students.length} Kinder groß anzeigen
          </button>
          <p className="text-xs text-slate-600">Falls das Gerät sehr klein ist, aktiviere den Vollbildmodus.</p>
        </div>
      ) : (
      <div className={gridMode ? 'grid min-h-0 flex-1 content-start gap-1.5 overflow-hidden' : 'min-h-0 flex-1 space-y-2 overflow-y-auto'}
        style={gridMode ? { gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))` } : undefined} role="list">
        {students.map((student: Student) => {
          const points = Math.max(0, getTodayPoints(student.id));
          const awarded = lastAwardedId === student.id;
          return (
            <div key={student.id} role="listitem"
              style={gridMode ? { minHeight: 58, height: Math.min(90, grid.cardHeight) } : undefined}
              className={`flex min-w-0 items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white ${gridMode ? 'px-1.5 py-1' : compact ? 'px-2 py-1' : 'px-3 py-2'}`}>
              <div className="min-w-0 flex-1">
                <span className={`block break-words font-semibold leading-tight ${gridMode ? 'text-xs sm:text-sm' : 'text-base'}`}>{labels.get(student.id)}</span>
                <span className="block text-sm font-medium text-amber-700" aria-label={`${points} Pluspunkte`}>
                  {gridMode ? `★ ${points}` : `${'★'.repeat(Math.min(points, 8))}${points > 8 ? '…' : ''} ${points}`}
                </span>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {awarded && (
                  <button
                    type="button"
                    onClick={() => {
                      if (getTodayPoints(student.id) > 0) removeParticipation(student.id);
                      setLastAwardedId(null);
                      setRecentlyAwardedId(null);
                    }}
                    className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                    aria-label={`Letzten Pluspunkt für ${labels.get(student.id)} rückgängig machen`}
                  >↶</button>
                )}
                <button
                  type="button"
                  onClick={event => {
                    addParticipation(student.id, event);
                    setLastAwardedId(student.id);
                    setRecentlyAwardedId(student.id);
                  }}
                  className="min-h-11 min-w-11 rounded-lg bg-emerald-600 px-3 text-lg font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                  aria-label={`Pluspunkt für ${labels.get(student.id)} vergeben`}
                >{recentlyAwardedId === student.id ? '✓ +1' : '+1'}</button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
