
# Plano de testes — Magic Up Onda 5: Magic Score real + curadoria

Vou testar exclusivamente o que acabou de ser implementado na **Onda 5**, sem avançar para novas features. O foco será validar, de forma meticulosa, a camada de diagnóstico, curadoria, comparação de variações, histórico enriquecido e backend function `magic-up-score`.

## Escopo exato dos testes

Serão avaliados:

- `MagicUpQualityScore`
- `MagicUpQualityChecklist`
- `MagicUpCurationStatus`
- `MagicUpVariationComparator`
- integração em `AdImageResult`
- integração em `MagicUpResultPanel`
- lógica de `useMagicUpGeneration`
- lógica de `useMagicUpState`
- backend function `magic-up-score`
- persistência em `magic_up_generations`
- fallback heurístico quando IA falhar
- acessibilidade dos novos botões/cards
- histórico com score/status/metadados

Não vou testar nem alterar as Ondas 6–13 nesta rodada.

---

## 1. Testes automatizados de componentes

Criar/expandir testes em `tests/components/` para validar os componentes novos.

### `MagicUpQualityScore`

Cenários:

- renderiza score `95/100` como peça excelente;
- renderiza score intermediário como peça boa;
- renderiza score baixo como peça crítica/precisa ajuste;
- exibe origem `IA`;
- exibe origem `Heurístico`;
- exibe `aspectRatio` quando fornecido;
- não quebra com listas vazias de recomendações;
- mantém `aria-label="Diagnóstico Magic Score"`.

### `MagicUpQualityChecklist`

Cenários:

- renderiza critérios aprovados;
- renderiza critérios reprovados;
- mostra score parcial;
- mostra recomendação individual;
- suporta 4–10 critérios;
- mantém estrutura acessível com `aria-label="Checklist de curadoria"`.

### `MagicUpCurationStatus`

Cenários:

- mostra status atual correto;
- renderiza todos os status:
  - Rascunho
  - Boa
  - Favorita
  - Aprovada internamente
  - Enviada ao cliente
  - Aprovada pelo cliente
  - Rejeitada
  - Precisa ajuste
- chama `onChange` ao clicar em cada status;
- desabilita botões quando `disabled=true`;
- mantém estado visual ativo correto.

### `MagicUpVariationComparator`

Cenários:

- não renderiza com 0 ou 1 variação;
- renderiza com 2+ variações;
- destaca melhor score automaticamente;
- permite selecionar variação;
- permite marcar vencedora;
- preserva `aria-label` em cada card;
- não propaga clique incorreto ao marcar vencedora;
- funciona quando uma variação não tem score.

---

## 2. Testes automatizados de estratégia e fallback

Criar/expandir testes para `magicUpStrategy.ts`.

Cenários:

- `buildMagicScore` calcula score com todos os requisitos completos;
- `buildMagicScore` reduz qualidade quando falta logo;
- `buildMagicScore` reduz qualidade quando falta cliente;
- `buildQualityDiagnosis` transforma score antigo em diagnóstico completo;
- critérios recebem IDs estáveis e sem acentos;
- riscos são gerados somente para critérios reprovados;
- recomendações são geradas para riscos;
- `source` do fallback é sempre `"heuristic"`;
- `CURATION_STATUSES` contém todos os status esperados.

---

## 3. Testes automatizados de hooks e integração de estado

Testar os fluxos principais em `useMagicUpGeneration` e `useMagicUpState` com mocks do cliente Cloud.

### Geração com score IA bem-sucedido

Simular:

- usuário autenticado;
- produto selecionado;
- imagem de produto;
- logo;
- prompt válido;
- função `generate-ad-image` retornando `imageUrl`;
- função `magic-up-score` retornando diagnóstico IA.

Validar:

- chama `generate-ad-image`;
- chama `magic-up-score` após gerar imagem;
- salva geração em `magic_up_generations`;
- persiste:
  - `quality_score`
  - `status: "draft"`
  - `metadata.qualityDiagnosis`
  - `metadata.qualitySource`
  - `metadata.curation`
  - `metadata.creativeControls`
  - `metadata.brief`
  - `metadata.brandKit`
- adiciona variação local com diagnóstico;
- define variação ativa;
- mostra toast de sucesso.

### Geração com falha no score IA

Simular:

- `generate-ad-image` retorna imagem;
- `magic-up-score` falha.

Validar:

- imagem continua sendo salva;
- fallback heurístico é usado;
- `source` vira `"heuristic"`;
- geração não falha;
- usuário não perde o resultado;
- histórico é invalidado.

### Falha na geração de imagem

Simular:

- `generate-ad-image` retorna erro.

Validar:

- não chama análise de score;
- não salva geração;
- exibe toast de erro;
- estado `generating` volta para `false`.

### Reanalisar Magic Score

Simular:

- variação atual com `id`;
- função `magic-up-score` retorna novo diagnóstico.

Validar:

- atualiza diagnóstico local;
- atualiza score da variação ativa;
- faz update em `magic_up_generations.quality_score`;
- invalida histórico;
- exibe toast de sucesso.

### Alterar status de curadoria

Simular:

- variação com `id`;
- clique em cada status.

Validar:

- estado local muda;
- variação ativa recebe novo status;
- update em `magic_up_generations.status`;
- histórico é invalidado;
- anúncio ARIA é disparado.

### Marcar variação vencedora

Simular:

- 3 variações com scores diferentes;
- usuário marca uma vencedora manualmente.

Validar:

- variação ativa muda;
- apenas uma variação fica com `isWinner=true`;
- diagnóstico da vencedora vira diagnóstico ativo;
- status da vencedora vira status ativo;
- toast informa a variação vencedora.

---

## 4. Testes da backend function `magic-up-score`

Validar a função de forma isolada.

### Pré-flight CORS

Testar:

- request `OPTIONS`.

Validar:

- retorna CORS corretamente;
- não exige body;
- não falha.

### Autenticação

Testar:

- sem token;
- token inválido;
- token válido.

Validar:

- sem token retorna erro de autenticação;
- token inválido retorna erro de autenticação;
- token válido segue o fluxo.

### Validação Zod

Testar payloads inválidos:

- body vazio;
- `imageUrl` curto;
- `imageUrl` ausente;
- campos opcionais nulos.

Validar:

- retorna `400`;
- retorna detalhes de validação;
- inclui CORS também nos erros.

### Resposta IA válida

Mockar resposta estruturada da IA.

Validar:

- parse via `safeJson`;
- validação por `DiagnosisSchema`;
- retorno contém `source: "ai"`;
- critérios ficam entre 4 e 10;
- scores ficam entre 0 e 100.

### Resposta IA inválida

Simular:

- resposta sem JSON;
- JSON com campos ausentes;
- critérios fora do limite;
- score acima de 100.

Validar:

- função retorna erro controlado;
- frontend consegue cair no fallback heurístico.

### Rate limit e quota

Validar comportamento para:

- limite mensal de IA;
- erro 429;
- erro 402;
- bloqueio por proteção anti-abuso.

---

## 5. Testes manuais no preview — cenários do dia a dia

Como o usuário pediu simulação real, após os testes automatizados vou usar o preview para validar a experiência prática.

### Cenário A — primeira geração comercial

Fluxo:

1. abrir Magic Up;
2. selecionar produto;
3. selecionar logo;
4. preencher/selecionar cenário;
5. gerar imagem;
6. aguardar score;
7. revisar score, checklist e curadoria.

Validações:

- loading aparece;
- imagem aparece;
- score aparece;
- checklist aparece;
- status inicia como Rascunho;
- botão “Reanalisar Magic Score” aparece;
- histórico recebe item com score/status.

### Cenário B — score com fallback

Simular falha da análise IA quando possível por mock/rede.

Validações:

- imagem gerada continua utilizável;
- diagnóstico heurístico aparece;
- UI não trava;
- histórico ainda salva score.

### Cenário C — curadoria operacional

Fluxo:

1. gerar ou abrir imagem do histórico;
2. alterar status para “Boa”;
3. alterar para “Aprovada internamente”;
4. alterar para “Enviada ao cliente”;
5. reabrir histórico.

Validações:

- badge do status muda imediatamente;
- status persiste;
- histórico mostra status atualizado.

### Cenário D — comparação de variações

Fluxo:

1. gerar 2 ou 3 variações;
2. alternar pelos dots;
3. alternar pelas thumbnails;
4. usar o comparador;
5. marcar uma vencedora.

Validações:

- melhor score é destacado;
- variação vencedora fica clara;
- imagem principal troca corretamente;
- score/checklist acompanham a variação ativa;
- thumbnails e dots continuam sincronizados.

### Cenário E — histórico enriquecido

Fluxo:

1. abrir histórico;
2. selecionar item antigo;
3. favoritar/desfavoritar;
4. excluir item somente se for dado de teste.

Validações:

- card histórico é navegável por mouse;
- card histórico é navegável por teclado;
- score/status aparecem;
- favorito não dispara seleção indevida;
- exclusão não dispara seleção indevida.

### Cenário F — mobile/responsivo

Viewport mobile:

- imagem;
- score;
- checklist;
- curadoria horizontal;
- botões de ação;
- histórico;
- comparador.

Validações:

- sem overflow quebrado;
- botões continuam tocáveis;
- status de curadoria rola horizontalmente;
- ações principais continuam visíveis.

### Cenário G — acessibilidade por teclado

Validar:

- foco visível;
- `Tab` alcança botões;
- `Enter`/`Space` seleciona histórico;
- botões icon-only têm `aria-label`;
- seções têm labels úteis;
- ARIA live anuncia geração/status quando aplicável.

---

## 6. Testes de regressão

Garantir que a Onda 5 não quebrou funcionalidades anteriores:

- renderização da página Magic Up;
- seleção de produto;
- seleção de cor;
- upload/preview de logo;
- Brand Kit da Onda 3;
- controles criativos da Onda 4;
- geração normal;
- download;
- compartilhamento WhatsApp;
- favoritos;
- histórico;
- batch generation.

---

## 7. Correções caso os testes encontrem bugs

Se algum problema aparecer durante os testes, vou corrigir antes de concluir a rodada.

Pontos de atenção já mapeados para validação rigorosa:

- reanálise de score atualiza `quality_score`, mas precisa confirmar se também deve atualizar `metadata.qualityDiagnosis`;
- alteração de status atualiza `status`, mas precisa confirmar se `metadata.curation` deve acompanhar;
- variação vencedora hoje é estado local; será verificado se precisa persistência;
- botão de favorito da imagem principal usa label genérico “Favoritar”; validar se precisa alternar para “Remover dos favoritos”;
- `safeJson` da função deve lidar com respostas parcialmente formatadas sem quebrar o fluxo de geração.

---

## 8. Entregável final após execução

Ao finalizar, vou entregar um relatório objetivo com:

- testes executados;
- módulos cobertos;
- cenários aprovados;
- bugs encontrados;
- correções aplicadas;
- testes que ficaram pendentes e motivo, se houver;
- status final da Onda 5:
  - aprovado;
  - aprovado com ressalvas;
  - ou bloqueado por bug externo.

## Arquivos que provavelmente serão envolvidos se houver correções

- `src/pages/magic-up/magicUpStrategy.ts`
- `src/hooks/useMagicUpGeneration.ts`
- `src/hooks/useMagicUpState.ts`
- `src/components/magic-up/AdImageResult.tsx`
- `src/components/magic-up/MagicUpQualityScore.tsx`
- `src/components/magic-up/MagicUpQualityChecklist.tsx`
- `src/components/magic-up/MagicUpCurationStatus.tsx`
- `src/components/magic-up/MagicUpVariationComparator.tsx`
- `src/pages/magic-up/MagicUpResultPanel.tsx`
- `supabase/functions/magic-up-score/index.ts`
- novos arquivos de teste em `tests/components/`, `tests/hooks/` e/ou `tests/services/`
