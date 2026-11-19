import React, { useEffect, useMemo, useState } from 'react';
import type { AppState, Student } from '../../types';
import { getDisplayStudentName } from './studentSelectionUtils';
import { useRef } from 'react';
import { useWidgetSize } from './widgetLayout';
import { getCompactStudentGridLayout, getStudentGridLayout } from '../../lib/studentWidgetGrid';
import { getCockpitEarnedBadges } from '../../lib/cockpitEarnedBadges';

interface Props {
  app: AppState;
  getTodayPoints: (studentId: string) => number;
  addParticipation: (studentId: string, event?: React.MouseEvent, onAwarded?: (subject: string) => void) => void;
  removeParticipation: (studentId: string) => void;
  /** Teacher action: adjacent stage is written to behavior_status and the dossier history. */
  onBehaviorStageChange?: (studentId: string, stageId: string) => void;
  /** Provided only inside the movable CockpitWidget, never for the narrow sidebar. */
  onExpand?: () => void;
  /** The narrow Cockpit sidebar must show the whole class in a dense grid. */
  sidebar?: boolean;
  sidebarCompact?: boolean;
  onCompactToggle?: () => void;
  socialMode?: boolean;
  onBadgeRequest?: (studentId: string) => void;
  isBirthday?: (student: Student) => boolean;
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
  sidebar = false,
  sidebarCompact = false,
  onCompactToggle,
  socialMode = false,
  onBadgeRequest,
  isBirthday,
}: Props) {
  const students = app.schueler ?? [];
  const containerRef = useRef<HTMLElement>(null);
  const size = useWidgetSize(containerRef);
  const grid = getStudentGridLayout(size.width, size.height, students.length, { reservedHeight: sidebarCompact ? 38 : 92, minCardWidth: sidebarCompact ? 144 : 170, minCardHeight: sidebarCompact ? 48 : 58, gap: 6 });
  const gridMode = Boolean(onExpand);
  const listRef = useRef<HTMLDivElement>(null);
  const listSize = useWidgetSize(listRef);
  const [compact, setCompact] = useState(false);
  const compactLayout = getCompactStudentGridLayout(listSize.width, listSize.height, students.length);
  // On classroom screens, do not force teachers to scroll through a full class.
  // Use the existing dense, two-column card layout when it actually fits.
  // For very large classes or narrow panels, retain the scrollable list.
  const autoCompactSidebar = sidebar && !sidebarCompact && !gridMode &&
    students.length >= 10 && listSize.width >= 260 && compactLayout.fits;
  const dense = !gridMode && (sidebarCompact || compact || autoCompactSidebar);
  const compactGrid = !gridMode && (sidebarCompact || compact || autoCompactSidebar);
  const showBehavior = app.boardSettings?.showStudentBehaviorInPluspoints === true;
  const showEarnedBadges = app.boardSettings?.showEarnedBadgesInCockpit === true;
  // Personal emoji is intentionally opt-in; do not invent a placeholder avatar.
  const showStudentEmoji = app.boardSettings?.showStudentEmojiInList === true;
  const [lastAwardedId, setLastAwardedId] = useState<string | null>(null);
  const [recentlyAwardedId, setRecentlyAwardedId] = useState<string | null>(null);
  const [recentAwardSubject, setRecentAwardSubject] = useState<string | null>(null);
  const [badgeDetailsStudentId, setBadgeDetailsStudentId] = useState<string | null>(null);

  useEffect(() => {
    setLastAwardedId(null);
    setRecentlyAwardedId(null);
    setRecentAwardSubject(null);
    setBadgeDetailsStudentId(null);
  }, [app.activeClassId, socialMode]);

  useEffect(() => {
    if (!badgeDetailsStudentId) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setBadgeDetailsStudentId(null); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [badgeDetailsStudentId]);

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
      className={`relative flex h-full min-h-0 flex-col text-slate-900 ${dense ? 'gap-1 p-1' : 'gap-2 p-2'}`}>
      {(!sidebar || Boolean(lastAwardedId && recentAwardSubject)) && <div className="flex min-h-11 shrink-0 items-center justify-between gap-1">
        {!sidebar && !lastAwardedId && <h3 className={`${dense ? 'text-xs' : 'text-sm'} font-extrabold`}>{socialMode ? "Soziale Sterne" : "Unsere Pluspunkte"} · {students.length}</h3>}
        {lastAwardedId && recentAwardSubject && (
          <>
            <span role="status" aria-live="polite" className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800"
              title={`${labels.get(lastAwardedId)} · ${socialMode ? 'Sozialverhalten' : `Mitarbeit · ${recentAwardSubject}`} +1`}>
              ✓ {labels.get(lastAwardedId)} · {socialMode ? 'Sozialverhalten' : `Mitarbeit · ${recentAwardSubject}`} +1
            </span>
            <button type="button" onClick={() => {
              if (getTodayPoints(lastAwardedId) > 0) removeParticipation(lastAwardedId);
              setLastAwardedId(null);
              setRecentlyAwardedId(null);
              setRecentAwardSubject(null);
            }} className="min-h-11 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
              aria-label={`Letzte ${socialMode ? 'Sozialbewertung' : 'Mitarbeitsbewertung'} für ${labels.get(lastAwardedId)} rückgängig machen`}>↶ Rückgängig</button>
          </>
        )}
        {!sidebar && !gridMode && !sidebarCompact && (
          <button type="button" aria-pressed={compact}
            onClick={() => onCompactToggle ? onCompactToggle() : setCompact(value => !value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
            {compact ? 'Große Ansicht' : 'Kompakt'}
          </button>
        )}
      </div>}
      {gridMode && !grid.fits ? (
        <div role="status" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 p-4 text-center">
          <p className="text-sm font-semibold">{students.length} Kinder benötigen eine größere Widget-Fläche, damit alle Pluspunkte sichtbar und bedienbar sind.</p>
          <button type="button" onClick={onExpand}
            className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">
            Alle {students.length} Kinder groß anzeigen
          </button>
          <p className="text-xs text-slate-600">Falls das Gerät sehr klein ist, aktiviere den Vollbildmodus.</p>
        </div>
      ) : null}
      <div ref={listRef} data-compact-student-grid={compactGrid || undefined}
        className={compactGrid ? 'grid min-h-0 flex-1 gap-1 overflow-hidden' : gridMode ? 'grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto' : 'min-h-0 flex-1 space-y-2 overflow-y-auto'}
        style={compactGrid ? { gridTemplateColumns: `repeat(${compactLayout.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${compactLayout.rows}, minmax(0, 1fr))` } : gridMode ? { gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))` } : undefined} role="list">
        {students.map((student: Student) => {
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
          const isRecentlyAwarded = recentlyAwardedId === student.id;
          const earnedBadges = getCockpitEarnedBadges(student, showEarnedBadges, compactGrid ? 2 : 3);
          const birthday = isBirthday?.(student) === true;
          const displayName = labels.get(student.id);
          const birthdayIcon = birthday ? <span role="img" aria-label="Geburtstag" className="shrink-0 text-sm leading-none">🎂</span> : undefined;
          const name = birthday ? <span className="cockpit-birthday-name">{displayName}</span> : displayName;
          const cardTone = isRecentlyAwarded
            ? (socialMode ? 'border-sky-300 bg-sky-50/90 ring-2 ring-sky-200/80' : 'border-emerald-300 bg-emerald-50/90 ring-2 ring-emerald-200/80')
            : birthday ? 'cockpit-birthday-card' : 'border-slate-200 bg-white hover:border-slate-300';
          const undoAward = () => {
            if (getTodayPoints(student.id) > 0) removeParticipation(student.id);
            setLastAwardedId(null);
            setRecentlyAwardedId(null);
          };
          if (compactGrid) {
            return (
              <div key={student.id} role="listitem" data-birthday-student={birthday || undefined}
                className={`flex min-h-0 min-w-0 items-center justify-between gap-1.5 rounded-lg border px-1.5 py-0.5 ${cardTone}`}>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <div className="flex min-w-0 items-center gap-0.5">
                    {birthdayIcon}
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-slate-900" title={labels.get(student.id)}>
                      {onBadgeRequest ? <button type="button" className="max-w-full truncate text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" aria-label={`Badges für ${labels.get(student.id)} vergeben`} title="Badges vergeben" onClick={() => onBadgeRequest(student.id)}>{name}</button> : name}
                    </span>
                    {(earnedBadges.visible.length > 0 || earnedBadges.more > 0) && <button type="button" onClick={() => setBadgeDetailsStudentId(student.id)}
                      aria-label={`Verdiente Badges von ${labels.get(student.id)} ansehen`} title="Verdiente Badges ansehen"
                      className="flex min-h-8 shrink-0 items-center gap-0.5 rounded-md px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
                      {earnedBadges.visible.map(badge => <span key={badge.id} data-earned-badge title={badge.name} className="text-xs leading-none">{badge.icon}</span>)}
                      {earnedBadges.more > 0 && <span className="text-[9px] font-bold text-slate-600">+${earnedBadges.more}</span>}
                    </button>}
                  </div>
                  <div className="flex min-w-0 items-center gap-1">
                    {showBehavior && behaviorStage && <span className="sr-only" aria-label={`Verhaltensstatus: ${behaviorStage.label}`}>{behaviorStage.label}</span>}
                    {showBehavior && behaviorStage && (onBehaviorStageChange ? (
                      <button type="button" disabled={!nextBehaviorStage || nextBehaviorStage.id === stageId}
                        onClick={() => nextBehaviorStage && onBehaviorStageChange(student.id, nextBehaviorStage.id)}
                        aria-label={`Verhalten von ${labels.get(student.id)}: ${behaviorStage.label}; ${nextBehaviorStage ? `auf ${nextBehaviorStage.label} weiterstellen` : 'keine weitere Stufe vorhanden'}`}
                        title={behaviorStage.label}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${behaviorColor}`}>
                        {behaviorStage.icon || '●'}
                      </button>
                    ) : <span title={behaviorStage.label} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs ${behaviorColor}`}>{behaviorStage.icon || '●'}</span>)}
                    <span className={`text-[10px] tabular-nums ${points > 0 ? 'font-semibold text-emerald-800' : 'text-slate-500'}`} aria-label={`${points} Pluspunkte`}>{socialMode ? `${points} ⭐` : points}</span>
                  </div>
                </div>
                {awarded && (
                  <button type="button" onClick={undoAward} title="Letzte Vergabe rückgängig machen"
                    className="min-h-11 min-w-11 shrink-0 rounded-lg border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                    aria-label={`Letzten Pluspunkt für ${labels.get(student.id)} rückgängig machen`}>↶</button>
                )}
                <button type="button" onClick={event => addParticipation(student.id, event, (subject) => {
                  setLastAwardedId(student.id);
                  setRecentlyAwardedId(student.id);
                  setRecentAwardSubject(subject);
                })}
                  className={`min-h-11 min-w-11 shrink-0 rounded-lg text-sm font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${socialMode ? "bg-sky-600 hover:bg-sky-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                  title={socialMode ? "Sozialpunkt für das Sozialverhalten" : "Mitarbeitspunkt für ein Unterrichtsfach"}
                  aria-label={`${socialMode ? "Sozialpunkt" : "Pluspunkt"} für ${labels.get(student.id)} vergeben`}>+1</button>
              </div>
            );
          }
          return (
            <div key={student.id} role="listitem" data-birthday-student={birthday || undefined}
              style={gridMode || sidebarCompact ? { minHeight: sidebarCompact ? 48 : 58 } : undefined}
              className={`min-w-0 shadow-sm transition-[border-color,background-color,box-shadow] duration-150 ${cardTone} ${sidebar ? 'rounded-lg border px-2 py-1' : gridMode ? 'rounded-2xl border-2 px-1.5 py-1' : dense ? 'rounded-xl border px-1.5 py-0.5' : 'rounded-2xl border-2 px-3 py-2'}`}>
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
                        className={`flex shrink-0 items-center justify-center shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-70 ${sidebar ? 'h-6 w-6 rounded-md text-xs' : dense ? 'h-8 w-8 rounded-lg text-base' : 'h-10 w-10 rounded-xl text-xl'} ${behaviorColor}`}>
                        {behaviorStage.icon || '●'}
                      </button>
                    ) : (
                      <span aria-hidden="true" title={`Verhalten: ${behaviorStage.label}`}
                        className={`flex shrink-0 items-center justify-center shadow-sm ${sidebar ? 'h-6 w-6 rounded-md text-xs' : dense ? 'h-8 w-8 rounded-lg text-base' : 'h-10 w-10 rounded-xl text-xl'} ${behaviorColor}`}>
                        {behaviorStage.icon || '●'}
                      </span>
                    )
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1">
                      {birthdayIcon}
                      <span className={`min-w-0 flex-1 truncate font-extrabold leading-tight text-slate-900 ${gridMode ? 'text-xs sm:text-sm' : dense ? 'text-xs' : 'text-base'}`} title={labels.get(student.id)}>
                        {onBadgeRequest ? <button type="button" className="max-w-full truncate text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" aria-label={`Badges für ${labels.get(student.id)} vergeben`} onClick={() => onBadgeRequest(student.id)}>{name}</button> : name}
                      </span>
                      {(earnedBadges.visible.length > 0 || earnedBadges.more > 0) && <button type="button" onClick={() => setBadgeDetailsStudentId(student.id)}
                        aria-label={`Verdiente Badges von ${labels.get(student.id)} ansehen`} title="Verdiente Badges ansehen"
                        className="flex min-h-8 shrink-0 items-center gap-0.5 rounded-md px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
                        {earnedBadges.visible.map(badge => <span key={badge.id} data-earned-badge title={badge.name} className="text-sm leading-none">{badge.icon}</span>)}
                        {earnedBadges.more > 0 && <span className="text-[10px] font-bold text-slate-600">+${earnedBadges.more}</span>}
                      </button>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                      <span className={sidebar ? `block text-xs tabular-nums ${points > 0 ? 'font-semibold text-emerald-800' : 'text-slate-500'}` : `block font-bold text-amber-800 ${dense ? 'text-[10px]' : 'text-sm'}`} aria-label={`${points} Pluspunkte`}>
                        {socialMode ? `${points} ⭐` : sidebar ? points : dense ? `${points} P.` : gridMode ? `⭐ ${points}` : `${'⭐'.repeat(Math.min(points, 8))}${points > 8 ? '…' : ''} ${points}`}
                      </span>
                      {showBehavior && behaviorStage && (
                        <span aria-label={`Verhaltensstatus: ${behaviorStage.label}`} className={sidebar ? "sr-only" : "truncate text-[10px] font-bold text-slate-700"}>
                          {behaviorStage.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {awarded && !dense && (
                    <button type="button"
                      onClick={undoAward}
                      className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-slate-50 px-2 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                      aria-label={`Letzten Pluspunkt für ${labels.get(student.id)} rückgängig machen`}>↶</button>
                  )}
                  <button type="button"
                    onClick={event => {
                      addParticipation(student.id, event, (subject) => {
                        setLastAwardedId(student.id);
                        setRecentlyAwardedId(student.id);
                        setRecentAwardSubject(subject);
                      });
                    }}
                    className={`${dense ? 'min-h-11 min-w-11 px-1 text-xs rounded-lg' : 'min-h-11 min-w-11 px-3 text-lg rounded-xl'} ${socialMode ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'} font-extrabold text-white shadow-sm transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600`}
                    aria-label={`${socialMode ? "Sozialpunkt" : "Pluspunkt"} für ${labels.get(student.id)} vergeben`}
                    title={socialMode ? "Sozialpunkt für das Sozialverhalten" : "Mitarbeitspunkt für ein Unterrichtsfach"}
                  >{recentlyAwardedId === student.id && !dense ? '✓ +1' : '+1'}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {badgeDetailsStudentId && (() => {
        const selected = students.find(student => student.id === badgeDetailsStudentId);
        if (!selected) return null;
        const earned = getCockpitEarnedBadges(selected, true, 999).visible;
        return <div role="dialog" aria-modal="true" aria-label={`Verdiente Badges von ${labels.get(selected.id)}`}
          className="absolute inset-0 z-[95] flex min-h-0 flex-col rounded-xl border border-amber-200 bg-white p-3 shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <h3 className="min-w-0 truncate text-sm font-bold text-slate-900">Verdiente Badges · {labels.get(selected.id)}</h3>
            <button type="button" autoFocus onClick={() => setBadgeDetailsStudentId(null)}
              aria-label="Badge-Übersicht schließen" className="min-h-11 min-w-11 rounded-lg border border-slate-200 text-lg font-bold">×</button>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto py-3">
            {earned.map(badge => <li key={badge.id} className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
              <span aria-hidden="true" className="text-2xl">{badge.icon}</span>
              <span className="min-w-0 text-xs font-semibold text-slate-900">{badge.name}
                {badge.date && <span className="block text-[11px] font-normal text-slate-600">Vergeben am {/^\d{4}-\d{2}-\d{2}$/.test(badge.date) ? badge.date.split('-').reverse().join('.') : badge.date}</span>}
              </span>
            </li>)}
          </ul>
          <p className="shrink-0 text-[11px] text-slate-500">Nur für die Tafel freigegebene, bereits verdiente Badges.</p>
        </div>;
      })()}
    </section>
  );
}
