

## Testes de integração para classificação de erros de conexão

### Objetivo
Criar uma suíte de testes que simula cenários reais de falha (timeout, network error, DNS, auth, HTTP 5xx) e valida que a pipeline ponta-a-ponta classifica corretamente o `error_kind`, mede latência e produz a copy/badge esperados na UI.

### Estratégia
Cobrir três camadas com mocks de `fetch`/network, sem depender de serviços externos:

1. **Lib (puro/unit-integration)** — `inferErrorKind` + `getErrorCopy` formam o pipeline de classificação no client. Validar com casos canônicos.
2. **Hook (`useConnectionTester`)** — mockar `supabase.functions.invoke` para retornar respostas que simulam o que o edge devolveria em cada cenário; validar `TestResult` normalizado, latência preservada e toast disparado com copy correta.
3. **Componente (`LastTestLine`)** — render com props de cada cenário; assert título humano, hint, badge `kind` e linha técnica.

### O que será criado

**`tests/lib/error-kind-inference.test.ts`** (~80 linhas)
Tabela de casos:
| input | expected kind |
|---|---|
| `{ errorMessage: "fetch failed: timeout após 12000ms" }` | `timeout` |
| `{ errorMessage: "TypeError: fetch failed", statusCode: null }` | `network` |
| `{ errorMessage: "getaddrinfo ENOTFOUND api.x.com" }` | `dns` |
| `{ statusCode: 401 }` | `auth` |
| `{ statusCode: 403, errorMessage: "Forbidden" }` | `auth` |
| `{ errorMessage: "Invalid token" }` | `auth` |
| `{ statusCode: 504 }` | `http` |
| `{ statusCode: 500 }` | `http` |
| `{ errorMessage: "Missing SUPABASE_URL env" }` | `config` |
| `{ success: true }` | `null` |
| `{ errorKind: "timeout", errorMessage: "..." }` (backend já gravou) | `timeout` (passa direto) |
| `{ errorMessage: "weird unknown thing" }` | `unknown` |

**`tests/lib/connection-error-copy.test.ts`** (~50 linhas)
- Cada `kind` retorna `title`, `hint`, `tone` esperados.
- `kind: "timeout"` com `timeout_ms: 12000` → hint contém `"12000ms"`.
- `kind: "http"` com `status: 504` → title contém `"504"`; hint diferencia 4xx vs 5xx.
- `kind: null/unknown` com `fallbackMessage` → hint usa o fallback.
- `getKindBadgeClass` retorna classe distinta para cada tone (snapshot por tone).
- `getKindLabel` retorna label PT-BR.

**`tests/hooks/useConnectionTester.test.tsx`** (~150 linhas)
Setup:
- Mock `@/integrations/supabase/client` com `supabase.functions.invoke` controlável.
- Mock `sonner` para capturar toasts.
- Renderizar hook via `renderHook` do `@testing-library/react`.

Cenários:
1. **Timeout** — invoke resolve com `data.result = { ok:false, error_kind:"timeout", error:"timeout após 12000ms", timeout_ms:12000, latency_ms: 12001 }`. Asserts: `result.ok===false`, `error_kind==="timeout"`, `timeout_ms===12000`, toast `error` chamado com title `"Tempo esgotado"` e description contendo `"12000"`.
2. **Network error** — `{ ok:false, error_kind:"network", error:"fetch failed", latency_ms: 47 }`. Asserts: kind preservado, latência preservada, toast `"Sem conexão"`.
3. **DNS** — `{ ok:false, error_kind:"dns", error:"getaddrinfo ENOTFOUND foo.bar" }` → toast `"URL não encontrada"`.
4. **Auth (401)** — `{ ok:false, error_kind:"auth", status:401 }` → toast `"Credenciais rejeitadas"`.
5. **HTTP 5xx** — `{ ok:false, error_kind:"http", status:504 }` → toast title contém `"504"`.
6. **Sucesso** — `{ ok:true, status:200, latency_ms:120 }` → toast `success`, `lastResult.ok===true`.
7. **Silent mode** — `silent:true` não dispara toast em falha.
8. **Erro de invoke** (rede do Supabase falhou) — invoke rejeita; hook retorna `{ ok:false, error_kind:"unknown" }` e dispara toast genérico.
9. **Latência** — preservada de `data.result.latency_ms` no `lastResult` em todos os cenários.

**`tests/components/LastTestLine.test.tsx`** (~120 linhas)
Render com `info` simulando cada cenário:
1. **Sucesso** — renderiza `CheckCircle2`, sem badge de kind.
2. **Timeout com `timeout_ms:12000`** — title `"Tempo esgotado"`, hint contém `"12000ms"`, linha técnica contém `"timeout 12000ms"`.
3. **Network sem error_kind (legacy)** — passa `error_kind:null`, `message:"fetch failed"`. Espera que inferência derive `network` e mostre `"Sem conexão"`.
4. **Auth 401 sem error_kind** — espera derivar `auth` e mostrar `"Credenciais rejeitadas"`.
5. **HTTP 504** — espera title com `504`, badge tone `http`.
6. **Tooltip** — `title` no header revela `info.message` cru.

### O que será alterado

Nenhum arquivo de produção. Apenas adições em `tests/`. Se faltar setup do Vitest para JSX, conferir `vitest.config.ts` (já existe e cobre `tests/**`).

### Detalhes técnicos
- **Sem rede real**: 100% mocks. Determinístico em CI.
- **Mock pattern**: usar `vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }))` no topo de cada teste de hook.
- **Mock sonner**: `vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))`.
- **Helpers compartilhados**: criar `tests/_helpers/connection-fixtures.ts` com factories `makeTimeoutResult()`, `makeNetworkResult()`, `makeAuthResult()` para reduzir duplicação entre testes de hook e componente.
- **Cobertura**: cada teste afirma simultaneamente (a) classificação correta de `error_kind`, (b) preservação de `latency_ms` e (c) copy/badge final exibido — garantindo que regressões em qualquer camada quebrem o build.
- **Nada de testes E2E de Edge**: o runner Deno está coberto pelo próprio backend; aqui validamos o contrato `result → UI`.

### Resultado
Após `npm test`, 4 novos arquivos rodam ~25 casos cobrindo todos os `error_kind` ponta-a-ponta. Falhas regressivas (ex.: alguém quebra `inferErrorKind` ou muda copy de timeout) são pegas imediatamente.

