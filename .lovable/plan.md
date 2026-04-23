

## Concorrência ajustável e progresso para "Testar todas"

Hoje `runAll` em `ConnectionsOverviewTable` já paraleliza com **concorrência fixa = 3** e o único feedback é o spinner no botão. O pedido: deixar a concorrência configurável e mostrar progresso (barra + contador) durante a execução.

### Mudanças visuais

1. **Seletor de concorrência** ao lado do botão "Testar filtradas/todas":
   - `Select` compacto (`h-8 w-[110px]`) com opções `1`, `2`, `3` (default), `5`, `8` paralelos.
   - Label visual: "Paralelos: N" — `font-display`, `text-xs`.
   - Valor persistido em `localStorage` (`connections.bulk_test_concurrency`) para sobreviver refresh.
   - Desabilitado durante `bulkTesting`.

2. **Painel de progresso** que aparece **dentro do `CardContent`, acima da tabela**, somente enquanto `bulkTesting`:
   - `Progress` (shadcn) com `value = (done / total) * 100`.
   - Linha de status: `Testando X de Y · ✓ A · ✗ B · ⏱ Cs decorridos` em `text-xs tabular-nums`.
   - Botão **"Cancelar"** (`variant="outline" size="sm"`) à direita que aborta os workers (não mata o teste em voo, mas impede novos da fila).
   - Skeleton rows continuam mostrando "Testando..." nas linhas em execução (já existente via `testingKey` — passar a aceitar **set** de chaves).

3. **Tooltip no botão "Testar"** explica: "Roda os testes em paralelo até o limite escolhido. Você pode cancelar a qualquer momento."

### Mudanças de estado

- Substituir `testingKey: string | null` por `testingKeys: Set<string>` (multi-key durante bulk; cells mostram "Testando..." quando `testingKeys.has(row.key)`).
- Novo estado:
  ```ts
  interface BulkProgress {
    total: number;
    done: number;
    ok: number;
    fail: number;
    startedAt: number;
  }
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const cancelRef = useRef(false);
  ```
- `runAll` agora:
  - Lê `concurrency` do estado (clamp `1..8`).
  - Inicializa `progress = { total: filtered.length, done: 0, ok: 0, fail: 0, startedAt: Date.now() }`.
  - Cada worker, ao terminar um item, chama `setProgress(p => ({ ...p, done: p.done+1, ok: p.ok+(res.ok?1:0), fail: p.fail+(res.ok?0:1) }))`.
  - Verifica `cancelRef.current` no topo do loop — se `true`, drena a fila sem executar.
  - Ao finalizar (ou cancelar), aguarda 800ms, depois `setProgress(null)` para o painel sumir suavemente.

### Mudanças no `useConnectionTester`

Hoje cada `test()` dispara um `toast.success`/`toast.error`. Em modo bulk com 30+ conexões isso vira spam.

- Adicionar parâmetro opcional `silent?: boolean` em `test()`:
  ```ts
  test(type, { ...opts, silent: true })
  ```
- Quando `silent`, **não chama `toast`** — feedback fica por conta do painel de progresso. Toast final agregado:
  - `toast.success("Teste em massa concluído", { description: "X OK · Y falhas em Zs" })`
  - `toast.error("Cancelado", { description: "X de Y testes executados" })` quando cancelado.

### Acessibilidade

- `Progress` recebe `aria-label="Progresso dos testes em massa"` e `aria-valuenow` automático.
- Linha de status com `role="status"` + `aria-live="polite"` (atualiza a cada item concluído sem flood — apenas valor numérico, não texto inteiro).
- Select de concorrência com `aria-label="Limite de testes paralelos"`.

### Arquivos

- **Modificado** `src/components/admin/connections/ConnectionsOverviewTable.tsx`:
  - `testingKey` → `testingKeys: Set<string>` (com `useState` e helpers `add`/`delete`).
  - Estados `progress`, `cancelRef`, `concurrency` (com persistência em `localStorage`).
  - `runAll` reescrito com workers que respeitam `cancelRef` e atualizam `progress`.
  - Novo `<BulkTestProgressPanel />` inline dentro do `CardContent`.
  - `Select` de concorrência no header (entre `Atualizar` e `Testar todas`).
  - Passa `silent: true` em todas as chamadas de bulk.
- **Modificado** `src/hooks/useConnectionTester.ts`:
  - Adiciona `silent?: boolean` em `TestOptions` (mantém compat com call-sites que usam objeto).
  - Quando `silent`, pula os blocos `toast.success` / `toast.error` (mantém o `toast.error` do `catch` final como rede de segurança? **Não** — também silencia, retornando o `TestResult` para o caller agregar.).
- **Novo (sub-componente no mesmo arquivo)** `BulkTestProgressPanel`:
  - Recebe `progress`, `onCancel`, e mostra `Progress` + contadores + botão. Mantido inline para evitar mais um arquivo dado o escopo pequeno.

### Detalhes técnicos

- Concorrência clamp: `const c = Math.min(8, Math.max(1, parseInt(stored ?? "3", 10) || 3))`.
- Persistência: `localStorage.setItem("connections.bulk_test_concurrency", String(c))` no `onChange` do Select.
- Cancelamento é **cooperativo**: testes em voo terminam normalmente; apenas itens que ainda não saíram da fila são pulados. UI diz "Cancelando..." enquanto `cancelRef === true && progress.done < progress.total`, depois fecha.
- O painel de progresso usa `Card`-less wrapper: `<div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">` para parecer parte da tabela.
- Sem alteração em backend, edge function, schema ou RLS.

