# Reestruturação de Níveis de Acesso (3 Roles)

## Modelo final

| Role | Quem é | Acesso |
|------|--------|--------|
| **vendedor** | Usuário padrão (default no signup) | Catálogo, orçamentos, CRM, pedidos, favoritos, comparador, kits |
| **supervisor** | Gestor comercial | Tudo do vendedor + aprovação de descontos, gestão de orçamentos/pedidos de toda a equipe, gestão de vendedores, cadastros (produtos/clientes/fornecedores), relatórios/BI |
| **dev** | Acesso técnico (só você no início) | Tudo do supervisor + Conexões externas, Secrets, MCP (chaves + grantors), Edge functions, Telemetria, Hardening, Auditoria completa, Bot/IP control, Feature flags, Skins factory |

---

## Etapa 1 — Banco de dados (migration)

1. Adicionar `'supervisor'` e `'dev'` ao enum `app_role` (manter `'admin'` e `'vendedor'` temporariamente para compatibilidade).
2. Migrar dados:
   - Todos os `user_roles` com `role='admin'` → `'supervisor'`.
   - Inserir `('dev')` para o usuário que você indicar (e-mail).
   - O usuário `dev` recebe **também** `supervisor` e `vendedor` (acesso cumulativo).
3. Atualizar funções security-definer:
   - `has_role` mantém assinatura.
   - Criar `is_dev()` e `is_supervisor_or_above()` (dev OU supervisor).
   - `is_admin()` vira alias de `is_supervisor_or_above()` para não quebrar policies legadas durante a transição.
4. Ajustar a função `handle_new_user` (default continua `'vendedor'`).
5. Atualizar `mcp_full_grantors` / `can_grant_mcp_full` para exigir role `dev` (não mais qualquer admin).
6. Adicionar policies novas só onde a separação muda comportamento (telemetria, conexões, MCP, hardening, audit log → `is_dev()`).
7. **Não** remover `'admin'` do enum nesta fase — fica deprecated mas funcional.

## Etapa 2 — Frontend

1. **`useRBAC.tsx`**: adicionar `'supervisor'` e `'dev'` no `RoleName`, mapear `admin → supervisor` na leitura, expor `isDev`, `isSupervisor`, `isSupervisorOrAbove`.
2. **`AuthContext`**: ler todas as roles do usuário (não só uma) e expor a "maior" + array completo.
3. **`ProtectedRoute`**: aceitar prop `requiredRole: 'dev' | 'supervisor' | 'vendedor'` com hierarquia.
4. **Sidebar (`SidebarReorganized` + `SidebarNavGroup`)**: ocultar entradas técnicas para quem não é `dev`:
   - Conexões, Segurança/Acesso, MCP, Telemetria, Rate Limit, Hardening, Edge Functions Logs, Skins Factory, Feature Flags, Auditoria.
5. **Páginas/rotas técnicas em `App.tsx`**: marcar com `requiredRole="dev"`:
   - `/admin/conexoes`, `/admin/seguranca-acesso`, `/admin/telemetria`, `/admin/rate-limit`, `/admin/hardening`, `/admin/auditoria`, `/admin/mcp`, `/admin/feature-flags`.
6. **Páginas de gestão de negócio** continuam com `requiredRole="supervisor"`:
   - Aprovação de descontos, gestão de usuários (vendedores), cadastros, BI/relatórios.
7. **Notificações/Informativos técnicos** (telemetria 503, cold start, falhas de webhook, erros de edge function) — filtrar no `notificationService` para enviar só a quem tem role `dev`.
8. **Página de gestão de usuários** (`AdminUsuariosPage`): permitir promover/rebaixar entre `vendedor` ↔ `supervisor`. Promover para `dev` só visível e permitido se o ator já for `dev`.

## Etapa 3 — Edge functions

- `mcp-keys-issue`, `mcp-keys-rotate`, `mcp-keys-update`, `mcp-keys-revoke`, `mcp-server`: trocar verificação de `'admin'` por `is_dev()`.
- Demais edge functions de negócio (orçamentos, descontos, CRM bridge): continuam aceitando `supervisor` (via `is_supervisor_or_above()`).

## Etapa 4 — UI cosmética

- Renomear todos os textos visíveis de "Administrador" / "Admin" para "Supervisor" (badges, perfis, listagens).
- Adicionar badge "Dev" (cor distinta, ícone de código) só para quem tem o role.

---

## Detalhes técnicos

**Compatibilidade durante a transição**: as policies SQL continuam funcionando porque `is_admin()` vira alias de `is_supervisor_or_above()`. Nenhuma quebra imediata; podemos remover `'admin'` do enum em uma migration posterior, depois de auditar todas as referências.

**Hierarquia no frontend**:
```text
dev > supervisor > vendedor
```
`hasRoleOrAbove('supervisor')` retorna true para `dev` e `supervisor`.

**Fluxo de notificações técnicas**:
```text
trigger técnico → notify_dev_only(category='technical')
                → INSERT workspace_notifications WHERE user_id IN (SELECT user_id FROM user_roles WHERE role='dev')
```

**Risco principal**: tabelas com policies antigas referenciando `'admin'::app_role` literal (centenas). Mitigação: manter `is_admin()` como alias e enum legado intacto. Migração agressiva (renomear no banco) fica para uma segunda onda.

---

## O que preciso de você antes de implementar

- **E-mail do usuário** que deve receber o role `dev` na migration inicial.
