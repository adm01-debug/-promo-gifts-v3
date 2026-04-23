

# Make `/admin/conexoes` truly functional

## Problem (what's fake today)

Looking at the screenshot: cards show "Não configurado" with "Configurar" buttons that **open a field but don't actually save anything**. The current flow:

1. Admin types a value → `secrets-manager` edge function only writes an audit log entry and returns "use the Lovable Secrets panel manually".
2. "Testar conexão" sends empty `{ url: "", key: "" }` so it always fails.
3. Status badges, "Ver schema", "Histórico" links work, but the core CRUD loop is broken.

Root cause: edge functions can't mutate platform env vars at runtime. We need a real persistence layer.

## Solution: persist credentials in the database, fall back to env

Move from "secrets in `Deno.env`" to a **`integration_credentials` table** that is the source of truth. Env vars stay as a fallback for the few legacy values already provisioned. Every edge function that consumed `Deno.env.get("EXTERNAL_*")` etc. now reads via a single helper that checks the DB first.

### 1. New table `integration_credentials` (admin-only RLS)

```text
id uuid pk
secret_name text unique           -- e.g. EXTERNAL_PROMOBRIND_URL
secret_value text not null        -- encrypted via pgsodium (or pgcrypto symmetric)
masked_suffix text                -- last 4 chars for UI confirmation
length int
updated_by uuid → auth.users
updated_at timestamptz
notes text
```

- RLS: only `admin` role can `select`/`insert`/`update`/`delete` (via `has_role()`).
- Trigger fills `masked_suffix`/`length` from `secret_value` on insert/update so the UI never has to fetch the cleartext.
- Encryption: use `pgsodium`'s transparent column encryption keyed by a secret managed in Vault. This way even a leaked dump doesn't expose credentials.

### 2. Rewrite `secrets-manager` edge function to actually persist

- `action: "set"` → `upsert` into `integration_credentials` (admin-only, whitelist enforced). Returns `{ ok:true, stored:true, masked_suffix }`.
- `action: "rotate"` → upsert + insert into existing `secret_rotation_log`.
- `action: "list"` → `select secret_name, masked_suffix, length, updated_at` (no plaintext) merged with env-var presence so legacy secrets still appear configured.
- `action: "delete"` → row delete + audit log entry.
- Audit log entries already in place are kept.

### 3. New helper `_shared/credentials.ts` for runtime reads

A single `getCredential(name, serviceClient)` used by `connection-tester`, `external-db-bridge`, `crm-db-bridge`, `bitrix-sync`, `webhook-dispatcher`, `mcp-server`:

```text
1. Try integration_credentials.select where secret_name = name (service role)
2. Fallback to Deno.env.get(name)
3. Cache in-memory per cold start (60s TTL) to avoid hot-path DB hits
```

This makes the database the canonical source while keeping zero-downtime migration for already-set env vars.

### 4. Make `connection-tester` use real entered values

`SupabaseConnectionsTab.tsx`: the "Testar conexão" button currently sends empty strings. Change to send no `config` (let the function read from `integration_credentials` for that environment) and pass an `env_key: "promobrind" | "crm"` so the tester knows which `EXTERNAL_<KEY>_URL`/`SERVICE_ROLE_KEY` pair to load. Same fix for Bitrix/n8n tabs (they already mostly work because they send `connection_id`, but verify the flow end-to-end).

### 5. UI polish on `SupabaseConnectionsTab`

- Show the masked suffix + last-updated timestamp from the DB (already supported by `SecretField`; just feed it real data).
- After save, optimistic refresh of the secret list.
- "Testar conexão" disabled until URL + service key both have a value.
- Add a per-card "Última verificação" line driven by `external_connections.last_test_at` so the user sees the test outcome persist.

### 6. Migration & backfill

- New migration creates `integration_credentials` with RLS, the trigger, and pgsodium key.
- For each currently-set env var in the whitelist, insert a row at migration time using a `DO` block reading from `current_setting('app.bootstrap_*')` — but since we can't read `Deno.env` from SQL, we instead leave env-fallback in place and let the admin re-save through the UI to upgrade. This is safe and zero-downtime.

### 7. Audit checklist updated

`connections-hub-audit` adds `integration_credentials` to `REQUIRED_TABLES` so the score reflects the new infra.

## What the user will see

- Click "Configurar" → paste value → "Salvar" → toast "Credencial salva" → field immediately shows `••••XXXX (NN chars) ✓`.
- Status badge flips to "Ativo" once URL + service key are both present.
- "Testar conexão" pings the actual external Supabase, returns latency + status.
- "Rotacionar" stores the new value and writes a row in `secret_rotation_log` (already wired, now backed by real persistence).
- Health card metrics ("Conexões com falha", "Webhooks ativos") become meaningful because the underlying connection records get real ping results.

## Files touched

**Backend**
- New SQL migration: `integration_credentials` table + RLS + trigger + pgsodium setup.
- New `supabase/functions/_shared/credentials.ts` helper.
- Rewrite `supabase/functions/secrets-manager/index.ts` (set/rotate/list/delete now persist).
- Update `supabase/functions/connection-tester/index.ts` to load via helper + accept `env_key`.
- Update `supabase/functions/connections-hub-audit/index.ts` to include the new table.
- Patch `external-db-bridge`, `crm-db-bridge`, `bitrix-sync`, `webhook-dispatcher`, `mcp-server` to use `getCredential()` instead of raw `Deno.env.get()` for the whitelisted names.

**Frontend**
- `src/components/admin/connections/SupabaseConnectionsTab.tsx`: pass `env_key` to tester, disable button until configured, show last-test info.
- `src/hooks/useSecretsManager.ts`: surface `updated_at` in `SecretStatus`.
- `src/components/admin/connections/SecretField.tsx`: show "atualizado há Xm" when present.

## Out of scope (callouts)

- Not adding a UI to manage the pgsodium master key — that stays in Vault.
- Not removing legacy env-var fallback in this pass; we keep it for safety. A follow-up can drop it once all admins re-save through the UI.
- No new tabs added; this is purely making the existing UI do what it claims.

