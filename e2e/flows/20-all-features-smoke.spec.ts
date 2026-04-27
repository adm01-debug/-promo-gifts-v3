/**
 * SMOKE SUITE — gate determinístico de CI.
 *
 * Política:
 *  - 1 `test()` por funcionalidade marcada `smoke: true` no `_catalog.ts`.
 *  - Numeração `NN · Nome` no título → ORDEM VISÍVEL em qualquer reporter.
 *  - Roda em `mode: "serial"` no project `chromium-smoke` (workers:1, retries:0).
 *  - Test 00 é health check da sessão — falha cedo se auth quebrou.
 *  - Test 99 é GOVERNANÇA: falha se alguma feature `smoke:true` do catálogo
 *    não está coberta aqui (fecha lacunas automaticamente).
 *  - CI dispara com `--max-failures=3`.
 *  - Tag `@smoke` em todos os describes para `--grep @smoke` opcional.
 *
 * Complementar a:
 *  - `e2e/routes/**` — 8 casos por rota (render/happy/erro/a11y/mobile)
 *  - `e2e/flows/21-feature-matrix.spec.ts` — fluxos cross-module
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { Sel } from "../fixtures/selectors";
import {
  SMOKE_ROUTES,
  findSmokeCoverageGaps,
  findUnknownCoveredFeatures,
} from "../routes/_catalog";
import { gotoAndWaitReady, pollUntil } from "../helpers/waits";

/** Ordem fixa: garante mesmo relatório em todo run do CI. */
test.describe.configure({ mode: "serial" });

/**
 * Normaliza URL para comparação de "mesma rota" — descarta query/hash e
 * trailing slash, mantém apenas o path. Permite redirects intencionais
 * preservando query (ex.: `?token=...`) sem disparar falso positivo.
 */
function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return url;
  }
}

/**
 * Asserções básicas que TODA tela autenticada deve atender.
 *
 * Estratégia anti-flake (CI):
 *  - `gotoAndWaitReady` = goto com retry em erros transitórios + espera de
 *    readiness (page-title-<slug> quando disponível, senão heurística).
 *  - Coleta `pageerror` para falhar com diagnóstico em vez de silenciar.
 *  - Sem `networkidle` por default (lento e flaky em apps com polling/realtime).
 *
 * Validação de estabilidade de URL/histórico (anti redirect-loop):
 *  - Snapshot de `history.length` ANTES da navegação.
 *  - Snapshot de URL imediatamente após o ready, e novo snapshot 800ms depois.
 *  - Falha se a URL mudou entre os 2 snapshots (loop tardio).
 *  - Falha se `history.length` cresceu mais que 2 entradas (1 push esperado
 *    para a nova rota; >2 indica replace-redirect-replace ou loop).
 *  - Falha se houve redirect para path diferente do solicitado E não para
 *    `/login` (este último já é coberto por asserção dedicada).
 */
async function assertFeatureLoads(
  page: import("@playwright/test").Page,
  path: string,
  pageSlug?: string,
): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    if (!/ResizeObserver|loading chunk|hydrat/i.test(e.message)) {
      errors.push(e.message);
    }
  });

  // Snapshot de histórico ANTES da navegação (estado da página atual).
  const historyBefore = await page
    .evaluate(() => window.history.length)
    .catch(() => 0);

  await gotoAndWaitReady(page, path, {
    attempts: 2,
    perAttemptTimeout: 25_000,
    pageSlug,
    timeout: 20_000,
  });

  // URL logo após ready.
  const urlAfterLoad = page.url();

  // Sessão válida: sem redirect para /login.
  expect(/\/login/.test(urlAfterLoad), `redirect inesperado para login em ${path}`).toBe(false);

  // Body visível (sanity).
  await expect(page.locator("body")).toBeVisible();

  // ── Validação de estabilidade de URL (anti redirect-loop) ───────────────
  // Aguarda 800ms para detectar redirects tardios (`useEffect` que dispara
  // navigate após mount). Não usa networkidle pra não acoplar a fetches.
  await page.waitForTimeout(800);
  const urlSettled = page.url();
  const historyAfter = await page
    .evaluate(() => window.history.length)
    .catch(() => historyBefore);

  expect(
    pathOf(urlSettled),
    `URL instável em ${path}: mudou de ${urlAfterLoad} → ${urlSettled} após 800ms (possível redirect-loop tardio)`,
  ).toBe(pathOf(urlAfterLoad));

  // Histórico: SPA pode adicionar 1 entrada (push da nova rota) ou 0
  // (replace). Mais que +2 indica loop ou cadeia de redirects.
  const historyDelta = historyAfter - historyBefore;
  expect(
    historyDelta,
    `history.length cresceu em ${historyDelta} entradas em ${path} ` +
      `(${historyBefore} → ${historyAfter}) — provável redirect-loop ou cadeia múltipla de navigate()`,
  ).toBeLessThanOrEqual(2);

  // Path final deve bater com o solicitado (ignorando trailing slash, query
  // e hash). Redirects intencionais para outra rota são considerados bug
  // de smoke (cada rota deve resolver pra si mesma com mocks default).
  expect(
    pathOf(urlSettled),
    `redirect inesperado: solicitado ${path}, terminou em ${urlSettled}`,
  ).toBe(pathOf(`http://x${path.startsWith("/") ? path : `/${path}`}`));

  // Sem `pageerror` fatal coletado durante o carregamento.
  expect(errors, `pageerrors em ${path}: ${errors.join(" | ")}`).toHaveLength(0);
}

/* ============================================================
 * SMOKE_COVERAGE — features autenticadas cobertas neste arquivo.
 * Mantido em ordem visível p/ revisão. Validado contra catálogo em test 99.
 * ============================================================ */
const SMOKE_COVERAGE = [
  "dashboard-home",
  "dashboard-custom",
  "catalog",
  "catalog-filters",
  "news",
  "trends",
  "favorites",
  "collections",
  "comparison",
  "carts",
  "quotes-list",
  "quotes-dashboard",
  "quotes-kanban",
  "quotes-templates",
  "quote-new",
  "simulator",
  "price-simulator",
  "price-search",
  "stock",
  "restock",
  "kit-builder",
  "my-kits",
  "mockup-generator",
  "mockup-history",
  "magic-up",
  "commercial-intel",
  "bi",
  "bi-compare",
  "match",
  "dropbox",
] as const;

/** Map feature → entry do catálogo (lookup determinístico). */
const ROUTE_BY_FEATURE = new Map(SMOKE_ROUTES.map((r) => [r.feature!, r]));

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

  // ----- Geração automática a partir do catálogo -----
  SMOKE_COVERAGE.forEach((feature, idx) => {
    const entry = ROUTE_BY_FEATURE.get(feature);
    if (!entry) {
      // Feature listada aqui mas ausente do catálogo → test de governança pega.
      // Skip silencioso evita ruído duplicado.
      return;
    }
    const num = String(idx + 1).padStart(2, "0");
    const label = entry.description ?? entry.feature!;
    test(`${num} · ${label}`, async ({ page }) => {
      await assertFeatureLoads(page, entry.path, entry.titleSlug);
      // Asserções extras específicas por feature.
      if (feature === "catalog") {
        await expect(page.locator(Sel.catalog.searchInput).first()).toBeAttached({
          timeout: 8_000,
        });
      }
    });
  });

  // ----- Governança (último teste) -----
  test("99 · Cobertura smoke ↔ catálogo está sincronizada", async () => {
    const gaps = findSmokeCoverageGaps(SMOKE_COVERAGE);
    const unknown = findUnknownCoveredFeatures(SMOKE_COVERAGE);

    const messages: string[] = [];
    if (gaps.length > 0) {
      messages.push(
        `⚠ ${gaps.length} feature(s) marcada(s) \`smoke:true\` no catálogo SEM teste correspondente em SMOKE_COVERAGE:\n  - ${gaps.join("\n  - ")}\n` +
          `→ adicione a feature ao array \`SMOKE_COVERAGE\` ou remova \`smoke:true\` no catálogo.`,
      );
    }
    if (unknown.length > 0) {
      messages.push(
        `⚠ ${unknown.length} feature(s) em SMOKE_COVERAGE não existe(m) (ou não está \`smoke:true\`) no catálogo:\n  - ${unknown.join("\n  - ")}\n` +
          `→ corrija o nome ou marque a rota \`smoke:true\` em \`e2e/routes/_catalog.ts\`.`,
      );
    }
    expect(messages.join("\n\n"), "Lacunas de cobertura smoke detectadas").toBe("");
  });
});

/* ============================================================
 * Smoke público (sem auth) — derivado do catálogo `PUBLIC_ROUTES`.
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

