
Vou criar o módulo **Business Intelligence** dentro de Ferramentas — uma central de inteligência comercial 360° por cliente, combinando histórico real (quando disponível) + dados mockados estratégicos + recomendações empíricas por ramo de atividade.

## Conceito UX — "BI Vendedor"

Tela única e densa, com seleção de cliente no topo e 4 zonas de inteligência abaixo. Tudo visualmente didático para o vendedor agir em segundos.

## Arquitetura da Página

### Topo — Seletor de Cliente
- Combobox `ClientPicker` (reaproveita `companies` do CRM, filtro `is_customer: true`).
- Ao selecionar: mostra card-resumo do cliente (nome fantasia, CNPJ, **ramo de atividade**, cidade, último contato).
- Empty state didático antes da seleção: "Selecione um cliente para gerar inteligência comercial personalizada".

### Zona 1 — Visão 360° do Cliente
3 KPIs lado a lado:
- **LTV** (soma de pedidos válidos) — usa `useClientOrdersHistory` real, fallback mock.
- **Ticket Médio** — real ou mock.
- **Última Compra** — data + dias atrás, badge colorido (verde <30d / âmbar 30-90d / vermelho >90d).
- Mini-timeline com últimos 5 pedidos (real ou mock).

### Zona 2 — "O Que Esse Cliente Gosta" (Personal Affinity)
- Top 5 categorias mais compradas pelo cliente.
- **Produtos similares ao histórico**: para cada categoria preferida, busca 3 produtos via `external-db-bridge` (`products` table, filtro por `main_category_id`). Reaproveita lógica de `useSimilarProducts`.
- Card visual com imagem, nome, preço, badge "Cliente já comprou X vezes desta categoria".

### Zona 3 — "Tendência do Setor" (Industry Intelligence)
- Baseado em `companies.ramo_atividade` do cliente selecionado.
- **Top 10 produtos vendidos por TODOS os vendedores para empresas do mesmo ramo** nos últimos 90 dias.
- Query agregada em `orders` + `order_items` + join com `companies` por ramo.
- Mock fallback: mapa empírico ramo → categorias (Seguros → garrafas/canetas premium, Farmacêutico → blocos/agendas, Tecnologia → mochilas/eletrônicos, Construção → kits ferramentas, etc).
- Card "Vendedores estão vendendo isso para Seguradoras" com ranking.

### Zona 4 — Recomendações Empíricas por Ramo
- Curadoria fixa (mockada inicialmente, editável por admin no futuro): mapa `INDUSTRY_RECOMMENDATIONS` em `src/lib/bi/industryRecommendations.ts`.
- Para cada ramo, lista de 5-8 categorias/produtos "que combinam".
- Diferenciado visualmente das recomendações de dados reais (badge "Sugestão do especialista").

### Ações em cada produto recomendado
- Botão "Adicionar ao Orçamento" → leva para `/orcamentos/novo?clientId=X&productIds=...`
- Botão "Ver detalhes" → `/produto/{id}`
- Botão "WhatsApp" → compartilha com cliente

## Implementação

### Arquivos novos
- `src/pages/BusinessIntelligencePage.tsx` — página principal
- `src/components/bi/ClientSelector.tsx` — combobox de clientes
- `src/components/bi/ClientOverview360.tsx` — KPIs + timeline
- `src/components/bi/ClientAffinityProducts.tsx` — Zona 2
- `src/components/bi/IndustryTrendingProducts.tsx` — Zona 3
- `src/components/bi/EmpiricalRecommendations.tsx` — Zona 4
- `src/components/bi/BIProductCard.tsx` — card unificado de produto recomendado
- `src/hooks/bi/useClientBI.ts` — orquestra LTV + ticket + última compra (real + mock)
- `src/hooks/bi/useClientAffinity.ts` — categorias preferidas + produtos similares
- `src/hooks/bi/useIndustryTrends.ts` — agregação por ramo (real + mock)
- `src/lib/bi/industryRecommendations.ts` — mapa empírico ramo→categorias
- `src/lib/bi/mockData.ts` — dados mockados realistas para fallback

### Editar
- `src/App.tsx` — rota `/ferramentas/bi`
- `src/components/layout/Sidebar.tsx` (ou onde está "Ferramentas") — adicionar item "Business Intelligence" com ícone `Brain`/`TrendingUp`
- `mem://index.md` — referência ao novo módulo

### Sem migration neste sprint
Tudo lê de tabelas existentes (`companies`, `orders`, `order_items`, `products`). Quando o sistema de pedidos amadurecer, mocks viram queries reais sem mudar UI.

### Padrões aplicados
- `MainLayout` + `PageSEO` + `max-w-[1920px]` (Layout Routes Pattern).
- Cards com `rounded-xl`, `border-[1.5px]`, `font-display`.
- Skeletons sofisticados durante loading.
- Badge "Dados simulados · em breve dados reais" nos blocos com mock, para transparência.
- A11y: `role="button"`, `tabIndex={0}` em cards clicáveis.

## Fora de escopo (follow-up)
- Editor admin para `industryRecommendations` (hoje hardcoded).
- Export PDF do dossiê do cliente.
- Comparativo "este cliente vs média do setor".
