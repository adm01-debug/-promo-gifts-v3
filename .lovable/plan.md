

# Loading state + toast detalhado no salvar de credenciais

## O que muda

Hoje o `SecretField` chama `setSecret`/`rotateSecret` e mostra apenas um toast genérico ("Credencial registrada"). Não há:
- Spinner visível durante o salvar (só desabilita o botão)
- Confirmação do sufixo mascarado salvo (`••••AB12`)
- Mensagem de erro contextualizada (whitelist, RLS, rede)
- Indicação de "novo valor" vs "atualização" vs "rotação"

## Solução

### 1. `useSecretsManager` retorna payload normalizado

Hoje `setSecret`/`rotateSecret` disparam o toast internamente e retornam `data` cru. Mudar para:
- **Não disparar toast dentro do hook** — só retornar `{ ok, masked_suffix, length, action, error }`.
- O componente decide qual toast mostrar (com o sufixo real vindo do backend).

Isso evita toast duplicado e dá controle ao `SecretField`.

### 2. `SecretField` — estado de loading visível + toast rico

- **Botão "Salvar"** ganha:
  - `<Loader2 className="animate-spin" />` no lugar do ícone `Save` enquanto `saving === true`
  - Texto muda para "Salvando…" / "Rotacionando…"
  - Input fica `disabled` durante o salvar (evita edição parcial)
- **Após o `await`**:
  - **Sucesso**: `toast.success(...)` com:
    - Título: `"Credencial salva"` ou `"Credencial atualizada"` ou `"Rotação concluída"` (decidido pelo `was_update` que o backend já sinaliza)
    - Description: `"${secretName} agora termina em ••••${masked_suffix} (${length} chars)"`
    - Duração 5s para o usuário ler o sufixo
  - **Erro**: `toast.error(...)` com:
    - Título: `"Falha ao salvar ${secretName}"`
    - Description normalizada por código HTTP/mensagem:
      - 403 / "not allowed" → "Apenas administradores podem alterar esta credencial."
      - 400 / "whitelist" → "Este nome de credencial não está na lista permitida."
      - 400 / "value too short" → "O valor precisa ter pelo menos 4 caracteres."
      - default → mensagem original do backend
    - Action button "Tentar novamente" que reabre o campo com o valor digitado
- **Inline feedback transitório no card** (~2s após salvar):
  - Linha verde abaixo do input: `✓ Salvo • ••••${masked_suffix} • atualizado agora`
  - Anima `fade-in` e some sozinha (não substitui o badge persistente que já existe)

### 3. Backend — `secrets-manager` retorna metadados do upsert

O `set`/`rotate` já fazem upsert e o trigger calcula `masked_suffix`/`length`. Garantir que a resposta inclua:
```json
{
  "ok": true,
  "stored": true,
  "was_update": true|false,
  "secret": { "name", "masked_suffix", "length", "updated_at", "source": "db" }
}
```
Hoje a função retorna `message` genérico. Adicionar o objeto `secret` lendo de volta a linha após o upsert (mesma transação) para garantir que o sufixo exibido vem do banco, não da string que o frontend mandou.

Para `rotate`, incluir também `previous_suffix` no retorno para o toast poder mostrar `"de ••••XXXX para ••••YYYY"`.

### 4. Tratamento de erro padronizado

Backend retorna `{ ok: false, error: { code, message } }` em vez de só `error`. Códigos:
- `forbidden` (403) — sem permissão
- `not_whitelisted` (400) — nome fora da lista
- `invalid_value` (400) — valor curto/vazio
- `db_error` (500) — falha no upsert
- `unexpected` (500) — fallback

O `useSecretsManager` repassa esse objeto; `SecretField` mapeia para mensagens em PT-BR.

### 5. Toast de "Configurando…" para operações > 800ms

Se o `await` demorar mais de 800ms, mostra `toast.loading("Salvando ${secretName}…")` que é substituído por `toast.success/error` com o mesmo `id`. Evita flicker em rede rápida e dá feedback em rede lenta.

## O que o usuário verá

1. Cola valor no campo `EXTERNAL_PROMOBRIND_URL` → clica **Salvar**.
2. Botão vira `[⟳ Salvando…]` (input desabilitado).
3. Em ~300ms: toast verde sticky por 5s:
   ```text
   ✓ Credencial salva
   EXTERNAL_PROMOBRIND_URL agora termina em ••••.co (52 chars)
   ```
4. Linha verde fade-in abaixo do input: `✓ Salvo • ••••.co • atualizado agora` (some em 2s).
5. Badge superior atualiza para `✓ ••••.co (52 chars) · atualizado agora`.
6. Em caso de erro 403:
   ```text
   ✗ Falha ao salvar EXTERNAL_PROMOBRIND_URL
   Apenas administradores podem alterar esta credencial.
   [Tentar novamente]
   ```
7. Em rotação:
   ```text
   ✓ Rotação concluída
   EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY: ••••AB12 → ••••YZ89 (registrado no log)
   ```

## Arquivos tocados

**Backend**
- `supabase/functions/secrets-manager/index.ts`: enriquecer resposta de `set`/`rotate` com `{ secret: {...}, was_update, previous_suffix }`; padronizar erros como `{ ok:false, error:{code,message} }`.

**Frontend**
- `src/hooks/useSecretsManager.ts`: remover toasts internos; retornar payload normalizado `{ ok, secret, was_update, previous_suffix, error }`.
- `src/components/admin/connections/SecretField.tsx`:
  - Spinner `Loader2` no botão, input `disabled` durante save
  - `toast.loading` → `toast.success`/`toast.error` com `id` para troca atômica
  - Mapeamento de códigos de erro → PT-BR
  - Linha inline `JustSavedFlash` (auto-some em 2s) com sufixo real do backend
- `src/components/admin/connections/JustSavedFlash.tsx` (novo, ~30 linhas): pequeno componente animado que recebe `{ masked_suffix, length, action }` e some sozinho.

## Fora de escopo

- Não muda o badge persistente já existente (continua igual)
- Não muda o fluxo de "Configurar"/"Atualizar"/"Rotacionar" (só o feedback)
- Não adiciona retry automático em erro de rede (a action "Tentar novamente" do toast é manual)

