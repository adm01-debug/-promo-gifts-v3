import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook para detectar cliques fora de um elemento
 * Útil para dropdowns, modais, popovers
 */
export function useClickOutside<T extends HTMLElement>(
  callback: () => void,
  enabled: boolean = true
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      if (ref.current && !ref.current.contains(target)) {
        callback();
      }
    };

    // Usar setTimeout para evitar que o clique que abriu o elemento
    // também o feche imediatamente
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('touchstart', handleClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [callback, enabled]);

  return ref;
}

/**
 * Hook para detectar cliques fora de múltiplos elementos
 */
export function useClickOutsideMultiple(
  refs: RefObject<HTMLElement>[],
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      const isOutside = refs.every(
        (ref) => ref.current && !ref.current.contains(target)
      );
      
      if (isOutside) {
        callback();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('touchstart', handleClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [refs, callback, enabled]);
}
