/**
 * Auth setup — roda UMA vez antes dos projects autenticados.
 * Usa o helper SSOT `loginViaUI` (e2e/helpers/auth.ts) — sem seletores duplicados.
 */
import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { loginViaUI } from "../helpers/auth";

const AUTH_DIR = path.resolve(__dirname, "../.auth");

async function authenticate(page: any, email?: string, password?: string, storagePath: string) {
  if (!email || !password) {
    fs.writeFileSync(
      storagePath,
      JSON.stringify({ cookies: [], origins: [] }, null, 2),
      "utf-8",
    );
    return false;
  }

  await loginViaUI(page, { email, password });
  await page.context().storageState({ path: storagePath });
  return true;
}

setup("authenticate agente", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await authenticate(
    page,
    process.env.E2E_USER_EMAIL,
    process.env.E2E_USER_PASSWORD,
    path.join(AUTH_DIR, "agente.json")
  );
});

setup("authenticate supervisor", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await authenticate(
    page,
    process.env.E2E_SUPERVISOR_EMAIL,
    process.env.E2E_USER_PASSWORD,
    path.join(AUTH_DIR, "supervisor.json")
  );
});

setup("authenticate dev", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await authenticate(
    page,
    process.env.E2E_ADMIN_EMAIL,
    process.env.E2E_USER_PASSWORD,
    path.join(AUTH_DIR, "dev.json")
  );
});
