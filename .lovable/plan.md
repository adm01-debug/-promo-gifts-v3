
# Auditoria Estratégica — Business Analytic 10/10

Análise como Product Designer Strategist sobre os 7 screenshots do modo demo. Foco: hierarquia, densidade informacional, narrativa comercial, ação, e diferenciação competitiva.

---

## 1. Diagnóstico do estado atual

**Pontos fortes:**
- 6 zonas estruturadas com fallback mock funcional
- Badge real/simulado transparente
- Heatmap de sazonalidade visualmente competente
- Export PDF funciona

**Gaps críticos identificados nos screenshots:**

### A) Hierarquia & narrativa
- Header genérico ("Business Analytic / Inteligência comercial 360°") **sem síntese executiva**. O vendedor abre e precisa rolar tudo pra entender se o cliente é quente/frio/risco.
- 6 zonas igualmente pesadas — **falta priorização**. Onde olhar primeiro?
- Zonas desconectadas. Zona 5 (sazonalidade) diz "estamos no pico" mas não conecta com Zona 3/4/6 ("compre agora estes produtos").

### B) Densidade & escaneabilidade
- "Últimos pedidos" é lista vertical pura — **sem sparkline de evolução**, sem indicador de margem, sem status (aprovado/perdido).
- Tendência do setor: 10 produtos em lista linear sem agrupamento, sem comparação contra o que o cliente já compra ("gap de oportunidade").
- Cliente×Setor: 4 métricas isoladas. Falta **score consolidado** (Health Score 0-100).

### C) Acionabilidade
- Cards de produto têm "Adicionar a Orçamento" mas **não há CTA macro**: "Criar orçamento de oportunidade com top 5 sugestões em 1 clique".
- Insights são textos estáticos. Não há **próxima ação recomendada** (ex: "Ligar agora · script sugerido · enviar campanha").
- Sem **timeline de follow-up** (última interação, próxima sugerida).

### D) Inteligência ausente
- Sem **risco de churn** (cliente sumindo? frequência caindo?).
- Sem **share-of-wallet estimado** (quanto do orçamento dele estamos pegando vs potencial).
- Sem **comparação temporal** (este trimestre vs anterior).
- Sem **detecção de anomalias** (mês fora do padrão, ticket atípico).
- Sem **clustering de personas** ("este cliente se parece com X outros — eles também compraram Y").

### E) Estética & polish
- Excesso de cards retangulares iguais → monotonia visual. Falta **variação de peso** (hero card, ribbon, donut, sparkline inline).
- Cores: violeta dominante na sazonalidade compete com badges amarelas. Sem hierarquia cromática semântica (verde=saúde, âmbar=atenção, vermelho=risco).
- "Últimos pedidos" sem timeline visual (dots conectados por linha vertical).

---

## 2. Roadmap de melhorias (priorizado por impacto × esforço)

### 🥇 Onda 1 — Quick wins de narrativa (alto impacto, baixo esforço)

1. **Health Score Card no topo** (substituindo header passivo)
   - Score 0-100 calculado a partir de: recência (30%) + frequência (25%) + ticket vs setor (20%) + crescimento trimestral (15%) + share-of-wallet (10%)
   - Badge: 🟢 Saudável (>75) · 🟡 Atenção (50-75) · 🔴 Risco (<50)
   - 3 chips: "Próxima ação · Script sugerido · Janela ideal"

2. **Hero CTA contextual**
   - "🎯 Cliente em pico sazonal · Crie orçamento com 5 produtos sugeridos" (botão grande, gradient violet)
   - Pré-popula o Quote Builder com Top 3 afinidade + Top 2 tendência setor

3. **Insight cross-zona no topo**
   - Frase única gerada das 6 zonas: "Acme está em mês de pico (+38%), com LTV 27% acima do setor, mas frequência caiu 15% no último trimestre — momento ideal para reativação com kit premium"

### 🥈 Onda 2 — Densidade & visualização (médio esforço, alto impacto)

4. **Timeline de pedidos enriquecida** (substitui "Últimos pedidos")
   - Vertical timeline com dots conectados, sparkline de ticket por pedido, ícone de status (✓ aprovado / ✗ perdido / ⏳ pendente), margem % inline
   - Filtro: Últimos 30/90/365 dias

5. **Cliente×Setor com gap de oportunidade**
   - Adicionar 5ª métrica: "Share-of-wallet estimado: 23% (potencial R$ 162k não capturado)"
   - Cada métrica vira clicável → drill-down modal com histórico

6. **Tendência do setor com "gap analysis"**
   - Coluna "Cliente já compra?" com check/X
   - Filtro: "Mostrar só produtos que cliente NÃO compra" (oportunidades puras)
   - Top 3 viram hero cards (imagem grande, % adoção no setor, projeção de receita)

7. **Afinidade com bundle suggestions**
   - "Clientes similares também compraram juntos: Garrafa + Squeeze + Necessaire (R$ 95 → kit R$ 240)"
   - Botão "Criar bundle no orçamento"

### 🥉 Onda 3 — Inteligência avançada (maior esforço)

8. **Risk & churn signals** (nova zona ou banner)
   - Detecção: frequência caindo, ticket caindo, recência > 2x média
   - Banner vermelho com ação: "⚠ Risco de churn detectado · Última compra há 80d (média 45d) · Ligar hoje"

9. **Comparação temporal lado-a-lado**
   - Toggle "Este trimestre vs anterior" em todas as métricas
   - Setas + variação % em verde/vermelho

10. **Clustering & lookalikes**
    - "Clientes parecidos com este (n=12 do setor Tecnologia, ticket similar) também compraram: [3 produtos]"
    - Powered by quote_items + ramo_atividade matching

11. **Sazonalidade preditiva**
    - Heatmap atual + linha pontilhada projetada para próximos 6 meses (regressão simples)
    - Card "Janela de campanha sugerida: 15-30 abr" com botão "Agendar follow-up"

### 🎨 Onda 4 — Polish visual & UX

12. **Variação de peso visual**
    - Health Score = hero card 2x altura, gradient sutil
    - Insights = cards com ícone grande e tipografia maior
    - Métricas = mini cards densos
    - Timeline = layout assimétrico

13. **Sistema cromático semântico**
    - Verde = saúde/oportunidade · Âmbar = atenção · Vermelho = risco · Violeta = sazonalidade · Azul = neutro/info
    - Substituir badges amarelas "Simulado" por badge cinza discreta no canto

14. **Skeleton states ricos**
    - Skeleton com forma da zona (não retângulo genérico) → reduz CLS percebido

15. **Print-ready / shareable**
    - Botão "Copiar resumo executivo" → 3 parágrafos prontos pra WhatsApp
    - Botão "Agendar reunião com cliente" (integra com calendário se houver)

### 🚀 Onda 5 — Diferenciação competitiva

16. **Modo "Briefing pré-reunião"**
    - View compacta 1 página: Health Score + 3 talking points + 5 produtos sugeridos + script de abertura
    - Otimizado para leitura mobile no Uber a caminho do cliente

17. **AI Copilot inline (Lovable AI · gemini-2.5-flash)**
    - Botão "❓ Pergunte ao BI" → chat lateral: "Por que a frequência caiu?" / "Qual produto tem maior chance de fechar?"
    - Respostas grounded nos dados da página

18. **Notificações proativas** (workspace_notifications)
    - Trigger automático quando cliente entra em pico sazonal, ou quando risk score cruza threshold
    - "📅 Acme entra em pico em 7 dias · revisar carteira"

19. **Comparador de clientes**
    - Selecionar 2-3 clientes e ver lado-a-lado (benchmark interno da carteira)

20. **Export expandido**
    - PDF atual ✅
    - PowerPoint editável (.pptx) para reuniões
    - Link público assinado (compartilhar com gestor)

---

## 3. Sugestão de execução

Recomendo executar em **3 sprints sequenciais autônomos** (preferência do usuário):

- **Sprint 1 (Onda 1 + parte da 4):** Health Score + Hero CTA + Insight cross-zona + sistema cromático semântico → transforma a primeira tela em ferramenta de decisão imediata.
- **Sprint 2 (Onda 2):** Timeline enriquecida + gap analysis + bundles + share-of-wallet → vira ferramenta de venda consultiva.
- **Sprint 3 (Onda 3 + 5):** Churn signals + comparação temporal + AI Copilot + briefing pré-reunião → diferenciação competitiva real.

**Onda 4 e 5 restantes** entram como polish ao final de cada sprint.

Aprove e digo qual sprint começar (ou "todos sequencialmente" mantendo seu modo autônomo).
