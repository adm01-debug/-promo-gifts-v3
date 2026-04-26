# Spec E2E — Favorito persistido após reload

## Contexto
- Spec atual `e2e/flows/08-favorites.spec.ts` é fraco: só clica e dá `waitForTimeout(800)`, não valida persistência nem aparição na lista.
- Infra já existe: `fixtures/test-base.ts` (`requireAuth` + evidence), `helpers/nav.ts` (`gotoAndSettle`), `playwright.config.ts` com projeto `chromium-authed` + `storageState.json`.
- Selectors confirmados: `aria-label="Favoritar"` nos cards (catálogo) e `aria-label="Remover favorito"` na FavoritesPage.

## Mudança
Substituir o conteúdo de `e2e/flows/08-favorites.spec.ts` por **3 testes**:

1. **`lista de favoritos carrega`** — smoke: navega `/favoritos`, valida heading ou estado-vazio.
2. **`favorita um produto, recarrega e ele persiste na lista`** (caso pedido):
   - Vai a `/produtos` → pega 1º card → lê nome → garante estado inicial NÃO favoritado (cleanup defensivo se já estava)
   - Clica Favoritar → aguarda mudança visual via `expect.poll(isFavorited)`
   - Navega `/favoritos` → **`page.reload()` forçando full reload** → aguarda hidratação
   - Asserção dupla: nome do produto visível **OU** ≥1 botão "Remover favorito" presente
   - Cleanup: desfavorita o item para restaurar estado
3. **`toggle do favorito é idempotente`** — clica 2x e valida que volta ao estado inicial (regressão de double-click).

## Helpers internos do spec
- `firstCatalogCard(page)` — primeiro card do catálogo com botão favoritar visível
- `readCardName(card)` — extrai nome via heading (`h1/h2/h3`/`[data-testid="product-name"]`) com fallback para 1ª linha de texto
- `isFavorited(button)` — checa `aria-pressed="true"` ou ícone preenchido (`fill-destructive`/`fill-current`)

## Detalhes técnicos
- Usa `expect.poll(...)` ao invés de `waitForTimeout` arbitrário → mais resiliente
- `page.reload({ waitUntil: "domcontentloaded" })` + wait condicional para skeletons sumirem
- Escape regex no nome do produto antes do `getByText(new RegExp(...))`
- Cleanup tolerante: tenta remover o card específico, fallback para o primeiro
- Mantém `requireAuth()` no `beforeEach` → spec faz skip se não houver `E2E_USER_EMAIL/PASSWORD`

## Rodar
```bash
npm run test:e2e -- e2e/flows/08-favorites.spec.ts
```

Após aprovação do plano, escrevo o arquivo e ele entra na suite `chromium-authed` automaticamente.
