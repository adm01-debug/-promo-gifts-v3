## Objetivo

Expandir a suíte E2E existente (Playwright) para cobrir fluxos críticos de cada módulo: **login**, **navegação**, **criação/edição**, **submissão** e **tratamento de erro** — com **evidências automáticas** (screenshot + vídeo + trace + DOM dump) gravadas em `e2e-artifacts/` quando um teste falha.

A plataforma é fechada (sem signup público), então E2E que exercitam rotas protegidas dependem de um **usuário de teste seedado** via `storageState` autenticado uma única vez no `globalSetup`.

## Arquitetura

```text
e2e/
├── fixtures/
│   ├── auth.setup.ts          # Login uma vez, salva storageState.json
│   ├── test-base.ts           # Fixture custom: page autenticada + helpers
│   └── selectors.ts           # SSOT de data-testid / roles
├── helpers/
│   ├── evidence.ts            # Captura screenshot+DOM+console em falha
│   ├── nav.ts                 # Navegação resiliente (waits robustos)
│   └── forms.ts               # Helpers de preenchimento + validação
├── flows/
│   ├── 01-auth.spec.ts        # Login OK / inválido / lockout / reset
│   ├── 02-navigation.spec.ts  # Sidebar, deep-links, 404, voltar
│   ├── 03-products.spec.ts    # Listar, filtrar, abrir detalhe, favoritar
│   ├── 04-quotes.spec.ts      # Criar → editar → submeter → erro
│   ├── 05-orders.spec.ts      # Listar, abrir, atualizar status
│   ├── 06-kit-builder.spec.ts # Wizard 4 etapas + validação + salvar
│   ├── 07-collections.spec.ts # CRUD coleção + share público
│   ├── 08-favorites.spec.ts   # Adicionar, remover, lista pública
│   ├── 09-simulator.spec.ts   # Simulação de preço + erro
│   ├── 10-admin.spec.ts       # Acesso admin + guards de role
│   └── 11-errors.spec.ts      # 503 edge, offline, RLS denial
└── (existentes mantidos: protected-routes, login, auth, etc.)

playwright.config.ts            # Atualizado: reporters, evidências, projects
.github/workflows/e2e.yml       # Job CI dedicado (opcional, gated)
```

## Mudanças principais

### 1. `playwright.config.ts`
- Reporters em paralelo: `html` + `list` + `json` (para CI parsing) + `junit`
- `use`: `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`
- `outputDir: 'e2e-artifacts/'` para evidências consolidadas
- 2 projects:
  - `setup` (roda `auth.setup.ts`, sem auth)
  - `chromium-authed` (depende de setup, usa `storageState.json`)
- `globalTimeout` e `expect.timeout` ajustados

### 2. `fixtures/auth.setup.ts`
- Lê `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` (secrets) ou pula com `test.skip` se ausentes
- Faz login real, aguarda redirect para `/`, salva `storageState.json`
- Se secrets faltarem, todos os specs autenticados são marcados `skip` com mensagem clara — CI verde, dev local pode rodar com `.env.e2e`

### 3. `fixtures/test-base.ts`
Estende `test` do Playwright com:
- `authedPage` — página com sessão pronta
- `evidence` — handle que registra screenshot+console+network ao falhar
- `afterEach` global: se `testInfo.status !== testInfo.expectedStatus`, dispara `evidence.capture()`

### 4. `helpers/evidence.ts`
Em falha, grava em `e2e-artifacts/<spec>/<test>/`:
- `screenshot.png` (full page)
- `dom.html` (snapshot)
- `console.json` (logs capturados)
- `network.har` (já automático via `recordHar`)
- `meta.json` (URL, viewport, user agent, timestamp)

Anexa todos via `testInfo.attach()` para aparecerem no relatório HTML.

### 5. Specs de fluxo (11 arquivos)
Cada spec segue o mesmo template:
- `describe(modulo)` com 5 blocos: navegação → carregamento → criação/edição → submissão → erro
- Usa `getByRole`/`getByTestId` (não selectors frágeis)
- Cada teste é independente (limpa estado se necessário) e **idempotente** (deletar entidades criadas no `afterEach`)
- Casos de erro: forçar 503 via `page.route()` mockando `external-db-bridge`, validar UI de erro

### 6. CI (`.github/workflows/e2e.yml`)
Job opcional (não-bloqueante inicialmente):
- Instala Playwright browsers (cache)
- Build do app + serve estático
- Roda suite `chromium-authed` se `E2E_USER_EMAIL` secret existir, senão só specs públicos
- Upload de `e2e-artifacts/` e `playwright-report/` como artifacts (retention 7 dias)

### 7. `package.json` — novos scripts
- `test:e2e:ui` — modo UI
- `test:e2e:headed` — com browser visível
- `test:e2e:debug` — com inspector
- `test:e2e:report` — abre relatório HTML

## Cobertura por módulo

| Módulo | Login | Nav | Criar | Editar | Submeter | Erro |
|---|---|---|---|---|---|---|
| Auth | ✓ | — | — | — | ✓ | ✓ |
| Produtos | — | ✓ | — | — | ✓ filtros | ✓ |
| Orçamentos | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pedidos | — | ✓ | — | ✓ status | ✓ | ✓ |
| Kit Builder | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Coleções | — | ✓ | ✓ | ✓ | ✓ share | ✓ |
| Favoritos | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Simulador | — | ✓ | ✓ | — | ✓ | ✓ |
| Admin | — | ✓ guards | — | — | — | ✓ 403 |
| Erros globais | — | — | — | — | — | ✓ 503/offline |

## Pontos a confirmar antes de implementar

1. **Credenciais de teste**: posso adicionar pedido de secrets `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` (e opcional `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` para specs admin)? Sem eles os specs autenticados ficam `skip`.
2. **Cleanup**: posso usar service-role via edge function dedicada `e2e-cleanup` (gated por header secreto) para apagar entidades criadas pelos testes? Alternativa: criar tudo em rascunho e descartar.
3. **CI gate**: o job E2E deve **falhar o build** ou rodar como informativo (artifacts only) na primeira versão?

## Não-objetivos (escopo fora)

- Visual regression (screenshots-as-source-of-truth) — ficar para depois
- Mobile viewports — adicionar em onda futura
- Cross-browser (Firefox/WebKit) — começar só Chromium
- Testes contra produção — só preview/staging

## Resultado esperado

- ~60–80 testes E2E novos cobrindo os 10 módulos críticos
- Relatório HTML navegável (`playwright-report/index.html`)
- Pasta `e2e-artifacts/` com evidências completas em qualquer falha
- Job CI opcional pronto para ser ligado quando secrets forem configuradas
