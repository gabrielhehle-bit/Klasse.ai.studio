import React from 'react';
import { FileText, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Einheitlicher Leerzustand für alle KLASSIO-Module.
 * Ruhige Theme-Oberfläche, lesbare Handlungsaufforderung und 44px-Touchziel.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      data-klassio-empty-state
      className={`flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface2)] px-5 py-7 text-center sm:px-8 sm:py-9 ${className}`}
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xl text-[var(--text2)]"
      >
        {icon || <FileText size={23} aria-hidden="true" />}
      </span>
      <div className="max-w-md space-y-1.5">
        <h3 className="text-base font-semibold leading-snug text-[var(--text)]">{title}</h3>
        <p className="text-sm leading-relaxed text-[var(--text2)]">{description}</p>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-text,#fff)] transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <Plus size={17} aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
