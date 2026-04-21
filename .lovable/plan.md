

# Plano — Testes de foco inicial e navegação por teclado (Tab/Shift+Tab)

Adiciono 2 testes ao `describe` do `MagicUpVariationComparator` em `tests/components/magic-up-onda5.test.tsx` validando: (1) ordem de foco natural via Tab/Shift+Tab pelos botões de seleção e botões "Marcar vencedora"; (2) que o card ativo (`activeIndex`) recebe os atributos visuais e ARIA corretos (`aria-pressed="true"`, `aria-current="true"`) independentemente do elemento focado pelo teclado.

## Justificativa

O componente `MagicUpVariationComparator` renderiza, para cada variação, **dois botões focáveis**:
1. Botão principal "Selecionar variação N" (com `aria-pressed` e `aria-current`)
2. Botão "Marcar vencedora" (logo abaixo)

Sem testes que travam:
- A ordem natural de Tab pode quebrar se alguém adicionar `tabIndex={-1}` ou reorganizar a estrutura DOM
- O destaque visual do card ativo (`border-primary ring-2 ring-primary/20`) e ARIA (`aria-pressed="true"`, `aria-current="true"`) podem se dessincronizar de `activeIndex` em refatorações
- A independência entre **foco do teclado** e **estado ativo** (foco não muda ativo, só `onSelect` muda) pode ser quebrada por handlers indevidos

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — adicionar 2 testes no `describe("MagicUpVariationComparator")`, após o teste de clique em empatado já existente.

## Testes a adicionar

### Teste 1 — Ordem de foco natural via Tab/Shift+Tab

```ts
it("Tab/Shift+Tab navega na ordem DOM: select-1 → marcar-1 → select-2 → marcar-2 → select-3 → marcar-3", async () => {
  const user = userEvent.setup();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
  ];
  render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );

  // Inicial: nenhum elemento do componente tem foco (body)
  expect(document.body).toHaveFocus();

  // Tab 1 → primeiro botão focável (select variação 1)
  await user.tab();
  expect(screen.getByRole("button", { name: /Selecionar variação 1, score 90, melhor score/i })).toHaveFocus();

  // Tab 2 → marcar vencedora 1
  await user.tab();
  expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();

  // Tab 3 → select variação 2
  await user.tab();
  expect(screen.getByRole("button", { name: "Selecionar variação 2, score 70" })).toHaveFocus();

  // Tab 4 → marcar vencedora 2
  await user.tab();
  expect(screen.getByRole("button", { name: "Marcar variação 2 como vencedora" })).toHaveFocus();

  // Tab 5 → select variação 3
  await user.tab();
  expect(screen.getByRole("button", { name: "Selecionar variação 3, score 50" })).toHaveFocus();

  // Tab 6 → marcar vencedora 3
  await user.tab();
  expect(screen.getByRole("button", { name: "Marcar variação 3 como vencedora" })).toHaveFocus();

  // Shift+Tab volta para select 3
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Selecionar variação 3, score 50" })).toHaveFocus();

  // Shift+Tab volta para marcar 2
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Marcar variação 2 como vencedora" })).toHaveFocus();
});
```

### Teste 2 — Card ativo destacado corretamente após mudança de `activeIndex` (independente do foco)

```ts
it("card ativo reflete activeIndex via aria-pressed/aria-current/border-primary, independente do foco do teclado", async () => {
  const user = userEvent.setup();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
  ];
  const { rerender } = render(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={0}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );

  // activeIndex=0: card 1 é o ativo
  const card1Btn = screen.getByRole("button", { name: /Selecionar variação 1, score 90, melhor score/i });
  const card2Btn = screen.getByRole("button", { name: "Selecionar variação 2, score 70" });
  const card3Btn = screen.getByRole("button", { name: "Selecionar variação 3, score 50" });

  expect(card1Btn).toHaveAttribute("aria-pressed", "true");
  expect(card1Btn).toHaveAttribute("aria-current", "true");
  expect(card2Btn).toHaveAttribute("aria-pressed", "false");
  expect(card2Btn).not.toHaveAttribute("aria-current");
  expect(card3Btn).toHaveAttribute("aria-pressed", "false");
  expect(card3Btn).not.toHaveAttribute("aria-current");

  // Wrapper do card 1 (parent direto do botão) tem classe border-primary
  expect(card1Btn.parentElement).toHaveClass("border-primary");
  expect(card2Btn.parentElement).not.toHaveClass("border-primary");

  // Foca no card 3 via Tab — foco não muda ativo
  card3Btn.focus();
  expect(card3Btn).toHaveFocus();
  // Card 1 continua sendo o ativo (aria-pressed=true), card 3 ainda é aria-pressed=false
  expect(card1Btn).toHaveAttribute("aria-pressed", "true");
  expect(card3Btn).toHaveAttribute("aria-pressed", "false");
  expect(card3Btn.parentElement).not.toHaveClass("border-primary");

  // Parent muda activeIndex para 2 → card 3 vira o ativo, card 1 perde
  rerender(
    <MagicUpVariationComparator
      variations={variations}
      activeIndex={2}
      onSelect={vi.fn()}
      onSelectWinner={vi.fn()}
    />
  );

  expect(card1Btn).toHaveAttribute("aria-pressed", "false");
  expect(card1Btn).not.toHaveAttribute("aria-current");
  expect(card3Btn).toHaveAttribute("aria-pressed", "true");
  expect(card3Btn).toHaveAttribute("aria-current", "true");
  expect(card3Btn.parentElement).toHaveClass("border-primary");
  expect(card1Btn.parentElement).not.toHaveClass("border-primary");
});
```

## Estratégia

- **`userEvent.setup()`** para Tab/Shift+Tab realista (preferível sobre `fireEvent.keyDown` em testes de tab order)
- **Ordem DOM esperada** vem direto da estrutura do componente: para cada variação, primeiro o `<button>` principal de seleção, depois o `<button>` "Marcar vencedora" — Tab segue ordem natural pois nenhum tem `tabIndex` customizado
- **Sanity check** com `document.body.toHaveFocus()` antes do primeiro Tab garante estado limpo
- **Destaque visual:** `card1Btn.parentElement` é o `<div>` wrapper que recebe `border-primary ring-2 ring-primary/20` quando ativo — assert na classe trava o destaque CSS
- **Independência foco/ativo:** `card3Btn.focus()` programático prova que apenas `activeIndex` (controlado pelo parent via `onSelect`) muda os ARIA, não o foco do teclado

## Imports necessários

`userEvent` provavelmente já está importado em outros testes do arquivo. Se não estiver, adicionar:
```ts
import userEvent from "@testing-library/user-event";
```

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks
- 2 testes novos (29 → 31 testes)

## Entregável

- 2 testes novos em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato de a11y de teclado: ordem natural DOM, sem `tabIndex` quebrado, sem trap
- Trava contrato visual/ARIA: card ativo = `activeIndex`, ortogonal a foco do teclado
- Cobertura WCAG 2.1.1 (Keyboard) e 2.4.3 (Focus Order) com asserts determinísticos

