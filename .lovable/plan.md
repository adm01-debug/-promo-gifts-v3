
# Magic Up 10/10 — Próxima execução: Onda 4, depois Ondas 5–13 em sequência

Como estamos em modo somente leitura, a próxima etapa será implementada assim que este plano for aprovado. Vou continuar exatamente no formato solicitado: **uma onda por vez, sem perguntas, com validação técnica ao final de cada onda**.

## Onda 4 — Geração Pro e refinamentos criativos

Objetivo: transformar os controles atuais de direção de arte em uma experiência modular, mais poderosa e pronta para geração em lote.

### 1. Modularizar os controles criativos

Criar componentes dedicados em `src/components/magic-up/`:

- `MagicUpCreativeControls.tsx`
- `MagicUpRefinementActions.tsx`
- `MagicUpBatchGenerationPanel.tsx`

Substituir o bloco inline atual `CreativeControlsCard` em `MagicUpConfigPanel.tsx` por componentes reutilizáveis e mais claros.

### 2. Expandir direção de arte

Manter e organizar os controles já existentes:

- Modo criativo:
  - produto herói
  - lifestyle
  - flatlay
  - premium
  - social ads
  - catálogo
  - evento
  - kit/combinação
  - mockup realista

- Composição:
  - centro limpo
  - produto à esquerda
  - produto à direita
  - close-up
  - ambiente aberto
  - com pessoas
  - com props

- Formato:
  - 1:1
  - 4:5
  - 9:16
  - 16:9
  - A4
  - WhatsApp

- Qualidade:
  - rascunho
  - alta qualidade
  - pro final
  - variação rápida

### 3. Adicionar refinamentos rápidos

Criar ações de “um clique” para ajustar a intenção criativa sem o usuário reescrever prompt:

- Mais premium
- Mais minimalista
- Mais humano
- Mais corporativo
- Mais vibrante
- Mais realista
- Mais foco no produto
- Menos elementos
- Trocar fundo
- Manter produto e logo, mudar cenário

Essas ações vão atualizar `additionalDetails` e/ou `creativeControls` de forma controlada, mantendo o briefing e Brand Kit intactos.

### 4. Preparar geração em lote local

Adicionar painel de lote com presets:

- 3 variações de cena
- 3 variações de canal
- 3 variações de tom
- Pacote completo:
  - WhatsApp
  - Instagram
  - LinkedIn
  - Orçamento

Nesta onda, o lote será preparado no frontend como fila local controlada. A execução poderá reutilizar `handleGenerate` sequencialmente, sem criar backend novo ainda.

### 5. Evoluir payload da geração

Atualizar `useMagicUpGeneration.ts` para enviar também:

- Brand Kit resumido
- Notas de marca estruturadas
- Refinamento ativo
- Batch metadata quando aplicável

Também persistir em `magic_up_generations.metadata`:

- `brandKit`
- `refinement`
- `batch`
- `creativeControls`
- `brief`

### 6. Evoluir `generate-ad-image`

Atualizar `supabase/functions/generate-ad-image/index.ts` para:

- aceitar `brandKit`
- aceitar `refinementInstruction`
- aceitar `batchVariant`
- padronizar retorno com:
  - `imageUrl`
  - `model`
  - `qualityMode`
  - `aspectRatio`
  - `creativeMode`
  - `compositionMode`
  - `message`

Também melhorar o prompt interno para separar claramente:

```text
CAMPAIGN BRIEF
BRAND KIT
PRODUCT DIRECTION
CREATIVE MODE
COMPOSITION
FORMAT
NEGATIVE PROMPT
REFINEMENT INSTRUCTION
```

### 7. UX e acessibilidade

Garantir:

- Botões icon-only com `aria-label`
- Botões de refinamento acessíveis por teclado
- Estado visual claro para filtros ativos
- `aria-live` para:
  - refinamento aplicado
  - lote iniciado
  - variação gerada
  - erro de geração

### 8. Validação da Onda 4

Ao final da implementação:

- Rodar typecheck.
- Verificar build quando necessário.
- Confirmar que os novos componentes compilam sem `any`.
- Confirmar que o prompt completo reflete:
  - briefing
  - Brand Kit
  - direção de arte
  - negative prompt
  - refinamento rápido
- Confirmar que a imagem gerada continua salvando no histórico.
- Confirmar que `metadata` registra os novos campos.

## Depois da Onda 4

Assim que a Onda 4 estiver validada, seguirei automaticamente para:

1. **Onda 5 — Magic Score real + curadoria**
2. **Onda 6 — Copywriter + WhatsApp Pack**
3. **Onda 7 — Exportação profissional**
4. **Onda 8 — Biblioteca criativa avançada**
5. **Onda 9 — Aprovação pública**
6. **Onda 10 — Integrações comerciais**
7. **Onda 11 — Produtividade, atalhos e acessibilidade**
8. **Onda 12 — Analytics e governança de IA**
9. **Onda 13 — QA e certificação 10/10**

## Arquivos previstos para a Onda 4

- `src/pages/magic-up/MagicUpConfigPanel.tsx`
- `src/pages/magic-up/magicUpStrategy.ts`
- `src/hooks/useMagicUpState.ts`
- `src/hooks/useMagicUpGeneration.ts`
- `src/components/magic-up/MagicUpCreativeControls.tsx`
- `src/components/magic-up/MagicUpRefinementActions.tsx`
- `src/components/magic-up/MagicUpBatchGenerationPanel.tsx`
- `supabase/functions/generate-ad-image/index.ts`

## Resultado esperado da Onda 4

O Magic Up deixará de ter apenas controles básicos e passará a operar como um mini estúdio de direção de arte:

- controles modulares;
- refinamentos rápidos;
- preparação para geração em lote;
- prompt mais estratégico;
- Brand Kit usado na geração;
- metadados completos salvos;
- UX mais premium, acessível e escalável.
