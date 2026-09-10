import React from 'react';
import { AlertTriangle, Trash2, ArrowRight } from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { getRetiredWidgetFallbackMessage } from '../../../lib/calculatorAlgorithm';

export interface RetiredMathWidgetFallbackProps {
  widget?: CockpitWidgetConfig;
  currentIsLight?: boolean;
  onRemove?: () => void;
  onOpenZahlenraum?: () => void;
}

export const RetiredMathWidgetFallback: React.FC<RetiredMathWidgetFallbackProps> = ({
  widget,
  currentIsLight = true,
  onRemove,
  onOpenZahlenraum,
}) => {
  const type = widget?.type || 'unknown';
  const message = getRetiredWidgetFallbackMessage(type);
  const isSorting = type === 'sorting';

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-4 text-center select-none rounded-xl border ${
        currentIsLight
          ? 'bg-slate-50 border-slate-200 text-slate-700'
          : 'bg-zinc-900 border-white/10 text-zinc-300'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
          currentIsLight
            ? 'bg-amber-100 text-amber-700'
            : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
        }`}
      >
        <AlertTriangle size={24} />
      </div>

      <h4 className="text-sm font-bold mb-1.5 text-slate-800 dark:text-zinc-100">
        Hinweis zum Mathematik-Widget
      </h4>

      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-[280px] leading-relaxed mb-4">
        {message}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isSorting && onOpenZahlenraum && (
          <button
            type="button"
            onClick={onOpenZahlenraum}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <span>Zahlenraum-Studio</span>
            <ArrowRight size={13} />
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              currentIsLight
                ? 'bg-white hover:bg-rose-50 text-rose-600 border-slate-200 hover:border-rose-200'
                : 'bg-zinc-800 hover:bg-zinc-700 text-rose-400 border-white/10'
            }`}
            title="Dieses veraltete Widget von der Tafel entfernen"
          >
            <Trash2 size={13} />
            <span>Entfernen</span>
          </button>
        )}
      </div>
    </div>
  );
};
