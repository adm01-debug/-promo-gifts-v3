

## Botão "Atualizar do banco" global em /admin/conexoes

### Objetivo
Adicionar um único botão no header da página de Conexões que, num clique:
1. Invalida o cache de **todas** as credenciais (TTL 60s no edge `_shared/credentials.ts`)
2. Recarrega a lista de secrets (status, suffix, source)
3. Recarrega a tabela `external_connections` (status persistido)
4. Mostra feedback unificado com cooldown de 5s

### O que será criado

**`src/components/admin/connections/GlobalRefreshFromDbButton.tsx`** (novo)
- Botão `variant="outline"` com ícone `DatabaseZap` + label "Atualizar tudo do banco"
- Estado interno: `isRunning`, `cooldownUntil` (mesmo padrão do `RefreshFromDbButton`)
- Ao clicar, executa em paralelo via `Promise.allSettled`:
  - `refreshCache()` (sem nome → invalida tudo no edge `secrets-manager` action `refresh_cache`)
  - `list()` do `useSecretsManager` (relê status do banco)
  - Callback `onRefreshed` (para o page recarregar overview + outros hooks)
- Toast único agregado:
  - **Sucesso total**: "Tudo atualizado · cache + N credenciais + status das conexões"
  - **Sucesso parcial**: "Atualização parcial" listando o que falhou
  - **Falha total**: "Falha ao atualizar"
- Cooldown de 5s com contagem regressiva visível ("Aguarde 4s")
- Tooltip explicando: "Invalida o cache de 60s das credenciais, relê o banco e recarrega o status de todas as conexões"
- Atalho de teclado opcional: `R` (sem modificadores quando não em input) — registrar via `useEffect` simples com guard para `event.target` não ser input/textarea

### O que será alterado

**`src/pages/admin/AdminConexoesPage.tsx`**
- Importa `GlobalRefreshFromDbButton`
- Coloca-o no header, à direita do `<SmokeTestChecklist>`, antes da listagem
- Passa `onRefreshed` que dispara `list()` (já tem) + um novo trigger para `ConnectionsOverviewTable` recarregar

**`src/components/admin/connections/ConnectionsOverviewTable.tsx`**
- Já expõe `refresh` internamente. Para permitir recarga externa, expor via prop opcional `refreshSignal?: number`. Quando o número muda, dispara `load(false)`.
- Alternativa mais simples: expor o componente com `forwardRef` e método `refresh()`. Vou usar `refreshSignal` (mais previsível, sem ref).

**`src/pages/admin/AdminConexoesPage.tsx`** (continuação)
- Mantém um state `refreshTick` incrementado pelo callback do botão global
- Passa `refreshSignal={refreshTick}` ao `<ConnectionsOverviewTable>`

### Detalhes técnicos

- **Sem nova migração**: tudo já existe no edge `secrets-manager` action `refresh_cache` (sem `name` invalida tudo).
- **Sem novo endpoint**: a tabela `external_connections` é lida diretamente pelo hook `useConnectionsOverview` — basta reexecutar o `select`.
- **Não duplica os botões por-aba**: os `RefreshFromDbButton` por aba (Bitrix24/n8n/Supabase) continuam, pois servem o caso de uso de invalidar 1 secret específico após edição. O global é o "big button" para o admin que acabou de editar várias credenciais.
- **Acessibilidade**: `aria-label` dinâmico ("Atualizar tudo do banco" / "Aguarde Ns" / "Atualizando…"), `disabled` apropriado.
- **Concorrência**: se já estiver rodando, segundo clique é ignorado (não enfileira).

### Resultado visual

```text
┌─ Conexões ───────────────────────── [Atualizar tudo do banco] [Smoke test] ─┐
│  Hub central de integrações...                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  Saúde geral: 87% · 1 falha consecutiva                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Após clique → toast: "Tudo atualizado · cache invalidado · 12 credenciais relidas · 8 conexões atualizadas (1.2s)" → cooldown 5s.

