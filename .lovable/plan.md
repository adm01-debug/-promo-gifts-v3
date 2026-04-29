## Estado atual

O botão "voltar ao topo" **já existe** em `src/components/common/ScrollProgress.tsx` (`ScrollToTopButton`) e já está montado no `MainLayout` (linha 135) com `threshold={150}`.

Ele aparece como um FAB redondo no canto inferior direito (`fixed bottom-20 lg:bottom-6 right-4 lg:right-6`) com `bg-primary` e ícone `ArrowUp`.

Porém ele tem 3 problemas que foram amplificados após a correção do sticky do Header:

1. **Lógica de scroll container complexa e frágil** — varre `document.querySelectorAll("*")` dentro de `#main-content` procurando elementos com `overflow-y: auto/scroll`. Após nossa correção, o scroll real é da `window`, então essa varredura é desnecessária e pode prender o listener no elemento errado (ex: dropdown interno).
2. **Delay de 500ms** antes de registrar o listener — em SPA com transições rápidas o usuário pode rolar antes do listener estar ativo.
3. **`z-index: 40`** — mesmo que do Header sticky. Não há conflito visual hoje (botão fica na base), mas em modais/overlays pode haver. Baixar para `z-30` deixa hierarquia clara.

## Mudanças

### `src/components/common/ScrollProgress.tsx` — refatorar `ScrollToTopButton`

Substituir o `useEffect` complexo por listener direto em `window.scrollY` (agora o scroll é sempre da janela, graças à correção do sticky):

```tsx
useEffect(() => {
  const handleScroll = () => setIsVisible(window.scrollY > threshold);
  handleScroll();
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, [threshold]);
```

E `handleScrollToTop` simples:

```tsx
const handleScrollToTop = () => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
};
```

Acrescentar:
- `data-testid="scroll-to-top"` (E2E SSOT)
- `type="button"` (boa prática)
- Anel de foco `focus-visible:ring-2 ring-primary` (a11y)
- `prefers-reduced-motion` no scroll
- Trocar `z-40` → `z-30` (Header continua acima)
- `title="Voltar ao topo"` (tooltip nativo)
- `aria-hidden` no ícone

### Não mudar

- O botão **já está montado** em `MainLayout` (linha 135) — nenhuma mudança em `MainLayout.tsx`.
- `threshold={150}` mantido.
- Visual (cor, posição, ícone, animações framer-motion) preservado.

## Verificação

1. Rolar qualquer página até passar 150px → botão aparece no canto inferior direito.
2. Clicar → página rola suavemente até o topo.
3. Header continua fixo durante o scroll de retorno (já garantido pela correção anterior).
4. Em mobile (`bottom-20` para não conflitar com `SmartMobileNav`).
5. Não testar com browser tools — mudança comportamental simples, baixo risco.

## Observação

Não vou criar um componente novo — apenas simplificar o existente, que é a fonte da verdade. Criar um botão paralelo violaria a política SSOT.
