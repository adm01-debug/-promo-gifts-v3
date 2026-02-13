import { useEffect } from "react";

/**
 * Previne que react-remove-scroll (usado internamente pelo Radix Dialog/Select/Popover)
 * trave o scroll da página via JavaScript.
 *
 * Solução: capture-phase wheel listener com stopImmediatePropagation
 * para impedir que react-remove-scroll receba o evento quando não há overlay ativo.
 */

function hasActiveOverlay(): boolean {
  return !!(
    document.querySelector('[data-state="open"][role="dialog"]') ||
    document.querySelector('[data-state="open"][role="alertdialog"]') ||
    document.querySelector('[data-state="open"][role="listbox"]') ||
    document.querySelector('[data-radix-select-content-wrapper]')
  );
}

function cleanScrollLockResiduals() {
  for (const el of [document.documentElement, document.body]) {
    if (el.hasAttribute('data-scroll-locked')) {
      el.removeAttribute('data-scroll-locked');
    }
    el.style.overflow = '';
    el.style.overflowY = '';
    el.style.marginRight = '';
    el.style.paddingRight = '';
    el.style.position = '';
    // Fix inline pointer-events
    if ((el as HTMLElement).style.pointerEvents === 'none') {
      (el as HTMLElement).style.pointerEvents = '';
    }
    // Fix computed pointer-events (set by classes like block-interactivity-N)
    const computed = window.getComputedStyle(el);
    if (computed.pointerEvents === 'none') {
      (el as HTMLElement).style.pointerEvents = 'auto';
    }
  }

  // Remove react-remove-scroll "block-interactivity-*" classes from body
  // These set pointer-events: none via <style> tag, not inline styles
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
    // ═══ 1. Capture-phase wheel/touch handler ═══
    // react-remove-scroll listens on bubble phase with {passive: false}
    // and calls preventDefault(). By intercepting in CAPTURE phase and calling
    // stopImmediatePropagation, we prevent it from ever receiving the event.
    const captureWheelHandler = (e: WheelEvent) => {
      if (!hasActiveOverlay()) {
        // No overlay active — scroll must work.
        // Stop react-remove-scroll from blocking this event.
        e.stopImmediatePropagation();
        // Also clean any residual lock attributes
        cleanScrollLockResiduals();
      }
    };

    const captureTouchHandler = (e: TouchEvent) => {
      if (!hasActiveOverlay()) {
        e.stopImmediatePropagation();
        cleanScrollLockResiduals();
      }
    };

    // MUST be non-passive to allow stopImmediatePropagation to take full effect
    // before react-remove-scroll's listeners
    document.addEventListener('wheel', captureWheelHandler, { capture: true, passive: false });
    document.addEventListener('touchmove', captureTouchHandler, { capture: true, passive: false });

    // ═══ 2. MutationObserver — cleanup de atributos residuais ═══
    const observer = new MutationObserver(() => {
      if (!hasActiveOverlay()) {
        cleanScrollLockResiduals();
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });

    // ═══ 3. Periodic cleanup — último recurso ═══
    const interval = setInterval(() => {
      if (!hasActiveOverlay()) {
        cleanScrollLockResiduals();
      }
    }, 2000);

    return () => {
      document.removeEventListener('wheel', captureWheelHandler, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchmove', captureTouchHandler, { capture: true } as EventListenerOptions);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}