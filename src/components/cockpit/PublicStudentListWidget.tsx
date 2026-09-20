import React, { useEffect, useMemo, useState } from 'react';
import type { AppState, Student } from '../../types';
import { getDisplayStudentName } from './studentSelectionUtils';
import { useRef } from 'react';
import { useWidgetSize } from './widgetLayout';
import { getStudentGridLayout } from '../../lib/studentWidgetGrid';
import { getPlusPointsPageLayout, PLUS_POINTS_GRID_OPTIONS } from '../../lib/plusPointsWidgetLayout';

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
  const grid = getStudentGridLayout(size.width, size.height, students.length, PLUS_POINTS_GRID_OPTIONS);
  const [page, setPage] = useState(0);
  const pageLayout = getPlusPointsPageLayout(size.width, size.height, students.length, page);
  const paginated = Boolean(onExpand) && !grid.fits && pageLayout.fitsAtLeastOne;
  const gridMode = Boolean(onExpand);
  const [compact, setCompact] = useState(false);
  const [lastAwardedId, setLastAwardedId] = useState<string | null>(null);
  const [recentlyAwardedId, setRecentlyAwardedId] = useState<string | null>(null);

  useEffect(() => {
    setLastAwardedId(null);
    setRecentlyAwardedId(null);
    setPage(0);
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
        <h3 className="min-w-0 text-sm font-bold">Unsere Pluspunkte</h3>
        {gridMode && lastAwardedId && getTodayPoints(lastAwardedId) > 0 && (
          <button type="button" onClick={() => {
            removeParticipation(lastAwardedId);
            setLastAwardedId(null);
            setRecentlyAwardedId(null);
          }} className="min-h-11 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold"
          aria-label={`Letzten Pluspunkt für ${labels.get(lastAwardedId)} rückgängig machen`}>
            ↶ Rückgängig
          </button>
        )}
        {!gridMode && (
          <button type="button" aria-pressed={compact}
            onClick={() => setCompact(value => !value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
            {compact ? 'Große Ansicht' : 'Kompakt'}
          </button>
        )}
      </div>
      {gridMode && !grid.fits && !pageLayout.fitsAtLeastOne ? (
        <div role="status" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 p-4 text-center">
          <p className="text-sm font-semibold">Diese Widget-Fläche ist für bedienbare Kinderkarten noch zu klein.</p>
          <button type="button" onClick={onExpand} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">
            Widget vergrößern · {students.length} Kinder
          </button>
        </div>
      ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className={gridMode ? 'grid min-h-0 flex-1 content-start gap-1.5 overflow-hidden' : 'min-h-0 flex-1 space-y-2 overflow-y-auto'}
          style={gridMode ? { gridTemplateColumns: `repeat(${paginated ? pageLayout.columns : grid.columns}, minmax(0, 1fr))` } : undefined} role="list">
        {(paginated ? students.slice(pageLayout.start, pageLayout.start + pageLayout.pageSize) : students).map((student: Student) => {
          const points = Math.max(0, getTodayPoints(student.id));
          const awarded = lastAwardedId === student.id;
          return (
            <div key={student.id} role="listitem"
              style={gridMode ? { minHeight: 88, height: paginated ? undefined : Math.min(130, grid.cardHeight) } : undefined}
              className={`flex min-w-0 items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white ${gridMode ? 'px-1.5 py-1' : compact ? 'px-2 py-1' : 'px-3 py-2'}`}>
              <div className="min-w-0 flex-1">
                <span className={`block break-words font-semibold leading-tight ${gridMode ? 'text-xs sm:text-sm' : 'text-base'}`}>{labels.get(student.id)}</span>
                <span className="block text-sm font-medium text-amber-700" aria-label={`${points} Pluspunkte`}>
                  {gridMode ? `★ ${points}` : `${'★'.repeat(Math.min(points, 8))}${points > 8 ? '…' : ''} ${points}`}
                </span>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {awarded && !gridMode && (
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
        {paginated && (
          <nav aria-label="Pluspunkte-Schülerseiten" className="flex shrink-0 items-center justify-between gap-2 text-xs font-bold">
            <button type="button" className="min-h-11 rounded-lg border px-3 disabled:opacity-40"
              onClick={() => setPage(value => Math.max(0, value - 1))} disabled={pageLayout.page === 0}
              aria-label="Vorherige Pluspunkte-Seite">← Zurück</button>
            <span aria-live="polite">{pageLayout.page + 1} / {pageLayout.pageCount}</span>
            <button type="button" className="min-h-11 rounded-lg border px-3 disabled:opacity-40"
              onClick={() => setPage(value => Math.min(pageLayout.pageCount - 1, value + 1))}
              disabled={pageLayout.page >= pageLayout.pageCount - 1} aria-label="Nächste Pluspunkte-Seite">Weiter →</button>
          </nav>
        )}
      </div>
      )}
    </section>
  );
}
