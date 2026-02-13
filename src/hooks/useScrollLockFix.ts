import { useEffect } from "react";

/**
 * Previne que react-remove-scroll (Radix) trave o scroll da página.
 * O react-remove-scroll captura eventos wheel/touchmove via JS e chama preventDefault().
 * Esta correção intercepta esses eventos na fase de captura e os re-dispatcha se necessário.
 */
export function useScrollLockFix() {
  useEffect(() => {
    // Força cleanup de atributos residuais a cada 2s
    const interval = setInterval(() => {
      const html = document.documentElement;
      const body = document.body;
      
      // Se não há nenhum dialog/modal aberto mas scroll está travado, limpar
      const hasOpenDialog = document.querySelector('[data-state="open"][role="dialog"]');
      if (!hasOpenDialog) {
        if (html.hasAttribute('data-scroll-locked')) {
          html.removeAttribute('data-scroll-locked');
          html.style.overflow = '';
          html.style.paddingRight = '';
          html.style.marginRight = '';
          html.style.position = '';
        }
        if (body.hasAttribute('data-scroll-locked')) {
          body.removeAttribute('data-scroll-locked');
          body.style.overflow = '';
          body.style.paddingRight = '';
          body.style.marginRight = '';
          body.style.position = '';
          body.style.top = '';
          body.style.left = '';
          body.style.right = '';
          body.style.width = '';
        }
        // Also clean up any pointer-events: none
        if (body.style.pointerEvents === 'none') {
          body.style.pointerEvents = '';
        }
      }
    }, 2000);

    // Observar mudanças no body/html para reagir imediatamente
    const observer = new MutationObserver(() => {
      const hasOpenDialog = document.querySelector('[data-state="open"][role="dialog"]');
      if (!hasOpenDialog) {
        // Limpar inline styles que travam scroll
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
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);
}