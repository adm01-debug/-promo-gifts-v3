# E2E (Playwright)

Suíte de testes ponta-a-ponta cobrindo os fluxos críticos por módulo, com
captura automática de evidências em qualquer falha.

## Estrutura

```
e2e/
├── fixtures/
│   ├── auth.setup.ts       Login uma vez e salva storageState.json
│   ├── test-base.ts        test estendido com captura de console/erros e
│   │                        afterEach que coleta evidências em falha
│   └── selectors.ts        SSOT de seletores frágeis
├── helpers/
│   ├── evidence.ts         Screenshot, DOM, console.json, meta.json
│   ├── nav.ts              gotoAndSettle, expectNoConsoleErrors
│   └── forms.ts            fill/click resilientes
└── flows/
    ├── 01-auth.spec.ts
    ├── 02-navigation.spec.ts
    ├── 03-products.spec.ts
    ├── 04-quotes.spec.ts
    ├── 05-orders.spec.ts
    ├── 06-kit-builder.spec.ts
    ├── 07-collections.spec.ts
    ├── 08-favorites.spec.ts
    ├── 09-simulator.spec.ts
    ├── 10-admin.spec.ts
    └── 11-errors.spec.ts
```

## Configuração local

1. Copie `.env.e2e.example` para `.env.e2e`:
   ```bash
   cp .env.e2e.example .env.e2e
   ```
2. Preencha com credenciais de um usuário de teste real:
   ```
   E2E_USER_EMAIL=teste@exemplo.com
   E2E_USER_PASSWORD=SuaSenhaForte
   ```
3. Carregue antes de rodar:
   ```bash
   set -a && source .env.e2e && set +a
   npm run test:e2e
   ```

Sem essas variáveis, os specs autenticados são marcados `skip` automaticamente
(o setup grava um storageState vazio).

## Comandos

| Comando                       | Descrição                            |
|-------------------------------|--------------------------------------|
| `npm run test:e2e`            | Headless, todos os specs             |
| `npm run test:e2e:ui`         | Modo UI interativo                   |
| `npm run test:e2e:headed`     | Browser visível                      |
| `npm run test:e2e:debug`      | Inspector do Playwright              |
| `npm run test:e2e:report`     | Abre relatório HTML                  |
| `npm run test:e2e:install`    | Instala browser do Chromium          |

## Evidências em falha

Quando um teste falha, a fixture `evidence` anexa automaticamente ao relatório:

- `screenshot.png` (full page)
- `dom.html` (snapshot do HTML)
- `console.json` (todos os logs de console capturados)
- `page-errors.json` (se houver erros de runtime)
- `meta.json` (URL, viewport, título, timestamp)

Além disso, o Playwright gera por padrão (config):
- `trace.zip` (`retain-on-failure`)
- `video.webm` (`retain-on-failure`)

Tudo fica em `playwright-report/` (relatório HTML) e `e2e-artifacts/` (raw).

## CI

Workflow em `.github/workflows/e2e.yml`:
- Roda em todo push/PR contra `main`
- Specs públicos sempre rodam
- Specs autenticados só rodam se `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`
  forem secrets do repositório
- Faz upload de `playwright-report` e `e2e-evidence` como artifacts (7 dias)

## Cobertura por módulo

| Módulo       | Login | Nav | Criar/Editar | Submeter | Erro |
|--------------|:-----:|:---:|:------------:|:--------:|:----:|
| Auth         |   ✓   |  —  |      —       |    ✓     |  ✓   |
| Navegação    |   —   |  ✓  |      —       |    —     |  ✓   |
| Produtos     |   —   |  ✓  |      ✓ filtro|    ✓     |  ✓   |
| Orçamentos   |   —   |  ✓  |      ✓       |    —*    |  ✓   |
| Pedidos      |   —   |  ✓  |      —       |    —     |  ✓   |
| Kit Builder  |   —   |  ✓  |      —       |    —     |  ✓   |
| Coleções     |   —   |  ✓  |      —       |    —     |  ✓   |
| Favoritos    |   —   |  ✓  |      ✓       |    ✓     |  ✓   |
| Simulador    |   —   |  ✓  |      —       |    —     |  ✓   |
| Admin        |   —   |  ✓  |      —       |    —     |  ✓   |
| Erros        |   —   |  —  |      —       |    —     |  ✓   |

\* Submissão de orçamentos é validada apenas até abertura do builder para
evitar criação de dados de teste no BD compartilhado. Para suíte completa
com cleanup, configure uma edge function `e2e-cleanup` gated por header
secreto.
