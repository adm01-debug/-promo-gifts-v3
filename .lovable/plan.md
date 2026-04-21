

# Plano — Asserções explícitas `toHaveFocus` antes de cada `userEvent.keyboard`

Adiciono `expect(<elemento>).toHaveFocus()` imediatamente antes de **toda** chamada `await user.keyboard(...)` nos testes do `MagicUpVariationComparator` em `tests/components/magic-up-onda5.test.tsx`, garantindo que cada ativação por teclado seja disparada no elemento pretendido.

## Justificativa

Após as últimas refatorações, há ~25 chamadas `await user.keyboard(...)` no escopo do `MagicUpVariationComparator`. Padrões observados:

| Padrão atual | Risco |
|---|---|
| `el.focus(); await user.keyboard("{Enter}")` | Foco assumido — se `el` for `disabled` ou perder foco silenciosamente, a tecla vai para `document.body` e o teste passa por motivo errado |
| `await user.tab(); await user.keyboard("{Enter}")` | Sem snapshot do que ganhou foco — Tab pular um elemento (ex: `tabindex={-1}` adicionado) inverte o cenário sem falhar |
| `await user.keyboard("{Home}")` após navegação | Foco implícito do passo anterior — qualquer re-render que perca foco silenciosamente quebra a intenção |

**Princípio**: ativação por teclado depende inteiramente do elemento focado. Asserção explícita transforma "foco assumido" em "foco verificado", capturando regressões onde:
- Re-render perde foco (anti-padrão React)
- `tabIndex` indevido desvia a sequência Tab
- Botão `disabled` rouba foco (browser quirk)
- Helper/wrapper inserido depois quebra a cadeia de foco

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

**Regra única**: antes de cada `await user.keyboard("...")` no escopo do `MagicUpVariationComparator`, inserir `expect(<elementoEsperado>).toHaveFocus()` referenciando o elemento que **deve** receber a tecla.

#### Categorias de ajuste

**A) Após `el.focus()` direto** (~12 ocorrências)
```ts
// ANTES
card2.focus();
await user.keyboard("{Enter}");

// DEPOIS
card2.focus();
expect(card2).toHaveFocus();
await user.keyboard("{Enter}");
```

**B) Após `await user.tab()` / `user.tab({ shift: true })`** (~6 ocorrências)
```ts
// ANTES
await user.tab(); // card2
await user.keyboard("{Enter}");

// DEPOIS
await user.tab();
expect(card2).toHaveFocus();
await user.keyboard("{Enter}");
```

**C) Sequências de teclado encadeadas (Home/End/Arrow após Enter/Space)** (~5 ocorrências)
```ts
// ANTES
await user.keyboard("{Enter}"); // ativa card2
await user.keyboard("{Home}");  // navega para card1

// DEPOIS — o foco permanece no card2 após Enter (handler não move foco), Home dispara handleArrowKey
await user.keyboard("{Enter}");
expect(card2).toHaveFocus();
await user.keyboard("{Home}");
```

**D) Loops de auto-repeat e atalhos globais com modificadores** (~3 ocorrências)
```ts
// ANTES
screen.getByTestId("external-sentinel").focus();
for (let i = 0; i < 15; i++) {
  await user.keyboard(" ");
}

// DEPOIS — sanity antes do loop (foco não muda dentro do loop pois sentinel é estável)
const sentinel = screen.getByTestId("external-sentinel");
sentinel.focus();
expect(sentinel).toHaveFocus();
for (let i = 0; i < 15; i++) {
  await user.keyboard(" ");
}
expect(sentinel).toHaveFocus(); // confirma que nenhuma das 15 pressões roubou foco
```

Para atalhos globais (`user.keyboard("{Control>}{Enter}{/Control}")`), validar que o foco permanece no sentinel (não no botão disabled):
```ts
expect(sentinel).toHaveFocus();
await user.keyboard("{Control>}{Enter}{/Control}");
```

**E) Asserção pós-keyboard quando o foco deve mudar** (oportunidade complementar)

Para `Arrow*`/`Home`/`End` (que movem foco via `cardRefs.current[nextIndex]?.focus()`), adicionar também asserção **depois** confirmando o destino:
```ts
expect(card2).toHaveFocus();
await user.keyboard("{ArrowRight}");
expect(card3).toHaveFocus(); // confirma que setas moveram para o próximo card
```

#### Escopo

- **Aplicar em**: todos os 4 sub-describes do `MagicUpVariationComparator`:
  - "navegação por setas/Home/End"
  - "ativação por Enter/Espaço nos botões"
  - "scroll preserva foco"
  - "anti-keyboard-trap"
  - "aria-pressed/aria-current"
- **Não aplicar em**: testes fora do `MagicUpVariationComparator`
- **Não duplicar**: chamadas que já têm `expect(el).toHaveFocus()` imediatamente antes (várias já têm — preservar)

#### Estimativa

- ~25 inserções de `expect(...).toHaveFocus()` antes de `user.keyboard`
- ~8 inserções complementares **após** `user.keyboard` para Arrow/Home/End (validação de destino)
- 0 remoções
- 0 mudanças na lógica de teste — apenas asserções defensivas

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (`expect` e `toHaveFocus` já em uso)
- Contagem de testes inalterada (109 → 109)
- Cobertura comportamental: idêntica + camada extra de garantia de foco
- Não introduzir helper neste plano (foco é apenas em asserções defensivas — a unificação via helper foi proposta antes e não aprovada)

## Entregável

- ~25 asserções `expect(<el>).toHaveFocus()` adicionadas antes de cada `user.keyboard(...)` no escopo do comparador
- ~8 asserções complementares após teclas de navegação (`Arrow*`/`Home`/`End`) confirmando destino do foco
- Captura regressões onde:
  - Re-render assíncrono entre `.focus()` e `keyboard(...)` perdesse foco silenciosamente
  - `Tab` pulasse elemento esperado por mudança de `tabIndex`
  - Botão `disabled` roubasse foco do sentinel (browser quirk / regressão de versão)
  - `Arrow*`/`Home`/`End` falhasse em mover foco programaticamente (handler `cardRefs.current[nextIndex]?.focus()` quebrado)
  - Loop de auto-repeat trocasse foco em alguma iteração intermediária
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 109/109 verde

