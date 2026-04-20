
# Magic Up 10/10 — Execução contínua das próximas ondas

O Magic Up já avançou com hardening inicial e Campaign Studio modular. Vou continuar a execução em sequência, uma melhoria por vez, sem perguntas intermediárias, até fechar o roadmap 10/10.

## Estado atual confirmado

- `magic_up_campaigns`, `magic_up_brand_kits`, `magic_up_generations`, `magic_up_comments`, `magic_up_reactions` e `magic_up_public_shares` já existem.
- RLS está ativa para o usuário gerenciar seus próprios dados.
- Índices principais já existem para campanhas, brand kits, gerações, comentários, reações e tokens públicos.
- Campaign Studio já foi iniciado com:
  - presets;
  - título/status;
  - salvar/atualizar campanha;
  - listar campanhas recentes;
  - duplicar campanha como rascunho;
  - associar geração à campanha ativa.

## Próxima execução: Onda 3 → Onda 13

### Onda 3 — Brand Kit 10/10

Criar uma camada real de identidade visual por cliente.

**Implementação:**
- Criar componentes:
  - `MagicUpBrandKitPanel`
  - `MagicUpLogoLibrary`
  - `MagicUpBrandSafetyChecklist`
- Integrar `magic_up_brand_kits` ao estado do Magic Up.
- Permitir salvar/carregar:
  - logo principal;
  - lista de logos;
  - cor primária;
  - cor secundária;
  - tom de voz;
  - estilo visual;
  - palavras obrigatórias;
  - palavras proibidas;
  - notas internas.
- Ao selecionar cliente, carregar automaticamente o Brand Kit vinculado.
- Melhorar o checklist atual de segurança de marca com:
  - logo presente;
  - cliente selecionado;
  - diretrizes preenchidas;
  - contraste básico;
  - uso de cor institucional;
  - risco de peça genérica.
- Persistir o Brand Kit sem duplicar dados do CRM externo.

**Validação:**
- Salvar Brand Kit.
- Reabrir Magic Up.
- Selecionar o mesmo cliente.
- Confirmar carregamento automático.

---

### Onda 4 — Geração Pro e refinamentos

Transformar a geração em direção de arte controlável.

**Implementação:**
- Modularizar os controles atuais em:
  - `MagicUpCreativeControls`
  - `MagicUpRefinementActions`
  - `MagicUpBatchGenerationPanel`
- Expandir os modos:
  - produto herói;
  - lifestyle;
  - flatlay;
  - premium;
  - social ads;
  - catálogo;
  - evento;
  - kit/combinação;
  - mockup realista.
- Expandir composição:
  - centro limpo;
  - produto à esquerda;
  - produto à direita;
  - close-up;
  - ambiente aberto;
  - com pessoas;
  - com props.
- Melhorar formato/canal:
  - 1:1;
  - 4:5;
  - 9:16;
  - 16:9;
  - A4;
  - WhatsApp.
- Adicionar refinamentos rápidos:
  - mais premium;
  - mais minimalista;
  - mais humano;
  - mais corporativo;
  - mais vibrante;
  - mais realista;
  - mais foco no produto;
  - menos elementos;
  - trocar fundo.
- Preparar geração em lote com fila local de variações.
- Evoluir `generate-ad-image` para padronizar:
  - `model`;
  - `qualityMode`;
  - `aspectRatio`;
  - `creativeMode`;
  - `compositionMode`;
  - mensagens de erro.

**Validação:**
- Gerar imagem com diferentes formatos.
- Confirmar metadados salvos em `magic_up_generations`.
- Confirmar que negative prompts entram no payload.

---

### Onda 5 — Magic Score real + curadoria

Elevar o score atual de heurístico para diagnóstico comercial útil.

**Implementação:**
- Criar componentes:
  - `MagicUpQualityScore`
  - `MagicUpQualityChecklist`
  - `MagicUpVariationComparator`
  - `MagicUpCurationStatus`
- Exibir score por critérios:
  - clareza do produto;
  - visibilidade do logo;
  - adequação ao canal;
  - coerência com cliente;
  - qualidade visual;
  - potencial comercial.
- Adicionar status de curadoria:
  - rascunho;
  - boa;
  - favorita;
  - aprovada internamente;
  - enviada ao cliente;
  - aprovada pelo cliente;
  - rejeitada;
  - precisa ajuste.
- Criar backend function `magic-up-score` com:
  - autenticação;
  - validação Zod;
  - uso do Lovable AI;
  - retorno estruturado com score, checklist e recomendações.
- Usar score heurístico como fallback se a análise IA falhar.

**Validação:**
- Gerar imagem.
- Rodar score.
- Persistir `quality_score` e metadados.
- Alterar status de curadoria.

---

### Onda 6 — Copywriter + WhatsApp Pack

Transformar imagem em peça comercial pronta para envio.

**Implementação:**
- Criar componentes:
  - `MagicUpCopyPanel`
  - `MagicUpWhatsAppPack`
  - `MagicUpCommercialMessageTemplates`
- Criar backend function `magic-up-copywriter` com:
  - autenticação;
  - validação Zod;
  - briefing;
  - produto;
  - cliente;
  - Brand Kit;
  - canal;
  - tom;
  - CTA.
- Gerar:
  - WhatsApp curto;
  - Instagram;
  - LinkedIn;
  - email;
  - CTA;
  - abordagem consultiva;
  - abordagem promocional;
  - abordagem premium.
- Permitir copiar cada texto.
- Abrir WhatsApp com texto pronto e link da imagem.
- Salvar resultado em `copy_pack`.

**Validação:**
- Gerar copy para cada canal.
- Copiar texto.
- Abrir WhatsApp.
- Confirmar persistência no histórico.

---

### Onda 7 — Exportação profissional

Permitir exportar peças prontas por canal.

**Implementação:**
- Criar componentes:
  - `MagicUpExportPackButton`
  - `MagicUpExportPresetMenu`
  - `MagicUpOverlayEditor`
- Adicionar presets:
  - PNG alta qualidade;
  - JPG leve para WhatsApp;
  - PDF A4;
  - Story 9:16;
  - Post 1:1;
  - LinkedIn 4:5;
  - Banner 16:9.
- Adicionar overlay opcional:
  - headline;
  - subheadline;
  - CTA;
  - logo cliente;
  - rodapé;
  - QR code futuro para orçamento.
- Criar backend function `magic-up-export-pack` para preparar exports profissionais.
- Salvar presets usados em `export_presets`.

**Validação:**
- Exportar PNG/JPG.
- Gerar PDF A4.
- Confirmar nomes de arquivo e qualidade visual.
- Testar mobile.

---

### Onda 8 — Biblioteca criativa avançada

Transformar histórico em acervo comercial pesquisável.

**Implementação:**
- Criar componentes:
  - `MagicUpCampaignLibrary`
  - `MagicUpLibraryFilters`
  - `MagicUpGenerationCard`
  - `MagicUpDuplicateActions`
- Adicionar filtros:
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
- Adicionar ações:
  - duplicar configuração;
  - gerar variação;
  - aplicar a outro produto;
  - aplicar a outro cliente;
  - criar campanha parecida.
- Melhorar empty state com presets e campanhas recentes.
- Preparar busca textual por metadados já persistidos.

**Validação:**
- Filtrar histórico.
- Duplicar uma geração.
- Criar variação a partir da biblioteca.
- Confirmar que favoritos continuam funcionando.

---

### Onda 9 — Aprovação pública

Criar fluxo profissional de validação com cliente.

**Implementação:**
- Criar rota pública:
  - `/magic-up/publica/:token`
- Criar página:
  - `PublicMagicUpApprovalPage`
- Criar componentes:
  - `MagicUpApprovalShareDialog`
  - `MagicUpPublicReactionBar`
  - `MagicUpPublicComments`
- Criar backend function `magic-up-public-react` com:
  - validação Zod;
  - rate limit por IP hash;
  - toggle de reação;
  - comentário;
  - aprovação/reprovação;
  - proteção contra token expirado.
- Permitir ao dono criar link público com:
  - expiração;
  - permissão de download;
  - permissão de comentários.
- Garantir que a rota pública exponha somente dados necessários.

**Validação:**
- Criar link.
- Abrir rota pública sem login.
- Reagir.
- Comentar.
- Aprovar/reprovar.
- Testar token expirado.

---

### Onda 10 — Integrações comerciais

Conectar Magic Up aos módulos existentes.

**Implementação:**
- Catálogo:
  - botão “Gerar campanha Magic Up” em produto;
  - preservar variante/cor/imagem ativa via URL params.
- Favoritos/Coleções:
  - iniciar campanha a partir de lista/coleção;
  - carregar múltiplos produtos como contexto.
- Comparador:
  - criar criativo para produto recomendado;
  - gerar criativo do vencedor.
- Orçamentos:
  - anexar imagem Magic Up;
  - usar imagem como capa;
  - gerar mensagem de envio.
- Notificações:
  - geração concluída;
  - cliente aprovou;
  - cliente comentou;
  - geração falhou.

**Validação:**
- Entrar no Magic Up via catálogo.
- Entrar via comparador.
- Criar orçamento com imagem.
- Confirmar navegação sem perda de contexto.

---

### Onda 11 — Produtividade, atalhos e acessibilidade

Dar sensação de ferramenta premium e rápida.

**Implementação:**
- Registrar atalhos:
  - `G M` ir para Magic Up;
  - `Ctrl/Cmd + Enter` gerar;
  - `V` gerar variação;
  - `H` histórico;
  - `F` favoritar;
  - `D` download;
  - `W` WhatsApp;
  - `B` banco de prompts;
  - `P` prompt completo;
  - `?` cheatsheet.
- Atualizar memória de atalhos.
- Adicionar ARIA live para:
  - geração iniciada;
  - geração concluída;
  - erro;
  - favorito;
  - copy copiada;
  - campanha salva.
- Garantir `aria-label` em botões icon-only.
- Garantir foco visível e navegação por teclado.
- Melhorar mobile:
  - ações principais sticky;
  - histórico compacto;
  - upload otimizado;
  - export rápido.

**Validação:**
- Testar atalhos.
- Testar navegação por teclado.
- Testar fluxo em viewport mobile.
- Verificar console sem warnings relevantes.

---

### Onda 12 — Analytics e governança de IA

Criar visibilidade de uso, qualidade e custo.

**Implementação:**
- Criar componentes:
  - `MagicUpAnalyticsPanel`
  - `MagicUpQuotaWidget`
  - `MagicUpCostEstimate`
- Mostrar métricas:
  - gerações por usuário;
  - gerações por cliente;
  - produtos mais usados;
  - canais mais usados;
  - score médio;
  - peças aprovadas;
  - exports;
  - status das campanhas.
- Adicionar estimativa antes da geração:
  - rascunho rápido;
  - alta qualidade;
  - pro final;
  - variação barata;
  - refinamento premium.
- Preparar cache lógico por:
  - produto;
  - logo;
  - prompt;
  - canal;
  - configuração.

**Validação:**
- Confirmar cards de analytics.
- Confirmar cálculo de score médio.
- Confirmar estados sem dados.
- Confirmar que não há exposição de custos sensíveis indevida.

---

### Onda 13 — QA e certificação 10/10

Fechar com testes completos do módulo.

**Validação final:**
- Selecionar cliente.
- Carregar Brand Kit.
- Selecionar produto.
- Escolher cor/variante.
- Enviar logo.
- Montar briefing.
- Selecionar direção de arte.
- Gerar imagem.
- Rodar Magic Score.
- Gerar copy.
- Exportar.
- Compartilhar WhatsApp.
- Favoritar.
- Reabrir histórico.
- Duplicar geração.
- Criar link público.
- Comentar/reagir/aprovar publicamente.
- Criar orçamento com imagem.
- Testar mobile.
- Testar acessibilidade básica.
- Revisar console e logs.
- Corrigir qualquer bug antes de declarar 10/10.

## Regras técnicas durante a execução

- Não editar manualmente arquivos gerados de integração Cloud.
- Não duplicar dados do banco externo localmente.
- Usar RLS e autenticação em todos os dados privados.
- Usar backend functions com Zod em fluxos sensíveis.
- Manter TypeScript estrito, sem `any`.
- Manter componentes modulares.
- Preservar design system atual.
- Usar cores semânticas e `var(--primary)` quando aplicável.
- Validar build/typecheck a cada onda relevante.

## Primeiro passo após aprovação

Começarei pela **Onda 3 — Brand Kit 10/10**, pois ela é a base estratégica para qualidade visual, consistência de marca, copywriter, score e aprovação pública.
