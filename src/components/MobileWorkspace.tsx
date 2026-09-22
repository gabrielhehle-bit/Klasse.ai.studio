import React from 'react';
import {
  ArrowLeft, BookOpen, CalendarDays, ClipboardCheck,
  House, NotebookPen, UsersRound,
} from 'lucide-react';

export type MobileDestination = 'dashboard' | 'schueler' | 'anwesenheit' | 'verhalten' | 'wochenplanung';

const destinations: {
  id: MobileDestination;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'dashboard', title: 'Heute', shortTitle: 'Heute', icon: CalendarDays },
  { id: 'schueler', title: 'Meine Klasse', shortTitle: 'Klasse', icon: UsersRound },
  { id: 'anwesenheit', title: 'Anwesenheit', shortTitle: 'Anwesen.', icon: ClipboardCheck },
  { id: 'verhalten', title: 'Notizen', shortTitle: 'Notizen', icon: NotebookPen },
  { id: 'wochenplanung', title: 'Wochenplanung', shortTitle: 'Planung', icon: BookOpen },
];

interface MobileWorkspaceProps {
  page: MobileDestination;
  classLabel: string;
  onHome: () => void;
  onNavigate: (page: MobileDestination) => void;
  children: React.ReactNode;
}

/** Device-local responsive shell. It never mutates or duplicates the encrypted classroom. */
export default function MobileWorkspace({
  page, classLabel, onHome, onNavigate, children,
}: MobileWorkspaceProps) {
  const title = destinations.find(item => item.id === page)?.title || 'KLASSIO';
  return (
    <div
      data-testid="klassio-mobile-workspace"
      className="flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-[#f8f6ff] text-slate-900"
    >
      <header className="z-20 flex min-h-[64px] shrink-0 items-center gap-3 border-b border-violet-100 bg-white px-3 pt-[env(safe-area-inset-top)] shadow-sm">
        <button
          type="button"
          onClick={onHome}
          aria-label="Zur KLASSIO-Mobile-Startseite"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-violet-600">{classLabel} · KLASSIO Mobile</p>
          <h1 className="truncate text-lg font-extrabold">{title}</h1>
        </div>
        <button
          type="button"
          onClick={onHome}
          aria-label="Mobile-Startseite"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-100 text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          <House size={20} />
        </button>
      </header>

      <main
        data-testid="klassio-mobile-page"
        className="klassio-mobile-page min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 pb-8"
      >
        <div className="mx-auto w-full min-w-0 max-w-xl">
          {children}
        </div>
      </main>

      <nav
        aria-label="Mobile Navigation"
        className="z-20 grid shrink-0 grid-cols-5 border-t border-violet-100 bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(76,29,149,0.04)]"
      >
        {destinations.map(({ id, shortTitle, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={page === id ? 'page' : undefined}
            className={`flex min-h-[65px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${page === id ? 'text-violet-700' : 'text-slate-500'}`}
          >
            <span className={`flex h-8 w-10 items-center justify-center rounded-xl ${page === id ? 'bg-violet-100' : ''}`}>
              <Icon size={21} />
            </span>
            <span className="max-w-full truncate">{shortTitle}</span>
          </button>
        ))}
      </nav>
      <style>{`
        /* Only the mobile shell: no overflowing desktop toolbars or off-screen forms. */
        .klassio-mobile-page, .klassio-mobile-page * { min-width: 0; }
        .klassio-mobile-page input, .klassio-mobile-page select,
        .klassio-mobile-page textarea { max-width: 100%; font-size: 16px; }
        .klassio-mobile-page textarea { width: 100%; }
        .klassio-mobile-page .print\\:hidden { max-width: 100%; }
        .klassio-mobile-page .overflow-x-auto { max-width: 100%; }
      `}</style>
    </div>
  );
}
