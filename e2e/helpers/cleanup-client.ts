/**
 * Cliente da edge function `e2e-cleanup` reutilizável.
 *
 * Usado pelo globalSetup (limpa ANTES da suite), globalTeardown (limpa
 * DEPOIS) e pela fixture `cleanup-on-failure` (limpa por teste falho).
 *
 * Skip silencioso quando faltam VITE_SUPABASE_URL ou E2E_CLEANUP_TOKEN.
 * Em CI loga warning amarelo; localmente loga em dim para não poluir.
 *
 * Variáveis de ambiente lidas:
 *   - VITE_SUPABASE_URL | SUPABASE_URL
 *   - E2E_CLEANUP_TOKEN
 *   - E2E_USER_EMAIL
 *   - E2E_ADMIN_EMAIL  (opcional)
 *   - E2E_CLEANUP_DRY_RUN ("1" para apenas contar)
 */
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export type CleanupResponse = {
  ok: boolean;
  dryRun: boolean;
  userId?: string;
  email?: string;
  deleted?: Record<string, number>;
  errors?: Record<string, string>;
  totalMs?: number;
  error?: string;
};

export interface CleanupConfig {
  baseUrl: string;
  token: string;
  userEmail?: string;
  adminEmail?: string;
  dryRun: boolean;
  /** "explicit" exige que sellerId resolvido bata com o user_id resolvido por email. */
  sellerScope?: "self" | "explicit";
  /** Quando sellerScope === "explicit", deve bater com o user_id real do email. */
  sellerId?: string;
  /**
   * Quando definido, restringe DELETEs a recursos cujo nome começa com este
   * prefixo (ex.: "[E2E]"). Por padrão usa `getTestPrefix()` para evitar
   * apagar dados criados manualmente fora do escopo dos testes.
   * Para purga total (sem filtro), defina E2E_CLEANUP_NO_NAME_FILTER=1.
   */
  nameFilterPrefix?: string | null;
}

export function loadCleanupConfig(): CleanupConfig | null {
  const baseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const token = process.env.E2E_CLEANUP_TOKEN || "";
  const userEmail = process.env.E2E_USER_EMAIL || "";
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "";
  const dryRun = process.env.E2E_CLEANUP_DRY_RUN === "1";
  const sellerScope: "self" | "explicit" =
    process.env.E2E_CLEANUP_SELLER_SCOPE === "explicit" ? "explicit" : "self";
  const sellerId = process.env.E2E_CLEANUP_SELLER_ID || undefined;

  // Filtro por prefixo de nome — ATIVO POR PADRÃO. Use o mesmo prefixo
  // usado por `e2eName(label)` para garantir paridade.
  const noNameFilter = process.env.E2E_CLEANUP_NO_NAME_FILTER === "1";
  const explicitPrefix = process.env.E2E_TEST_PREFIX?.trim();
  const nameFilterPrefix = noNameFilter
    ? null
    : explicitPrefix && explicitPrefix.length > 0
      ? explicitPrefix
      : "[E2E]"; // fallback alinhado ao DEFAULT_PREFIX de test-user.ts

  if (!baseUrl || !token) return null;
  if (!userEmail && !adminEmail) return null;

  return {
    baseUrl,
    token,
    userEmail,
    adminEmail,
    dryRun,
    sellerScope,
    sellerId,
    nameFilterPrefix,
  };
}

export async function purgeOne(
  cfg: CleanupConfig,
  email: string,
  opts: { quiet?: boolean; reason?: string } = {},
): Promise<CleanupResponse | null> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/functions/v1/e2e-cleanup`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-e2e-cleanup-token": cfg.token,
      },
      body: JSON.stringify({
        email,
        dryRun: cfg.dryRun,
        sellerScope: cfg.sellerScope ?? "self",
        ...(cfg.sellerId ? { sellerId: cfg.sellerId } : {}),
      }),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => ({}))) as CleanupResponse;

    if (!res.ok || !json.ok) {
      console.warn(
        `${YELLOW}[e2e-cleanup] falha para ${email}: HTTP ${res.status} ${json.error ?? ""}${RESET}`,
      );
      return json;
    }

    if (!opts.quiet) {
      const deleted = json.deleted ?? {};
      const total = Object.values(deleted).reduce((a, b) => a + b, 0);
      const tag = json.dryRun ? "DRY-RUN" : "DELETED";
      const reason = opts.reason ? ` ${DIM}[${opts.reason}]${RESET}` : "";
      console.log(
        `${GREEN}[e2e-cleanup] ${tag} ${total} linha(s) para ${email}${RESET}${reason} ${DIM}(${json.totalMs ?? 0}ms)${RESET}`,
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
    }
    return json;
  } catch (err) {
    console.warn(
      `${RED}[e2e-cleanup] erro de rede ao limpar ${email}: ${String(err)}${RESET}`,
    );
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Purga TODOS os usuários configurados (user + admin se distintos).
 */
export async function purgeAll(
  cfg: CleanupConfig,
  opts: { quiet?: boolean; reason?: string } = {},
): Promise<void> {
  const seen = new Set<string>();
  if (cfg.userEmail) {
    seen.add(cfg.userEmail.toLowerCase());
    await purgeOne(cfg, cfg.userEmail, opts);
  }
  if (cfg.adminEmail && !seen.has(cfg.adminEmail.toLowerCase())) {
    await purgeOne(cfg, cfg.adminEmail, opts);
  }
}

export function logSkipReason(phase: "setup" | "teardown"): void {
  const baseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const token = process.env.E2E_CLEANUP_TOKEN || "";
  const hasEmail = !!(process.env.E2E_USER_EMAIL || process.env.E2E_ADMIN_EMAIL);

  let msg = `[e2e-cleanup:${phase}] pulado — `;
  if (!baseUrl || !token) {
    msg += "VITE_SUPABASE_URL ou E2E_CLEANUP_TOKEN ausentes.";
  } else if (!hasEmail) {
    msg += "nenhum E2E_USER_EMAIL/E2E_ADMIN_EMAIL definido.";
  } else {
    msg += "configuração incompleta.";
  }
  if (process.env.CI) console.warn(`${YELLOW}${msg}${RESET}`);
  else console.log(`${DIM}${msg}${RESET}`);
}
