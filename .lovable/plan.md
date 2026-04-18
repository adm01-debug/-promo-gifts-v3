
# Plano: Reordenar grupos do Sidebar

## Mudança
Em `src/components/layout/SidebarReorganized.tsx`, mover **Carrinhos** (1º) e **Orçamentos** (2º) para o topo do array `navGroups`, mantendo o restante na sequência atual.

## Nova ordem
1. **Carrinhos**
2. **Orçamentos**
3. Catálogo
4. Ferramentas
5. Insights
6. Admin

## Arquivo modificado
- `src/components/layout/SidebarReorganized.tsx` (apenas reordenação dos blocos do array `navGroups` linhas 54-116)

Sem mudanças de comportamento, props, rotas ou estilos — apenas a ordem dos grupos.
