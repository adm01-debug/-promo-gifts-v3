

# Plano — Expandir hit area dos dots de paginação (mantendo visual)

Os dots de paginação no `MagicUpResultPanel` têm `w-2 h-2` (8px) — visual elegante, mas hit area abaixo do mínimo WCAG 2.5.5 (24×24 AA / 44×44 AAA). Já existe um pseudo-elemento `before:-inset-2` (expande +8px de cada lado = ~24px), mas **falta `before:absolute`** garantido com `inset` real e o pseudo não é clicável de forma testável. Vou expandir formalmente para 44×44px usando pseudo-elemento posicionado, mantendo o pixel visual em 8px.

## Arquivos alterados

### 1. `src/pages/magic-up/MagicUpResultPanel.tsx`
Trocar a classe do `<button>` do dot:

**Antes:**
```
"relative w-2 h-2 rounded-full transition-all ... before:absolute before:-inset-2 before:content-['']"
```

**Depois:**
```
"relative inline-flex items-center justify-center w-11 h-11 -m-[18px] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
```

E adicionar um `<span>` interno como o "ponto visual":
```tsx
<span
  aria-hidden="true"
  className={cn(
    "block h-2 rounded-full transition-all",
    i === m.activeVariation ? "bg-primary w-6" : "bg-muted-foreground/30 w-2 group-hover:bg-muted-foreground/50"
  )}
/>
```

Detalhes:
- `w-11 h-11` = 44×44px (WCAG AAA target)
- `-m-[18px]` neutraliza o tamanho extra no fluxo do layout — o container `flex gap-1.5` continua visualmente igual
- `inline-flex items-center justify-center` centraliza o ponto visual
- O `<span>` interno é `aria-hidden` (texto a11y já está no `aria-label` do botão)
- Hover muda cor do span via `group-hover` (botão recebe `group`)

### 2. `tests/components/magic-up-result-panel-keyboard.test.tsx` — adicionar 3 testes

Novo `describe("MagicUpResultPanel — hit area dos dots (WCAG 2.5.5)")`:

1. **Click no botão dot (área expandida) ativa setActiveVariation**
   - Renderiza com 3 variações
   - `fireEvent.click(dots[2])` (clique no `<button>`, não no span visual)
   - Assert: `setActiveVariation(2)`

2. **Click no span visual interno também ativa (event bubbling)**
   - Localiza span `aria-hidden` dentro do dot 2 via `dots[1].querySelector("span[aria-hidden='true']")`
   - `fireEvent.click(span)`
   - Assert: `setActiveVariation(1)` (clique borbulha para o button)

3. **Botão dot tem dimensões mínimas WCAG 2.5.5**
   - Para cada dot: `className` contém `w-11` E `h-11`
   - Garante que regressões de classe (volta para `w-2 h-2` no próprio button) quebram CI

## Restrições

- Sem alterar comportamento — só hit area
- Visual idêntico (gap, tamanho do ponto, cor ativa)
- Sem novas dependências
- Mantém todos os testes existentes verdes (selectors continuam válidos: `role="tab"`, `aria-label="Selecionar variação N"`)

## Entregável

- 1 arquivo de produção alterado (`MagicUpResultPanel.tsx`) — só classes do dot button + span interno
- 3 novos testes (total: 6 → 9 no arquivo de keyboard)
- Hit area de 44×44px (WCAG AAA) sem mudança visual
- Atalho de regressão: testes detectam se hit area encolher de novo

