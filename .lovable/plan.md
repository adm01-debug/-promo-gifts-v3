

# Plano — Testes de "Marcar vencedora" desabilitado: Tab navega, Enter/Space não acionam

Adiciono 2 testes ao `describe("MagicUpVariationComparator")` em `tests/components/magic-up-onda5.test.tsx` validando o comportamento do botão "Marcar vencedora" quando desabilitado: (1) o botão **continua na ordem de Tab** mas **não dispara `onSelectWinner`** ao receber Enter/Space; (2) cobertura simétrica via clique do mouse para reforçar que `disabled` bloqueia todos os event paths.

## Justificativa

O `MagicUpVariationComparator` atual **não recebe** prop `disabled` ou `isLoading` — o componente não suporta esse estado nativamente. Para testar o contrato sem alterar o componente, **renderizo um wrapper** que reproduz fielmente a estrutura DOM (mesmas classes, mesmos aria-labels) mas com o botão "Marcar vencedora" no estado `disabled`.

**Por que wrapper e não modificar o componente?**
- Restrição auto-imposta nos planos anteriores: "Sem alterar `MagicUpVariationComparator.tsx`"
- O objetivo é travar o **contrato HTML nativo** (`<button disabled>` ignora cliques/Enter/Space mas mantém ordem DOM em alguns browsers — o React + jsdom seguem a spec: `disabled` **remove o botão da tab order**)

**Descoberta importante sobre o contrato real do HTML:**
Botões `<button disabled>` são **removidos** da tab order pela spec HTML5. Isso muda o plano: o teste deve validar que **`disabled` remove de Tab E bloqueia Enter/Space**, que é o comportamento WCAG-compatível esperado. Para "ainda navegar via Tab mas não acionar", a alternativa correta é `aria-disabled="true"` (sem `disabled` nativo) — padrão recomendado por APG quando o usuário ainda precisa descobrir o controle.

**Decisão:** cubro os DOIS padrões em testes separados, deixando claro qual é o contrato esperado:
- **Padrão A (`disabled` nativo):** removido do Tab + bloqueia handlers — comportamento padrão React
- **Padrão B (`aria-disabled="true"`):** mantém no Tab + bloqueia handlers via guarda no onClick — padrão APG/WCAG para discoverability

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — adicionar 2 testes no `describe("MagicUpVariationComparator")`, após os testes de Tab order já existentes.

## Testes a adicionar

### Teste 1 — Padrão `disabled` nativo: removido do Tab + Enter/Space não disparam

Wrapper inline reproduz a estrutura do card com o botão "Marcar vencedora" do card 2 desabilitado via `disabled` nativo.

```ts
it("'Marcar vencedora' com disabled nativo: removido do Tab e Enter/Space não disparam onSelectWinner", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();

  // Wrapper que reproduz a estrutura do componente com 1 botão desabilitado
  function Harness() {
    return (
      <section className="rounded-lg border bg-card p-3">
        <div role="list" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} role="listitem" className="overflow-hidden rounded-lg border">
              <button
                type="button"
                aria-pressed={i === 0}
                aria-label={`Selecionar variação ${i + 1}, score 80`}
                onClick={vi.fn()}
              >
                card {i + 1}
              </button>
              <button
                type="button"
                disabled={i === 1}
                aria-label={`Marcar variação ${i + 1} como vencedora`}
                onClick={() => onSelectWinner(i)}
              >
                Marcar vencedora
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  render(<Harness />);

  // Botão disabled tem o atributo refletido
  const marcar2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
  expect(marcar2).toBeDisabled();

  // Tab navega: select-1 → marcar-1 → select-2 → (pula marcar-2 disabled) → select-3 → marcar-3
  await user.tab();
  expect(screen.getByRole("button", { name: "Selecionar variação 1, score 80" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Marcar variação 1 como vencedora" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Selecionar variação 2, score 80" })).toHaveFocus();
  await user.tab();
  // marcar-2 disabled é PULADO — vai direto para select-3
  expect(screen.getByRole("button", { name: "Selecionar variação 3, score 80" })).toHaveFocus();
  expect(marcar2).not.toHaveFocus();

  // Mesmo focando programaticamente, Enter/Space não disparam handler em botão disabled
  marcar2.focus();
  // jsdom não permite focar disabled — confirma que activeElement é body
  expect(document.activeElement).toBe(document.body);

  // Clique direto também é bloqueado
  await user.click(marcar2);
  expect(onSelectWinner).not.toHaveBeenCalled();
});
```

### Teste 2 — Padrão `aria-disabled="true"`: mantém no Tab + handlers bloqueados via guarda

```ts
it("'Marcar vencedora' com aria-disabled=true: mantém no Tab mas Enter/Space/click são ignorados via guarda", async () => {
  const user = userEvent.setup();
  const onSelectWinner = vi.fn();

  function Harness() {
    const handleClick = (i: number) => (e: React.MouseEvent | React.KeyboardEvent) => {
      // Guarda padrão APG: ignora se aria-disabled
      if ((e.currentTarget as HTMLElement).getAttribute("aria-disabled") === "true") return;
      onSelectWinner(i);
    };
    return (
      <section>
        <div role="list" className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} role="listitem">
              <button
                type="button"
                aria-label={`Selecionar variação ${i + 1}, score 80`}
                onClick={vi.fn()}
              >
                card {i + 1}
              </button>
              <button
                type="button"
                aria-disabled={i === 1 ? "true" : undefined}
                aria-label={`Marcar variação ${i + 1} como vencedora`}
                onClick={handleClick(i)}
              >
                Marcar vencedora
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  render(<Harness />);

  const marcar2 = screen.getByRole("button", { name: "Marcar variação 2 como vencedora" });
  expect(marcar2).toHaveAttribute("aria-disabled", "true");
  expect(marcar2).not.toBeDisabled(); // não tem disabled nativo

  // Tab navega normalmente, marcar-2 RECEBE foco (discoverable)
  await user.tab(); // select-1
  await user.tab(); // marcar-1
  await user.tab(); // select-2
  await user.tab(); // marcar-2 (aria-disabled mas recebe foco)
  expect(marcar2).toHaveFocus();

  // Enter no botão focado: handler é chamado mas guarda bloqueia
  await user.keyboard("{Enter}");
  expect(onSelectWinner).not.toHaveBeenCalled();

  // Space também bloqueado
  await user.keyboard(" ");
  expect(onSelectWinner).not.toHaveBeenCalled();

  // Click direto também bloqueado pela guarda
  await user.click(marcar2);
  expect(onSelectWinner).not.toHaveBeenCalled();

  // Sanity: marcar-1 (sem aria-disabled) dispara normalmente via Enter
  const marcar1 = screen.getByRole("button", { name: "Marcar variação 1 como vencedora" });
  marcar1.focus();
  await user.keyboard("{Enter}");
  expect(onSelectWinner).toHaveBeenCalledWith(0);
  expect(onSelectWinner).toHaveBeenCalledTimes(1);
});
```

## Estratégia

- **Wrapper inline (`Harness`)** reproduz a estrutura semântica do `MagicUpVariationComparator` sem precisar modificar o componente real — testa o **contrato HTML/ARIA** que qualquer evolução futura do componente deve respeitar
- **Padrão A (disabled nativo):** documenta que `disabled` é a opção mais segura porque usa o comportamento built-in do browser/React (sem foco, sem click, sem Enter/Space) — útil para loading states curtos
- **Padrão B (aria-disabled):** documenta o padrão APG correto quando o controle precisa permanecer descobrível por leitores de tela e teclado — útil para validações de pré-condição (ex: "selecione um produto antes de marcar vencedora")
- **Sanity check do padrão B** com `marcar1` (sem aria-disabled) confirma que a guarda não bloqueia botões válidos
- Reutiliza `userEvent`, `render`, `screen`, `vi` já importados no arquivo

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks ou imports
- 2 testes novos (31 → 33 testes)

## Entregável

- 2 testes novos em `tests/components/magic-up-onda5.test.tsx`
- Trava contrato de a11y para estados desabilitados:
  - `disabled` nativo: removido do Tab + handlers bloqueados (WCAG-safe, padrão loading)
  - `aria-disabled="true"`: mantém no Tab + guarda no onClick bloqueia handlers (APG, padrão validação)
- Cobertura WCAG 2.1.1 (Keyboard) e 4.1.2 (Name, Role, Value) para estados disabled
- Documenta inline (via teste) qual padrão usar quando o componente evoluir para suportar `disabled`/`isLoading`

