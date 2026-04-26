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

type Fixtures = {
  evidence: EvidenceCollector;
};

export const test = base.extend<Fixtures>({
  evidence: async ({ page }, use, testInfo) => {
    const collector = attachConsoleCapture(page);
    await use(collector);
    if (testInfo.status !== testInfo.expectedStatus) {
      await collector.attachAll(page, testInfo);
    }
  },
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
