

# Plano — Teste do fluxo "Reanalisar Magic Score"

## Limitação herdada do QA anterior

O QA manual A–D ficou **bloqueado pelo upload de logo** (`<input type="file">` que o browser-bot não aciona). Reanalisar exige uma variação já gerada com `id` persistido em `magic_up_generations`, então **não consigo disparar o fluxo end-to-end pelo preview** sem que você faça pelo menos uma geração manual.

Mesmo assim, posso entregar uma validação **rigorosa em três camadas** sem depender do upload, combinando código + DB + logs + curl real da edge function.

## O que vou executar

### 1. Auditoria de código do fluxo (read-only)
Reler e cruzar:
- `useMagicUpGeneration.handleRunQualityScore` — chamada à `magic-up-score`, atualização de `variations[activeVariation]`, `setQualityDiagnosis`, `setQualityScore`, update em `magic_up_generations.quality_score`, `queryClient.invalidateQueries(['magic-up-history'])`, toast de sucesso/erro
- `useMagicUpState` — exposição de `handleRunQualityScore` e propagação para `MagicUpResultPanel` → `AdImageResult`
- `AdImageResult` — botão "Reanalisar Magic Score" e gating por `currentVariation?.id`
- Confirmar se o update em DB também grava `metadata.qualityDiagnosis` e `metadata.qualitySource` (ponto de atenção mapeado na Onda 5)

### 2. Validação backend ao vivo
- `supabase--curl_edge_functions` em `magic-up-score` com payload mínimo válido (sem `imageUrl` real para não consumir IA): confirmar 400 Zod
- Tentar payload válido (com URL pública pequena) só se quota permitir; caso contrário, registrar como ressalva
- `supabase--edge_function_logs` filtrando por `magic-up-score` para correlacionar a chamada acima

### 3. Inspeção do estado atual no banco
- `supabase--read_query` em `magic_up_generations` (últimos 5 registros do usuário logado): conferir colunas `quality_score`, `status`, `metadata->qualityDiagnosis`, `metadata->qualitySource`, `metadata->curation`, `updated_at`
- Identificar se já existe ao menos uma geração com `id` que possa servir como caso real para você reanalisar manualmente no preview enquanto observo

### 4. Cobertura por testes automatizados (já verde)
Confirmar que `tests/hooks/useMagicUpGeneration-onda5.test.tsx` cobre o caso "reanalisar Magic Score" — atualização de diagnóstico, score, update em DB, invalidação do histórico e toast — e citar como evidência substituta da execução manual bloqueada.

### 5. (Opcional, mediante seu OK) QA assistido
Se você fizer **uma única geração manual** com upload de logo enquanto eu acompanho, eu:
- Acompanho a inserção em `magic_up_generations` por `read_query`
- Capturo a chamada à `magic-up-score` por logs
- Você clica em "Reanalisar Magic Score"
- Eu confirmo update do score na linha + invalidação do histórico (recontagem) + diferença em `metadata`

## Entregável

Relatório consolidado com:
- ✅ trecho de código do `handleRunQualityScore` com pontos confirmados/divergentes
- ✅ resultado do curl + log da edge function
- ✅ snapshot do estado atual em `magic_up_generations`
- ✅ confirmação dos testes automatizados que cobrem o caso
- ⚠️ ressalva clara sobre QA manual interativo bloqueado pelo upload de logo
- 🐛 lista de bugs/divergências caso encontre (ex.: update sem regravar `metadata.qualityDiagnosis`)

Sem alterações de código nesta rodada.

