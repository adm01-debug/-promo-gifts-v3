

# Plano — Tooltip acessível nos dots de paginação com `aria-describedby`

Adiciono Radix Tooltip aos dots de paginação do `MagicUpResultPanel` exibindo "Variação N" no hover/foco, com vínculo `aria-describedby` para screen readers, e nova sub-suíte de testes validando o comportamento.

## Justificativa

Os dots atualmente têm `aria-label="Ir para variação N"` (cobre screen readers), mas faltam:
- **Affordance visual** no hover/foco do mouse e teclado para usuários sighted
- **Vínculo `aria-describedby`** redundante para tecnologias assistivas que preferem `description` em vez de `label`

Radix Tooltip já está disponível (`src/components/ui/tooltip.tsx`) e dispara em hover **e foco** automaticamente — atende WCAG 1.4.13 (Content on Hover or Focus).

## Arquivos alterados

1. **`src/pages/magic-up/MagicUpResultPanel.tsx`** — envolve cada dot em `<Tooltip>` + adiciona `aria-describedby`
2. **`tests/components/magic-up-result-panel-keyboard.test.tsx`** — nova sub-suíte de ~6 testes

## Mudanças no componente

### Imports e wrapper

Adiciona ao topo do arquivo:
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

Envolve o bloco de dots com `<TooltipProvider delayDuration={300}>` (uma vez, fora do `.map`).

### Estrutura por dot

Substitui cada `<button>` de dot por:

```tsx
<Tooltip key={i}>
  <TooltipTrigger asChild>
    <button
      ref={(el) => { dotRefs.current[i] = el; }}
      role="tab"
      aria-selected={i === active}
      aria-current={i === active ? "true" : undefined}
      aria-label={`Ir para variação ${i + 1}`}
      aria-describedby={`magic-up-dot-tooltip-${i}`}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
      tabIndex={i === active ? 0 : -1}
      onClick={() => m.setActiveVariation(i)}
      onKeyDown={(e) => handleArrowKey(e, i, dotRefs)}
      className={...} // mantém classes existentes
    />
  </TooltipTrigger>
  <TooltipContent id={`magic-up-dot-tooltip-${i}`} side="top">
    Variação {i + 1}
  </TooltipContent>
</Tooltip>
```

**Notas técnicas:**
- `id` no `TooltipContent` casa com `aria-describedby` do botão — vínculo permanente independente de visibilidade do tooltip (Radix renderiza o conteúdo no portal mas o id existe; em testes JSDOM o conteúdo só renderiza após hover/foco — o teste de `aria-describedby` valida apenas o atributo no botão, não o conteúdo)
- `asChild` requer trigger com ref forwardable — `<button>` nativo serve
- Apenas dots recebem tooltip nesta entrega (thumbnails já têm thumb visual + nome — tooltip seria ruído visual)

## Mudanças nos testes

### Nova sub-suíte: `MagicUpResultPanel — tooltip acessível nos dots`

**Setup**: importa `userEvent` (já disponível em testing-library) ou usa `fireEvent.pointerEnter` + `act` para Radix Tooltip.

**~6 testes:**

1. **Cada dot tem `aria-describedby` apontando para id único `magic-up-dot-tooltip-{i}`**
   - Renderiza 3 variações
   - `expect(dots[0]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-0")`
   - Idem para dots[1], dots[2]
   - Confirma que ids são únicos entre si

2. **Tooltip aparece no hover (mouse)** — usa `userEvent.hover(dots[1])` + `await screen.findByRole("tooltip")` ou `findByText("Variação 2")`
   - Valida texto "Variação 2"
   - Valida que `id` do tooltip casa com `aria-describedby` do dot

3. **Tooltip aparece no foco do teclado** — `dots[2].focus()` + aguarda tooltip aparecer
   - Confirma WCAG 1.4.13 — affordance equivalente para teclado e mouse
   - Valida texto "Variação 3"

4. **Tooltip desaparece no `unhover`/`blur`**
   - Hover → tooltip visível → `userEvent.unhover` → `waitFor` que tooltip não está mais no DOM (ou tem `data-state="closed"`)

5. **Tooltip texto reflete o índice correto em todos os dots** (parametrizado)
   - Para cada `i` em `[0, 1, 2]`: focar dot[i] → tooltip mostra "Variação ${i+1}"

6. **`aria-describedby` permanece estável após troca de variação ativa** (re-render)
   - Renderiza `activeVariation=0`
   - `rerenderWithActive(rerender, m, 2)`
   - `expect(getDots()[0]).toHaveAttribute("aria-describedby", "magic-up-dot-tooltip-0")` (id NÃO depende de `active`)

### Estratégia técnica dos testes

- **Wrap em `TooltipProvider`**: o componente já provê internamente, mas se houver erro "must be used within Provider", os testes envolvem `<TooltipProvider><MagicUpResultPanel m={m} /></TooltipProvider>` (verificado no render existente — provavelmente já está no App; se não, helper local)
- **Radix usa portal**: usa `screen.findByRole("tooltip")` com timeout (Radix tem `delayDuration`, então `findBy*` com timeout 1000ms cobre)
- **`pointer-events`**: Radix verifica `hasPointerCapture` — em JSDOM pode ser necessário `userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never })`
- **Reusa** `buildStubState`, `getDots`, `rerenderWithActive` existentes

## Restrições

- Sem alterar `useMagicUpState`, `MagicUpVariationComparator` ou outros componentes
- Sem alterar testes ou helpers existentes — só adiciona nova sub-suíte
- Mantém os 71 testes existentes intactos
- `aria-label` original preservado (tooltip é descrição complementar, não substituto)
- Thumbnails permanecem sem tooltip (ruído visual desnecessário; já têm thumb + nome)
- Cobertura WCAG: 1.4.13 (Content on Hover or Focus), 4.1.2 (Name/Role/Value), 2.4.7 (Focus Visible)

## Entregável

- Tooltip Radix em cada dot exibindo "Variação N" com hover/foco
- Vínculo `aria-describedby` permanente entre dot e tooltip
- Nova sub-suíte com ~6 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- Cobertura final: 71 → 77 testes no arquivo
- Conformidade WCAG 1.4.13 confirmada por testes de hover **e** foco (não só um dos dois)

