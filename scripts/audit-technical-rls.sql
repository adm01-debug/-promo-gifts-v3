-- ============================================================================
-- Auditoria de RLS — tabelas técnicas
-- ============================================================================
-- Objetivo: garantir que TODAS as políticas das tabelas marcadas como
-- "técnicas" (telemetria, segurança, logs, hub de conexões) usem
-- `is_dev(auth.uid())` e NÃO escalem privilégio via:
--   - alias `is_admin(auth.uid())` (admin legado / supervisor)
--   - role check direto: `role = 'admin'` / `'supervisor'`
--   - cláusulas permissivas: `USING (true)` sem outro gate
--
-- Como rodar:
--   psql -f scripts/audit-technical-rls.sql
--   # ou: supabase--read_query passando o último SELECT
--
-- Saída: 4 relatórios independentes
--   1. Tabelas técnicas SEM RLS habilitada           (deve estar vazio)
--   2. Policies sem referência a is_dev              (cada uma justificada)
--   3. Policies que usam is_admin / 'admin' / 'supervisor' como gate  (deve estar vazio)
--   4. Resumo agregado por tabela (total/dev/admin/permissivas)
-- ============================================================================

-- SSOT — tabelas técnicas (espelha src/lib/navigation/restricted-routes.ts)
WITH technical_tables(table_name, domain) AS (
  VALUES
    -- Telemetria
    ('query_telemetry',         'telemetria'),
    ('external_db_telemetry',   'telemetria'),
    ('optimization_queue',      'telemetria'),
    -- Segurança
    ('bot_detection_log',       'seguranca'),
    ('ip_access_control',       'seguranca'),
    ('request_rate_limits',     'seguranca'),
    ('login_attempts',          'seguranca'),
    ('admin_audit_log',         'seguranca'),
    ('mcp_violations',          'seguranca'),
    -- MCP / Conexões / credenciais
    ('mcp_api_keys',            'mcp'),
    ('integration_credentials', 'conexoes'),
    ('secret_rotation_log',     'conexoes'),
    ('external_connections',    'conexoes'),
    ('outbound_webhooks',       'conexoes'),
    ('inbound_webhook_endpoints','conexoes'),
    ('webhook_deliveries',      'conexoes'),
    ('inbound_webhook_events',  'conexoes')
),
all_policies AS (
  SELECT
    n.nspname              AS schema_name,
    c.relname              AS table_name,
    c.relrowsecurity       AS rls_enabled,
    pol.polname            AS policy_name,
    pol.polcmd             AS cmd,
    pg_get_expr(pol.polqual, pol.polrelid)      AS using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expr
  FROM pg_policy pol
  JOIN pg_class c     ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
),
joined AS (
  SELECT
    t.domain,
    t.table_name,
    p.policy_name,
    p.cmd,
    p.using_expr,
    p.check_expr,
    COALESCE(p.using_expr, '') || ' ' || COALESCE(p.check_expr, '') AS combined_expr
  FROM technical_tables t
  LEFT JOIN all_policies p ON p.table_name = t.table_name
),
classified AS (
  SELECT
    j.*,
    -- usa is_dev em algum lugar (USING ou WITH CHECK)
    (combined_expr ~* '\bis_dev\s*\(') AS uses_is_dev,
    -- usa is_admin diretamente (alias legado / supervisor)
    (combined_expr ~* '\bis_admin\s*\(') AS uses_is_admin,
    -- compara role com 'admin' ou 'supervisor' (escalação por papel)
    (combined_expr ~* $$role\s*=\s*'(admin|supervisor)'$$
       OR combined_expr ~* $$'(admin|supervisor)'\s*=\s*role$$) AS uses_admin_role_string,
    -- cláusula completamente permissiva
    (TRIM(COALESCE(using_expr, ''))   IN ('true', 'TRUE')
     OR TRIM(COALESCE(check_expr, '')) IN ('true', 'TRUE')) AS has_permissive_clause
  FROM joined j
  WHERE policy_name IS NOT NULL
)

-- ────────────────────────────────────────────────────────────────────────────
-- RELATÓRIO 1 — Tabelas técnicas SEM RLS habilitada
-- ────────────────────────────────────────────────────────────────────────────
SELECT
  '1_tables_without_rls' AS report,
  t.domain,
  t.table_name,
  CASE
    WHEN c.relname IS NULL THEN 'TABLE_NOT_FOUND'
    WHEN c.relrowsecurity THEN 'rls_enabled'
    ELSE 'RLS_DISABLED'
  END AS status
FROM technical_tables t
LEFT JOIN pg_class c     ON c.relname = t.table_name
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.relname IS NULL OR NOT c.relrowsecurity
ORDER BY t.domain, t.table_name;
