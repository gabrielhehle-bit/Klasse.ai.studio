import React from 'react';

/**
 * Legacy compatibility component.
 *
 * The active Klassio teaching surface is Unterrichtsmodus.tsx. This component
 * intentionally contains no demo content, sample pupils, fake timetable items
 * or invented weekly highlights. It remains in the repository so older imports
 * do not break while all real cockpit functionality stays in Unterrichtsmodus.
 */
export default function Cockpit() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <div className="max-w-md">
        <h2 className="text-xl font-black text-[var(--text)]">Unterricht</h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--text2)]">
          Die aktive Unterrichtsfläche wird über den Klassio-Unterrichtsmodus geöffnet.
        </p>
      </div>
    </div>
  );
}
