# Service Level Objectives (SLOs)

## 🎯 Objetivo Geral
Garantir que o sistema Promo Brindes opere com alta disponibilidade, baixa latência e integridade de dados absoluta.

## 📊 Métricas Críticas (SLIs)

| Serviço | Métrica | Objetivo (SLO) | Janela |
| :--- | :--- | :--- | :--- |
| **Plataforma (Uptime)** | Disponibilidade HTTP 2xx/3xx | **99.5%** | Mensal |
| **Catálogo / Busca** | Latência P95 | **< 800ms** | 24h |
| **Orçamentos (Edge)** | Taxa de Erro 5xx | **< 0.5%** | 7 dias |
| **Integração CRM** | Latência média (Bridge) | **< 2s** | 24h |
| **Webhooks** | Taxa de processamento OK | **> 99.9%** | Mensal |

## 🛠️ Monitoramento e Alertas

1.  **Alertas Críticos (Sentry/Log):**
    *   Taxa de erro > 5% em 5 minutos.
    *   Falha consecutiva de 3 webhooks.
    *   Latência P99 > 5s por 10 minutos.

2.  **Dashboard de Saúde:**
    *   Acessível em `/admin/telemetria` para supervisores e desenvolvedores.
    *   Monitoramento em tempo real de KPIs de negócio e técnicos.

## 🔄 Resiliência e Recuperação

*   **Circuit Breakers:** Implementados via `ADR-0005` para proteger contra falhas em APIs externas (Bitrix24, n8n).
*   **Backoff Exponencial:** Utilizado em todas as pontes de banco de dados e sincronização.
*   **DR Plan:** Snapshots semanais de esquema e migrations exportadas para storage off-site.

---
*Última atualização: 06/05/2026*
