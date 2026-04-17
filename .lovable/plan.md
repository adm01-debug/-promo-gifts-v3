

Usuário quer remover **Gestão de Comissões** completamente. Já existe outro sistema cobrindo. Ação destrutiva confirmada (mesmo padrão dos ciclos anteriores).

## Escopo

**Frontend (deletar):**
- `src/pages/admin/AdminCommissionsPage.tsx`
- `src/pages/CommissionsPage.tsx`
- `src/hooks/useCommissions.ts`

**Frontend (editar):**
- `src/App.tsx` — remover rotas `/admin/comissoes` e `/comissoes` + lazy imports `AdminCommissionsPage` e `CommissionsPage`
- `src/components/layout/SidebarReorganized.tsx` — remover 2 itens "Comissões" (linhas 118 e 138)

**Backend (migration DROP):**
```sql
DROP TRIGGER IF EXISTS trg_auto_commission_on_order ON public.orders;
DROP FUNCTION IF EXISTS public.auto_create_commission_entry() CASCADE;
DROP FUNCTION IF EXISTS public.validate_commission_status() CASCADE;
DROP TABLE IF EXISTS public.commission_entries CASCADE;
DROP TABLE IF EXISTS public.commission_rules CASCADE;
```

**Documentação:**
- `docs/DATA_DICTIONARY.md` — remover linhas de `commission_entries`, `commission_rules` e trigger `auto_create_commission_entry`
- `tests/rls/README.md` — remover linha `commission_entries`
- Buscar referências em testes RLS (`tests/rls/`) para eventual limpeza

**Sem mudanças em** `src/integrations/supabase/types.ts` (regenera após migration).

## Ordem de execução

1. Migration DROP (triggers, funções, tabelas — em transação, idempotente)
2. Deletar 3 arquivos frontend
3. Editar `App.tsx` (rotas + imports)
4. Editar `SidebarReorganized.tsx` (2 itens)
5. Atualizar `docs/DATA_DICTIONARY.md` e `tests/rls/README.md`

## Confirmação final

Irreversível: apaga regras de comissão configuradas e histórico de entries. Como há outro sistema cobrindo, prosseguir é seguro.

Ao aprovar, executo na ordem acima.

