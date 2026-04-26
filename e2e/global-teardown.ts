/**
 * Global teardown — roda UMA vez após toda a suite Playwright.
 *
 * Chama a edge function `e2e-cleanup` para apagar dados de aplicação
 * criados pelos usuários de teste (E2E_USER_EMAIL e, se houver, E2E_ADMIN_EMAIL).
 *
 * Skip silencioso quando faltam variáveis — devs locais sem token não quebram.
 * Em CI, loga warning amarelo se faltar token.
 *
 * Variáveis lidas:
 *   - VITE_SUPABASE_URL  (ou SUPABASE_URL)
 *   - E2E_CLEANUP_TOKEN  (segredo compartilhado)
 *   - E2E_USER_EMAIL     (alvo principal)
 *   - E2E_ADMIN_EMAIL    (opcional)
 *   - E2E_CLEANUP_DRY_RUN ("1" para apenas contar)
 */
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

type CleanupResponse = {
  ok: boolean;
  dryRun: boolean;
  userId?: string;
  email?: string;
  deleted?: Record<string, number>;
  errors?: Record<string, string>;
  totalMs?: number;
  error?: string;
};

async function purge(
  baseUrl: string,
  token: string,
  email: string,
  dryRun: boolean,
): Promise<void> {
  const url = `${baseUrl.replace(/\/$/, "")}/functions/v1/e2e-cleanup`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-e2e-cleanup-token": token,
      },
      body: JSON.stringify({ email, dryRun }),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => ({}))) as CleanupResponse;

    if (!res.ok || !json.ok) {
      console.warn(
        `${YELLOW}[e2e-cleanup] falha para ${email}: HTTP ${res.status} ${json.error ?? ""}${RESET}`,
      );
      return;
    }

    const deleted = json.deleted ?? {};
    const total = Object.values(deleted).reduce((a, b) => a + b, 0);
    const tag = json.dryRun ? "DRY-RUN" : "DELETED";
    console.log(
      `${GREEN}[e2e-cleanup] ${tag} ${total} linha(s) para ${email}${RESET} ${DIM}(${json.totalMs ?? 0}ms)${RESET}`,
    );
    const rows = Object.entries(deleted)
      .filter(([, n]) => n > 0)
      .map(([t, n]) => `  · ${t.padEnd(32)} ${n}`)
      .join("\n");
    if (rows) console.log(rows);
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.warn(
        `${YELLOW}[e2e-cleanup] avisos:${RESET}\n${Object.entries(json.errors)
          .map(([t, e]) => `  · ${t}: ${e}`)
          .join("\n")}`,
      );
    }
  } catch (err) {
    console.warn(
      `${RED}[e2e-cleanup] erro de rede ao limpar ${email}: ${String(err)}${RESET}`,
    );
  } finally {
    clearTimeout(t);
  }
}

export default async function globalTeardown(): Promise<void> {
  const baseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const token = process.env.E2E_CLEANUP_TOKEN || "";
  const userEmail = process.env.E2E_USER_EMAIL || "";
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "";
  const dryRun = process.env.E2E_CLEANUP_DRY_RUN === "1";

  if (!baseUrl || !token) {
    const msg =
      "[e2e-cleanup] pulado — VITE_SUPABASE_URL ou E2E_CLEANUP_TOKEN ausentes.";
    if (process.env.CI) console.warn(`${YELLOW}${msg}${RESET}`);
    else console.log(`${DIM}${msg}${RESET}`);
    return;
  }
  if (!userEmail && !adminEmail) {
    console.log(
      `${DIM}[e2e-cleanup] pulado — nenhum E2E_USER_EMAIL/E2E_ADMIN_EMAIL definido.${RESET}`,
    );
    return;
  }

  if (userEmail) await purge(baseUrl, token, userEmail, dryRun);
  if (adminEmail && adminEmail.toLowerCase() !== userEmail.toLowerCase()) {
    await purge(baseUrl, token, adminEmail, dryRun);
  }
}
