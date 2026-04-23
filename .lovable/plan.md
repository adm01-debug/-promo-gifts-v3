

# Validação imediata + normalização ao colar no `SecretField`

## Objetivo

Quando o admin **cola** um valor (Ctrl+V) num `SecretField`, aplicar imediatamente:
1. **Normalização silenciosa** (corrigir erros comuns de copy/paste).
2. **Validação imediata** com feedback visual (ok/erro/hint).

Hoje a validação só acontece em `onChange`/`onBlur` e nada é normalizado — o usuário cola `https://abc.supabase.co/` (com `/`) ou `eyJ...\n` (com newline) e só descobre o erro ao tentar salvar.

## Mudanças

### 1. Novo módulo `secretNormalizers.ts` (irmão de `secretValidators.ts`)

Função pura `normalizeSecret(name, raw): { value, changes[] }` por credencial:

| Secret | Normalizações aplicadas |
|---|---|
| `EXTERNAL_PROMOBRIND_URL`, `EXTERNAL_CRM_URL` | trim, remove aspas envolventes, lower-case do host, remove `/` final, remove qualquer path/query/fragment |
| `EXTERNAL_*_ANON_KEY`, `EXTERNAL_*_SERVICE_ROLE_KEY` | trim, remove `Bearer ` prefix, remove todo whitespace interno (newlines de copy/paste de UI) |
| `BITRIX24_WEBHOOK_URL` | trim, remove aspas, garante `/` final, remove query/fragment |
| `BITRIX24_DOMAIN` | trim, remove `https://`/`http://`, remove `/` final, lower-case |
| `BITRIX24_USER_ID` | trim, mantém apenas dígitos |
| `BITRIX24_TOKEN` | trim, remove whitespace |
| `N8N_BASE_URL` | trim, remove aspas, remove `/` final, remove path |
| `N8N_API_KEY` | trim, remove `Bearer ` prefix, remove whitespace |
| `MCP_SERVER_URL`, `MCP_SHARED_SECRET` | trim, remove aspas |
| Outbound/Inbound `*_HMAC_*`/`*_SECRET_*` | trim, remove whitespace |
| Default (qualquer outro) | trim |

Cada normalização adiciona um string descritivo ao array `changes` (ex.: `"barra final removida"`, `"prefixo Bearer removido"`, `"quebras de linha removidas"`) — usado pra mostrar feedback discreto pro usuário.

### 2. `SecretField.tsx` — handler de paste + validação imediata

- Adicionar `onPaste={handlePaste}` no `<Input type="password">` do modo set/rotate:
  - `e.preventDefault()`
  - Pegar `e.clipboardData.getData("text")`
  - Rodar `normalizeSecret(name, raw)`
  - `setValue(normalized)`
  - Se `changes.length > 0`, mostrar **toast info** discreto: `"Valor normalizado: barra final removida, espaços removidos"` (uma única toast, ID estável `paste-norm-${name}` pra evitar duplicar)
  - Disparar a validação imediatamente (já roda via `useEffect` em `value`, mas garantir que não há debounce).

- Mudar a validação visual atual (que hoje só aparece após digitar) pra rodar em **todo `setValue`** — incluindo paste — e mostrar:
  - Borda `border-destructive` no `<Input>` quando `validation.ok === false && value.length > 0`
  - Borda `border-success` (token existente) quando `validation.ok === true`
  - Mensagem `validation.message` em vermelho **abaixo** do input (já existe parcialmente — garantir que aparece imediatamente no paste, não só no blur).

### 3. Mesma normalização no `onChange` manual (digitação)

Também rodar `normalizeSecret` no `onChange`, mas **só aplicar normalizações idempotentes não-destrutivas** durante digitação (trim de pontas só no blur). Evita o usuário não conseguir digitar um espaço temporário no meio. → Implementação: criar `normalizeSecretLight(name, raw)` que pula normalizações que cortam conteúdo (ex.: trim só no início, mas não no fim enquanto digitando).

Ou mais simples e seguro: **só normalizar no paste e no blur**, manter `onChange` cru. Vou adotar essa versão (menos surpresa pro usuário).

### 4. Indicador visual de "normalizado"

Quando o último `setValue` veio de paste e gerou `changes`, mostrar pequeno badge `✓ Valor ajustado` ao lado do input por 4s (depois fade). Estado local `lastNormalization: string[] | null` + `setTimeout` pra limpar.

## Fora de escopo

- Não tocar nos validators existentes (`secretValidators.ts`) — a normalização roda **antes** da validação, então o validator continua sendo a fonte de verdade do "ok/erro".
- Não normalizar o valor já salvo no banco (não temos plaintext no frontend de qualquer forma).
- Não fazer auto-fix de erros que mudam o significado (ex.: NÃO trocar `http://` por `https://` em URLs Supabase — pode mascarar bug real do user).
- Não adicionar normalização no backend (`secrets-manager` edge function) nesta onda — o backend já valida formato e a normalização é UX-only. Pode vir em onda futura.

## Arquivos afetados

- **Novo:** `src/components/admin/connections/secretNormalizers.ts` (~120 linhas)
- **Editado:** `src/components/admin/connections/SecretField.tsx` — adicionar `onPaste`, validação imediata em todo setValue, badge de "normalizado", borda colorida no input

## Critério de aceite

- Colar `https://abc.supabase.co/  ` em `EXTERNAL_PROMOBRIND_URL` → vira `https://abc.supabase.co`, mostra `✓ Valor ajustado` + toast `"Valor normalizado: espaços removidos, barra final removida"`, validação fica verde.
- Colar `Bearer eyJhbGc...\n` em `N8N_API_KEY` → vira `eyJhbGc...`, badge aparece, validação verde.
- Colar `abc123` (curto demais) em `N8N_API_KEY` → input fica com `border-destructive` e mensagem `"API Key deve ter ≥20 chars e nenhum espaço."` aparece imediatamente, sem precisar tirar o foco.
- Digitar manualmente continua funcionando como hoje (sem normalização disruptiva).

