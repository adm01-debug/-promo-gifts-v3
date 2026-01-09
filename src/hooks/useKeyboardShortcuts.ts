import { useEffect, useCallback, useRef } from "react";

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  callback: () => void;
  description?: string;
  enabled?: boolean;
};

/**
 * useKeyboardShortcuts - Hook para shortcuts globais de teclado (CA-15)
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: "k", ctrl: true, callback: openSearch, description: "Abrir busca" },
 *   { key: "Escape", callback: closeModal, description: "Fechar modal" },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const altMatch = !!shortcut.alt === event.altKey;
        const shiftMatch = !!shortcut.shift === event.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          // Não previne default para inputs/textareas a menos que seja Escape
          const target = event.target as HTMLElement;
          const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
          
          if (isInput && shortcut.key !== "Escape") {
            continue;
          }

          event.preventDefault();
          shortcut.callback();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * useEscapeKey - Hook simplificado para Escape
 */
export function useEscapeKey(callback: () => void, enabled = true) {
  useKeyboardShortcuts([
    { key: "Escape", callback, enabled },
  ]);
}

/**
 * useArrowNavigation - Hook para navegação com setas
 */
export function useArrowNavigation({
  onUp,
  onDown,
  onLeft,
  onRight,
  enabled = true,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (onUp) shortcuts.push({ key: "ArrowUp", callback: onUp, enabled });
  if (onDown) shortcuts.push({ key: "ArrowDown", callback: onDown, enabled });
  if (onLeft) shortcuts.push({ key: "ArrowLeft", callback: onLeft, enabled });
  if (onRight) shortcuts.push({ key: "ArrowRight", callback: onRight, enabled });

  useKeyboardShortcuts(shortcuts);
}

/**
 * useFocusTrap - Hook para trap de foco em modais
 */
export function useFocusTrap(enabled = true) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element
    firstElement?.focus();

    container.addEventListener("keydown", handleTabKey);
    return () => container.removeEventListener("keydown", handleTabKey);
  }, [enabled]);

  return containerRef;
}

export default useKeyboardShortcuts;
