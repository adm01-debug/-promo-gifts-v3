
## Plano: Importação em Massa Robusta

### 1. Refatorar `BulkImportDialog.tsx` (componente principal)
- Corrigir bug do `autoMapColumns` (state stale)
- Adicionar seleção de modo: **Inserir** / **Atualizar** / **Upsert** (inserir ou atualizar por SKU)
- Adicionar verificação de SKUs existentes antes da importação (batch query ao BD externo)
- Mostrar no preview quais linhas são novas vs. existentes
- Enforçar limite de 10.000 linhas
- Adicionar download de template Excel (.xlsx) além do CSV

### 2. Importação em lotes (batch processing)
- Enviar produtos em chunks de 25 para o `external-db-bridge` em vez de 1-a-1
- Reduz tempo de ~500 chamadas para ~20 chamadas
- Manter progress bar funcional

### 3. Relatório de erros exportável
- Botão "Baixar Relatório de Erros" no step final
- CSV com: Linha, SKU, Nome, Erro(s)

### 4. Deprecar `BulkImportPanel.tsx`
- Redirecionar para `BulkImportDialog` que é mais flexível
- Remover validações excessivas (cores/materiais/imagens obrigatórios para import)

### Arquivos afetados:
- `src/components/admin/products/BulkImportDialog.tsx` — refatoração principal
- `src/components/product-registration/BulkImportPanel.tsx` — deprecar
- `src/lib/external-db/bridge.ts` — adicionar helper de batch insert/upsert
