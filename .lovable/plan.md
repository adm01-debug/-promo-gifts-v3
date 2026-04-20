
# Magic Up 10/10 — Execução sequencial até a meta

Vou continuar a evolução do Magic Up em ondas pequenas, uma por vez, sem perguntas intermediárias, mantendo excelência técnica, segurança, RLS, TypeScript estrito, acessibilidade e validação ao final de cada onda.

O que já existe como base recente:
- Briefing comercial básico.
- Presets de campanha.
- Brand notes.
- Direção de arte básica.
- Magic Score heurístico inicial.
- Copy comercial inicial.
- Persistência expandida em `magic_up_generations`.
- Tabelas estruturais iniciais para campanhas, brand kits, comentários, reactions e shares.
- `generate-ad-image` recebendo briefing, formato, qualidade, composição e negative prompt.

Agora vou completar o roadmap para transformar o módulo em uma suíte publicitária B2B 10/10.

## Onda 1 — Hardening da base implementada

Objetivo: deixar a base atual sólida antes de adicionar novas camadas.

### Ajustes
- Revisar o código recém-adicionado em:
  - `src/pages/MagicUp.tsx`
  - `src/pages/magic-up/MagicUpConfigPanel.tsx`
  - `src/pages/magic-up/MagicUpResultPanel.tsx`
  - `src/pages/magic-up/magicUpStrategy.ts`
  - `src/hooks/useMagicUpState.ts`
  - `src/hooks/useMagicUpGeneration.ts`
  - `supabase/functions/generate-ad-image/index.ts`
- Corrigir qualquer risco de:
  - tipo frouxo;
  - dependências instáveis em callbacks;
  - botões sem acessibilidade;
  - arrays inline que causem renderizações desnecessárias;
  - estados derivados mal memorizados;
  - inserções Cloud sem tratamento de erro;
  - layout com excesso visual ou desalinhamento mobile.

### Resultado
Magic Up atual estabilizado e preparado para receber as próximas ondas sem acumular débito técnico.

## Onda 2 — Campaign Studio completo

Objetivo: transformar o briefing simples em uma estrutura real de campanha.

### Frontend
Criar componentes modulares:
- `MagicUpCampaignPanel.tsx`
- `MagicUpCampaignSummary.tsx`
- `MagicUpCampaignPresets.tsx`

Funcionalidades:
- Criar campanha com título, cliente, objetivo, canal, público, tom, CTA e ocasião.
- Persistir campanha em `magic_up_campaigns`.
- Associar novas gerações à campanha ativa.
- Exibir resumo compacto no header.
- Permitir duplicar uma campanha para outro produto ou cliente.
- Estados:
  - rascunho;
  - em revisão;
  - enviada;
  - aprovada;
  - rejeitada.

### Backend
- Garantir RLS completa por `user_id`.
- Adicionar índices se necessário para:
  - `user_id`;
  - `client_id`;
  - `status`;
  - `created_at`.

### Resultado
O usuário não gera imagens soltas: ele trabalha dentro de campanhas reutilizáveis.

## Onda 3 — Brand Kit 10/10

Objetivo: tornar marca do cliente um ativo persistente e reutilizável.

### Frontend
Criar:
- `MagicUpBrandKitPanel.tsx`
- `MagicUpLogoLibrary.tsx`
- `MagicUpBrandSafetyChecklist.tsx`

Funcionalidades:
- Salvar Brand Kit por cliente:
  - logos;
  - cor primária;
  - cor secundária;
  - tom de voz;
  - estilo visual;
  - palavras obrigatórias;
  - palavras proibidas;
  - notas internas.
- Carregar automaticamente o Brand Kit ao selecionar cliente.
- Exibir checklist de marca:
  - logo presente;
  - cliente selecionado;
  - diretrizes preenchidas;
  - contraste recomendado;
  - uso de cor institucional.
- Preparar a UI para múltiplas versões de logo:
  - colorido;
  - branco;
  - preto;
  - horizontal;
  - vertical;
  - ícone.

### Edge Function
Criar ou reaproveitar:
- `analyze-logo-colors`

Para:
- extrair paleta aproximada do logo;
- sugerir cor primária/secundária;
- retornar alertas de contraste e qualidade.

### Resultado
Cada imagem passa a respeitar a identidade do cliente e reduz aparência genérica.

## Onda 4 — Geração Pro e refinamento criativo

Objetivo: dar controle real de direção de arte ao vendedor.

### Frontend
Criar:
- `MagicUpCreativeControls.tsx`
- `MagicUpRefinementActions.tsx`
- `MagicUpBatchGenerationPanel.tsx`

Funcionalidades:
- Modos criativos:
  - produto herói;
  - lifestyle;
  - flatlay;
  - premium;
  - social ads;
  - catálogo;
  - evento;
  - kit/combinação;
  - mockup realista.
- Composição:
  - produto central;
  - produto à esquerda;
  - produto à direita;
  - close-up;
  - fundo limpo;
  - ambiente com pessoas;
  - ambiente com props.
- Formatos:
  - 1:1;
  - 4:5;
  - 9:16;
  - 16:9;
  - A4;
  - WhatsApp.
- Negative prompts visuais:
  - sem texto na imagem;
  - sem mãos deformadas;
  - sem logo distorcido;
  - sem produto duplicado;
  - sem marca concorrente;
  - sem fundo poluído.
- Ações rápidas:
  - mais premium;
  - mais minimalista;
  - mais humano;
  - mais corporativo;
  - mais vibrante;
  - mais realista;
  - mais foco no produto;
  - menos elementos;
  - trocar fundo;
  - manter produto e logo, mudar cenário.
- Geração em lote:
  - 3 variações de cena;
  - 3 variações de canal;
  - pacote WhatsApp + Instagram + LinkedIn + orçamento.

### Edge Function
Evoluir `generate-ad-image` para:
- respeitar formato/canal;
- retornar metadados da geração;
- padronizar mensagens de erro;
- registrar `model`, `qualityMode`, `aspectRatio`, `creativeMode`.

### Resultado
Magic Up deixa de ser “gerar uma imagem” e vira um fluxo de direção de arte controlável.

## Onda 5 — Magic Score real + curadoria

Objetivo: ajudar o vendedor a escolher a melhor peça e evitar envio de imagens ruins.

### Frontend
Criar:
- `MagicUpQualityScore.tsx`
- `MagicUpQualityChecklist.tsx`
- `MagicUpVariationComparator.tsx`
- `MagicUpCurationStatus.tsx`

Funcionalidades:
- Score 0–100 com critérios:
  - clareza do produto;
  - visibilidade do logo;
  - adequação ao canal;
  - coerência com cliente;
  - qualidade visual;
  - potencial comercial.
- Checklist pós-geração:
  - produto visível;
  - logo legível;
  - cena coerente;
  - espaço para copy;
  - pronto para WhatsApp;
  - realismo visual;
  - composição limpa.
- Comparador de variações:
  - lado a lado;
  - destacar melhor score;
  - pontos fortes/fracos;
  - marcar vencedora.
- Status:
  - rascunho;
  - boa;
  - favorita;
  - aprovada internamente;
  - enviada ao cliente;
  - aprovada pelo cliente;
  - rejeitada;
  - precisa ajuste.

### Edge Function
Criar:
- `magic-up-score`

Com Zod validation e autenticação, usando Lovable AI para avaliar imagem + prompt + briefing quando houver imagem gerada.

### Resultado
Cada imagem recebe diagnóstico comercial, não apenas visual.

## Onda 6 — Copywriter + WhatsApp Pack

Objetivo: entregar a peça pronta para vender, não apenas a imagem.

### Frontend
Criar:
- `MagicUpCopyPanel.tsx`
- `MagicUpWhatsAppPack.tsx`
- `MagicUpCommercialMessageTemplates.tsx`

Funcionalidades:
- Gerar textos:
  - WhatsApp curto;
  - Instagram;
  - LinkedIn;
  - email;
  - CTA;
  - abordagem consultiva;
  - abordagem promocional;
  - abordagem premium.
- Copiar texto com um clique.
- Abrir WhatsApp com:
  - imagem;
  - mensagem;
  - CTA;
  - saudação com cliente;
  - link do produto/orçamento quando disponível.
- Salvar copy em `copy_pack`.

### Edge Function
Criar:
- `magic-up-copywriter`

Com:
- briefing;
- cliente;
- produto;
- canal;
- tom;
- CTA;
- Brand Kit;
- Zod validation;
- autenticação.

### Resultado
A imagem vira uma peça comercial pronta para envio.

## Onda 7 — Exportação profissional

Objetivo: tornar o resultado utilizável em canais reais imediatamente.

### Frontend
Criar:
- `MagicUpExportPackButton.tsx`
- `MagicUpExportPresetMenu.tsx`
- `MagicUpOverlayEditor.tsx`

Funcionalidades:
- Exportar:
  - PNG alta qualidade;
  - JPG leve para WhatsApp;
  - PDF A4;
  - Story 9:16;
  - Post 1:1;
  - LinkedIn 4:5;
  - Banner 16:9.
- Overlay opcional:
  - headline;
  - subheadline;
  - CTA;
  - logo cliente;
  - rodapé;
  - QR code de orçamento.
- White-label:
  - marca Promo Gifts;
  - marca do vendedor;
  - marca do cliente;
  - sem marca.

### Edge Function
Criar:
- `magic-up-export-pack`

Para gerar pacote de exportação e preparar evolução futura para ZIP.

### Resultado
O usuário não precisa de Canva ou edição externa para enviar a peça.

## Onda 8 — Biblioteca criativa avançada

Objetivo: transformar histórico em acervo comercial pesquisável.

### Frontend
Criar:
- `MagicUpCampaignLibrary.tsx`
- `MagicUpLibraryFilters.tsx`
- `MagicUpGenerationCard.tsx`
- `MagicUpDuplicateActions.tsx`

Funcionalidades:
- Filtros:
  - cliente;
  - produto;
  - SKU;
  - campanha;
  - canal;
  - status;
  - favorito;
  - data;
  - score;
  - tags.
- Ações:
  - duplicar configuração;
  - gerar variação;
  - aplicar a outro produto;
  - aplicar a outro cliente;
  - criar campanha parecida.
- Tags e notas internas.
- Smart empty state com:
  - presets recomendados;
  - exemplos;
  - últimas campanhas;
  - CTA para começar.

### Resultado
Magic Up vira biblioteca reutilizável de campanhas e ativos.

## Onda 9 — Aprovação pública

Objetivo: profissionalizar aprovação com cliente ou gestor.

### Backend
Revisar/evoluir:
- `magic_up_public_shares`
- `magic_up_comments`
- `magic_up_reactions`

Criar funções seguras para:
- buscar share por token válido;
- registrar reaction;
- registrar comentário;
- aprovar/reprovar;
- aplicar rate limit por IP hash.

### Edge Function
Criar:
- `magic-up-public-react`

Com:
- Zod validation;
- rate limit;
- IP hash;
- toggle de reação;
- suporte a comentário/aprovação.

### Frontend
Criar:
- `MagicUpApprovalShareDialog.tsx`
- `PublicMagicUpApprovalPage.tsx`

Adicionar rota pública:
```text
/magic-up/publica/:token
```

Funcionalidades públicas:
- ver imagem/campanha;
- aprovar;
- reprovar;
- comentar;
- reagir;
- baixar se permitido.

### Resultado
O fluxo deixa de depender de prints soltos e vira aprovação profissional.

## Onda 10 — Integrações comerciais

Objetivo: conectar Magic Up ao ecossistema inteiro.

### Catálogo
- Botão “Gerar campanha Magic Up” em produto.
- Preservar produto, variante/cor e imagem ativa.

### Favoritos/Coleções
- Gerar campanha para lista/coleção.
- Criar variações por item.
- Transformar coleção em campanha visual.

### Comparador
- Gerar criativo para produto recomendado.
- Criar criativo lado a lado para duelo.

### Orçamentos
- Criar orçamento com imagem Magic Up.
- Anexar imagem à proposta.
- Usar imagem como capa.
- Gerar mensagem de envio.

### Notificações
- Notificar:
  - geração concluída;
  - cliente aprovou;
  - cliente comentou;
  - geração falhou;
  - quota próxima do limite.

### Resultado
Magic Up vira motor visual transversal do funil comercial.

## Onda 11 — Produtividade, atalhos e acessibilidade

Objetivo: dar sensação de ferramenta premium e rápida.

### Atalhos
Adicionar:
- `G M` ir para Magic Up.
- `Ctrl/Cmd + Enter` gerar.
- `V` gerar variação.
- `H` histórico.
- `F` favoritar.
- `D` download.
- `W` WhatsApp.
- `B` banco de prompts.
- `P` prompt completo.
- `?` cheatsheet.

### Acessibilidade
- ARIA live para:
  - geração iniciada;
  - geração concluída;
  - erro;
  - imagem favoritada;
  - copy copiada.
- Botões icon-only com `aria-label`.
- Cards clicáveis com `role`, `tabIndex` e teclado.
- Foco visível.
- Menus acessíveis.

### Mobile
- Resultado em bottom sheet ou painel sticky mobile.
- Ações principais sempre visíveis.
- Histórico em carousel.
- Upload otimizado.
- Export rápido WhatsApp.

### Resultado
Magic Up fica rápido, acessível e eficiente no uso diário.

## Onda 12 — Analytics e governança de IA

Objetivo: controlar custo, qualidade e aprendizado comercial.

### Frontend
Criar:
- `MagicUpAnalyticsPanel.tsx`
- `MagicUpQuotaWidget.tsx`
- `MagicUpCostEstimate.tsx`

Métricas:
- gerações por usuário;
- gerações por cliente;
- produtos mais usados;
- canais mais usados;
- score médio;
- peças aprovadas;
- exports;
- uso de IA;
- status das campanhas.

### Governança
- Estimativa de custo antes de gerar.
- Modos:
  - rascunho rápido;
  - alta qualidade;
  - pro final;
  - variação barata;
  - refinamento premium.
- Evitar custo duplicado com cache por:
  - produto;
  - logo;
  - prompt;
  - canal;
  - configuração.

### Resultado
O módulo fica sustentável, mensurável e administrável.

## Onda 13 — QA abrangente e certificação 10/10

Ao final de cada onda:
- validar TypeScript/build;
- revisar console;
- testar fluxo principal;
- checar responsividade;
- checar acessibilidade básica.

No fechamento:
- testar geração completa:
  - selecionar cliente;
  - selecionar produto;
  - carregar logo;
  - montar briefing;
  - selecionar Brand Kit;
  - gerar imagem;
  - avaliar score;
  - gerar copy;
  - exportar;
  - compartilhar WhatsApp;
  - favoritar;
  - reabrir histórico;
  - criar link público;
  - comentar/aprovar publicamente.
- validar Cloud:
  - tabelas;
  - RLS;
  - edge functions;
  - logs;
  - rate limit;
  - token expirado;
  - usuário sem permissão.
- validar mobile.
- corrigir bugs encontrados antes de declarar 10/10.

## Arquivos previstos

### Frontend
- `src/pages/MagicUp.tsx`
- `src/pages/magic-up/MagicUpConfigPanel.tsx`
- `src/pages/magic-up/MagicUpResultPanel.tsx`
- `src/pages/magic-up/magicUpStrategy.ts`
- `src/pages/PublicMagicUpApprovalPage.tsx`
- `src/hooks/useMagicUpState.ts`
- `src/hooks/useMagicUpGeneration.ts`
- novos componentes em `src/components/magic-up/`

### Backend functions
- `supabase/functions/generate-ad-image/index.ts`
- `supabase/functions/generate-ad-prompt/index.ts`
- `supabase/functions/magic-up-score/index.ts`
- `supabase/functions/magic-up-copywriter/index.ts`
- `supabase/functions/magic-up-public-react/index.ts`
- `supabase/functions/magic-up-export-pack/index.ts`

### Banco
- Evoluir tabelas Magic Up já criadas.
- Adicionar RPCs seguras quando necessário.
- Garantir RLS por usuário.
- Garantir rate limit nos fluxos públicos.
- Não expor dados privados em rota pública.

### Memórias
Atualizar:
- `mem://features/magic-up-advertising-suite`
- `mem://features/keyboard-shortcuts-registry`

## Resultado final

Magic Up 10/10:
- campanha estruturada;
- Brand Kit por cliente;
- direção de arte controlável;
- geração por formato/canal;
- refinamentos rápidos;
- score de qualidade;
- copy comercial;
- WhatsApp Pack;
- export profissional;
- biblioteca criativa;
- aprovação pública;
- integrações com catálogo, favoritos, coleções, comparador e orçamentos;
- analytics e governança de IA;
- UX premium, acessível e mobile-first;
- validação completa de ponta a ponta.
