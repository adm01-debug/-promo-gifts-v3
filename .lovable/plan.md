

# Kit Maker — Auditoria de Product Design Strategist

Análise do estado atual e recomendações de excelência, organizadas por impacto estratégico.

---

## 1. Diagnóstico do Estado Atual

**Pontos fortes já implementados:**
- Wizard 4 steps com indicador de progresso, autosave, undo/redo, templates, sugestões inteligentes, validação de volume/peso, freight estimator, PDF export, WhatsApp share, margin simulator, kit comparison, stock validation.

**Gaps críticos identificados:**
- Falta de **visualização 3D/2D real** da caixa com itens dentro (KitVisualPreview existe mas não está integrado no fluxo principal).
- **Sem feedback de viabilidade comercial** em tempo real (margem, ponto de equilíbrio, comparativo com kits similares vendidos).
- **Personalização desconectada do mockup visual** — usuário configura sem ver resultado.
- **Sem gestão de versões/variantes do mesmo kit** (ex: Kit Onboarding G/M/P).
- **Resumo final pobre em storytelling** — não vende o kit ao cliente final.
- **Sidebar fixa** consome espaço; em mobile fica ruim.
- **Sem inteligência de ocasião** (aniversário, fim de ano, evento) guiando seleção.

---

## 2. Melhorias Propostas (priorizadas por ROI)

### TIER 1 — Transformacionais (impacto direto em conversão)

**1.1 Preview Visual 3D Interativo da Caixa**
- Renderizar caixa com itens empilhados em proporção real (Three.js leve ou SVG isométrico).
- Drag-and-drop para reorganizar disposição interna.
- Indicador visual de espaço sobrando/excedido em cor semântica.
- Botão "ver como cliente vê" → preview presenteável.

**1.2 Mockup de Personalização ao Vivo**
- Ao configurar gravação na caixa/item, mostrar preview com logo aplicado (reutilizar pipeline do Mockup module).
- Toggle "ver com/sem personalização" no preview 3D.

**1.3 Inteligência Comercial Embutida**
- Card "Saúde do Kit": margem %, comparativo com média de kits do mesmo tipo, alerta se preço fora do range competitivo.
- "Kits similares vendidos nos últimos 90 dias" com taxa de aprovação em orçamentos.
- Sugestão de ajuste de quantidade para atingir faixa de preço-alvo (ex: "para R$80/kit, reduza X").

**1.4 Modo Ocasião (Occasion-driven Builder)**
- Antes do step Caixa, perguntar opcionalmente: "Para qual ocasião?" (Boas-vindas, Fim de ano, Evento, Aniversário, Cliente VIP, Reativação).
- Filtra templates, sugere caixas/itens contextuais, ajusta tom da personalização sugerida.

---

### TIER 2 — Excelência operacional (reduz fricção)

**2.1 Multi-variante do Mesmo Kit**
- Permitir criar tamanhos (P/M/G) ou versões (Standard/Premium) dentro do mesmo "Kit Master".
- Comparativo lado-a-lado de preço/conteúdo entre versões.
- Exporta orçamento com as 3 opções automaticamente.

**2.2 Resumo "Apresentável" para Cliente**
- Step 4 vira preview de **proposta visual** com: foto montada, descrição narrativa gerada por IA ("Este kit foi pensado para..."), tabela de itens, preço, prazo, gravação.
- Botão "gerar link público compartilhável" (sem precisar criar orçamento).

**2.3 Validações Inteligentes em Tempo Real**
- Detectar conflitos: itens incompatíveis (ex: chocolate + caixa sem isolamento térmico), peso excede frete econômico, prazo de gravação > prazo do cliente.
- Banner contextual com solução sugerida ("Trocar por caixa térmica").

**2.4 Atalhos de Produtividade**
- Cmd+K para busca rápida de itens dentro do builder.
- Duplicar kit existente em 1 clique.
- "Salvar como template pessoal" para reuso.

---

### TIER 3 — Refinamentos UX/UI

**3.1 Layout Responsivo Repensado**
- Mobile: sidebar vira bottom-sheet sticky com resumo de preço/volume.
- Desktop ultrawide: aproveitar espaço para preview 3D + builder + sidebar simultâneos.

**3.2 Onboarding Contextual**
- Tour guiado de 30s na primeira visita (Shepherd.js ou similar).
- Tooltips progressivos nos primeiros 3 kits criados.

**3.3 Feedback Háptico/Sonoro Sutil**
- Micro-animações ao adicionar item (item "voa" para a caixa).
- Sound design opcional (toggle).

**3.4 Acessibilidade & Performance**
- Atalhos de teclado para navegação entre steps (←/→, números 1-4).
- Skeleton loaders mais sofisticados.
- Lazy load do preview 3D.

---

### TIER 4 — Diferenciação competitiva (longo prazo)

**4.1 IA Generativa de Kits**
- Prompt natural: "Quero um kit para 50 colaboradores, R$120/cabeça, tema sustentabilidade" → IA monta proposta.
- Usar Lovable AI Gateway (gemini-2.5-pro).

**4.2 Histórico & Analytics do Kit**
- Quantas vezes foi orçado, taxa de aprovação, ticket médio gerado, sazonalidade.
- Painel "meus kits campeões".

**4.3 Colaboração**
- Compartilhar kit em construção com colega (link de edição).
- Comentários inline em itens ("trocar por opção mais barata?").

**4.4 Integração com Estoque Futuro**
- Validar disponibilidade na quantidade desejada considerando reposição prevista.
- Sugerir data ideal de fechamento do orçamento.

---

## 3. Roadmap Sugerido (sequencial, autônomo)

**Sprint 1 (quick wins):** 2.4 atalhos, 2.3 validações, 3.1 mobile bottom-sheet, 3.4 atalhos teclado.
**Sprint 2 (visual):** 1.1 preview isométrico SVG, 1.2 mockup personalização, 2.2 resumo apresentável.
**Sprint 3 (inteligência):** 1.3 saúde do kit, 1.4 modo ocasião, 4.1 IA generativa.
**Sprint 4 (escala):** 2.1 multi-variante, 4.2 analytics, 4.3 colaboração, 4.4 estoque futuro.

---

## 4. Recomendação Imediata

Sugiro começar pelo **Sprint 1 + item 2.2 (Resumo Apresentável)** — máximo impacto percebido pelo usuário com menor esforço de engenharia, sem dependências externas (3D, IA). Posso executar autonomamente uma melhoria por vez seguindo a preferência registrada.

