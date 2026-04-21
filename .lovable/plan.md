

# Plano — Refatorar testes de teclado para Enter/Space via user-event (sem fallback em click)

Auditoria + refatoração dos testes de teclado em `tests/components/magic-up-onda5.test.tsx` para garantir que toda ativação por teclado use `userEvent.keyboard("{Enter}")` ou `userEvent.keyboard(" ")` em um elemento previamente focado, sem depender de `fireEvent.click()` ou `.click()` programático como atalho.

## Diagnóstico

Após inspecionar os testes adicionados nas últimas ondas, identifico 3 padrões a corrigir:

1. **`fireEvent.click()` usado em testes que descrevem "teclado"** — alguns testes antigos (pré-userEvent) afirmam validar comportamento de teclado mas disparam `fireEvent.click()` no botão, que não simula nem Enter nem Space (é um `MouseEvent`).
2. **Mistura de `fireEvent` + `userEvent` no mesmo teste** — degrada a fidelidade da simulação (userEvent dispara a sequência completa de eventos: pointerdown → mousedown → focus → pointerup → mouseup → click; fireEvent dispara só o evento isolado).
3. **Foco implícito** — alguns testes chamam `.focus()` programático e em seguida `fireEvent.keyDown(el, { key: "Enter" })`, que não dispara o click sintetizado pelo browser. O padrão correto é `el.focus()` + `await user.keyboard("{Enter}")`.

## Arquivo alterado

`tests/components/magic-up-onda5.test.tsx` — refatorar os testes do `describe("MagicUpVariationComparator")` que disparam ativação por teclado, mantendo assertions e cobertura.

## Mudanças

### Padrão a aplicar (canônico)

```ts
const user = userEvent.setup();
// ... render ...
const btn = screen.getByRole("button", { name: /.../i });

// Opção A: navegar via Tab até o botão
await user.tab();
await user.tab();
expect(btn).toHaveFocus();
await user.keyboard("{Enter}");  // ou " " para Space

// Opção B: focar programaticamente quando Tab seria muito longo
btn.focus();
expect(btn).toHaveFocus();
await user.keyboard("{Enter}");
```

### Substituições específicas

1. **Substituir `fireEvent.click(btn)` → `await user.click(btn)`** em testes que descrevem ativação semântica (clique = Enter no botão). `user.click` é mais fiel e segue o padrão do restante da suíte.

2. **Substituir `fireEvent.keyDown(btn, { key: "Enter" })` → `btn.focus(); await user.keyboard("{Enter}")`** em qualquer teste que dispare keyDown isolado — porque keyDown sozinho não sintetiza o click do botão (browser faz isso automaticamente em Enter/Space para `<button>`, mas só com a sequência keydown→keypress→click→keyup).

3. **Remover `fireEvent` de imports se não restar nenhum uso** após a refatoração; caso contrário, manter mas adicionar comentário explicando os usos legítimos remanescentes (ex: testes de `change` em input, que `userEvent.type` substituiria mas é fora do escopo).

4. **Adicionar helper local `pressKey`** (opcional, se houver 5+ ocorrências repetidas) para padronizar:
```ts
async function pressKey(user: ReturnType<typeof userEvent.setup>, el: HTMLElement, key: string) {
  el.focus();
  expect(el).toHaveFocus();
  await user.keyboard(key);
}
```
Decisão: **não adicionar** se houver < 5 usos — overhead desnecessário. Avaliar durante implementação.

### Testes específicos a auditar/corrigir

A) **Teste de empate (variação não-vencedora não move badge)** — usa `fireEvent.click` para simular seleção. Trocar por `await user.click` (mantém semântica de clique) OU por `btn.focus(); await user.keyboard("{Enter}")` se o objetivo é validar ativação por teclado.

B) **Testes de "Marcar vencedora desabilitado"** — já usam `userEvent` corretamente, **manter como estão**.

C) **Testes de Shift+Tab + Enter/Space** — já corretos, **manter**.

D) **Testes de feedback visual (border-primary + aria-pressed)** — já usam `user.keyboard`, **manter**.

E) **Testes de estabilidade do DOM** — já corretos, **manter**.

### Critério de decisão por teste

Para cada uso de `fireEvent.click` no `describe("MagicUpVariationComparator")`:
- Se o teste descreve **comportamento de teclado** → trocar por `btn.focus(); await user.keyboard("{Enter}")`
- Se o teste descreve **comportamento genérico de seleção** (clique = ativação) → trocar por `await user.click(btn)` (mais fiel)
- Se o teste é de outro `describe` (ex: `MagicUpQualityScore`) → **não tocar** (fora do escopo)

## Estratégia de validação

- Após cada substituição, garantir que os asserts de handler chamado (`expect(onSelect).toHaveBeenCalledWith(...)`) continuam passando — `user.click` e `user.keyboard("{Enter}")` em botão focado **ambos** disparam `onClick` (browser sintetiza click em Enter/Space).
- Adicionar 1 teste de regressão que afirma explicitamente: "Enter em botão focado dispara onClick (não onKeyDown)" — para travar que a refatoração mantém a semântica nativa.

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx`
- Sem novos mocks
- Sem mudar contagem total de testes (refatoração) + 1 teste de regressão = 38 testes
- Manter todos os asserts existentes; apenas trocar o mecanismo de disparo

## Entregável

- `tests/components/magic-up-onda5.test.tsx` refatorado: zero `fireEvent.click` ou `fireEvent.keyDown` em testes de teclado do `MagicUpVariationComparator`
- Padrão único de ativação por teclado: `el.focus()` + `await user.keyboard("{Enter|Space}")`
- 1 teste de regressão garantindo que Enter em botão focado dispara handler de click (semântica nativa preservada)
- Trava contrato: futuros testes seguem o mesmo padrão; PRs que voltem a usar `fireEvent.click` em testes de teclado falham na revisão por inconsistência

