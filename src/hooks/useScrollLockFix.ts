import { useEffect } from "react";

/**
 * Previne que react-remove-scroll (usado internamente pelo Radix Dialog/Select/Popover)
 * trave o scroll da página via JavaScript.
 *
 * Estratégia: interceptação em capture-phase de wheel E touchmove,
 * MutationObserver e cleanup periódico.
 */

function hasActiveOverlay(): boolean {
  const openDialogs = document.querySelectorAll('[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]');
  for (const dialog of openDialogs) {
    const rect = (dialog as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return true;
    }
  }
  
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
  let cleaned = false;
  
  for (const el of [document.documentElement, document.body]) {
    if (el.hasAttribute('data-scroll-locked')) {
      el.removeAttribute('data-scroll-locked');
      cleaned = true;
    }
    
    const style = el.style;
    if (style.overflow && style.overflow !== '') { style.overflow = ''; cleaned = true; }
    if (style.overflowY && style.overflowY !== '') { style.overflowY = ''; cleaned = true; }
    if (style.marginRight && style.marginRight !== '') { style.marginRight = ''; cleaned = true; }
    if (style.paddingRight && style.paddingRight !== '') { style.paddingRight = ''; cleaned = true; }
    if (style.position === 'fixed' || style.position === 'relative') { style.position = ''; cleaned = true; }
    if (style.touchAction === 'none') { style.touchAction = ''; cleaned = true; }
    if (style.pointerEvents === 'none') { style.pointerEvents = ''; cleaned = true; }
    
    const computed = window.getComputedStyle(el);
    if (computed.pointerEvents === 'none') {
      style.pointerEvents = 'auto';
      cleaned = true;
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
    cleaned = true;
  }
  
  if (cleaned) {
    console.log('[ScrollLockFix] Cleaned residual scroll lock');
  }
}

export function useScrollLockFix() {
  useEffect(() => {
    // ═══ 1. Capture-phase handlers ═══
    // react-remove-scroll listens on bubble phase with {passive: false}
    // and calls preventDefault(). Intercept in CAPTURE phase to prevent it.
    const captureHandler = (e: Event) => {
      if (!hasActiveOverlay()) {
        e.stopImmediatePropagation();
      }
    };

    // Intercept BOTH wheel (desktop) AND touchmove (mobile).
    // Using stopImmediatePropagation only — does NOT call preventDefault,
    // so native browser scrolling still works. It only prevents react-remove-scroll
    // from receiving the event and calling preventDefault itself.
    document.addEventListener('wheel', captureHandler, { capture: true, passive: true });
    document.addEventListener('touchmove', captureHandler, { capture: true, passive: true });

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

    // ═══ 4. Cleanup on visibility change ═══
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !hasActiveOverlay()) {
        cleanScrollLockResiduals();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ═══ 5. Initial cleanup ═══
    cleanScrollLockResiduals();

    return () => {
      document.removeEventListener('wheel', captureHandler, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchmove', captureHandler, { capture: true } as EventListenerOptions);
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}
