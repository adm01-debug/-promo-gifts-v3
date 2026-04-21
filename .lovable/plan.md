

# Plano — Doc de guideline de foco e disabled para componentes Onda 5

Adiciono um doc curto em `docs/` consolidando as classes obrigatórias de `focus-visible:ring-*` e `disabled:*` que os testes em `magic-up-onda5.test.tsx` e `onda5-a11y.test.tsx` já travam em CI.

## Arquivo novo

`docs/MAGIC_UP_ONDA5_A11Y.md` (~120 linhas, markdown puro, sem código novo)

## Estrutura

### 1. Contexto (4 linhas)
Objetivo: garantir foco visível (WCAG 2.4.7) e contraste em estados disabled (WCAG 1.4.3) em todos os componentes interativos da Onda 5 do Magic Up. Travado por testes automatizados — qualquer regressão quebra CI.

### 2. Classes obrigatórias — Focus Visible

Tabela:

| Token | Classes Tailwind | Quando usar |
|-------|------------------|-------------|
| Ring padrão | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` | Botões `<Button variant="outline">`, dots de paginação, thumbnails, tabs |
| Ring sobre input | `focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary` | `<Input>`, `<Textarea>` (já no design system) |

Regra: **todo elemento focável customizado** (não-input) deve incluir o bloco padrão completo. `outline-none` sozinho é proibido.

### 3. Classes obrigatórias — Disabled

| Cenário | Classes obrigatórias | Por quê |
|---------|---------------------|---------|
| Botão prev/next variação | `disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100` | `opacity-50` padrão do shadcn cai abaixo de 4.5:1 — substituímos por par token-on-token que mantém legibilidade |
| Botão de ação (gerar, baixar) | `disabled:opacity-50` (padrão shadcn aceito) | Ação destrutiva ou bloqueada por validação — usuário entende rapidamente |

Regra: **botões de navegação por teclado** (prev/next, paginação) **não podem** usar `disabled:opacity-50` — sempre par `bg-muted` + `text-muted-foreground` + `opacity-100`.

### 4. Hit area mínima

- Dots de paginação, thumbnails, ícones interativos: `w-11 h-11` (44×44px, WCAG 2.5.5 AAA)
- Para manter visual menor: usar `<span aria-hidden>` interno + negative margin (`-mx-[18px] -my-[18px]`) no botão para neutralizar layout

### 5. Componentes cobertos

Lista com link relativo:
- `MagicUpResultPanel` — prev/next, dots, thumbnails
- `MagicUpVariationComparator` — cards de variação, botão "winner"
- `MagicUpQualityScore` — score badge
- `MagicUpQualityChecklist` — itens de checklist
- `AdImageResult` — ações de download/share/regenerate

### 6. Testes que travam regressões

Referência cruzada:
- `tests/components/magic-up-onda5.test.tsx` — classes literais via `expect(button.className).toContain(...)`
- `tests/a11y/onda5-a11y.test.tsx` — axe-core (WCAG 2.1 AA)
- `tests/components/magic-up-result-panel-keyboard.test.tsx` — tab order, Enter/Space, hit area `w-11 h-11`

### 7. Checklist para PRs novos

5 bullets curtos: copiar bloco focus-visible, escolher disabled correto, hit area 44px se ícone-only, rodar `npm test -- magic-up`, garantir `aria-label` em ícone-only.

## Restrições

- Sem alterar código de produção
- Sem novos testes (este doc descreve os existentes)
- Markdown puro, sem dependências
- Linka apenas arquivos já existentes no repo

## Entregável

- 1 arquivo novo: `docs/MAGIC_UP_ONDA5_A11Y.md`
- ~120 linhas, lê em ~3min
- Referência canônica para devs ao adicionar/editar componentes Onda 5
- Reduz risco de PRs removerem classes que quebram CI sem entender o porquê

