/**
 * Catálogo central de rotas do app — fonte única para a suíte smoke
 * `e2e/flows/20-all-features-smoke.spec.ts` e para gerar specs de rota
 * (`e2e/routes/app|admin|quotes|public/*.spec.ts`).
 *
 * IMPORTANTE: rotas dinâmicas usam tokens fixos (`SAMPLE_ID`/`SAMPLE_TOKEN`)
 * para que mocks possam interceptar de forma determinística.
 */

export const SAMPLE_ID = "00000000-0000-0000-0000-000000000001";
export const SAMPLE_TOKEN = "VALID_TOKEN";

export interface RouteEntry {
  /** Path final (já com IDs/tokens substituídos quando dinâmico). */
  path: string;
  /** Categoria — usada por playwright filter/tag. */
  area: "public" | "app" | "admin" | "quotes";
  /** Slug do `data-testid="page-title-<slug>"` quando disponível. */
  titleSlug?: string;
  /** Marca rotas que precisam de role admin. */
  requiresAdmin?: boolean;
  /** Marca rotas que requerem role dev. */
  requiresDev?: boolean;
}

/* ============================================================
 * Públicas (sem auth)
 * ============================================================ */
export const PUBLIC_ROUTES: RouteEntry[] = [
  { path: "/login", area: "public" },
  { path: "/reset-password", area: "public" },
  { path: `/approve/${SAMPLE_TOKEN}`, area: "public" },
  { path: `/proposta/${SAMPLE_TOKEN}`, area: "public" },
  { path: `/kit/${SAMPLE_TOKEN}`, area: "public" },
  { path: `/lista-publica/${SAMPLE_TOKEN}`, area: "public" },
  { path: `/colecao-publica/${SAMPLE_TOKEN}`, area: "public" },
  { path: `/comparar-publica/${SAMPLE_TOKEN}`, area: "public" },
  { path: `/dossie/${SAMPLE_TOKEN}`, area: "public" },
];

/* ============================================================
 * App autenticado (qualquer role)
 * ============================================================ */
export const APP_ROUTES: RouteEntry[] = [
  { path: "/", area: "app", titleSlug: "dashboard" },
  { path: "/dashboard", area: "app", titleSlug: "dashboard" },
  { path: "/produtos", area: "app", titleSlug: "produtos" },
  { path: "/filtros", area: "app", titleSlug: "produtos" },
  { path: `/produto/${SAMPLE_ID}`, area: "app" },
  { path: "/novidades", area: "app" },
  { path: "/reposicao", area: "app" },
  { path: "/favoritos", area: "app", titleSlug: "favoritos" },
  { path: "/carrinhos", area: "app", titleSlug: "carrinhos" },
  { path: "/comparar", area: "app", titleSlug: "comparador" },
  { path: "/colecoes", area: "app", titleSlug: "colecoes" },
  { path: `/colecoes/${SAMPLE_ID}`, area: "app" },
  { path: "/tendencias", area: "app", titleSlug: "tendencias" },
  { path: "/simulador", area: "app", titleSlug: "simulador" },
  { path: "/simulador-precos", area: "app", titleSlug: "simulador-precos" },
  { path: "/estoque", area: "app" },
  { path: "/busca-preco", area: "app", titleSlug: "busca-avancada-preco" },
  { path: "/montar-kit", area: "app" },
  { path: "/meus-kits", area: "app", titleSlug: "kits" },
  { path: "/mockup-generator", area: "app" },
  { path: "/mockups/historico", area: "app", titleSlug: "mockup-historico" },
  { path: "/magic-up", area: "app", titleSlug: "magic-up" },
  { path: "/inteligencia-comercial", area: "app", titleSlug: "inteligencia-mercado" },
  { path: "/ferramentas/bi", area: "app", titleSlug: "bi" },
  { path: "/ferramentas/bi/comparar", area: "app" },
  { path: "/match", area: "app", titleSlug: "match-produtos" },
  { path: "/dropbox", area: "app", titleSlug: "dropbox" },
];

/* ============================================================
 * Orçamentos (autenticado)
 * ============================================================ */
export const QUOTES_ROUTES: RouteEntry[] = [
  { path: "/orcamentos", area: "quotes", titleSlug: "orcamentos" },
  { path: "/orcamentos/dashboard", area: "quotes", titleSlug: "orcamentos-dashboard" },
  { path: "/orcamentos/lista", area: "quotes", titleSlug: "orcamentos" },
  { path: "/orcamentos/kanban", area: "quotes", titleSlug: "orcamentos-funil" },
  { path: "/orcamentos/templates", area: "quotes", titleSlug: "orcamentos-templates" },
  { path: "/orcamentos/novo", area: "quotes", titleSlug: "orcamento-novo" },
  { path: `/orcamentos/${SAMPLE_ID}`, area: "quotes" },
  { path: `/orcamentos/${SAMPLE_ID}/editar`, area: "quotes" },
];

/* ============================================================
 * Admin (requer role supervisor/dev)
 * ============================================================ */
export const ADMIN_ROUTES: RouteEntry[] = [
  { path: "/admin/usuarios", area: "admin", requiresAdmin: true },
  { path: "/admin/limites-desconto", area: "admin", requiresAdmin: true },
  { path: "/admin/cadastros", area: "admin", requiresAdmin: true },
  { path: "/admin/permissoes", area: "admin", requiresAdmin: true },
  { path: "/admin/roles", area: "admin", requiresAdmin: true },
  { path: "/admin/role-permissoes", area: "admin", requiresAdmin: true },
  { path: "/admin/temas", area: "admin", requiresAdmin: true },
  { path: "/admin/video-variantes", area: "admin", requiresAdmin: true },
  { path: "/admin/kit-templates", area: "admin", requiresAdmin: true },
  { path: "/admin/conexoes", area: "admin", requiresAdmin: true },
  { path: "/admin/seguranca", area: "admin", requiresDev: true },
  { path: "/admin/seguranca/chaves", area: "admin", requiresDev: true },
  { path: "/admin/seguranca/migracao-papeis", area: "admin", requiresDev: true },
  { path: "/admin/prompts-ia", area: "admin", requiresDev: true },
  { path: "/admin/validade-precos", area: "admin", requiresDev: true },
  { path: "/admin/telemetria", area: "admin", requiresDev: true },
  { path: "/admin/rate-limit", area: "admin", requiresDev: true },
  { path: "/admin/workflows", area: "admin", requiresDev: true },
  { path: "/admin/login-attempts", area: "admin", requiresDev: true },
  { path: "/admin/consumo-ia", area: "admin", requiresDev: true },
  { path: "/admin/rls-denials", area: "admin", requiresDev: true },
  { path: "/admin/auditoria-propriedade", area: "admin", requiresDev: true },
  { path: "/admin/rbac-rotas", area: "admin", requiresDev: true },
  { path: "/status", area: "admin", requiresDev: true },
];

/* ============================================================
 * União (para iteração no smoke aggregator)
 * ============================================================ */
export const ALL_ROUTES: RouteEntry[] = [
  ...PUBLIC_ROUTES,
  ...APP_ROUTES,
  ...QUOTES_ROUTES,
  ...ADMIN_ROUTES,
];

/** Rotas autenticadas que NÃO exigem admin/dev (rodam com user comum). */
export const AUTHED_USER_ROUTES: RouteEntry[] = [...APP_ROUTES, ...QUOTES_ROUTES];
