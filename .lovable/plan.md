

# Plano — Testes de retorno de foco e estabilidade de focus order após troca de variação ativa

Adiciono nova sub-suíte ao `tests/components/magic-up-result-panel-keyboard.test.tsx` validando que, após ativar uma variação via dot ou thumbnail (click ou Enter/Space), o foco do teclado **permanece no controle ativado** e a ordem de Tab continua coerente — confirmando que o re-render disparado por `setActiveVariation` não move foco para outro elemento nem quebra o roving tabindex.

## Justificativa

Sub-suítes anteriores cobrem extremidades, accessible names e focus-visible estático, mas não validam o ciclo completo **"ativação → re-render → foco preservado + tab order recalculado"**:

- Ao clicar/Enter num dot[2] (vindo de active=0), o componente re-renderiza com `activeVariation=2`. O dot[2] passa a ter `tabindex=0` (e dot[0] vai para `-1`). **O foco DOM precisa continuar em dot[2]** — não pular para dot[0] nem para outro elemento
- Mesmo contrato em thumbnails: ativar thumb[1] mantém foco em thumb[1] após re-render
- **Cross-control**: ativar dot[N] não desloca foco para thumb[N] (e vice-versa) — cada grupo mantém sua própria parada de foco
- **Tab order pós-ativação**: após ativar dot[2], um Tab adicional avança para o próximo elemento focável seguindo a nova ordem (next button → thumb[2]), não retrocede
- **Roving tabindex re-sincronizado**: após ativação, o único dot focável (tabindex=0) é o recém-ativo; os outros voltam para `-1`

Esses contratos previnem regressões onde React perderia foco em re-render (ex: se o componente fosse re-key'd) ou onde alguém adicionaria `useEffect` que move foco para outro lugar.

## Arquivo alterado

`tests/components/magic-up-result-panel-keyboard.test.tsx` apenas — sem alterar componentes nem outros testes.

## Sub-suíte nova: `MagicUpResultPanel — retorno de foco após troca de variação ativa`

### Helper local

```ts
function activate(el: HTMLElement, key: "click" | "Enter" | " " = "click") {
  el.focus();
  if (key === "click") {
    fireEvent.click(el);
  } else {
    fireEvent.keyDown(el, { key });
    fireEvent.click(el); // Enter/Space em <button> dispara click sintético
  }
}
```

Helper para re-renderizar simulando o efeito do `setActiveVariation` (já que `buildStubState` usa `vi.fn()` e não aplica state):

```ts
function rerenderWithActive(
  rerender: (ui: React.ReactElement) => void,
  m: ReturnType<typeof buildStubState>,
  newActive: number
) {
  const updated = { ...m, activeVariation: newActive, currentVariation: m.variations[newActive] };
  rerender(<MagicUpResultPanel m={updated} />);
}
```

### Testes a adicionar (~7 testes)

**Teste 1 — Click em dot[2] mantém foco em dot[2] após re-render com active=2**
- Renderiza `activeVariation=0`, captura `rerender`
- `activate(dots[2], "click")` → confirma `setActiveVariation(2)` chamado
- `rerenderWithActive(rerender, m, 2)` → simula re-render
- Re-busca dots: `expect(document.activeElement).toBe(getDots()[2])`
- Confirma `getDots()[2].tabIndex === 0` e demais com `-1` (roving re-sincronizado)

**Teste 2 — Enter em dot[1] mantém foco em dot[1] após re-render**
- Mesma estrutura do teste 1 mas via `activate(dots[1], "Enter")`

**Teste 3 — Click em thumb[2] mantém foco em thumb[2] após re-render**
- Renderiza `activeVariation=0`
- `activate(thumbs[2], "click")` → re-render com active=2
- `expect(document.activeElement).toBe(getThumbs()[2])`
- `getThumbs()[2].tabIndex === 0` (roving sincronizado)

**Teste 4 — Space em thumb[1] mantém foco em thumb[1] após re-render**
- Mesma estrutura do teste 3 mas via `activate(thumbs[1], " ")`

**Teste 5 — Ativar dot[N] NÃO desloca foco para thumb[N] (grupos independentes)**
- Renderiza `activeVariation=0`
- `activate(dots[2], "Enter")` → re-render
- `expect(document.activeElement).toBe(getDots()[2])` — foco fica no dot, NÃO migra para thumb[2]
- Confirma `getThumbs()[2].tabIndex === 0` (roving da thumbnail também atualiza), mas foco DOM permanece no dot

**Teste 6 — Ativar thumb[N] NÃO desloca foco para dot[N] (espelho do teste 5)**
- Renderiza `activeVariation=0`
- `activate(thumbs[1], "click")` → re-render
- `expect(document.activeElement).toBe(getThumbs()[1])`
- Confirma `getDots()[1].tabIndex === 0` mas foco continua no thumb

**Teste 7 — Após ativar dot[2], roving tabindex está totalmente re-sincronizado nos dois grupos**
- Renderiza `activeVariation=0`, ativa dot[2]
- Re-render com active=2
- `getDots()[0].tabIndex === -1`, `getDots()[1].tabIndex === -1`, `getDots()[2].tabIndex === 0`
- `getThumbs()[0].tabIndex === -1`, `getThumbs()[1].tabIndex === -1`, `getThumbs()[2].tabIndex === 0`
- `prev` agora `enabled` (pois active=2, mas é último então `next` está disabled — confirma boundary correto pós-ativação)

## Estratégia técnica

- **`rerender` do RTL**: necessário porque `buildStubState` usa `vi.fn()` para `setActiveVariation` — não há state real. Simulamos o efeito disparando `rerender` com `activeVariation` atualizado, replicando o que o hook `useMagicUpState` faria em produção.
- **Re-busca de elementos pós-rerender**: após `rerender`, os nós DOM podem ser os mesmos (React reconcilia), mas re-buscamos via `getDots()`/`getThumbs()` para evitar referências stale. React preserva foco quando o elemento permanece no DOM tree — esse é o contrato que travamos.
- **`document.activeElement` antes/depois**: trava o invariante "elemento clicado continua focado após re-render".
- **Helper `activate`**: padroniza o ciclo focus → click/keyDown → click sintético, evitando boilerplate em 6 testes.
- **Independência de grupos**: testes 5 e 6 travam que dots e thumbnails são tablists independentes — ativar um não rouba foco para o outro, mesmo que ambos atualizem seu próprio `tabindex=0` para o índice ativado.
- **Sem novo mock**: reusa `buildStubState`, `getDots`, `getThumbs`, e adiciona apenas `rerender` do `render()`.

## Restrições

- Sem alterar `MagicUpResultPanel.tsx` (comportamento já correto — React preserva foco em re-render quando o elemento DOM permanece)
- Sem alterar `useMagicUpState`, snapshots, outros testes ou helpers existentes
- Mantém os 41 testes existentes intactos
- Cobertura WCAG: 2.4.3 (Focus Order), 2.4.7 (Focus Visible), 3.2.1 (On Focus — sem mudança de contexto inesperada)

## Entregável

- Nova sub-suíte com ~7 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- 2 helpers locais (`activate`, `rerenderWithActive`) reutilizáveis
- Trava contrato: foco permanece no controle ativado após re-render por troca de variação
- Trava contrato: dots e thumbnails são grupos independentes — ativar um não move foco para o outro
- Trava contrato: roving tabindex re-sincroniza corretamente nos dois grupos após ativação
- Cobertura final: 41 → 48 testes no arquivo

