import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type IconButtonVariant = 
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'selected'
  | 'danger';

export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Pflicht-Attribut für Screenreader und Barrierefreiheit */
  'aria-label': string;
  icon?: ReactNode;
  children?: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  selected?: boolean;
  isLoading?: boolean;
}

/**
 * Standardisierter semantischer IconButton nach F-DS2 Spezifikation.
 * Quadratische Touchfläche, garantiert barrierefreies aria-label.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  'aria-label': ariaLabel,
  icon,
  children,
  variant = 'ghost',
  size = 'md',
  selected = false,
  isLoading = false,
  className = '',
  disabled,
  type = 'button',
  ...rest
}, ref) => {
  const isActuallySelected = variant === 'selected' || selected;
  const effectiveVariant: IconButtonVariant = isActuallySelected ? 'selected' : variant;
  const isDisabled = disabled || isLoading;

  const baseClasses =
    'inline-flex items-center justify-center select-none shrink-0 aspect-square ' +
    'transition-all duration-150 ease-in-out cursor-pointer ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))] ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-card,var(--surface))] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none';

  // Guaranteed touch target dimensions:
  // md: 44x44 px (Standard WCAG AA / Mobile Touch Target)
  // lg: 52x52 px
  // sm: 36x36 px (mit 44px touch margin / target)
  const sizeClasses: Record<IconButtonSize, string> = {
    sm: 'w-9 h-9 min-w-[36px] min-h-[36px] p-2 rounded-lg text-xs active:scale-[0.96]',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-sm active:scale-[0.96]',
    lg: 'w-13 h-13 min-w-[52px] min-h-[52px] p-3 rounded-2xl text-base active:scale-[0.96]'
  };

  const variantClasses: Record<IconButtonVariant, string> = {
    primary:
      'bg-[var(--accent)] text-[var(--accent-text,var(--btn-text,#ffffff))] shadow-xs ' +
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

    danger:
      'bg-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)] ' +
      'active:brightness-95 border border-transparent'
  };

  const content = icon || children;

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-pressed={isActuallySelected ? true : undefined}
      aria-busy={isLoading ? true : undefined}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[effectiveVariant]} ${className}`.trim()}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        content
      )}
    </button>
  );
});

IconButton.displayName = 'IconButton';
