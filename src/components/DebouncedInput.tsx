import React, { useState, useEffect, useCallback } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedTextarea = React.memo(function DebouncedTextarea({
  value: initialValue,
  onChange,
  debounceMs = 500,
  ...props
}: DebouncedTextareaProps) {
  const [localValue, setLocalValue] = useState(initialValue);

  // Sync from props when external value changes
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  // Debounced callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== initialValue) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, initialValue, debounceMs, onChange]);

  return (
    <textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      {...props}
    />
  );
});

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedInput = React.memo(function DebouncedInput({
  value: initialValue,
  onChange,
  debounceMs = 500,
  ...props
}: DebouncedInputProps) {
  const [localValue, setLocalValue] = useState(initialValue);

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== initialValue) {
        onChange(String(localValue));
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, initialValue, debounceMs, onChange]);

  return (
    <input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      {...props}
    />
  );
});
