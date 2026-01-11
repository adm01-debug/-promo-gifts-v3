import { useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

type KeyHandler = (event: KeyboardEvent) => void;

interface KeyBinding {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean;
    alt?: boolean;
    shift?: boolean;
  };
  handler: KeyHandler;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardNavigationOptions {
  enabled?: boolean;
  globalShortcuts?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  callback: KeyHandler,
  options: {
    ctrl?: boolean;
    meta?: boolean;
    alt?: boolean;
    shift?: boolean;
    enabled?: boolean;
    preventDefault?: boolean;
  } = {}
) {
  const { ctrl, meta, alt, shift, enabled = true, preventDefault = true } = options;
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger in input fields unless explicitly allowed
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrlMatch = ctrl ? event.ctrlKey : !event.ctrlKey;
      const metaMatch = meta ? event.metaKey : !event.metaKey;
      const altMatch = alt ? event.altKey : !event.altKey;
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey;

      // Handle cmd/ctrl cross-platform
      const modifierMatch = (ctrl || meta)
        ? (event.ctrlKey || event.metaKey) && altMatch && shiftMatch
        : ctrlMatch && metaMatch && altMatch && shiftMatch;

      if (event.key.toLowerCase() === key.toLowerCase() && modifierMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        callbackRef.current(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrl, meta, alt, shift, enabled, preventDefault]);
}

/**
 * Hook for global keyboard navigation
 */
export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { enabled = true, globalShortcuts = true } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const sequenceRef = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear sequence after timeout
  const clearSequence = useCallback(() => {
    sequenceRef.current = [];
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
    }
  }, []);

  // Handle "go to" shortcuts (g + key)
  const handleGoToShortcut = useCallback((key: string) => {
    const routes: Record<string, string> = {
      h: "/",
      c: "/",
      o: "/orcamentos",
      p: "/pedidos",
      e: "/estoque",
      f: "/favoritos",
      s: "/configuracoes",
    };

    if (routes[key]) {
      navigate(routes[key]);
    }
  }, [navigate]);

  useEffect(() => {
    if (!enabled || !globalShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      // Handle sequence shortcuts
      sequenceRef.current.push(key);

      // Reset sequence timeout
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
      sequenceTimeoutRef.current = setTimeout(clearSequence, 500);

      // Check for "g + x" shortcuts
      if (sequenceRef.current.length === 2 && sequenceRef.current[0] === "g") {
        handleGoToShortcut(sequenceRef.current[1]);
        clearSequence();
        return;
      }

      // Single key shortcuts
      if (sequenceRef.current.length === 1) {
        switch (key) {
          case "escape":
            // Close any open modals/sheets
            const escapeEvent = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
            });
            document.dispatchEvent(escapeEvent);
            break;
        }
      }

      // Keep sequence short
      if (sequenceRef.current.length > 2) {
        clearSequence();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [enabled, globalShortcuts, handleGoToShortcut, clearSequence]);

  return {
    currentPath: location.pathname,
    navigate,
  };
}

/**
 * Hook for arrow key navigation in lists
 */
export function useArrowKeyNavigation<T extends HTMLElement>(
  itemsCount: number,
  options: {
    initialIndex?: number;
    wrap?: boolean;
    onSelect?: (index: number) => void;
    enabled?: boolean;
  } = {}
) {
  const { initialIndex = 0, wrap = true, onSelect, enabled = true } = options;
  const currentIndexRef = useRef(initialIndex);
  const containerRef = useRef<T>(null);

  const setCurrentIndex = useCallback((index: number) => {
    currentIndexRef.current = index;
    
    // Focus the item
    if (containerRef.current) {
      const items = containerRef.current.querySelectorAll('[data-nav-item]');
      const item = items[index] as HTMLElement;
      if (item) {
        item.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      let newIndex = currentIndexRef.current;

      switch (event.key) {
        case "ArrowDown":
        case "j":
          event.preventDefault();
          newIndex = currentIndexRef.current + 1;
          if (newIndex >= itemsCount) {
            newIndex = wrap ? 0 : itemsCount - 1;
          }
          break;

        case "ArrowUp":
        case "k":
          event.preventDefault();
          newIndex = currentIndexRef.current - 1;
          if (newIndex < 0) {
            newIndex = wrap ? itemsCount - 1 : 0;
          }
          break;

        case "Enter":
        case " ":
          event.preventDefault();
          onSelect?.(currentIndexRef.current);
          return;

        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;

        case "End":
          event.preventDefault();
          newIndex = itemsCount - 1;
          break;

        default:
          return;
      }

      setCurrentIndex(newIndex);
    };

    const container = containerRef.current;
    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [enabled, itemsCount, wrap, onSelect, setCurrentIndex]);

  return {
    containerRef,
    currentIndex: currentIndexRef.current,
    setCurrentIndex,
  };
}

export default useKeyboardShortcut;
