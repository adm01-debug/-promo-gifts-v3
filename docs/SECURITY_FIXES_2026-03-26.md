# Security Fixes Applied — 2026-03-26

## Summary

All critical security findings (SEC-01 through SEC-05) from the backend audit have been implemented.

---

## SEC-01: CORS Wildcard Restriction ✅

**Before:** All 35+ Edge Functions used `Access-Control-Allow-Origin: *`

**After:** 
- Created `_shared/cors.ts` with origin allowlist:
  - `criar-together-now.lovable.app` (production)
  - `id-preview--*.lovable.app` (preview)
  - `localhost:5173/8080/3000` (development)
- 30+ Edge Functions patched to use `getCorsHeaders(req)` with dynamic origin reflection
- Public endpoints (`kit-public-view`, `quote-public-view`, `product-webhook`) retain wildcard intentionally

**Impact:** Blocks CSRF and unauthorized cross-origin requests from unknown domains.

---

## SEC-02: log-login-attempt Hardening ✅

**Before:** No authentication, no rate limiting, accepts arbitrary input.

**After:**
- Rate limiting: 10 requests/minute per IP via `_shared/rate-limiter.ts`
- Email format validation (must contain `@`)
- UUID format validation for `user_id`
- Restricted CORS (no longer wildcard)
- Input sanitization preserved (length limits)

**Impact:** Prevents log injection and abuse of the login attempt logging endpoint.

---

## SEC-03: JWT Mandatory on Sensitive Tables ✅

**Before:** `external-db-bridge` allowed unauthenticated reads on ALL product tables, including those with commercial data (costs, markups, supplier pricing).

**After:**
- Defined `SENSITIVE_TABLES` set containing 10 tables with commercial data:
  - `variant_supplier_sources`, `variant_cost_tiers`, `variant_sale_prices`
  - `price_lists`, `price_history`
  - `organization_markup_customization`
  - `tabela_preco_fornecedores_gravacao`, `tabela_preco_gravacao_oficial`, `tabela_preco_gravacao_oficial_faixa`
  - `supplier_branches`
- These tables now require a valid JWT even for `SELECT` operations
- Non-sensitive product tables remain publicly readable (catalog browsing)
- Auth method upgraded from `getUser()` to `getClaims()` (faster, no server round-trip)

**Impact:** Protects supplier costs, markups, and pricing strategy from exposure.

---

## SEC-04: Admin Audit Log Table ✅

**Before:** No persistent audit trail for administrative actions.

**After:**
- Created `admin_audit_log` table with:
  - `user_id`, `action`, `resource_type`, `resource_id`, `details` (JSONB)
  - `ip_address`, `user_agent` for forensics
  - `created_at` timestamp
- RLS: Only admins can read; users can only insert their own entries
- **Immutable**: No UPDATE or DELETE policies (append-only)
- Indexed on `user_id`, `created_at`, and `action`

**Impact:** Enables forensic investigation of admin actions (role changes, user management, config changes).

---

## SEC-05: Centralized Auth Module ✅

**Before:** Auth logic duplicated across 30+ Edge Functions with inconsistent patterns.

**After:**
- Created `_shared/auth.ts` with:
  - `authenticateRequest(req)` — validates JWT via `getClaims()`, fetches role
  - `requireRole(auth, role)` — role-based access control helper
  - `authErrorResponse(err, corsHeaders)` — standardized error responses
- Created `_shared/cors.ts` with:
  - `getCorsHeaders(req)` — dynamic origin-validated CORS
  - `handleCorsPreflightIfNeeded(req)` — OPTIONS handler
  - `publicCorsHeaders` — for genuinely public endpoints

**Impact:** Eliminates auth code duplication, ensures consistent security across all functions.

---

## Build Verification

- **TypeScript**: 0 errors (`tsc --noEmit`)
- **Vite Build**: Success (29.5s)
- **Edge Functions**: All 39 functions structurally intact

## Pre-existing Linter Warnings (Not New)

- `extension_in_public`: Extensions installed in public schema (pre-existing)
- `leaked_password_protection`: Already enabled via auth config (false positive)
