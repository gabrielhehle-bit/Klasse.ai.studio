import React from 'react';
import type { AppState } from '../../types';
import { isClassMascotAction, MASCOT_RITUAL_EVENT, MASCOT_SURPRISE_EVENT, normalizeClassMascot, type ClassMascotAction } from '../../lib/classMascot';
import ClassMascotArtwork from './ClassMascotArtwork';

interface Props {
  app: AppState;
  setApp?: React.Dispatch<React.SetStateAction<AppState>>;
  currentIsLight?: boolean;
}

/**
 * Deliberately only the transparent character: no name, status, action panel,
 * settings gear, or widget background. The teacher can choose among the four
 * mascots in their own dedicated cockpit settings panel.
 *
 * Retain the character hit target so it can be moved directly on the board
 * without making the surrounding invisible widget rectangle interactive.
 */
export default function ClassMascotWidget({ app }: Props) {
  const state = normalizeClassMascot(app.classMascot);
  // A deliberate tap triggers a short, local reaction. Never persist tap counters
  // or timers to the class vault / account sync; only teacher-chosen settings sync.
  const [reactionTick, setReactionTick] = React.useState(0);
  const [reactionActive, setReactionActive] = React.useState(false);
  const reactionTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [surpriseTick, setSurpriseTick] = React.useState(0);
  const [surpriseActive, setSurpriseActive] = React.useState(false);
  const surpriseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ritualAction, setRitualAction] = React.useState<ClassMascotAction | null>(null);
  const [ritualTick, setRitualTick] = React.useState(0);
  const ritualTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRitual = React.useCallback((event: Event) => {
    const action = (event as CustomEvent<unknown>).detail;
    if (!isClassMascotAction(action)) return;
    if (state.quietMode) return;
    // Only the latest chosen ritual may finish; never queue background surprises.
    if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setSurpriseActive(false);
    setReactionActive(false);
    setRitualTick(tick => tick + 1);
    setRitualAction(action);
    ritualTimer.current = setTimeout(() => {
      setRitualAction(null);
      ritualTimer.current = null;
    }, action === 'calm' ? 5400 : 1750);
  }, [state.quietMode]);
  const triggerSurprise = React.useCallback(() => {
    if (state.quietMode) return;
    if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    setRitualAction(null);
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    setSurpriseTick(tick => tick + 1);
    setSurpriseActive(true);
    surpriseTimer.current = setTimeout(() => {
      setSurpriseActive(false);
      surpriseTimer.current = null;
    }, 1900);
  }, [state.quietMode]);
  React.useEffect(() => {
    window.addEventListener(MASCOT_SURPRISE_EVENT, triggerSurprise);
    window.addEventListener(MASCOT_RITUAL_EVENT, triggerRitual);
    return () => {
      window.removeEventListener(MASCOT_SURPRISE_EVENT, triggerSurprise);
      window.removeEventListener(MASCOT_RITUAL_EVENT, triggerRitual);
      if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
      if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
      if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    };
  }, [triggerSurprise, triggerRitual]);
  // A shared cockpit component can remain mounted while switching classes:
  // reset temporary gesture state instead of showing the previous class's ritual.
  React.useEffect(() => {
    if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setRitualAction(null);
    setSurpriseActive(false);
    setReactionActive(false);
  }, [app.activeClassId, state.quietMode]);
  const reactToTap = () => {
    if (state.quietMode) return;
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setReactionTick(tick => tick + 1);
    setReactionActive(true);
    reactionTimer.current = setTimeout(() => {
      setReactionActive(false);
      reactionTimer.current = null;
    }, 750);
  };
  return (
    <section aria-label="Klassenmaskottchen" className="class-mascot-v1 class-mascot-freestanding pointer-events-none flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-transparent p-0">
      <button
        type="button"
        aria-label={state.name + (state.quietMode
          ? ' – Klassenmaskottchen in Tafelruhe; verschieben mit Ziehen oder Pfeiltasten'
          : ' – Klassenmaskottchen verschieben: ziehen oder Pfeiltasten nutzen (Umschalt für Feinschritt); antippen für eine Reaktion')}
        onClick={reactToTap}
        onDoubleClick={triggerSurprise}
        className="class-mascot-character pointer-events-none mx-auto flex max-w-full shrink-0 touch-none cursor-grab items-end justify-center bg-transparent p-0 active:cursor-grabbing focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        style={{ width: `min(100%, ${state.displaySize}px)` }}
      >
        <span className="pointer-events-none block w-full">
          <ClassMascotArtwork kind={state.kind} mood={state.mood} name={state.name} animationEnabled={state.animationEnabled && !state.quietMode} reactionActive={reactionActive && !state.quietMode} reactionTick={reactionTick} accessory={state.accessory} season={state.season} surpriseActive={surpriseActive && !state.quietMode} surpriseTick={surpriseTick} ritualAction={state.quietMode ? null : ritualAction} ritualTick={ritualTick} />
        </span>
      </button>
    </section>
  );
}
