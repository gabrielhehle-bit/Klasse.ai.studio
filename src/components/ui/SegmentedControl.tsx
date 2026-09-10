import React, { ReactNode } from 'react';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Wiederverwendbare SegmentedControl / Tabs nach F-DS2 Spezifikation.
 * Aktiver Zustand verwendet semantische Selected-Logik (stärkere Schrift, Rand, Hintergrundkontrast).
 * Keine starren Indigo- oder Slate-Klassen.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  ariaLabel = 'Optionen auswählen',
  className = ''
}: SegmentedControlProps<T>) {
  const containerSizeClasses = size === 'sm' ? 'p-1 rounded-xl gap-1 text-xs' : 'p-1.5 rounded-2xl gap-1.5 text-sm';
  const itemSizeClasses = size === 'sm' ? 'min-h-[34px] px-3 py-1 rounded-lg' : 'min-h-[40px] px-4 py-1.5 rounded-xl';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border2))] ${fullWidth ? 'w-full' : ''} ${containerSizeClasses} ${className}`.trim()}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        const isDisabled = option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(option.value)}
            className={`
              relative inline-flex items-center justify-center font-medium select-none transition-all duration-150 cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-card,var(--surface))]
              disabled:opacity-40 disabled:cursor-not-allowed
              ${fullWidth ? 'flex-1' : ''}
              ${itemSizeClasses}
              ${isSelected
                ? 'bg-[var(--surface-card,var(--surface))] text-[var(--text-primary,var(--text))] font-bold shadow-xs border border-[var(--border-strong,var(--border2))]'
                : 'bg-transparent text-[var(--text-secondary,var(--text2))] hover:text-[var(--text-primary,var(--text))] hover:bg-[var(--surface-muted,var(--surface3))]/60 border border-transparent'
              }
            `.trim()}
          >
            {/* Visual active indicator bar on bottom edge */}
            {isSelected && (
              <span
                aria-hidden="true"
                className="absolute bottom-1 left-3 right-3 h-0.5 bg-[var(--accent)] rounded-full"
              />
            )}

            <div className="flex items-center gap-1.5 relative z-10">
              {option.icon && (
                <span className={`inline-flex shrink-0 ${isSelected ? 'text-[var(--accent)]' : 'opacity-70'}`} aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
              {option.badge && (
                <span className="shrink-0">{option.badge}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
