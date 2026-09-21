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
  return (
    <section aria-label="Klassenmaskottchen" className="class-mascot-v1 class-mascot-freestanding pointer-events-none flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-transparent p-0">
      <button
        type="button"
        aria-label={state.name + ' – Klassenmaskottchen verschieben: ziehen oder Pfeiltasten nutzen (Umschalt für Feinschritt)'}
        className="class-mascot-character pointer-events-none mx-auto flex max-w-full shrink-0 touch-none cursor-grab items-end justify-center bg-transparent p-0 active:cursor-grabbing focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        style={{ width: `min(100%, ${state.displaySize}px)` }}
      >
        <span className="pointer-events-none block w-full">
          <ClassMascotArtwork kind={state.kind} mood={state.mood} name={state.name} animationEnabled={state.animationEnabled} />
        </span>
      </button>
    </section>
  );
}
