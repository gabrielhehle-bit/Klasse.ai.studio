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
  /** Teacher action: adjacent stage is written to behavior_status and the dossier history. */
  onBehaviorStageChange?: (studentId: string, stageId: string) => void;
  /** Provided only inside the movable CockpitWidget, never for the narrow sidebar. */
  onExpand?: () => void;
  /** The narrow Cockpit sidebar must show the whole class in a dense grid. */
  sidebarCompact?: boolean;
}

/**
 * Nur für die öffentliche, duplizierte Unterrichtsfläche. Interne Status,
 * Notizen, Diagnosen und Abwesenheitsgründe werden hier nie angezeigt.
 * Verhaltensstufen aus der vorhandenen Erfassung dürfen ausschließlich bei
 * ausdrücklicher Aktivierung durch die Lehrperson öffentlich gezeigt werden;
 * interne Verhaltensnotizen bleiben auch dann verborgen.
 *
 * Korrekturen werden ausschließlich nach einem bewussten Plus-Klick in dieser
 * Ansicht angeboten; bestehende Mitarbeitspunkte bleiben im AppState.
 */
export function PublicStudentListWidget({
  app,
  getTodayPoints,
  addParticipation,
  removeParticipation,
  onBehaviorStageChange,
  onExpand,
  sidebarCompact = false,
}: Props) {
  const students = app.schueler ?? [];
  const containerRef = useRef<HTMLElement>(null);
  const size = useWidgetSize(containerRef);
  const grid = getStudentGridLayout(size.width, size.height, students.length, { reservedHeight: 92, minCardWidth: 170, minCardHeight: 58, gap: 6 });
  const gridMode = Boolean(onExpand);
  const [compact, setCompact] = useState(false);
  const dense = !gridMode && (sidebarCompact || compact);
  const showBehavior = app.boardSettings?.showStudentBehaviorInPluspoints === true;
  // Personal emoji is intentionally opt-in; do not invent a placeholder avatar.
  const showStudentEmoji = app.boardSettings?.showStudentEmojiInList === true;
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
    <section ref={containerRef} aria-label="Öffentliche Schülerliste und Pluspunkte"
      className={`flex h-full min-h-0 flex-col text-slate-900 ${dense ? 'gap-1 p-1' : 'gap-2 p-2'}`}>
      <div className="flex shrink-0 items-center justify-between gap-1">
        <h3 className={`${dense ? 'text-xs' : 'text-sm'} font-extrabold`}>✨ Unsere Pluspunkte · {students.length}</h3>
        {dense && lastAwardedId && (
          <button type="button" onClick={() => {
            if (getTodayPoints(lastAwardedId) > 0) removeParticipation(lastAwardedId);
            setLastAwardedId(null);
            setRecentlyAwardedId(null);
          }} className="min-h-9 shrink-0 rounded-md border border-slate-300 bg-white px-1.5 text-xs font-semibold" aria-label="Letzten Pluspunkt rückgängig machen">↶</button>
        )}
        {!gridMode && !sidebarCompact && (
          <button type="button" aria-pressed={compact}
            onClick={() => setCompact(value => !value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
            {compact ? 'Große Ansicht' : 'Kompakt'}
          </button>
        )}
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
      <div className={gridMode ? 'grid min-h-0 flex-1 content-start gap-1.5 overflow-hidden' : dense ? 'min-h-0 flex-1 space-y-1 overflow-y-auto' : 'min-h-0 flex-1 space-y-2 overflow-y-auto'}
        style={gridMode ? { gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))` } : undefined} role="list">
        {students.map((student: Student, index: number) => {
          const points = Math.max(0, getTodayPoints(student.id));
          const awarded = lastAwardedId === student.id;
          const stageId = showBehavior
            ? app.behavior_status?.[student.id] || app.behavior_default_stage_id || '3'
            : null;
          const behaviorStage = stageId
            ? app.behavior_stages?.find(stage => stage.id === stageId)
            : undefined;
          const behaviorColor = stageId === '1' ? 'bg-emerald-100 text-emerald-900'
            : stageId === '2' ? 'bg-sky-100 text-sky-900'
            : stageId === '4' ? 'bg-amber-100 text-amber-950'
            : stageId === '5' ? 'bg-rose-100 text-rose-950'
            : 'bg-slate-100 text-slate-800';
          const behaviorStages = showBehavior ? (app.behavior_stages || []) : [];
          // A single tap cycles through the teacher-configured stages, including last → first.
          const currentStageIndex = behaviorStages.findIndex(stage => stage.id === stageId);
          const nextBehaviorStage = behaviorStages.length > 0
            ? behaviorStages[(currentStageIndex + 1) % behaviorStages.length]
            : undefined;
          const cardTone = ['border-sky-200 bg-sky-50/80', 'border-amber-200 bg-amber-50/80', 'border-violet-200 bg-violet-50/80', 'border-emerald-200 bg-emerald-50/80'][index % 4];
          return (
            <div key={student.id} role="listitem"
              style={gridMode ? { minHeight: 58, height: Math.min(100, grid.cardHeight) } : undefined}
              className={`min-w-0 shadow-sm ${cardTone} ${gridMode ? 'rounded-2xl border-2 px-1.5 py-1' : dense ? 'rounded-xl border px-1.5 py-0.5' : 'rounded-2xl border-2 px-3 py-2'}`}>
              <div className="flex min-w-0 items-center justify-between gap-1">
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  {showStudentEmoji && student.emoji && (
                    <span aria-label={`Profil-Emoji von ${labels.get(student.id)}`}
                      className={`${sidebarCompact ? 'hidden' : 'flex'} h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-base shadow-sm`}>
                      {student.emoji}
                    </span>
                  )}
                  {showBehavior && behaviorStage && (
                    onBehaviorStageChange ? (
                      <button type="button" disabled={!nextBehaviorStage || nextBehaviorStage.id === stageId}
                        onClick={() => nextBehaviorStage && onBehaviorStageChange(student.id, nextBehaviorStage.id)}
                        aria-label={`Verhalten von ${labels.get(student.id)}: ${behaviorStage.label}; ${nextBehaviorStage ? `mit einem Klick auf ${nextBehaviorStage.label} weiterstellen` : 'keine weitere Stufe vorhanden'}`}
                        title={nextBehaviorStage ? `${behaviorStage.label} → ${nextBehaviorStage.label}` : `${behaviorStage.label}: Verhaltensstufen in der Notenmappe einstellen.`}
                        className={`flex shrink-0 items-center justify-center shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-70 ${dense ? 'h-8 w-8 rounded-lg text-base' : 'h-10 w-10 rounded-xl text-xl'} ${behaviorColor}`}>
                        {behaviorStage.icon || '●'}
                      </button>
                    ) : (
                      <span aria-hidden="true" title={`Verhalten: ${behaviorStage.label}`}
                        className={`flex shrink-0 items-center justify-center shadow-sm ${dense ? 'h-8 w-8 rounded-lg text-base' : 'h-10 w-10 rounded-xl text-xl'} ${behaviorColor}`}>
                        {behaviorStage.icon || '●'}
                      </span>
                    )
                  )}
                  <div className="min-w-0 flex-1">
                    <span className={`block break-words font-extrabold leading-tight text-slate-900 ${gridMode ? 'text-xs sm:text-sm' : dense ? 'text-xs' : 'text-base'}`}>{labels.get(student.id)}</span>
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                      <span className={`block font-bold text-amber-800 ${dense ? 'text-[10px]' : 'text-sm'}`} aria-label={`${points} Pluspunkte`}>
                        {dense ? `${points} P.` : gridMode ? `⭐ ${points}` : `${'⭐'.repeat(Math.min(points, 8))}${points > 8 ? '…' : ''} ${points}`}
                      </span>
                      {showBehavior && behaviorStage && (
                        <span aria-label={`Verhaltensstatus: ${behaviorStage.label}`} className="truncate text-[10px] font-bold text-slate-700">
                          {behaviorStage.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {awarded && !dense && (
                    <button type="button"
                      onClick={() => {
                        if (getTodayPoints(student.id) > 0) removeParticipation(student.id);
                        setLastAwardedId(null);
                        setRecentlyAwardedId(null);
                      }}
                      className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                      aria-label={`Letzten Pluspunkt für ${labels.get(student.id)} rückgängig machen`}>↶</button>
                  )}
                  <button type="button"
                    onClick={event => {
                      addParticipation(student.id, event);
                      setLastAwardedId(student.id);
                      setRecentlyAwardedId(student.id);
                    }}
                    className={`${dense ? 'min-h-9 min-w-9 px-1 text-xs rounded-lg' : 'min-h-11 min-w-11 px-3 text-lg rounded-xl'} bg-emerald-600 font-extrabold text-white shadow-sm transition-transform hover:bg-emerald-700 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600`}
                    aria-label={`Pluspunkt für ${labels.get(student.id)} vergeben`}
                  >{recentlyAwardedId === student.id && !dense ? '✓ +1' : '+1'}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
