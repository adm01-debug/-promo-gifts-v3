

# Plano — Garantir hit area 44×44 dos dots em todos os breakpoints + testes responsivos

Adiciono testes de regressão validando que a hit area expandida dos dots (`w-11 h-11` = 44×44px) permanece consistente em mobile/tablet/desktop, e ajusto classes para evitar quebra de layout em telas estreitas.

## Justificativa

A implementação atual usa `w-11 h-11 -mx-[18px] -my-[18px]` para criar hit area 44×44 (WCAG 2.5.5 AAA / 2.5.8 AA) sem alterar o visual de 8px do dot. Riscos não cobertos:

- **Margens negativas** (`-mx-[18px]`) podem causar overflow horizontal em mobile estreito (320px) quando há 3+ dots, encostando nos botões prev/next
- **Sem testes** garantindo que `w-11 h-11` não foi removido por refactor futuro
- **Sem testes** que classes responsivas não reduzam o tamanho em breakpoints menores

## Arquivos alterados

1. **`src/pages/magic-up/MagicUpResultPanel.tsx`** — ajuste defensivo no container dos dots (gap maior + flex-wrap previne overflow)
2. **`tests/components/magic-up-result-panel-keyboard.test.tsx`** — nova sub-suíte com ~7 testes

## Mudanças no componente

### Container dos dots (defensivo)

Atual:
```tsx
<div className="flex gap-1.5" role="tablist" aria-label="Variações geradas">
```

Novo:
```tsx
<div
  className="flex gap-3 items-center justify-center flex-wrap"
  role="tablist"
  aria-label="Variações geradas"
  data-testid="magic-up-dots-container"
>
```

**Por quê:**
- `gap-3` (12px) compensa margens negativas dos hit areas (overlap de 18px+18px=36px entre dots adjacentes ficaria sem gap → click ambíguo). Com gap-3, hit areas ainda se sobrepõem levemente, mas o centro de cada hit area fica isolado
- `flex-wrap` previne overflow horizontal em mobile com 5+ variações
- `items-center justify-center` mantém alinhamento visual independente do wrap
- `data-testid` simplifica seleção nos testes

### Hit area do botão (mantida, com guarda)

Mantém `w-11 h-11 -mx-[18px] -my-[18px]` exatamente como está. Adiciona apenas `min-w-11 min-h-11` defensivos para impedir colapso em containers flex estreitos:

```tsx
className="group relative inline-flex items-center justify-center w-11 h-11 min-w-11 min-h-11 -mx-[18px] -my-[18px] rounded-full focus-visible:..."
```

## Mudanças nos testes

### Nova sub-suíte: `MagicUpResultPanel — hit area 44×44 responsiva (WCAG 2.5.5 AAA, 2.5.8 AA)`

**~7 testes:**

1. **Cada dot tem classes `w-11` e `h-11` (44×44 base)**
   - Renderiza 3 variações
   - `getDots().forEach(dot => { expect(dot.className).toMatch(/\bw-11\b/); expect(dot.className).toMatch(/\bh-11\b/); })`

2. **Cada dot tem `min-w-11` e `min-h-11` (defesa contra colapso flex)**
   - Garante que mesmo em container flex estreito, hit area não diminui
   - Trava regressão de quem remover essas classes "limpando" o código

3. **Cada dot tem margens negativas `-mx-[18px]` e `-my-[18px]` (visual 8px sem alterar)**
   - Confirma que o "truque" de margens negativas está aplicado
   - Sem isso, o dot ocuparia 44px visualmente em vez de 8px

4. **Container tem `flex-wrap` (previne overflow em mobile)**
   - `screen.getByTestId("magic-up-dots-container")` → `expect(container.className).toMatch(/\bflex-wrap\b/)`

5. **Container tem gap suficiente para isolar hit areas (`gap-3` mínimo)**
   - Trava que ninguém volte para `gap-1.5` (que faria hit areas se sobreporem totalmente, causando clicks ambíguos)
   - `expect(container.className).toMatch(/\bgap-(3|4|5|6)\b/)`

6. **Hit area NÃO usa classes responsivas que reduzem tamanho**
   - Verifica que NÃO existem classes como `sm:w-8`, `md:h-6`, `max-md:w-9` etc nos dots
   - Regex: `/\b(sm|md|lg|xl):(w|h|min-w|min-h)-(0|1|2|3|4|5|6|7|8|9|10)\b/` deve NÃO casar
   - Garante consistência cross-breakpoint do hit target (WCAG 2.5.5 não permite reduzir abaixo de 44px em nenhum viewport)

7. **Com 5 variações (caso de carga), todos os dots mantêm 44×44**
   - Renderiza com `variationsCount: 5`
   - Todos os 5 dots têm `w-11 h-11`
   - Container ainda tem `flex-wrap` ativo (chave para 5 dots em 320px sem overflow)

### Estratégia técnica dos testes

- **Validação por className regex**: JSDOM não calcula layout real, então testar `getBoundingClientRect()` daria 0×0. Validar classes Tailwind é a abordagem correta para garantir contrato visual cross-breakpoint
- **WCAG 2.5.5 AAA / 2.5.8 AA**: tamanho mínimo de target 44×44 (AAA) ou 24×24 (AA). Já estamos em AAA — testes travam isso
- **Reusa** `buildStubState`, `getDots` existentes
- **Sem `userEvent`/hover/foco**: esta sub-suíte é puramente sobre estrutura DOM/classes

## Restrições

- Sem alterar `useMagicUpState`, `MagicUpVariationComparator` ou outros componentes
- Sem alterar testes ou helpers existentes — só adiciona nova sub-suíte
- Mantém os 79 testes existentes intactos
- Visual dos dots permanece idêntico (8px círculo, hit area invisível 44×44)
- Cobertura WCAG: 2.5.5 (Target Size AAA), 2.5.8 (Target Size Minimum AA), 1.4.10 (Reflow — sem overflow horizontal em mobile 320px)

## Entregável

- Container dos dots com `gap-3 flex-wrap items-center justify-center` (defesa anti-overflow mobile)
- `min-w-11 min-h-11` adicionados aos dots (defesa anti-colapso flex)
- `data-testid="magic-up-dots-container"` para seleção nos testes
- Nova sub-suíte com ~7 testes em `tests/components/magic-up-result-panel-keyboard.test.tsx`
- Cobertura final: 79 → 86 testes no arquivo
- Conformidade WCAG 2.5.5 AAA travada por testes em todos os breakpoints

