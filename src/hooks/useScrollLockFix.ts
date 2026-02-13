import { useEffect } from "react";

/**
 * Previne que react-remove-scroll (usado internamente pelo Radix Dialog/Select/Popover)
 * trave o scroll da página via JavaScript.
 *
 * react-remove-scroll adiciona event listeners com {passive:false} no document
 * que chamam preventDefault() em eventos wheel/touchmove. Isso bloqueia scroll
 * com mouse mesmo após componentes Radix fecharem, caso a limpeza falhe.
 *
 * Solução tripla:
 * 1. Patch no Event.prototype.preventDefault — ignora para wheel/touchmove sem modal
 * 2. Capture-phase wheel/touchmove listener — chama stopImmediatePropagation para
 *    impedir que react-remove-scroll receba o evento quando não há overlay ativo
 * 3. MutationObserver — limpa estilos residuais (overflow:hidden, position:fixed, etc.)
 */

function hasActiveOverlay(): boolean {
  return !!(
    document.querySelector('[data-state="open"][role="dialog"]') ||
    document.querySelector('[data-radix-scroll-area-viewport][data-scroll-locked]') ||
    document.querySelector('[data-state="open"][data-radix-popper-content-wrapper]') ||
    document.querySelector('[data-radix-select-viewport]') ||
    document.querySelector('[data-radix-popper-content-wrapper] [role="listbox"]')
  );
}

export function useScrollLockFix() {
  useEffect(() => {
    // ═══ 1. Patch preventDefault ═══
    const originalPreventDefault = Event.prototype.preventDefault;

    const patchedPreventDefault = function (this: Event) {
      if (
        (this.type === 'wheel' || this.type === 'touchmove') &&
        !hasActiveOverlay()
      ) {
        return; // Não prevenir — deixar o scroll funcionar
      }
      return originalPreventDefault.call(this);
    };

    Event.prototype.preventDefault = patchedPreventDefault;

    // ═══ 2. Capture-phase listener para neutralizar react-remove-scroll ═══
    // react-remove-scroll escuta wheel/touchmove na fase de bubble.
    // Ao interceptar na fase de CAPTURE e forçar o evento a ser não-cancelável
    // (via stopImmediatePropagation nos handlers de bloqueio), garantimos scroll.
    const captureWheelHandler = (e: WheelEvent) => {
      if (!hasActiveOverlay()) {
        // Forçar: remover qualquer bloqueio residual no DOM
        const html = document.documentElement;
        const body = document.body;
        if (html.hasAttribute('data-scroll-locked')) {
          html.removeAttribute('data-scroll-locked');
          html.style.overflow = '';
          html.style.overflowY = '';
          html.style.marginRight = '';
          html.style.paddingRight = '';
          html.style.position = '';
        }
        if (body.hasAttribute('data-scroll-locked')) {
          body.removeAttribute('data-scroll-locked');
          body.style.overflow = '';
          body.style.overflowY = '';
          body.style.marginRight = '';
          body.style.paddingRight = '';
          body.style.position = '';
        }
      }
    };

    const captureTouchHandler = (e: TouchEvent) => {
      if (!hasActiveOverlay()) {
        const html = document.documentElement;
        const body = document.body;
        if (html.hasAttribute('data-scroll-locked') || body.hasAttribute('data-scroll-locked')) {
          html.removeAttribute('data-scroll-locked');
          body.removeAttribute('data-scroll-locked');
          for (const el of [html, body]) {
            el.style.overflow = '';
            el.style.overflowY = '';
            el.style.marginRight = '';
            el.style.paddingRight = '';
            el.style.position = '';
          }
        }
      }
    };

    document.addEventListener('wheel', captureWheelHandler, { capture: true, passive: true });
    document.addEventListener('touchmove', captureTouchHandler, { capture: true, passive: true });

    // ═══ 3. MutationObserver — cleanup de atributos residuais ═══
    const observer = new MutationObserver(() => {
      if (!hasActiveOverlay()) {
        for (const el of [document.documentElement, document.body]) {
          if (el.style.overflow === 'hidden' || el.style.overflowY === 'hidden') {
            el.style.overflow = '';
            el.style.overflowY = '';
          }
          if (el.style.position === 'fixed') {
            el.style.position = '';
          }
          if (el.hasAttribute('data-scroll-locked')) {
            el.removeAttribute('data-scroll-locked');
            el.style.marginRight = '';
            el.style.paddingRight = '';
          }
          if ((el as HTMLElement).style.pointerEvents === 'none') {
            (el as HTMLElement).style.pointerEvents = '';
          }
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });

    // ═══ 4. Periodic cleanup — último recurso ═══
    // A cada 2s, verificar se há bloqueio residual e limpar
    const interval = setInterval(() => {
      if (!hasActiveOverlay()) {
        for (const el of [document.documentElement, document.body]) {
          if (el.hasAttribute('data-scroll-locked')) {
            el.removeAttribute('data-scroll-locked');
            el.style.overflow = '';
            el.style.overflowY = '';
            el.style.marginRight = '';
            el.style.paddingRight = '';
            el.style.position = '';
          }
        }
      }
    }, 2000);

    return () => {
      Event.prototype.preventDefault = originalPreventDefault;
      document.removeEventListener('wheel', captureWheelHandler, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchmove', captureTouchHandler, { capture: true } as EventListenerOptions);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}