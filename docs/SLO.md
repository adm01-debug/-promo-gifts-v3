# Service Level Objectives (SLOs) - Gift Store 🚀

Este documento define os SLOs críticos para garantir uma experiência de "World-Class Engineering".

## 1. Performance (Core Web Vitals)

| Métrica | Target (P75) | Alerta (Critical) | Descrição |
|---------|--------------|-------------------|-----------|
| **LCP** | < 1.2s | > 2.5s | Largest Contentful Paint (Página de Produto) |
| **INP** | < 100ms | > 200ms | Interaction to Next Paint (Fluidez UI) |
| **CLS** | < 0.05 | > 0.1 | Cumulative Layout Shift (Estabilidade Visual) |
| **TBT** | < 150ms | > 300ms | Total Blocking Time (Main thread health) |

## 2. Infraestrutura Backend (Edge Functions)

| Métrica | Target (P95) | Alerta (Critical) | Descrição |
|---------|--------------|-------------------|-----------|
| **Latência API** | < 250ms | > 800ms | Tempo de resposta das Edge Functions |
| **Erro Rate** | < 0.1% | > 1.0% | Taxa de falhas (5xx) |
| **Cold Starts** | < 400ms | > 1000ms | Impacto do primeiro acesso pós-idle |

## 3. Disponibilidade e Confiabilidade

| Métrica | Target | Janela | Descrição |
|---------|--------|--------|-----------|
| **Uptime** | 99.9% | Mensal | Disponibilidade do dashboard e catálogo |
| **Data Freshness** | < 15m | - | Delay de sincronização Bitrix24 -> App |
| **Cache Hit Rate** | > 85% | - | Eficiência do TanStack Query + Edge Cache |

## 4. Segurança e Resiliência

| Métrica | Target | Descrição |
|---------|--------|-----------|
| **Brute Force Detection** | < 5 attempts | Tempo para lockout persistente |
| **Secrets Rotation** | 90 dias | Frequência de rotação automática de chaves |
| **RLS Coverage** | 100% | Cobertura de testes automatizados de matriz role x CRUD |

---
*Atualizado em: 6 de Maio de 2026*
