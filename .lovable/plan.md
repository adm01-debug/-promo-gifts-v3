## Diagnóstico

O modal "Salvar EXTERNAL_PROMOBRIND_URL" exibe `Failed to send a request to the Edge Function`. Investigando a aba de rede:

- Requisição: `POST /functions/v1/secrets-manager` com body `{"action":"set","name":"EXTERNAL_PROMOBRIND_URL","value":"https://..."}`
- Erro do browser: **`Failed to fetch`** (falha antes mesmo de chegar à função — preflight CORS bloqueado)
- Logs da edge mostram apenas `booted`, **sem nenhuma execução registrada** → confirma que o browser rejeitou o preflight

A causa raiz está em `supabase/functions/_shared/cors.ts`:

```ts
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type,
  x-supabase-client-platform, x-supabase-client-platform-version,
  x-supabase-client-runtime, x-supabase-client-runtime-version'
```

O header `X-Request-Id` **NÃO está listado**. Porém o cliente (`useSecretsManager.ts` via `invokeSecretsManager`) envia esse header em **todas** as chamadas:

```ts
await supabase.functions.invoke("secrets-manager", {
  body, headers: { [REQUEST_ID_HEADER]: requestId }, // X-Request-Id
});
```

Quando o browser faz o preflight `OPTIONS`, ele inclui `X-Request-Id` em `Access-Control-Request-Headers`. O servidor responde com um `Allow-Headers` que **não cobre** esse header → o browser cancela o request real, gerando `Failed to fetch` (que o `supabase-js` traduz para "Failed to send a request to the Edge Function").

Esse mesmo bug afeta toda função que usa `getCorsHeaders()` e recebe chamadas com `X-Request-Id` (é o caso de praticamente todo o hub de Conexões, Magic Up, MCP, Quote, etc., conforme a memória `Edge Request-Id Propagation Gate`).

## Correção

**Arquivo único:** `supabase/functions/_shared/cors.ts`

Adicionar `x-request-id` (case-insensitive, lowercase por convenção HTTP/2) à constante `CORS_HEADERS_BASE['Access-Control-Allow-Headers']`.

```ts
const CORS_HEADERS_BASE = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
```

Também adicionar a `publicCorsHeaders` (legacy wildcard) para manter consistência caso alguma função pública também receba o header.

Opcionalmente expor `Access-Control-Expose-Headers: x-request-id` para que o frontend possa ler o `X-Request-Id` ecoado pelo servidor (já estamos retornando — falta só permitir a leitura no browser).

## Validação pós-correção

1. Recarregar `/admin/conexoes`, abrir o modal "Salvar EXTERNAL_PROMOBRIND_URL", colar uma URL e clicar **Sim, salvar** → deve persistir e fechar o modal sem erro.
2. Verificar via Network que a request `POST secrets-manager` retorna `200` com `ok: true`.
3. Confirmar que o painel "Saúde da Aplicação" passa a registrar a chamada (antes era engolida pelo CORS, então nem chegava no `webhook_delivery_metrics`).

## Por que é a única mudança necessária

- Não há mudança de schema, RLS ou edge logic.
- Não há regressão para outras funções (apenas habilita um header já enviado).
- Cobre **todas** as edges (one-shot fix), porque todas importam `getCorsHeaders` desse arquivo.
