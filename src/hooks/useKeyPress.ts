import { useEffect, useCallback, useState } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface UseKeyPressOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: Window | Document | HTMLElement | null;
}

/**
 * Hook para detectar teclas pressionadas
 * Útil para atalhos de teclado
 */
export function useKeyPress(
  targetKey: string | string[],
  handler: KeyHandler,
  options: UseKeyPressOptions = {}
): void {
  const {
    enabled = true,
    preventDefault = false,
    stopPropagation = false,
    target = typeof window !== 'undefined' ? window : null,
  } = options;

  const keys = Array.isArray(targetKey) ? targetKey : [targetKey];

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const pressedKey = event.key.toLowerCase();
      const isMatch = keys.some((key) => key.toLowerCase() === pressedKey);

      if (isMatch) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        handler(event);
      }
    },
    [enabled, keys, handler, preventDefault, stopPropagation]
  );

  useEffect(() => {
    if (!target || !enabled) return;

    target.addEventListener('keydown', handleKeyPress as EventListener);

    return () => {
      target.removeEventListener('keydown', handleKeyPress as EventListener);
    };
  }, [target, enabled, handleKeyPress]);
}

/**
 * Hook para detectar combinações de teclas (Ctrl+S, etc)
 */
export function useKeyCombo(
  combo: string,
  handler: KeyHandler,
  options: UseKeyPressOptions = {}
): void {
  const { enabled = true, preventDefault = true, ...rest } = options;

  const handleKeyCombo = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const parts = combo.toLowerCase().split('+');
      const key = parts[parts.length - 1];
      const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');
      const needsShift = parts.includes('shift');
      const needsAlt = parts.includes('alt');

      const ctrlPressed = event.ctrlKey || event.metaKey;
      const shiftPressed = event.shiftKey;
      const altPressed = event.altKey;

      const keyMatches = event.key.toLowerCase() === key;
      const ctrlMatches = needsCtrl ? ctrlPressed : !ctrlPressed;
      const shiftMatches = needsShift ? shiftPressed : !shiftPressed;
      const altMatches = needsAlt ? altPressed : !altPressed;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        if (preventDefault) event.preventDefault();
        handler(event);
      }
    },
    [combo, enabled, handler, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyCombo);

    return () => {
      window.removeEventListener('keydown', handleKeyCombo);
    };
  }, [enabled, handleKeyCombo]);
}

/**
 * Hook para rastrear se uma tecla está pressionada
 */
export function useKeyState(targetKey: string): boolean {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === targetKey.toLowerCase()) {
        setIsPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === targetKey.toLowerCase()) {
        setIsPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [targetKey]);

  return isPressed;
}
