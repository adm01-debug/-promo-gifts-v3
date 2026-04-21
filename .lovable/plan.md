

# Plano — Testes de feedback visual de teclado e estabilidade do DOM

Adiciono 2 testes ao `describe("MagicUpVariationComparator")` em `tests/components/magic-up-onda5.test.tsx` cobrindo: (1) feedback visual no card ativo quando Enter/Space dispara `onSelect` e o parent atualiza `activeIndex` (re-render reflete `border-primary`, `aria-pressed`, `aria-current`); (2) estabilidade do DOM — Enter/Space em botões NÃO devem adicionar/remover elementos, alterar contagem de botões, ou mudar atributos não relacionados ao estado controlado.

## Justificativa

Cobertura atual valida disparo de handlers e tab order, mas não:
- **Feedback visual completo** após ativação por teclado: quando Enter/Space chama `onSelect` e o pai re-renderiza com novo `activeIndex`, o card ganha `border-primary ring-2 ring-primary/20`, `aria-pressed="true"`, `aria-current="true"` — tudo via teclado, sem mouse
- **Estabilidade do DOM**: ativação por teclado não deve criar tooltips, popovers, portais, ou mudar contagem de elementos focáveis (regressão comum quando alguém adiciona efeitos colaterais no `onClick`/`onKeyDown`)

Sem esses testes, refatorações que adicionem animações com elementos extras, tooltips on-focus, ou efeitos colaterais visuais podem quebrar a UX silenciosa do teclado.

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — 2 testes novos no `describe("MagicUpVariationComparator")`, após o último teste de Enter/Space simétrico.

## Testes a adicionar

### Teste 1 — Feedback visual completo após Enter/Space (controlled re-render)

Wrapper controlado com `useState` simula o pai que reage ao `onSelect` atualizando `activeIndex`. Valida que após Enter ou Space, o card destacado muda corretamente todos os marcadores visuais e ARIA.

```ts
it("Enter/Space disparam re-render que atualiza border-primary + aria-pressed + aria-current no novo card ativo", async () => {
  const user = userEvent.setup();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
  ];

  function ControlledHarness() {
    const [active, setActive] = React.useState(0);
    return (
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={active}
        onSelect={setActive}
        onSelectWinner={vi.fn()}
      />
    );
  }

  render(<ControlledHarness />);

  const select1 = screen.getByRole("button", { name: /Selecionar variação 1, score 90/i });
  const select2 = screen.getByRole("button", { name: "Selecionar variação 2, score 70" });
  const select3 = screen.getByRole("button", { name: "Selecionar variação 3, score 50" });

  // Estado inicial: card 1 ativo
  expect(select1).toHaveAttribute("aria-pressed", "true");
  expect(select1).toHaveAttribute("aria-current", "true");
  expect(select1.parentElement).toHaveClass("border-primary");
  expect(select2.parentElement).not.toHaveClass("border-primary");

  // Tab até select-2 e dispara via Enter
  await user.tab(); // select-1
  await user.tab(); // marcar-1
  await user.tab(); // select-2
  expect(select2).toHaveFocus();
  await user.keyboard("{Enter}");

  // Card 2 agora é o ativo: border, aria-pressed, aria-current
  expect(select2).toHaveAttribute("aria-pressed", "true");
  expect(select2).toHaveAttribute("aria-current", "true");
  expect(select2.parentElement).toHaveClass("border-primary");
  expect(select2.parentElement?.className).toMatch(/ring-2/);
  // Card 1 perde destaque
  expect(select1).toHaveAttribute("aria-pressed", "false");
  expect(select1).not.toHaveAttribute("aria-current");
  expect(select1.parentElement).not.toHaveClass("border-primary");

  // Tab até select-3 e dispara via Space (consistência)
  await user.tab(); // marcar-2
  await user.tab(); // select-3
  expect(select3).toHaveFocus();
  await user.keyboard(" ");

  // Card 3 vira ativo
  expect(select3).toHaveAttribute("aria-pressed", "true");
  expect(select3).toHaveAttribute("aria-current", "true");
  expect(select3.parentElement).toHaveClass("border-primary");
  // Card 2 perde
  expect(select2).toHaveAttribute("aria-pressed", "false");
  expect(select2.parentElement).not.toHaveClass("border-primary");
});
```

### Teste 2 — Estabilidade do DOM: Enter/Space não adicionam/removem nós nem mudam contagens

Snapshot estrutural antes/depois de Enter/Space em select e marcar — apenas atributos controlados (`aria-pressed`, `aria-current`, `class` border) podem mudar; nada de novos elementos, tooltips, portais.

```ts
it("Enter/Space não alteram quantidade de botões, listitems, imagens nem criam portais/tooltips", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();
  const variations: VariationItem[] = [
    { id: "v1", imageUrl: "https://example.com/a.png", isFavorite: false, qualityScore: 90 },
    { id: "v2", imageUrl: "https://example.com/b.png", isFavorite: false, qualityScore: 70 },
    { id: "v3", imageUrl: "https://example.com/c.png", isFavorite: false, qualityScore: 50 },
  ];

  function ControlledHarness() {
    const [active, setActive] = React.useState(0);
    return (
      <MagicUpVariationComparator
        variations={variations}
        activeIndex={active}
        onSelect={setActive}
        onSelectWinner={onSelectWinner}
      />
    );
  }

  const { container } = render(<ControlledHarness />);

  // Snapshot inicial de contagens estruturais
  const initialButtons = screen.getAllByRole("button").length;
  const initialListItems = screen.getAllByRole("listitem").length;
  const initialImages = container.querySelectorAll("img").length;
  const initialBodyChildren = document.body.children.length; // detecta portais novos
  const initialSectionHTML = container.querySelector("section")?.outerHTML.length || 0;

  expect(initialButtons).toBe(6); // 3 cards + 3 marcar
  expect(initialListItems).toBe(3);
  expect(initialImages).toBe(3);

  // Ativa via Enter no card 2
  await user.tab(); // select-1
  await user.tab(); // marcar-1
  await user.tab(); // select-2
  await user.keyboard("{Enter}");

  // Contagens NÃO mudam
  expect(screen.getAllByRole("button").length).toBe(initialButtons);
  expect(screen.getAllByRole("listitem").length).toBe(initialListItems);
  expect(container.querySelectorAll("img").length).toBe(initialImages);
  expect(document.body.children.length).toBe(initialBodyChildren); // sem novos portais
  // HTML pode variar levemente (classes/atributos), mas dentro de margem pequena (sem nós novos)
  const afterEnterHTML = container.querySelector("section")?.outerHTML.length || 0;
  expect(Math.abs(afterEnterHTML - initialSectionHTML)).toBeLessThan(200);

  // Ativa "Marcar vencedora" via Space — também não deve mudar estrutura
  await user.tab(); // marcar-2
  await user.keyboard(" ");
  expect(onSelectWinner).toHaveBeenCalledWith(1);

  expect(screen.getAllByRole("button").length).toBe(initialButtons);
  expect(screen.getAllByRole("listitem").length).toBe(initialListItems);
  expect(container.querySelectorAll("img").length).toBe(initialImages);
  expect(document.body.children.length).toBe(initialBodyChildren);

  // Sem tooltips/popovers Radix vazados
  expect(document.querySelector("[role='tooltip']")).toBeNull();
  expect(document.querySelector("[role='dialog']")).toBeNull();
  expect(document.querySelector("[data-radix-portal]")).toBeNull();
});
```

## Estratégia

- **Wrapper controlado (`ControlledHarness`)** com `useState` simula uso real do componente — `onSelect` realmente atualiza estado e re-renderiza, validando o ciclo completo Enter/Space → handler → re-render → feedback visual
- **Asserts de feedback visual completos** em 3 dimensões: classe CSS (`border-primary`, `ring-2`), ARIA pressed (`aria-pressed`), ARIA current (`aria-current`) — cobre tanto leitores de tela quanto usuários sighted
- **Cobertura Enter + Space** no mesmo teste com cards diferentes garante simetria de feedback entre ambas teclas
- **Snapshot estrutural por contagens** (botões, listitems, imagens, filhos do body) é mais robusto que comparar HTML inteiro — detecta nós adicionados/removidos sem ser frágil a mudanças de classe
- **Detecção de portais Radix** via `document.body.children.length` e queries por `[role='tooltip']`, `[role='dialog']`, `[data-radix-portal]` — pega regressões comuns de tooltips on-focus mal configurados
- **Margem de tolerância** (`< 200` chars no HTML) permite mudanças legítimas de classe/atributo sem aceitar nós novos

## Imports necessários

`React` precisa estar importado (provavelmente já está pelos testes que usam JSX). Se não estiver:
```ts
import React from "react";
```

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou dependências
- 2 testes novos (35 → 37 testes)

## Entregável

- 2 testes novos em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato de feedback visual via teclado: Enter/Space produzem re-render com mudanças visuais e ARIA esperadas
- Trava contrato de estabilidade do DOM: ativação por teclado não introduz elementos, portais, tooltips ou efeitos colaterais visuais inesperados
- Cobertura WCAG 1.4.11 (Non-text Contrast — feedback de estado) e 4.1.2 (Name, Role, Value — atributos refletindo estado)

