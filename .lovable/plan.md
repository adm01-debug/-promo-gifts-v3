## Objetivo

Operacionalizar criação e cleanup automáticos de dados E2E **por funcionalidade**, evitando que um spec interfira em outro. A política `e2eName` + edge `e2e-cleanup` com `nameFilterPrefix` já existe — falta o **scoping por spec** e a **adoção real** dos helpers nas specs.

## Diagnóstico

- `e2eName(label)` gera `[E2E] label <ts>-<rand>` — único por chamada, mas **mesmo prefixo `[E2E]` para toda a suite**. Cleanup pós-falha de um spec apaga recursos vivos de outro spec rodando em paralelo no mesmo worker/CI.
- Helpers `createE2eQuote/Collection/FavoriteList/CartTemplate/CustomKit` existem mas **nenhum spec os utiliza** (`rg createE2e e2e/` só acha as definições).
- `cleanup-on-failure` purga **tudo do usuário** — efeito colateral em testes paralelos.
- ESLint não bloqueia `page.fill('[data-testid="quote-client-name"]', "literal")`.

## Plano

### 1. Sub-prefixo por spec (`e2e/fixtures/test-user.ts`)
- Adicionar `e2eScope(specSlug)` → retorna prefixo `[E2E:<slug>]` derivado do `testInfo.titlePath` (file basename + sanitização).
- `e2eName(label, opts?)` aceita `opts.prefix` opcional; default mantém `getTestPrefix()` para retrocompatibilidade.

### 2. Fixture `e2eResources` automática (`e2e/fixtures/test-base.ts`)
- Nova fixture `scopedPrefix: string` calculada do `testInfo` (ex.: `[E2E:quote-create]`).
- Fixture `e2eResources` expõe wrappers já bound ao prefixo:
  - `resources.createQuote({ label, submit })`, `.createCollection(...)`, etc.
  - Internamente chama `e2eName(label, { prefix: scopedPrefix })`.
- `cleanupOnFailure` passa a chamar `purgeAll(cfg, { nameFilterPrefix: scopedPrefix })` em vez de purga total — **isolamento entre specs**.

### 3. `cleanup-client.ts` aceita override de prefixo por chamada
- Assinatura `purgeAll(cfg, { nameFilterPrefix?: string })` sobrescreve `cfg.nameFilterPrefix` para a chamada (pré-existente passa o config global).
- `purgeOne` idem.

### 4. Helpers sub-escopados (`e2e/helpers/e2e-resources.ts`)
- Refatorar `createE2eQuote/...` para aceitar `{ prefix?: string }` — defaultando ao prefixo global.
- `assertE2eName` aceita lista de prefixos válidos (global + scoped) — falha se não bater com nenhum.

### 5. Adoção mínima nos specs que criam recursos
Migrar para a fixture `e2eResources` apenas onde já há criação de recursos nomeáveis hoje:
- `e2e/quote-create.spec.ts`
- `e2e/quote-approval.spec.ts`
- `e2e/discount-approval.spec.ts`
- `e2e/routes/app/kit-builder.spec.ts` (se criar custom kit)
- `e2e/routes/app/kit-library.spec.ts`

Para os demais specs (smoke/navigation/protected) **nada muda** — eles não criam dados.

### 6. Guard ESLint adicional
Adicionar regra em `eslint.config.js` (severity `warn` inicial):
```js
{
  selector: "CallExpression[callee.object.name='page'][callee.property.name='fill'] > Literal[value=/^\\[E2E\\]/]",
  message: "Use resources.createX() ou e2eName() — nunca passe literal '[E2E]' no .fill()."
}
```
E reforço para `client_name`/inputs nomeáveis: detectar `.fill(<literal sem prefixo>)` em testids conhecidos via `no-restricted-syntax`.

### 7. Edge `e2e-cleanup` — sem mudanças
Já aceita `nameFilterPrefix` arbitrário e sanitiza wildcards (`%`, `_`). Sub-prefixos `[E2E:quote-create]` casam no `LIKE '<prefix>%'` existente sem alteração de schema/RLS.

### 8. Memória atualizada
- Editar `mem://testing/e2e-named-resources-policy.md`:
  - Documentar `e2eScope` + fixture `e2eResources` como **caminho preferido**.
  - Manter `e2eName(label)` como fallback documentado.
  - Adicionar exemplo: `const { name } = await resources.createQuote({ label: "approval" });`

## Detalhes técnicos

```ts
// fixtures/test-user.ts
export function e2eScope(specSlug: string): string {
  const safe = specSlug.replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 32);
  return `[E2E:${safe}]`;
}
export function e2eName(label: string, opts: { prefix?: string } = {}): string {
  const p = opts.prefix ?? getTestPrefix();
  return `${p} ${label} ${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
}
```

```ts
// fixtures/test-base.ts (trecho)
e2eResources: async ({ page }, use, testInfo) => {
  const slug = path.basename(testInfo.file).replace(/\.spec\.tsx?$/, "");
  const prefix = e2eScope(slug);
  await use({
    prefix,
    createQuote: (o={}) => createE2eQuote(page, { ...o, prefix }),
    createCollection: (o={}) => createE2eCollection(page, { ...o, prefix }),
    // ...
  });
},
cleanupOnFailure: [async ({ e2eResources }, use, testInfo) => {
  await use();
  if (testInfo.status === testInfo.expectedStatus) return;
  const cfg = loadCleanupConfig();
  if (!cfg) return;
  await purgeAll(cfg, { nameFilterPrefix: e2eResources.prefix, reason: `failure:${testInfo.title}` });
}, { auto: true }],
```

## Arquivos afetados

- `e2e/fixtures/test-user.ts` — adiciona `e2eScope`, estende `e2eName`.
- `e2e/fixtures/test-base.ts` — fixture `e2eResources` + cleanup escopado.
- `e2e/helpers/cleanup-client.ts` — overrides em `purgeOne/purgeAll`.
- `e2e/helpers/e2e-resources.ts` — aceita `prefix` opcional.
- 4–5 specs migrados para `resources.createX(...)`.
- `eslint.config.js` — regra anti-literal-com-prefixo.
- `mem://testing/e2e-named-resources-policy.md` — atualização.

## Validação

- `npx eslint e2e/` sem erros novos nos arquivos refatorados.
- `npx tsc --noEmit` limpo.
- Smoke local de 1 spec migrado: criação → asserção visível → falha forçada → confirmar que cleanup só apagou recursos com prefixo `[E2E:<slug>]` (via auditoria `e2e_cleanup_audit`).

## Fora de escopo

- Migrar todos os 100+ specs para a fixture (apenas os que **criam** recursos hoje).
- Mudanças no schema da edge function (já suporta `nameFilterPrefix`).
- Promover ESLint de `warn` para `error` (segue separado da política existente).