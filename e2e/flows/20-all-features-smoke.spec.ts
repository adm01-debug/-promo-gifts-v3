/**
 * SMOKE SUITE — gate determinístico de CI.
 *
 * Política:
 *  - 1 `test()` por funcionalidade principal (~31 testes + 3 públicos).
 *  - Numeração `NN · Nome` no título → ORDEM VISÍVEL em qualquer reporter.
 *  - Roda em `mode: "serial"` no project `chromium-smoke` (workers:1, retries:0).
 *  - Test 00 é health check da sessão — falha cedo se auth quebrou em vez
 *    de gastar minutos vendo 30 redirects pra /login.
 *  - CI dispara com `--max-failures=3` (3 features quebradas = problema sistêmico).
 *  - Tag `@smoke` em todos os describes para `--grep @smoke` opcional.
 *
 * Complementar a:
 *  - `e2e/routes/**` — 8 casos por rota (render/happy/erro/a11y/mobile)
 *  - `e2e/flows/21-feature-matrix.spec.ts` — fluxos cross-module
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { Sel } from "../fixtures/selectors";

/** Ordem fixa: garante mesmo relatório em todo run do CI. */
test.describe.configure({ mode: "serial" });

/**
 * Asserções básicas que TODA tela autenticada deve atender.
 */
async function assertFeatureLoads(
  page: import("@playwright/test").Page,
  path: string,
): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    if (!/ResizeObserver|loading chunk|hydrat/i.test(e.message)) {
      errors.push(e.message);
    }
  });

  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");

  // 1. Não pode redirecionar para /login (sessão válida).
  expect(/\/login/.test(page.url()), `redirect inesperado para login em ${path}`).toBe(false);

  // 2. Body visível.
  await expect(page.locator("body")).toBeVisible();

  // 3. Sem loaders pendurados após 5s (best-effort).
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"]:not([data-allow-loading])'),
      { timeout: 5_000 },
    )
    .catch(() => {});

  // 4. Sem `pageerror` fatal coletado durante o carregamento.
  expect(errors, `pageerrors em ${path}: ${errors.join(" | ")}`).toHaveLength(0);
}

test.describe("@smoke Funcionalidades principais (gate de CI)", () => {
  test.beforeEach(() => requireAuth());

  // ----- Health check -----
  test("00 · Sessão autenticada carregada", async ({ page }) => {
    await page.goto("/produtos");
    await page.waitForLoadState("domcontentloaded");
    expect(/\/login/.test(page.url()), "storageState não autenticou").toBe(false);
    const hasToken = await page.evaluate(() =>
      Object.keys(localStorage).some(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
      ),
    );
    expect(hasToken, "auth token ausente no storageState").toBe(true);
  });

  // ----- Núcleo do app -----
  test("01 · Dashboard inicial", async ({ page }) => {
    await assertFeatureLoads(page, "/");
  });
  test("02 · Dashboard customizável", async ({ page }) => {
    await assertFeatureLoads(page, "/dashboard");
  });

  // ----- Catálogo / Produtos -----
  test("03 · Catálogo de produtos", async ({ page }) => {
    await assertFeatureLoads(page, "/produtos");
    await expect(page.locator(Sel.catalog.searchInput).first()).toBeAttached({
      timeout: 8_000,
    });
  });
  test("04 · Filtros avançados de produtos", async ({ page }) => {
    await assertFeatureLoads(page, "/filtros");
  });
  test("05 · Novidades", async ({ page }) => {
    await assertFeatureLoads(page, "/novidades");
  });
  test("06 · Tendências", async ({ page }) => {
    await assertFeatureLoads(page, "/tendencias");
  });

  // ----- Engajamento -----
  test("07 · Favoritos", async ({ page }) => {
    await assertFeatureLoads(page, "/favoritos");
  });
  test("08 · Coleções", async ({ page }) => {
    await assertFeatureLoads(page, "/colecoes");
  });
  test("09 · Comparador de produtos", async ({ page }) => {
    await assertFeatureLoads(page, "/comparar");
  });

  // ----- Carrinho / Pedidos -----
  test("10 · Carrinhos do vendedor", async ({ page }) => {
    await assertFeatureLoads(page, "/carrinhos");
  });
  test("11 · Pedidos", async ({ page }) => {
    await assertFeatureLoads(page, "/pedidos");
  });

  // ----- Orçamentos -----
  test("12 · Lista de orçamentos", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos");
  });
  test("13 · Dashboard de orçamentos", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos/dashboard");
  });
  test("14 · Funil (Kanban) de orçamentos", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos/kanban");
  });
  test("15 · Templates de orçamento", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos/templates");
  });
  test("16 · Criar novo orçamento (wizard)", async ({ page }) => {
    await assertFeatureLoads(page, "/orcamentos/novo");
  });

  // ----- Ferramentas / Simulação -----
  test("17 · Simulador (wizard)", async ({ page }) => {
    await assertFeatureLoads(page, "/simulador");
  });
  test("18 · Simulador de preços", async ({ page }) => {
    await assertFeatureLoads(page, "/simulador-precos");
  });
  test("19 · Busca avançada de preço", async ({ page }) => {
    await assertFeatureLoads(page, "/busca-preco");
  });
  test("20 · Estoque", async ({ page }) => {
    await assertFeatureLoads(page, "/estoque");
  });
  test("21 · Reposição", async ({ page }) => {
    await assertFeatureLoads(page, "/reposicao");
  });

  // ----- Kits -----
  test("22 · Kit Builder", async ({ page }) => {
    await assertFeatureLoads(page, "/montar-kit");
  });
  test("23 · Meus Kits", async ({ page }) => {
    await assertFeatureLoads(page, "/meus-kits");
  });

  // ----- Mockup / Magic Up -----
  test("24 · Gerador de Mockup", async ({ page }) => {
    await assertFeatureLoads(page, "/mockup-generator");
  });
  test("25 · Histórico de Mockups", async ({ page }) => {
    await assertFeatureLoads(page, "/mockups/historico");
  });
  test("26 · Magic Up (publicidade IA)", async ({ page }) => {
    await assertFeatureLoads(page, "/magic-up");
  });

  // ----- Inteligência -----
  test("27 · Inteligência comercial", async ({ page }) => {
    await assertFeatureLoads(page, "/inteligencia-comercial");
  });
  test("28 · Business Intelligence", async ({ page }) => {
    await assertFeatureLoads(page, "/ferramentas/bi");
  });
  test("29 · BI — Comparador de clientes", async ({ page }) => {
    await assertFeatureLoads(page, "/ferramentas/bi/comparar");
  });
  test("30 · Match de produtos", async ({ page }) => {
    await assertFeatureLoads(page, "/match");
  });

  // ----- Integrações -----
  test("31 · Dropbox browser", async ({ page }) => {
    await assertFeatureLoads(page, "/dropbox");
  });
});

/* ============================================================
 * Smoke público (sem auth) — 1 teste por rota pública chave.
 * ============================================================ */
test.describe("@smoke Rotas públicas (gate de CI)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ mode: "serial" });

  test("90 · Tela de login renderiza", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator(Sel.login.email)).toBeVisible();
    await expect(page.locator(Sel.login.password)).toBeVisible();
    await expect(page.locator(Sel.login.submit).first()).toBeVisible();
  });

  test("91 · Reset de senha renderiza", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      if (!/ResizeObserver|loading chunk/i.test(e.message)) errors.push(e.message);
    });
    await page.goto("/reset-password");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
    expect(errors, `pageerrors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("92 · 404 (rota inexistente)", async ({ page }) => {
    await page.goto("/rota-inexistente-smoke-xyz");
    await expect(page.locator(Sel.app.notFound).first()).toBeVisible({ timeout: 8_000 });
  });
});
