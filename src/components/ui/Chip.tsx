import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import { X, Check } from 'lucide-react';
import { BadgeVariant } from './Badge';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  variant?: BadgeVariant;
  selected?: boolean;
  icon?: ReactNode;
  onDismiss?: () => void;
  dismissAriaLabel?: string;
  children: ReactNode;
}

/**
 * Standardisierter interaktiver Chip nach F-DS2 Spezifikation.
 * Kann auswählbar (selected) oder löschbar (onDismiss) sein.
 */
export function Chip({
  variant = 'neutral',
  selected = false,
  icon,
  onDismiss,
  dismissAriaLabel = 'Entfernen',
  children,
  className = '',
  disabled,
  onClick,
  ...rest
}: ChipProps) {
  const isInteractive = Boolean(onClick);

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full select-none transition-all
        ${selected
          ? 'bg-[var(--accent)] text-[var(--accent-text,var(--btn-text,#ffffff))] border-2 border-[var(--accent-hover)] font-bold shadow-xs'
          : variant === 'accent'
            ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30'
            : variant === 'success'
              ? 'bg-[var(--success-soft)] text-[var(--success-text)] border border-[var(--success)]/30'
              : variant === 'warning'
                ? 'bg-[var(--warning-soft)] text-[var(--warning-text)] border border-[var(--warning)]/30'
                : variant === 'danger'
                  ? 'bg-[var(--danger-soft)] text-[var(--danger-text)] border border-[var(--danger)]/30'
                  : variant === 'info'
                    ? 'bg-[var(--info-soft)] text-[var(--info-text)] border border-[var(--info)]/30'
                    : 'bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-primary,var(--text))] border border-[var(--border-default,var(--border2))]'
        }
        ${isInteractive ? 'cursor-pointer hover:opacity-90 active:scale-[0.98]' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `.trim()}
    >
      {selected && <Check className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />}
      {!selected && icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>}

      {isInteractive ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className="focus-visible:outline-none focus-visible:underline"
          {...rest}
        >
          {children}
        </button>
      ) : (
        <span>{children}</span>
      )}

      {onDismiss && (
        <button
          type="button"
          aria-label={dismissAriaLabel}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current cursor-pointer"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
