
## Problema
O widget de IP/geolocalização não aparece porque as APIs externas (ipapi.co, ipwho.is, ipify.org) estão sendo bloqueadas pelo navegador no preview do Lovable. Chamadas diretas do browser para essas APIs são instáveis.

## Solução: Edge Function como proxy

### 1. Criar edge function `get-visitor-info`
- A edge function recebe a requisição do browser
- Extrai o IP do visitante via header `x-forwarded-for` (disponível automaticamente no Deno/Supabase)
- Faz chamada server-side para API de geolocalização (sem restrições de CORS/sandbox)
- Retorna `{ ip, city, country_code }` para o frontend

### 2. Atualizar `Auth.tsx`
- Substituir as chamadas diretas às APIs externas por uma única chamada à edge function via `supabase.functions.invoke('get-visitor-info')`
- Isso funciona tanto no preview quanto em produção, pois a edge function é um endpoint do próprio backend

### Vantagens
- ✅ Funciona no preview e em produção
- ✅ Não expõe APIs externas ao browser
- ✅ IP real do visitante vem dos headers do servidor (mais confiável)
- ✅ Sem problemas de CORS ou mixed content (HTTP/HTTPS)
