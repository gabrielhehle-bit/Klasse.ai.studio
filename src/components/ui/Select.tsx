import React, { forwardRef, SelectHTMLAttributes, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { InputSize } from './Input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  options?: SelectOption[];
  size?: InputSize;
}

/**
 * Standardisiertes semantisches Auswahlfeld (Select) nach F-DS2 Spezifikation.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  helperText,
  error,
  options,
  children,
  size = 'md',
  id,
  className = '',
  disabled,
  ...rest
}, ref) => {
  const autoId = useId();
  const selectId = id || autoId;
  const isError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : undefined;

  const sizeClasses: Record<InputSize, string> = {
    sm: 'min-h-[36px] pl-2.5 pr-8 py-1.5 text-xs rounded-lg',
    md: 'min-h-[44px] pl-3.5 pr-9 py-2 text-sm rounded-xl',
    lg: 'min-h-[52px] pl-4 pr-10 py-3 text-base rounded-2xl'
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-[var(--text-secondary,var(--text2))]"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={isError ? true : undefined}
          aria-describedby={
            errorMessage
              ? `${selectId}-error`
              : helperText
                ? `${selectId}-helper`
                : undefined
          }
          className={`
            w-full appearance-none transition-all duration-150 cursor-pointer
            bg-[var(--surface-card,var(--surface))]
            text-[var(--text-primary,var(--text))]
            border
            ${isError
              ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/25'
              : 'border-[var(--border-default,var(--border2))] hover:border-[var(--border-strong,var(--border2))] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring,var(--accent))]/25'
            }
            focus:outline-none
            disabled:opacity-50 disabled:bg-[var(--surface-muted,var(--surface3))] disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${className}
          `.trim()}
          {...rest}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <span
          className="absolute right-3 flex items-center pointer-events-none text-[var(--text-muted,var(--text3))]"
          aria-hidden="true"
        >
          <ChevronDown className="w-4 h-4" />
        </span>
      </div>

      {errorMessage && (
        <p
          id={`${selectId}-error`}
          className="text-xs font-medium text-[var(--danger)]"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {!errorMessage && helperText && (
        <p
          id={`${selectId}-helper`}
          className="text-xs text-[var(--text-muted,var(--text3))]"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
