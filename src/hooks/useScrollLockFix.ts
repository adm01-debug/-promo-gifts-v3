import { useEffect } from "react";

/**
 * Previne que react-remove-scroll (usado internamente pelo Radix Dialog/Select/Popover)
 * trave o scroll da página via JavaScript.
 *
 * Estratégia: MutationObserver + cleanup periódico para remover atributos residuais
 * quando nenhum overlay está ativo. Evita interceptar touchmove para não interferir
 * com o scroll nativo em dispositivos móveis.
 */

function hasActiveOverlay(): boolean {
  // Check dialogs that are actually visible (not hidden or zero-size)
  const openDialogs = document.querySelectorAll('[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]');
  for (const dialog of openDialogs) {
    const rect = (dialog as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return true;
    }
  }
  
  // Check for open select content wrappers
  const selectWrapper = document.querySelector('[data-radix-select-content-wrapper]');
  if (selectWrapper) {
    const rect = (selectWrapper as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return true;
    }
  }
  
  return false;
}

function cleanScrollLockResiduals() {
  for (const el of [document.documentElement, document.body]) {
    if (el.hasAttribute('data-scroll-locked')) {
      el.removeAttribute('data-scroll-locked');
    }
    
    const style = el.style;
    if (style.overflow) style.overflow = '';
    if (style.overflowY) style.overflowY = '';
    if (style.marginRight) style.marginRight = '';
    if (style.paddingRight) style.paddingRight = '';
    if (style.position === 'fixed' || style.position === 'relative') style.position = '';
    
    // Fix touch-action that may block mobile scroll
    if (style.touchAction === 'none') style.touchAction = '';
    
    // Fix inline pointer-events
    if (style.pointerEvents === 'none') style.pointerEvents = '';
    
    // Fix computed pointer-events (set by classes like block-interactivity-N)
    const computed = window.getComputedStyle(el);
    if (computed.pointerEvents === 'none') {
      style.pointerEvents = 'auto';
    }
  }

  // Remove react-remove-scroll "block-interactivity-*" classes from body
  const toRemove: string[] = [];
  document.body.classList.forEach(cls => {
    if (cls.startsWith('block-interactivity-')) {
      toRemove.push(cls);
    }
  });
  if (toRemove.length > 0) {
    toRemove.forEach(cls => document.body.classList.remove(cls));
  }
}

export function useScrollLockFix() {
  useEffect(() => {
    // ═══ 1. Capture-phase wheel handler (desktop only) ═══
    // react-remove-scroll listens on bubble phase with {passive: false}
    // and calls preventDefault(). Intercept in CAPTURE phase to prevent it.
    const captureWheelHandler = (e: WheelEvent) => {
      if (!hasActiveOverlay()) {
        e.stopImmediatePropagation();
        cleanScrollLockResiduals();
      }
    };

    // Only intercept wheel events (desktop scroll).
    // Do NOT intercept touchmove — it breaks native mobile scrolling.
    document.addEventListener('wheel', captureWheelHandler, { capture: true, passive: false });

    // ═══ 2. MutationObserver — cleanup de atributos residuais ═══
    const observer = new MutationObserver(() => {
      if (!hasActiveOverlay()) {
        cleanScrollLockResiduals();
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-scroll-locked', 'class'] });

    // ═══ 3. Periodic cleanup — último recurso ═══
    const interval = setInterval(() => {
      if (!hasActiveOverlay()) {
        cleanScrollLockResiduals();
      }
    }, 500);

    // ═══ 4. Focus/visibility change cleanup ═══
    // When user switches tabs and comes back, clean any stale locks
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !hasActiveOverlay()) {
        cleanScrollLockResiduals();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('wheel', captureWheelHandler, { capture: true } as EventListenerOptions);
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}
