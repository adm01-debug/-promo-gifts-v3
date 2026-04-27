/**
 * Manifest SSOT — Authorization requirements per Edge Function
 * --------------------------------------------------------------
 * Cada edge function deployada deve aparecer aqui com sua categoria
 * de autorização. Este manifest é a fonte de verdade consumida pelo
 * gate de CI (`scripts/check-edge-authorization.mjs`) e pelos testes
 * de bypass (`tests/security/edge-authz-bypass.test.ts`).
 *
 * Categorias:
 *   - "public":          chamável sem autenticação (rotas públicas por token,
 *                        webhooks com assinatura, health, image-proxy etc.).
 *   - "authenticated":   exige JWT válido, qualquer role (incl. agente).
 *   - "supervisor":      exige role >= supervisor (admin/dev).
 *   - "dev":             exige role dev.
 *   - "service":         só pode ser chamada server-to-server (cron / outra edge),
 *                        verify_jwt true + tipicamente service_role no caller.
 *   - "scoped":          autenticação custom (token/HMAC/scope MCP) — validada
 *                        in-function com lógica própria.
 *
 * Política: TODA edge nova precisa ser adicionada aqui no mesmo PR
 * que cria a função. O gate CI falha se houver função em
 * `supabase/functions/<name>/index.ts` ausente do manifest.
 */
export type AuthzCategory =
  | "public"
  | "authenticated"
  | "supervisor"
  | "dev"
  | "service"
  | "scoped";

export interface AuthzEntry {
  /** Categoria principal */
  category: AuthzCategory;
  /** Comentário curto explicando a decisão */
  rationale: string;
  /**
   * Mecanismo de enforcement. Default = "shared-authorize" (helper SSOT).
   * "custom" = implementação própria legítima (validação inline de
   * has_role, scope MCP, HMAC, etc.) — exige rationale claro.
   */
  enforcedBy?: "shared-authorize" | "custom";
  /** Se true, o teste de bypass anon é dispensado */
  skipAnonBypassTest?: boolean;
  /** Se true, o teste de bypass authenticated é dispensado */
  skipAuthBypassTest?: boolean;
}

export const EDGE_AUTHZ_MANIFEST: Record<string, AuthzEntry> = {
  // ---------------- Públicas por design ----------------
  "kit-public-view": { category: "public", rationale: "Visualização de kit por token público" },
  "quote-public-view": { category: "public", rationale: "Aprovação de orçamento por token" },
  "favorites-public-react": { category: "public", rationale: "Reactions anônimas em lista pública" },
  "comparisons-public-react": { category: "public", rationale: "Reactions em comparação pública" },
  "collections-public-react": { category: "public", rationale: "Reactions em coleção pública" },
  "image-proxy": { category: "public", rationale: "Proxy de imagens (anti-hotlink CDN externos)" },
  "cnpj-lookup": { category: "public", rationale: "Lookup CNPJ via API pública" },
  "health-check": { category: "public", rationale: "Health endpoint para uptime monitors" },
  "get-visitor-info": { category: "public", rationale: "Geo/IP do visitante para anti-fraude" },
  "verify-email": { category: "public", rationale: "Verificação de email no signup público" },
  "log-login-attempt": { category: "public", rationale: "Telemetria de login (anti-bruteforce)" },
  "rate-limit-check": { category: "public", rationale: "Rate-limit consult anonymous" },
  "commemorative-dates": { category: "public", rationale: "Calendário público" },
  "categories-api": { category: "public", rationale: "Catálogo de categorias público" },
  "materials-api": { category: "public", rationale: "Catálogo de materiais público" },
  "analyze-logo-colors": { category: "public", rationale: "Extração de cores via foto pública" },
  "visual-search": { category: "public", rationale: "Busca por imagem (anônima)" },
  "semantic-search": { category: "public", rationale: "Busca semântica (anônima)" },
  "detect-new-device": { category: "public", rationale: "Anti-fraude pré-login" },
  "bi-share-dossier": { category: "public", rationale: "Dossiê compartilhado por token" },
  "dropbox-list": { category: "public", rationale: "Listagem pública de arquivos curados" },

  // ---------------- Webhooks (assinatura própria) ----------------
  "webhook-inbound": { category: "scoped", rationale: "HMAC-SHA256 inline" },
  "webhook-dispatcher": { category: "scoped", rationale: "Disparo via service-role / cron" },
  "product-webhook": { category: "scoped", rationale: "Token shared-secret no header" },

  // ---------------- Cron / service-to-service ----------------
  "cleanup-notifications": { category: "service", rationale: "pg_cron diário" },
  "cleanup-novelties": { category: "service", rationale: "pg_cron diário" },
  "collections-watcher": { category: "service", rationale: "pg_cron — price drop watcher" },
  "favorites-watcher": { category: "service", rationale: "pg_cron — price drop watcher" },
  "comparison-price-watcher": { category: "service", rationale: "pg_cron — price drop watcher" },
  "process-queue": { category: "service", rationale: "pg_cron — fila de jobs" },
  "process-scheduled-reports": { category: "service", rationale: "pg_cron — relatórios" },
  "send-scheduled-reports": { category: "service", rationale: "pg_cron — envio batch" },
  "send-digest": { category: "service", rationale: "pg_cron — digest semanal" },
  "quote-followup-reminders": { category: "service", rationale: "pg_cron — followup orçamentos" },
  "send-notification": { category: "service", rationale: "Disparo interno entre edges" },
  "connections-health-check": { category: "service", rationale: "pg_cron — health connections" },
  "connections-auto-test": { category: "service", rationale: "pg_cron — auto-test connections" },
  "connections-hub-audit": { category: "service", rationale: "pg_cron diário — auditoria" },
  "ownership-audit": { category: "service", rationale: "pg_cron diário — auditoria órfãos" },

  // ---------------- Authenticated (qualquer user logado) ----------------
  "ai-recommendations": { category: "authenticated", rationale: "Recomendações IA do user logado" },
  "elevenlabs-scribe-token": { category: "authenticated", rationale: "Token TTS do user" },
  "elevenlabs-tts": { category: "authenticated", rationale: "TTS do user" },
  "expert-chat": { category: "authenticated", rationale: "Chat IA do user" },
  "external-db-bridge": { category: "authenticated", rationale: "Bridge para BD externo (RBAC interno)" },
  "generate-ad-image": { category: "authenticated", rationale: "Magic Up Ads do user" },
  "generate-ad-prompt": { category: "authenticated", rationale: "Magic Up Ads do user" },
  "generate-mockup": { category: "authenticated", rationale: "Mockup IA do user" },
  "generate-mockup-nanobanana": { category: "authenticated", rationale: "Mockup IA do user" },
  "generate-product-seo": { category: "authenticated", rationale: "SEO de produto do user" },
  "kit-ai-builder": { category: "authenticated", rationale: "Kit IA do user" },
  "kit-identity-suggest": { category: "authenticated", rationale: "Sugestão visual do user" },
  "magic-up-score": { category: "authenticated", rationale: "Scoring criativo do user" },
  "voice-agent": { category: "authenticated", rationale: "Voice agent do user" },
  "quote-sync": { category: "authenticated", rationale: "Sync do orçamento do próprio vendedor" },
  "sync-quote-bitrix": { category: "authenticated", rationale: "Sync do orçamento do vendedor" },
  "trends-insights": { category: "authenticated", rationale: "Insights do BI" },
  "comparison-ai-advisor": { category: "authenticated", rationale: "Conselheiro IA na comparação" },
  "market-intelligence-insights": { category: "authenticated", rationale: "BI insights" },
  "bi-copilot": { category: "authenticated", rationale: "BI copilot" },
  "send-transactional-email": { category: "authenticated", rationale: "Envio de e-mail trans (user logado)" },
  "step-up-verify": { category: "authenticated", rationale: "MFA step-up — quem está fazendo" },
  "validate-access": { category: "authenticated", rationale: "Validação de acesso pós-login" },
  "force-global-logout": { category: "authenticated", rationale: "Logout global do próprio user" },

  // ---------------- Supervisor (admin) ----------------
  "bitrix-sync": { category: "supervisor", rationale: "Sync no CRM externo — admin/dev" },
  "manage-users": { category: "supervisor", rationale: "Gestão de usuários — admin/dev" },
  "block-ip-temporarily": { category: "supervisor", rationale: "Bloqueio de IP — admin/dev" },
  "ownership-repair": { category: "supervisor", rationale: "Reparo de órfãos — admin (com dry-run)" },

  // ---------------- Dev-only ----------------
  "secrets-manager": { category: "dev", rationale: "Leitura/edição de secrets — dev only" },
  "connection-tester": { category: "dev", rationale: "Teste de credenciais externas — dev only" },
  "github-credentials-test": { category: "dev", rationale: "Teste de PAT GitHub — dev only" },
  "github-fix-config": { category: "dev", rationale: "Escreve no repo via PAT — dev only" },
  "external-db-inspect": { category: "dev", rationale: "Introspecção do BD externo — dev" },
  "rls-audit": { category: "dev", rationale: "Auditoria RLS — dev only" },
  "rls-integration-tests": { category: "dev", rationale: "Testes RLS — dev only" },
  "rls-matrix-export": { category: "dev", rationale: "Export matriz RLS — dev only" },
  "tests": { category: "dev", rationale: "Suite interna de testes — dev only" },
  "e2e-cleanup": { category: "dev", rationale: "Cleanup E2E — dev/CI only" },
  "full-op-diagnostics": { category: "dev", rationale: "Diagnóstico introspecção — dev" },
  "mcp-keys-issue": { category: "dev", rationale: "Emissão de chave MCP — dev" },
  "mcp-keys-revoke": { category: "dev", rationale: "Revogação de chave MCP — dev" },
  "mcp-keys-rotate": { category: "dev", rationale: "Rotação de chave MCP — dev" },
  "mcp-keys-update": { category: "dev", rationale: "Atualização de chave MCP — dev" },

  // ---------------- Scoped (auth custom) ----------------
  "mcp-server": { category: "scoped", rationale: "Token MCP com escopos read/write/admin" },
  "crm-db-bridge": { category: "scoped", rationale: "JWT + RBAC custom interno" },
};
