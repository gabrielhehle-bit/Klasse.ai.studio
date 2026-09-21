import React from 'react';
import type { AppState } from '../../types';
import { normalizeClassMascot } from '../../lib/classMascot';
import ClassMascotArtwork from './ClassMascotArtwork';

interface Props {
  app: AppState;
  setApp?: React.Dispatch<React.SetStateAction<AppState>>;
  currentIsLight?: boolean;
}

/**
 * Deliberately only the transparent character: no name, status, action panel,
 * settings gear, or widget background. The teacher can choose among the four
 * mascots in the separate cockpit Design & Farben settings.
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
  React.useEffect(() => () => {
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
  }, []);
  const reactToTap = () => {
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
        aria-label={state.name + ' – Klassenmaskottchen verschieben: ziehen oder Pfeiltasten nutzen (Umschalt für Feinschritt); antippen für eine Reaktion'}
        onClick={reactToTap}
        className="class-mascot-character pointer-events-none mx-auto flex max-w-full shrink-0 touch-none cursor-grab items-end justify-center bg-transparent p-0 active:cursor-grabbing focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        style={{ width: `min(100%, ${state.displaySize}px)` }}
      >
        <span className="pointer-events-none block w-full">
          <ClassMascotArtwork kind={state.kind} mood={state.mood} name={state.name} animationEnabled={state.animationEnabled} reactionActive={reactionActive} reactionTick={reactionTick} />
        </span>
      </button>
    </section>
  );
}
