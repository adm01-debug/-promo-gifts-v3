

# Plano — Auto-scroll para variação fora da viewport ao navegar com setas

Adiciono **auto-scroll suave** ao `MagicUpVariationComparator` para garantir que, quando o usuário navega via teclado (setas, Home, End) para um card fora da área visível, o navegador role automaticamente até trazer o card para o viewport. Implementação leve usando `Element.scrollIntoView()` com opções nativas + respeito a `prefers-reduced-motion`.

## Justificativa

A lógica atual em `handleArrowKey` chama `cardRefs.current[nextIndex]?.focus()`, mas:
- `.focus()` **não rola** automaticamente em todos os navegadores quando o elemento está parcialmente visível (especialmente em containers com overflow ou viewports curtos)
- Em **mobile** (grid 2 colunas), navegar de card 1 → card 6 deixa o foco invisível
- Em **desktop** com janela curta, cards inferiores ficam abaixo da dobra
- Usuários de leitor de tela perdem contexto visual quando a sincronização ocorre

**WCAG 2.4.7 (Focus Visible)**: foco precisa ser visualmente perceptível — rolar para o elemento é parte do contrato.

## Alteração

### `src/components/magic-up/MagicUpVariationComparator.tsx`

Modificar `handleArrowKey` (linhas 35-46) para:
1. Após `focus()`, chamar `scrollIntoView({ block: "nearest", inline: "nearest", behavior })`
2. `behavior` = `"smooth"` por padrão, `"auto"` (instantâneo) se `prefers-reduced-motion: reduce`
3. `block: "nearest"` evita rolagem desnecessária quando o card já está visível (não "pula" se já no viewport)

```ts
const handleArrowKey = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
  const total = variations.length;
  let nextIndex: number | null = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIndex = (currentIndex + 1) % total;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIndex = (currentIndex - 1 + total) % total;
  else if (e.key === "Home") nextIndex = 0;
  else if (e.key === "End") nextIndex = total - 1;
  if (nextIndex === null) return;
  e.preventDefault();
  onSelect(nextIndex);
  const nextCard = cardRefs.current[nextIndex];
  nextCard?.focus();
  if (nextCard) {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    nextCard.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }
};
```

### Testes — `tests/components/magic-up-onda5.test.tsx`

Adicionar **2 testes** ao final do sub-describe `"navegação por setas/Home/End"`:

#### Teste 1 — `scrollIntoView` é chamado com opções corretas após navegação

```ts
it("auto-scroll: setas/Home/End disparam scrollIntoView com block:nearest e behavior:smooth", async () => {
  const user = userEvent.setup();
  // Stub global de scrollIntoView (jsdom não implementa)
  const scrollSpy = vi.fn();
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = scrollSpy;

  // Mock matchMedia retornando false para reduced-motion
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  try {
    function ControlledWrapper() {
      const [activeIndex, setActiveIndex] = React.useState(0);
      return (
        <MagicUpVariationComparator
          variations={navVariations}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onSelectWinner={vi.fn()}
        />
      );
    }
    render(<ControlledWrapper />);

    const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
    card1.focus();
    scrollSpy.mockClear();

    // ArrowRight
    await user.keyboard("{ArrowRight}");
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });

    // End
    scrollSpy.mockClear();
    await user.keyboard("{End}");
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ block: "nearest", behavior: "smooth" })
    );

    // Home
    scrollSpy.mockClear();
    await user.keyboard("{Home}");
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ block: "nearest", behavior: "smooth" })
    );
  } finally {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    window.matchMedia = originalMatchMedia;
  }
});
```

#### Teste 2 — `prefers-reduced-motion` força `behavior: "auto"`

```ts
it("auto-scroll respeita prefers-reduced-motion: behavior vira 'auto' (instantâneo)", async () => {
  const user = userEvent.setup();
  const scrollSpy = vi.fn();
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = scrollSpy;

  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("reduce"), // true para prefers-reduced-motion
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  try {
    render(
      <MagicUpVariationComparator
        variations={navVariations}
        activeIndex={0}
        onSelect={vi.fn()}
        onSelectWinner={vi.fn()}
      />
    );
    const card1 = screen.getByRole("button", { name: /^Selecionar variação 1/ });
    card1.focus();
    scrollSpy.mockClear();

    await user.keyboard("{ArrowRight}");
    expect(scrollSpy).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
      behavior: "auto",
    });

    // Click NÃO dispara scroll (apenas teclado)
    scrollSpy.mockClear();
    await user.click(screen.getByRole("button", { name: /^Selecionar variação 3/ }));
    expect(scrollSpy).not.toHaveBeenCalled();
  } finally {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    window.matchMedia = originalMatchMedia;
  }
});
```

## Restrições

- Sem novos imports no componente (usa API nativa `scrollIntoView` + `matchMedia`)
- Sem novos imports nos testes (reusa `render`, `screen`, `userEvent`, `vi`, `React`)
- Guard SSR-safe: `typeof window !== "undefined"` + optional chaining em `matchMedia?.`
- `block: "nearest"` garante que cards já visíveis não causam scroll desnecessário (zero jitter quando todos cabem na tela)
- Click do mouse **não** dispara scroll (handler é só `onKeyDown`) — preserva controle do usuário
- 2 testes novos (114 → 116 testes)

## Entregável

- Componente: navegação por teclado traz card focado para viewport com animação suave (ou instantânea se reduced-motion)
- Testes cobrem:
  1. ArrowRight/Home/End disparam `scrollIntoView` exatamente 1× cada
  2. Opções corretas: `{block:"nearest", inline:"nearest", behavior:"smooth"}`
  3. `prefers-reduced-motion: reduce` muda `behavior` para `"auto"` (sem animação)
  4. Click do mouse **não** dispara scroll (apenas teclado)
- Captura regressões onde:
  - `scrollIntoView` seja removido do handler
  - `behavior` vire hardcoded `"smooth"` ignorando reduced-motion
  - `block: "center"` ou `"start"` causem rolagem agressiva quando card já está visível
  - Scroll passe a ser disparado também por click (UX intrusiva)
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 116/116 verde

