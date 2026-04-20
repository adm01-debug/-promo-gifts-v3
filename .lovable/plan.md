
# Magic Up 10/10 — Próxima execução: Onda 5, depois Ondas 6–13 em sequência

A Onda 4 já deixou o Magic Up com direção de arte Pro, refinamentos rápidos, fila local de variações, Brand Kit no payload e metadados completos. A próxima evolução será a **Onda 5 — Magic Score real + curadoria**, transformando a avaliação atual heurística em um sistema de diagnóstico comercial, visual e operacional para escolher a melhor peça antes de enviar ao cliente.

## Onda 5 — Magic Score real + curadoria

### Objetivo

Criar uma camada de curadoria profissional para cada imagem gerada, com:

- score 0–100 mais detalhado;
- checklist por critérios comerciais;
- recomendações de melhoria;
- status de curadoria;
- comparação entre variações;
- persistência do diagnóstico no histórico;
- fallback seguro quando a análise por IA não estiver disponível.

## 1. Expandir tipos e estratégia do Magic Score

Atualizar `src/pages/magic-up/magicUpStrategy.ts` para adicionar uma estrutura mais rica:

- `MagicUpQualityCriterion`
  - `id`
  - `label`
  - `score`
  - `passed`
  - `weight`
  - `recommendation`

- `MagicUpQualityDiagnosis`
  - `total`
  - `label`
  - `summary`
  - `criteria`
  - `strengths`
  - `risks`
  - `recommendations`
  - `source: "heuristic" | "ai"`

- `MagicUpCurationStatus`
  - `draft`
  - `good`
  - `favorite`
  - `internal-approved`
  - `sent-to-client`
  - `client-approved`
  - `client-rejected`
  - `needs-adjustment`

Também manter compatibilidade com o `qualityScore` atual para não quebrar componentes existentes.

## 2. Criar componentes de curadoria

Criar em `src/components/magic-up/`:

### `MagicUpQualityScore.tsx`

Exibir:

- score visual 0–100;
- rótulo de qualidade;
- origem do diagnóstico:
  - heurístico;
  - IA;
- resumo executivo;
- estado visual claro:
  - excelente;
  - bom;
  - precisa ajuste;
  - crítico.

### `MagicUpQualityChecklist.tsx`

Mostrar critérios:

- clareza do produto;
- visibilidade do logo;
- adequação ao canal;
- coerência com cliente/Brand Kit;
- qualidade visual;
- potencial comercial;
- realismo;
- espaço para copy/CTA.

Cada item terá:

- aprovado/revisar;
- score parcial;
- recomendação objetiva.

### `MagicUpVariationComparator.tsx`

Quando houver mais de uma variação:

- listar variações lado a lado em cards compactos;
- destacar a melhor pelo score;
- permitir selecionar a vencedora;
- indicar pontos fortes/fracos de cada uma;
- preservar navegação já existente de variações.

### `MagicUpCurationStatus.tsx`

Permitir alterar o status da imagem atual:

- Rascunho
- Boa
- Favorita
- Aprovada internamente
- Enviada ao cliente
- Aprovada pelo cliente
- Rejeitada
- Precisa ajuste

A mudança atualizará a geração salva no banco quando houver `generation.id`.

## 3. Criar backend function `magic-up-score`

Criar `supabase/functions/magic-up-score/index.ts`.

A função terá:

- autenticação em código;
- CORS em todas as respostas;
- proteção contra abuso/rate limit;
- validação Zod;
- uso do Lovable AI;
- resposta JSON estritamente estruturada.

### Entrada esperada

```text
imageUrl
productName
clientName
campaignBrief
brandKit
creativeControls
promptText
channel
aspectRatio
```

### Saída esperada

```text
{
  "total": 0-100,
  "label": "...",
  "summary": "...",
  "criteria": [
    {
      "id": "...",
      "label": "...",
      "score": 0-100,
      "passed": true,
      "weight": 1-5,
      "recommendation": "..."
    }
  ],
  "strengths": ["..."],
  "risks": ["..."],
  "recommendations": ["..."]
}
```

### Modelo

Usar um modelo multimodal do Lovable AI apropriado para avaliar imagem + contexto, priorizando precisão. A função não pedirá chaves externas.

## 4. Integrar análise de score ao frontend

Atualizar `useMagicUpGeneration.ts` para:

- depois que a imagem for gerada, chamar `magic-up-score`;
- usar fallback heurístico se a função falhar;
- persistir o diagnóstico em:
  - `quality_score`
  - `metadata.qualityDiagnosis`
  - `metadata.qualitySource`
  - `metadata.curation`

A geração não deve falhar caso a análise de score falhe. Nesse caso:

- imagem continua salva;
- score heurístico é aplicado;
- aviso discreto é exibido.

## 5. Adicionar ações de curadoria no estado

Atualizar `useMagicUpState.ts` e/ou `useMagicUpGeneration.ts` para expor:

- `qualityDiagnosis`
- `curationStatus`
- `handleRunQualityScore`
- `handleSetCurationStatus`
- `handleSelectWinningVariation`

Regras:

- se não houver imagem, ações ficam desabilitadas;
- se não houver `generation.id`, status muda apenas localmente;
- se houver `generation.id`, status é persistido em `magic_up_generations.status`;
- favoritos continuam usando `is_favorite`.

## 6. Refatorar `AdImageResult`

Atualizar `src/components/magic-up/AdImageResult.tsx` para substituir o bloco simples de Magic Score por componentes modulares:

- `MagicUpQualityScore`
- `MagicUpQualityChecklist`
- `MagicUpCurationStatus`

Também corrigir acessibilidade existente:

- cards do histórico clicáveis devem virar `button` ou receber `role`, `tabIndex` e `onKeyDown`;
- botão de favorito do histórico precisa de `aria-label`;
- dots de variação precisam de `aria-label`;
- botões icon-only devem ter labels específicos, não genéricos como “Horário”.

## 7. Integrar comparador ao painel de resultado

Atualizar `src/pages/magic-up/MagicUpResultPanel.tsx` para:

- exibir `MagicUpVariationComparator` quando houver 2+ variações;
- manter thumbnails existentes;
- permitir selecionar a melhor variação;
- mostrar badge “Melhor score” na vencedora;
- não poluir a UI quando só houver uma variação.

## 8. Persistência e histórico

Atualizar a query de histórico em `useMagicUpState.ts` para buscar campos úteis:

- `quality_score`
- `status`
- `channel`
- `aspect_ratio`
- `metadata`
- `copy_pack`

Atualizar `GenerationHistoryItem` para suportar score/status sem quebrar usos atuais.

No histórico:

- mostrar score compacto;
- mostrar status;
- permitir filtrar/ordenar futuramente na Onda 8.

## 9. Validação da Onda 5

Ao final da implementação:

- rodar typecheck;
- validar que a função `magic-up-score` tem Zod e autenticação;
- confirmar que a geração de imagem continua funcionando mesmo se o score falhar;
- confirmar que `quality_score` é salvo;
- confirmar que `metadata.qualityDiagnosis` é salvo;
- confirmar que o status de curadoria atualiza a geração;
- confirmar que variações podem ser comparadas;
- confirmar que não há `any` novo;
- revisar acessibilidade dos botões e cards interativos.

## Depois da Onda 5

Assim que a Onda 5 estiver validada, seguirei automaticamente para:

1. **Onda 6 — Copywriter + WhatsApp Pack**
2. **Onda 7 — Exportação profissional**
3. **Onda 8 — Biblioteca criativa avançada**
4. **Onda 9 — Aprovação pública**
5. **Onda 10 — Integrações comerciais**
6. **Onda 11 — Produtividade, atalhos e acessibilidade**
7. **Onda 12 — Analytics e governança de IA**
8. **Onda 13 — QA e certificação 10/10**

## Arquivos previstos para a Onda 5

- `src/pages/magic-up/magicUpStrategy.ts`
- `src/hooks/useMagicUpState.ts`
- `src/hooks/useMagicUpGeneration.ts`
- `src/pages/magic-up/MagicUpResultPanel.tsx`
- `src/components/magic-up/AdImageResult.tsx`
- `src/components/magic-up/MagicUpQualityScore.tsx`
- `src/components/magic-up/MagicUpQualityChecklist.tsx`
- `src/components/magic-up/MagicUpVariationComparator.tsx`
- `src/components/magic-up/MagicUpCurationStatus.tsx`
- `supabase/functions/magic-up-score/index.ts`

## Resultado esperado da Onda 5

O Magic Up deixará de apenas gerar imagens e passará a ajudar o vendedor a decidir com segurança qual peça merece ser enviada:

- score real por critérios;
- diagnóstico visual e comercial;
- curadoria de status;
- comparação de variações;
- fallback heurístico seguro;
- histórico enriquecido;
- base pronta para copywriter, exportação e aprovação pública.
