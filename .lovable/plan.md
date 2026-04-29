## Objetivo

Criar um spec E2E que valida que o `<Header />` global permanece **sticky no topo do viewport** ao rolar verticalmente, em todos os módulos principais (catálogo, pedidos, favoritos, coleções, dashboard, novidades).

Esse teste protege contra regressões da correção feita em `MainLayout.tsx` (remoção do `overflow-x-hidden` no wrapper que quebrava `position: sticky`).

## Mudanças

### 1. `src/components/layout/Header.tsx` (1 linha)

Adicionar `data-testid="app-header"` ao `<header>` (linha 79–88) — necessário porque a política E2E proíbe seletores por tag/role/classe.

```tsx
<header
  data-testid="app-header"
  className={cn(...)}
>
```

### 2. `e2e/fixtures/selectors.ts` (registro SSOT)

Adicionar dentro de `Sel.app`:

```ts
/** Header global (sticky no topo). */
header: TID("app-header"),
```

### 3. `e2e/flows/22-header-sticky.spec.ts` (novo)

Spec novo que, para cada rota da matriz, executa:

1. `loginAs(page)` + `gotoAndSettle(page, route)`
2. Captura `boundingBox.y` inicial do `Sel.app.header` → deve ser ~0
3. Injeta conteúdo alto via `page.evaluate` (ou rola até `document.body.scrollHeight`) para forçar scroll do viewport
4. `await page.evaluate(() => window.scrollTo(0, 1500))`
5. Reavalia `boundingBox.y` do header → **deve continuar ~0** (tolerância ±2px para acomodar o estado comprimido `h-11`/`h-12`)
6. Assert extra: `getComputedStyle(header).position === "sticky"`

Esqueleto:

```ts
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";
import { waitForTestId } from "../helpers/waits";

const ROUTES = [
  "/produtos",
  "/pedidos",
  "/favoritos",
  "/colecoes",
  "/dashboard",
  "/novidades",
];

test.describe("Header sticky em todos os módulos", () => {
  test.beforeEach(() => requireAuth());

  for (const route of ROUTES) {
    test(`header permanece fixo ao rolar em ${route}`, async ({ page }) => {
      await gotoAndSettle(page, route);
      const header = page.locator(Sel.app.header);
      await waitForTestId(page, "app-header");

      const initialBox = await header.boundingBox();
      expect(initialBox?.y ?? -1).toBeLessThanOrEqual(2);

      // Garante que a página tem altura para rolar
      await page.evaluate(() => {
        if (document.body.scrollHeight < window.innerHeight + 800) {
          const spacer = document.createElement("div");
          spacer.style.height = "2000px";
          spacer.setAttribute("data-e2e-spacer", "");
          document.body.appendChild(spacer);
        }
        window.scrollTo(0, 1500);
      });

      await page.waitForFunction(() => window.scrollY > 1000, { timeout: 3000 });

      const scrolledBox = await header.boundingBox();
      expect(scrolledBox?.y ?? -1).toBeLessThanOrEqual(2);

      const position = await header.evaluate(
        (el) => getComputedStyle(el).position,
      );
      expect(position).toBe("sticky");
    });
  }
});
```

## Escopo / Não-objetivos

- Não testa header em rotas públicas (`/login`, `/lista-publica/*`) — elas não usam `MainLayout`.
- Não inclui tag `@smoke` (smoke tem project isolado e gating próprio — fica no projeto `chromium` padrão).
- Não adiciona ao catálogo `_catalog.ts` (é um cross-cutting concern, não uma rota).

## Verificação

- Rodar `npx playwright test e2e/flows/22-header-sticky.spec.ts`
- ESLint deve passar (não usa `page.goto`/`waitForTimeout`/`networkidle` direto — usa helpers SSOT).
- Se o `MainLayout` voltar a ter `overflow-x-hidden` no wrapper, **todos os 6 testes falham** ao verificar `boundingBox.y` após scroll, capturando a regressão imediatamente.
