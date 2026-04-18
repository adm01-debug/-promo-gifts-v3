
# Plano: Compactar loading do Dashboard de Estoque

## Problema
O estado de carregamento (`StockDashboard.tsx` linhas 148-184) usa `py-16` + ícone 80x80 + texto grande + barra de progresso isolada, ocupando uma faixa enorme acima dos skeletons. Visualmente parece um "modal vazio" desproporcional para uma simples sincronização de dados.

## Solução — Loading inline compacto integrado aos skeletons
Substituir o bloco hero por uma **barra de status fina e horizontal** no topo, deixando os skeletons abaixo carregarem o resto do espaço naturalmente (que é o padrão de loading correto).

### Mudanças em `src/components/inventory/StockDashboard.tsx` (linhas 148-184)

1. **Remover** o bloco centralizado `flex flex-col items-center justify-center py-16` (ícone 80x80 + ping + texto grande).
2. **Substituir** por um cabeçalho horizontal compacto (h-14, com mesmo padrão visual das outras páginas):
   - Ícone `Package` 16px com `animate-pulse` à esquerda
   - Texto "Sincronizando estoque" (`text-sm font-medium`) + sublinha "Conectando ao fornecedor..." (`text-xs muted`)
   - Barra de progresso fina (`h-1`) à direita com `%` em tabular-nums
   - Tudo dentro de um `Card` compacto com `border border-border/40 rounded-xl px-4 py-3`
3. **Manter** os skeletons abaixo (KPIs grid + filtros + tabela) exatamente como estão — eles já comunicam o carregamento da estrutura real.
4. **Remover** o `p-6` externo (alinhar com `space-y-5` do estado carregado).

### Resultado esperado
- Loading ocupa ~60px de altura (vs ~340px atual)
- Visual coerente com o restante do app (mesmos tokens, sem hero gigante)
- Progresso ainda visível, mas como informação secundária
- Skeletons assumem o protagonismo visual — padrão correto de loading skeleton

### Arquivos modificados
- `src/components/inventory/StockDashboard.tsx` (apenas o bloco `if (isLoading)`)

Sem migrações, sem novos arquivos, sem mudança de comportamento — apenas refinamento visual do estado de loading.
