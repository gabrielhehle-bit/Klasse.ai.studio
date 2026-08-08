import { useEffect } from 'react';

export function useEscapeKey(onEscape: () => void, condition: boolean = true) {
  useEffect(() => {
    if (!condition) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEscape, condition]);
}
