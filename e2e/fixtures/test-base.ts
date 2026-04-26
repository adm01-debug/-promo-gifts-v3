/**
 * Test base estendendo o Playwright com:
 *  - Captura automática de console/pageerror em toda página
 *  - afterEach que dispara coleta de evidências em qualquer falha
 *  - Helper `requireAuth()` que pula o teste se as credenciais não foram dadas
 *
 * Uso:
 *   import { test, expect } from "../fixtures/test-base";
 */
import { test as base, expect } from "@playwright/test";
import { attachConsoleCapture, type EvidenceCollector } from "../helpers/evidence";
import { loadCleanupConfig, purgeAll } from "../helpers/cleanup-client";

type Fixtures = {
  evidence: EvidenceCollector;
  /**
   * Auto-fixture: dispara purge da edge `e2e-cleanup` quando o teste falha,
   * para que o teste seguinte não herde lixo. Pode ser desligada via
   * `E2E_CLEANUP_ON_FAILURE=0` (default ligado quando há config válida).
   */
  cleanupOnFailure: void;
};

export const test = base.extend<Fixtures>({
  evidence: async ({ page }, use, testInfo) => {
    const collector = attachConsoleCapture(page);
    await use(collector);
    if (testInfo.status !== testInfo.expectedStatus) {
      await collector.attachAll(page, testInfo);
    }
  },
  cleanupOnFailure: [
    async ({}, use, testInfo) => {
      await use();
      if (process.env.E2E_CLEANUP_ON_FAILURE === "0") return;
      if (testInfo.status === testInfo.expectedStatus) return;
      const cfg = loadCleanupConfig();
      if (!cfg) return;
      await purgeAll(cfg, {
        quiet: true,
        reason: `failure:${testInfo.title}`,
      }).catch(() => {});
    },
    { auto: true },
  ],
});

export { expect };

/** Marca o teste como skip se as credenciais E2E_USER_* não foram fornecidas. */
export function requireAuth(reason = "E2E_USER_EMAIL/PASSWORD não configurados") {
  test.skip(!process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD, reason);
}

/** Marca o teste como skip se as credenciais admin não foram fornecidas. */
export function requireAdmin(reason = "E2E_ADMIN_EMAIL/PASSWORD não configurados") {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    reason,
  );
}
