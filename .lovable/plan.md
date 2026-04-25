# Plano de QA — Colapso/Expansão de Zonas com Persistência

## Resumo da análise estática

Já fiz uma simulação manual linha-a-linha dos 3 arquivos tocados (`useZoneCollapse.ts`, `ZoneSection.tsx`, `AdminConexoesPage.tsx`). A lógica está **sólida** em ~95% dos cenários. Encontrei 2 pontos que merecem atenção antes de fechar:

### Achado 1 — Cobertura de teste ausente
Não existem testes automatizados para `useZoneCollapse` nem para o novo comportamento de colapso em `ZoneSection`. Como você pediu uma bateria abrangente, vou adicionar.

### Achado 2 — Pequena redundância em `ZoneSection`
O wrapper de conteúdo usa **simultaneamente** `hidden={collapsed}` (atributo HTML) **e** `className={cn("space-y-4", collapsed && "hidden")}` (classe Tailwind). Os dois fazem a mesma coisa. Funciona, mas é ruído. Vou manter apenas o atributo `hidden` (tem prioridade nativa, é mais semântico para leitores de tela e dispensa CSS).

### Achado 3 — Persistência via `useEffect` grava no mount
`useEffect(..., [collapsed])` roda no primeiro render também, regravando o mesmo valor lido. Sem bug funcional, mas desnecessário. Não vou alterar — risco/benefício baixo.

---

## O que vou executar (modo build)

### 1. Criar testes unitários

**`tests/hooks/useZoneCollapse.test.ts`** (9 cenários):

1. Estado inicial: todas zonas expandidas (`collapsed=false`)
2. `toggle` alterna 1 zona sem afetar as outras
3. `expand` reabre zona colapsada e é no-op em zona já expandida (preserva referência)
4. `collapseAll` colapsa as 3; `expandAll` reabre as 3
5. Persistência: cada mudança grava em `localStorage` na chave `connections.zone-collapse.v1`
6. Hidratação: nova instância com `localStorage` preenchido recupera o estado correto
7. Resiliência: JSON inválido em storage → fallback para todas expandidas
8. Merge parcial: `{ health: true }` no storage → mescla com defaults das outras
9. Sem guarda: permite colapsar todas as 3 (intencionalmente diferente de `useZoneVisibility`)

**`tests/components/admin/connections/ZoneSection.test.tsx`** (9 cenários):

1. Conteúdo visível por padrão (sem props de colapso)
2. Conteúdo recebe atributo `hidden` quando `collapsed=true`
3. Botão de toggle só aparece se `onToggleCollapse` for passado
4. `aria-expanded` reflete o estado (`true` expandido, `false` colapsado)
5. `aria-controls` aponta para `${id}-content`
6. Click no botão dispara `onToggleCollapse`
7. Header (título h2) permanece visível mesmo colapsado
8. `actions` e botão de toggle coexistem sem conflito
9. `highlight=true` aplica classes `ring-2`

### 2. Limpeza no `ZoneSection.tsx`
Remover a classe `collapsed && "hidden"` redundante (manter só o atributo `hidden`).

### 3. Rodar a suíte
Executar `vitest run tests/hooks/useZoneCollapse.test.ts tests/components/admin/connections/ZoneSection.test.tsx` e reportar resultados.

### 4. Checklist manual (você executa no preview)
Documento curto com 8 cenários do dia a dia para você validar visualmente:

- [ ] Clicar no chevron de **Saúde** → conteúdo some, header permanece, ícone gira -90°
- [ ] Clicar de novo → reabre, ícone volta
- [ ] Colapsar **Operação** → recarregar página → continua colapsada
- [ ] Colapsar as 3 zonas → recarregar → as 3 voltam colapsadas (diferente de visibility)
- [ ] Colapsar **Saúde** → clicar em incidente da Incident Strip que aponta para "health" → zona expande automaticamente, faz scroll e pisca highlight
- [ ] Combinar com Quick Nav: ocultar **Conexões** + colapsar **Operação** → ambas preferências persistem juntas (chaves separadas no localStorage)
- [ ] Hover no botão → tooltip "Colapsar zona" / "Expandir zona"
- [ ] Tab navigation: foco visível no botão, Enter aciona

---

## Arquivos que serão criados/editados

- **criar** `tests/hooks/useZoneCollapse.test.ts`
- **criar** `tests/components/admin/connections/ZoneSection.test.tsx`
- **editar** `src/components/admin/connections/ZoneSection.tsx` (remoção da classe `hidden` redundante — 1 linha)

Sem mudanças de schema, sem edge functions, sem migração.
