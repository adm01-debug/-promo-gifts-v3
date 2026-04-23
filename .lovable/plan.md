

# Validação inline em `SecretField` + bloqueio de "Testar conexão"

## Diagnóstico

Hoje em `SecretField.tsx`:
- O único guard é `value.length < 4` para habilitar "Salvar"/"Rotacionar"
- Não há validação de formato (URL malformada, service key sem prefixo `eyJ`, webhook sem `/rest/`, etc.)
- O botão "Testar conexão" em cada aba (`Bitrix24Tab`, `N8nTab`, `SupabaseConnectionsTab`, `McpTab`) só checa `has_value`, então um valor inválido salvo via env permite testar e falhar com erro genérico de rede

Resultado: admin cola um valor errado, salva, clica "Testar", recebe erro confuso sem saber se é o valor ou o serviço.

## Solução

### 1. Registry de validadores por nome de credencial

Novo arquivo `src/components/admin/connections/secretValidators.ts` com um mapa `SECRET_NAME → ValidatorRule`:

```ts
type ValidatorRule = {
  /** Regex ou função que retorna true se válido */
  test: (v: string) => boolean;
  /** Mensagem de erro exibida inline quando inválido */
  message: string;
  /** Hint exibido em cinza abaixo do input quando vazio/editando */
  hint?: string;
  /** Exemplo clicável que preenche o input com placeholder de demo */
  example?: string;
};
```

Regras (cobertura inicial — todos os secrets já listados nas abas):

| Secret name | Regra |
|---|---|
| `EXTERNAL_PROMOBRIND_URL`, `EXTERNAL_CRM_URL` | URL `https://` válida, sem barra final, host termina em `.supabase.co` |
| `EXTERNAL_*_ANON_KEY`, `EXTERNAL_*_SERVICE_ROLE_KEY` | JWT: começa com `eyJ`, 3 segmentos separados por `.`, length ≥ 100 |
| `BITRIX24_WEBHOOK_URL` | URL `https://` válida + contém `/rest/` + termina com `/` |
| `BITRIX24_DOMAIN` | host válido (`*.bitrix24.*`), sem `https://` |
| `BITRIX24_USER_ID` | inteiro positivo |
| `BITRIX24_TOKEN` | alfanumérico, 10–60 chars |
| `N8N_BASE_URL` | URL `https://` válida, sem caminho (só host), sem barra final |
| `N8N_API_KEY` | string ≥ 20 chars, sem espaços |
| `MCP_SERVER_URL` | URL `https://` ou `wss://` válida |
| Default (sem regra) | `length ≥ 4` (comportamento atual) |

### 2. Validação inline no `SecretField`

Ao digitar (`onChange`), avaliar o validator do `secretName`:

- **Vazio**: nenhum erro, mostra `hint` em cinza abaixo do input (ex: _"Formato esperado: https://abc.supabase.co"_)
- **Inválido**: borda vermelha + ícone `AlertCircle` + mensagem em `text-destructive` (ex: _"URL deve terminar em .supabase.co"_)
- **Válido**: borda verde sutil + ícone `CheckCircle2` em verde-success
- **Loading/saving**: estados de validação congelam até resposta

Botão "Salvar"/"Rotacionar" desabilitado enquanto inválido (com tooltip explicativo: _"Corrija o formato antes de salvar"_).

```ts
const validation = useMemo(() => validateSecret(secretName, value), [secretName, value]);
const canSave = value.length > 0 && validation.ok && !saving;
```

### 3. Indicador de validade do valor já salvo

Quando o campo **não está em edição** mas tem `status.has_value`, rodar a validação contra um proxy do valor salvo:
- Não temos o valor real no frontend (segurança), mas temos `masked_suffix` + `length` + heurísticas (ex: JWT mínimo 100 chars; URL não dá para validar sem o valor)
- Para JWTs: se `length < 100` exibir badge amarelo `⚠ Comprimento suspeito` ao lado do sufixo
- Para URLs: sem warning (não dá para inferir do mascarado)
- Esse warning é informativo, não bloqueia nada

### 4. Bloqueio do botão "Testar conexão"

Hoje em cada aba o `disabled` é `isTesting || !credsOk` onde `credsOk = !!secret?.has_value`. Mudar para também checar warnings de comprimento:

```ts
const credsLooksValid = credsOk && !hasSuspiciousLength(secrets, requiredNames);
<Button disabled={isTesting || !credsLooksValid}
  title={!credsOk ? "Configure as credenciais primeiro"
    : !credsLooksValid ? "Credenciais com formato suspeito — re-salve antes de testar"
    : "Testar conexão"}>
```

Helper `hasSuspiciousLength(secrets, ["EXTERNAL_CRM_SERVICE_ROLE_KEY"])` retorna true se algum secret na lista tem `length < threshold` definido no validator.

Aplicar em:
- `Bitrix24Tab` → checa `BITRIX24_WEBHOOK_URL` (length ≥ 60)
- `N8nTab` → checa `N8N_BASE_URL` (length ≥ 15) e `N8N_API_KEY` se presente
- `SupabaseConnectionsTab` → checa `EXTERNAL_*_URL` (length ≥ 25) e `*_SERVICE_ROLE_KEY` (length ≥ 100)
- `McpTab` → checa `MCP_SERVER_URL` (length ≥ 15)

### 5. Validação no modal de rotação

`RotateSecretConfirmDialog` já recebe `newSuffix` e `newLength`. O bloqueio do "Salvar/Rotacionar" no `SecretField` já cobre isso (modal só abre se `canSave` for true), então nenhuma mudança no modal.

### 6. Estados visuais

```text
┌─ Service Role Key ───────────────────────────────────────┐
│ [eyJhbGc..._invalido_]                  [✗] [Salvar]🚫   │
│ ⚠ Service Role Key deve ter ≥100 chars (atual: 47)       │
└──────────────────────────────────────────────────────────┘

┌─ Service Role Key ───────────────────────────────────────┐
│ [eyJhbGciOiJIUzI1NiIs...XYZ]            [✓] [Salvar]    │
│ Formato JWT válido                                        │
└──────────────────────────────────────────────────────────┘

┌─ Service Role Key ───────────────────────────────────────┐
│ [..............]                        [Salvar]🚫       │
│ Formato esperado: token JWT (eyJ...) com ≥100 chars      │
└──────────────────────────────────────────────────────────┘
```

## Arquivos tocados

**Frontend (novos)**
- `src/components/admin/connections/secretValidators.ts` (~120 linhas): registry de validadores + helpers `validateSecret(name, value)` e `hasSuspiciousLength(secrets, names)`.

**Frontend (editados)**
- `src/components/admin/connections/SecretField.tsx`:
  - Importar `validateSecret`
  - Adicionar `useMemo` de validação a partir de `value` e `secretName`
  - Renderizar ícone `CheckCircle2`/`AlertCircle` à direita do input em modo edição
  - Renderizar mensagem de erro / hint abaixo do input
  - Mudar `disabled` do "Salvar"/"Rotacionar" para `!validation.ok || value.length === 0 || saving`
  - Adicionar `title` no botão explicando o motivo do disabled
  - No modo não-edição, mostrar badge `⚠ Comprimento suspeito` se `hasSuspiciousLength` retornar true para o secret atual
- `src/components/admin/connections/Bitrix24Tab.tsx`: trocar `credsOk` por `credsLooksValid` e ajustar `title`/`disabled` do botão "Testar conexão"
- `src/components/admin/connections/N8nTab.tsx`: idem
- `src/components/admin/connections/SupabaseConnectionsTab.tsx`: idem (por env)
- `src/components/admin/connections/McpTab.tsx`: idem

**Backend**: nenhuma mudança. `secrets-manager` continua aceitando qualquer valor ≥ 4 chars (validação é defense-in-depth no client; o admin pode forçar override removendo o validator se necessário, mas o caso de uso primário é evitar erros de digitação).

## Fora de escopo

- Não adiciona validação no backend `secrets-manager` (mantém liberdade para casos especiais — frontend é defense-in-depth)
- Não adiciona "auto-fix" (ex: remover barra final automaticamente) — só sinaliza
- Não adiciona validação cruzada (ex: "URL e Service Key devem ser do mesmo projeto") — fora do escopo
- Não muda os validadores em runtime via UI admin — registry é estático no código
- Não adiciona validação para webhooks customizados na aba Webhooks (URLs livres por design)

