
# BI 10/10 — Refinamentos finais (Onda 5)

Tudo do plano original (Sprints 1+2+3 + Onda 4) já foi entregue: Health Hero, Churn Banner, Timeline enriquecida, Bundle, Lookalikes, Executive Summary + PPTX, Gap analysis, Share-of-Wallet, Toggle temporal, Sazonalidade preditiva, Skeletons especializados e cromática semântica.

Para fechar o 10/10 com excelência, restam **6 refinamentos de polish & diferenciação** identificados na auditoria original mas ainda não implementados:

## Itens restantes (executar 1 a 1, sem pausas)

1. **Notificações proativas de sazonalidade** — trigger no `notificationService` que dispara workspace_notification quando cliente entra a 7d de pico sazonal detectado pelo `useClientSeasonality`. Card "📅 Acme entra em pico em 7 dias" no sino.

2. **Comparador de clientes (até 3)** — novo componente `ClientComparator.tsx` + rota `/ferramentas/bi/comparar`. Tabela lado-a-lado: Health Score, LTV, ticket, frequência, top categoria, próximo pico. CTA do BI principal: "Comparar com outro cliente".

3. **Link público assinado do dossiê** — edge function `bi-share-dossier` gera token JWT curto (7d) + página pública `/dossie/:token` read-only para gestor. Botão "Compartilhar" ao lado de PDF/PPTX.

4. **Modo "Briefing pré-reunião" mobile-first** — refinar `BIBriefingMode` existente: layout 1 página otimizado para leitura no celular (Health Score grande, 3 talking points, 5 produtos, script de abertura), botão "Adicionar ao calendário (.ics)".

5. **Anomalia detectada inline** — badge "⚠ Pedido atípico" na timeline quando `ticket > avg + 2σ` ou `< avg - 2σ`. Tooltip explicando o desvio. Lógica em `useClientBI` (já tem orders).

6. **Tour guiado primeira visita** — `BITourGuide.tsx` usando `react-joyride` (já no projeto) com 5 passos: Health Score → Churn Banner → Timeline → Sazonalidade → AI Copilot. Persiste em localStorage.

## Detalhes técnicos
- **Notificações**: usar `notificationService.send({type: 'bi_seasonal_peak'})`; cron diário verifica clientes do vendedor com pico em 7d.
- **Comparador**: hook `useClientsComparison(ids: string[])` que paraleliza `useClientHealthScore` + `useClientBI` por cliente.
- **Link público**: token assinado HMAC com `client_id + expires_at`; página renderiza versão estática do dossiê sem auth.
- **Anomalia**: cálculo no `useClientBI`, retorna `orders.map(o => ({...o, isAnomaly: bool, deviation: number}))`.
- **Tour**: `react-joyride` com `disableScrolling: false`, target via data-attrs nos componentes existentes.

## Arquivos
**Criar:** `ClientComparator.tsx`, `useClientsComparison.ts`, `BITourGuide.tsx`, `ClientComparatorPage.tsx`, `bi-share-dossier/index.ts` (edge function), `PublicDossierPage.tsx`.
**Editar:** `BusinessIntelligencePage.tsx` (botões Compartilhar/Comparar/Tour), `EnrichedOrdersTimeline.tsx` (badge anomalia), `useClientBI.ts` (cálculo σ), `BIBriefingMode.tsx` (mobile polish + .ics), `App.tsx` (rotas), `notificationService.ts` (tipo novo).

Sem mudanças de schema. 1 edge function nova. ~10 arquivos tocados.

Aprovar → executo os 6 itens em sequência sem perguntar.
