import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, Check } from 'lucide-react';

export type ButtonVariant = 
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'selected'
  | 'success'
  | 'warning'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  selected?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

/**
 * Standardisierter semantischer Button nach F-DS2 Spezifikation.
 * Nutzt aktive Theme-Tokens (accent, surface, border, text, focus-ring).
 * Keine starren Indigo- oder Slate-Klassen.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  selected = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}, ref) => {
  const isActuallySelected = variant === 'selected' || selected;
  const effectiveVariant: ButtonVariant = isActuallySelected ? 'selected' : variant;
  const isDisabled = disabled || isLoading;

  // Base layout, font, transitions, focus and touch target behavior
  const baseClasses = 
    'inline-flex items-center justify-center font-medium select-none whitespace-nowrap ' +
    'transition-all duration-150 ease-in-out cursor-pointer ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))] ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-card,var(--surface))] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none';

  // Size specifications complying with touch targets:
  // md: ~44px height (WCAG touch standard)
  // lg: ~52px height
  // sm: ~34px height (compact, touch-manipulation safe)
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-xl gap-1.5 active:scale-[0.98]',
    md: 'min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl gap-2 active:scale-[0.98]',
    lg: 'min-h-[52px] px-5 py-3 text-base font-bold rounded-xl gap-2.5 active:scale-[0.98]'
  };

  // Variant specifications using pure semantic CSS tokens
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--accent)] text-[var(--accent-text,var(--btn-text,#ffffff))] shadow-sm ' +
      'hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] border border-transparent',

    secondary:
      'bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-primary,var(--text))] ' +
      'border border-[var(--border-default,var(--border2))] shadow-xs ' +
      'hover:bg-[var(--surface-muted,var(--surface3))] hover:text-[var(--text-primary,var(--text))] ' +
      'active:bg-[var(--surface-muted,var(--surface3))]',

    ghost:
      'bg-transparent text-[var(--text-secondary,var(--text2))] border border-transparent ' +
      'hover:bg-[var(--surface-subtle,var(--surface2))] hover:text-[var(--text-primary,var(--text))] ' +
      'active:bg-[var(--surface-muted,var(--surface3))] shadow-none',

    selected:
      'bg-[var(--accent)] text-[var(--accent-text,var(--btn-text,#ffffff))] font-bold shadow-xs ' +
      'border-2 border-[var(--accent-hover)] ring-1 ring-[var(--accent)] ' +
      'hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]',

    success:
      'bg-[var(--success)] text-white shadow-xs border border-transparent ' +
      'hover:bg-[var(--success-hover,#15803d)] active:brightness-95',

    warning:
      'bg-[var(--warning)] text-white shadow-xs border border-transparent ' +
      'hover:bg-[var(--warning-hover,#b45309)] active:brightness-95',

    danger:
      'bg-[var(--danger)] text-white shadow-xs border border-transparent ' +
      'hover:bg-[var(--danger-hover,#b91c1c)] active:brightness-95'
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-pressed={isActuallySelected ? true : undefined}
      aria-busy={isLoading ? true : undefined}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[effectiveVariant]} ${className}`.trim()}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex items-center" aria-hidden="true">{leftIcon}</span>
      )}

      {children && <span>{children}</span>}

      {isActuallySelected && !rightIcon && !isLoading && (
        <Check className="w-3.5 h-3.5 shrink-0 opacity-90 stroke-[2.5]" aria-hidden="true" />
      )}

      {!isLoading && rightIcon && (
        <span className="shrink-0 inline-flex items-center" aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';
