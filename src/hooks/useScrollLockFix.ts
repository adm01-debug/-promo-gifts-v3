import { useEffect } from "react";

/**
 * Previne que react-remove-scroll (usado internamente pelo Radix Dialog)
 * trave o scroll da página via JavaScript.
 * 
 * O react-remove-scroll NÃO apenas muda CSS — ele adiciona event listeners
 * no document que chamam preventDefault() em eventos wheel/touchmove.
 * Isso impede scroll com mouse mesmo após o dialog fechar se a limpeza falhar.
 * 
 * Solução: interceptar wheel/touchmove na fase de CAPTURA (antes do react-remove-scroll)
 * e impedir que preventDefault() seja chamado quando não há dialog aberto.
 */
export function useScrollLockFix() {
  useEffect(() => {
    // Salvar referência original do preventDefault
    const originalPreventDefault = Event.prototype.preventDefault;

    // Patch temporário: impedir preventDefault em eventos de scroll
    // quando nenhum dialog está aberto
    const patchedPreventDefault = function (this: Event) {
      // Se é um evento de scroll (wheel/touchmove) e não há dialog aberto,
      // ignorar o preventDefault
      if (
        (this.type === 'wheel' || this.type === 'touchmove') &&
        !document.querySelector('[data-state="open"][role="dialog"]')
      ) {
        return; // Não prevenir — deixar o scroll funcionar
      }
      return originalPreventDefault.call(this);
    };

    Event.prototype.preventDefault = patchedPreventDefault;

    // Cleanup de atributos residuais via MutationObserver
    const observer = new MutationObserver(() => {
      const hasOpenDialog = document.querySelector('[data-state="open"][role="dialog"]');
      if (!hasOpenDialog) {
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

    return () => {
      // Restaurar preventDefault original
      Event.prototype.preventDefault = originalPreventDefault;
      observer.disconnect();
    };
  }, []);
}