

# Plano — Refatorar testes de teclado do MagicUpVariationComparator para userEvent puro

Remover **todos os usos de `fireEvent.keyDown`, `fireEvent.keyUp` e `fireEvent.click`** nos 3 testes do `MagicUpVariationComparator` (linhas 2917-2935, 2962-2972, 3010-3029) em `tests/components/magic-up-onda5.test.tsx`, substituindo por `userEvent.keyboard()` após `.focus()` e `userEvent.click()` (que respeita `disabled` nativamente).

## Justificativa

Auditoria via `grep "fireEvent\.\(click\|keyDown\|keyUp\)"` retornou 11 ocorrências:

| Linha | Uso | Escopo |
|-------|-----|--------|
| 102   | `fireEvent.click(boa)` | **Fora do escopo** — outro componente (curadoria) |
| 2919-2923 | 4× keyDown/keyUp + 1 click em botão disabled | **Refatorar** |
| 2963-2971 | 8× keyDown/keyUp com modificadores + 1 click | **Refatorar** |
| 3012-3015 | 10× keyDown auto-repeat + 1 keyUp + 1 click | **Refatorar** |
| 3025-3026 | 1× keyDown/keyUp Space+Ctrl | **Refatorar** |

Total: **10 ocorrências** a remover (apenas no `MagicUpVariationComparator`).

**Princípio**: `userEvent` simula sequências realistas de eventos do navegador (incluindo `pointerdown`/`pointerup`/`click` derivados); `fireEvent` dispara eventos sintéticos isolados que podem mascarar bugs reais. Botões `disabled` nativos têm comportamento próprio que `userEvent` respeita (`pointer-events: none`, foco bloqueado, click ignorado).

## Alteração

### `tests/components/magic-up-onda5.test.tsx`

#### Bloco 1 — linhas 2917-2935 (botão disabled bloqueia Enter/Space/click)

Substituir o trecho `fireEvent.keyDown/keyUp/click` por:

```ts
// 3) Tentativa de focar o botão em loading: HTMLButtonElement disabled
//    rejeita foco programático — sanity check
winnerBtn1Loading.focus();
expect(winnerBtn1Loading).not.toHaveFocus();
expect(screen.getByTestId("external-sentinel")).toHaveFocus();

// 4) userEvent.click no botão disabled é silenciosamente ignorado
//    (respeita pointer-events: none do estado disabled)
await user.click(winnerBtn1Loading);
expect(onSelectWinner).not.toHaveBeenCalled();

// 5) Enter/Space via userEvent.keyboard com foco no sentinel — botão disabled
//    nunca recebe o evento porque não está na cadeia de foco
await user.keyboard("{Enter}");
await user.keyboard(" ");
expect(onSelectWinner).not.toHaveBeenCalled();

// 6) Foco continua no sentinel externo (botão disabled não rouba foco)
expect(screen.getByTestId("external-sentinel")).toHaveFocus();
```

Remove o comentário "(HTMLButtonElement disabled bloqueia eventos de click derivados de teclado)" e os 5 `fireEvent.*` (linhas 2919-2923).

---

#### Bloco 2 — linhas 2962-2972 (modificadores Ctrl/Cmd/Shift/Alt + Enter)

Substituir o trecho `fireEvent.keyDown/keyUp/click` por:

```ts
// 1) Sanity: botão disabled rejeita foco programático
winnerBtn.focus();
expect(winnerBtn).not.toHaveFocus();
expect(screen.getByTestId("external-sentinel")).toHaveFocus();

// 2) userEvent.click no botão disabled é ignorado
await user.click(winnerBtn);
expect(onSelectWinner).not.toHaveBeenCalled();
```

Os atalhos com modificadores via `user.keyboard("{Control>}{Enter}{/Control}")` etc. (linhas 2975-2978) já existem e permanecem — eles cobrem o cenário de "atalho global Ctrl+Enter" sem foco no botão. Remove os 9 `fireEvent.*` (linhas 2963-2971).

---

#### Bloco 3 — linhas 3010-3029 (Space auto-repeat + modificadores)

Substituir o trecho de auto-repeat por sequência `userEvent`:

```ts
// 1) Sanity: botão disabled rejeita foco programático
winnerBtn.focus();
expect(winnerBtn).not.toHaveFocus();
expect(screen.getByTestId("external-sentinel")).toHaveFocus();

// 2) userEvent.click no botão disabled é ignorado
await user.click(winnerBtn);
expect(onSelectWinner).not.toHaveBeenCalled();

// 3) Múltiplas pressões Space sequenciais (15 no total — emula auto-repeat) com foco no sentinel
for (let i = 0; i < 15; i++) {
  await user.keyboard(" ");
}
expect(onSelectWinner).not.toHaveBeenCalled();

// 4) Combinação Space + modificadores via atalho global
await user.keyboard("{Control>} {/Control}");
await user.keyboard("{Meta>} {/Meta}");
await user.keyboard("{Shift>} {/Shift}");
await user.keyboard("{Alt>} {/Alt}");
expect(onSelectWinner).not.toHaveBeenCalled();
```

Remove o loop `fireEvent.keyDown` com `repeat:true` (linhas 3011-3013), o `fireEvent.keyUp` (3014), `fireEvent.click` (3015) e o par `fireEvent.keyDown/keyUp` com Ctrl (3025-3026). Consolida o "5 pressões via userEvent" original em "15 pressões" para preservar a cobertura de volume.

A seção "Sanity reverso" (linhas 3031+, botão habilitado vizinho responde a Space via `winnerBtn1.focus()` + `user.keyboard(" ")`) já usa `userEvent` puro — permanece intacta.

## Restrições

- Sem alteração no `MagicUpVariationComparator.tsx`
- Sem novos imports (já há `userEvent`, `screen`, `expect`)
- O import de `fireEvent` permanece pois é usado em outros componentes (linha 102 — curadoria)
- Total: **10 chamadas `fireEvent.*` removidas** dentro do escopo do comparador
- Contagem de testes inalterada (109 → 109)
- Cobertura comportamental preservada: botão disabled bloqueia foco, click, Enter, Space, modificadores e auto-repeat

## Entregável

- 3 testes refatorados usando exclusivamente `userEvent.keyboard` (após `.focus()` no sentinel) e `userEvent.click` (que respeita `disabled` nativamente)
- Cobertura mantida ou ampliada:
  - **Bloco 1**: confirma que `disabled` rejeita foco programático + click + teclas Enter/Space
  - **Bloco 2**: confirma que modificadores (Ctrl/Cmd/Shift/Alt + Enter) não vazam, agora 100% via userEvent
  - **Bloco 3**: 15 pressões Space sequenciais (vs. 5 anteriores) + 4 combinações com modificadores
- Captura regressões onde:
  - Implementação custom permitisse foco programático em botão `disabled` (anti-padrão)
  - Handler `onClick` ignorasse o estado `disabled` (necessitando guarda manual)
  - `userEvent.click` em botão disabled vazasse para o handler (regressão de versão `@testing-library/user-event`)
  - Auto-repeat de Space gerasse múltiplas chamadas via foco indevido
- Após implementação: rodar `npx vitest run tests/components/magic-up-onda5.test.tsx` e confirmar 109/109 verde

