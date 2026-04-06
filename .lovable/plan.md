
# Sistema de Rastreamento de Consumo de IA (AI Usage Tracking)

## 1. Tabela `ai_usage_logs`
Registra cada chamada de IA com detalhes completos:
- `user_id`, `function_name` (ex: generate-ad-image, ai-recommendations)
- `model` (ex: google/gemini-3-flash-preview, openai/gpt-5)
- `input_tokens`, `output_tokens`, `total_tokens`
- `estimated_cost_usd` (calculado com base na tabela de preços por modelo)
- `duration_ms`, `status` (success/error), `error_message`
- `metadata` (JSONB para contexto adicional)

## 2. Tabela `ai_usage_quotas`
Define limites mensais por role:
- `role` (app_role enum), `monthly_limit` (requests), `is_unlimited` (boolean)
- Valores padrão: admin=ilimitado, manager=500 req/mês, vendedor=100 req/mês

## 3. Função `check_ai_quota` (SECURITY DEFINER)
- Verifica se o usuário ainda tem quota disponível no mês corrente
- Retorna `allowed: boolean`, `used: number`, `limit: number`, `remaining: number`

## 4. Middleware nas Edge Functions
- Antes de cada chamada de IA, verificar quota via `check_ai_quota`
- Após a chamada, registrar em `ai_usage_logs` com tokens e custo
- Retornar erro 429 se quota excedida

## 5. Dashboard Admin (`/admin/consumo-ia`)
- Cards de resumo: total de requests, custo total, top usuários
- Gráfico de consumo por período (dia/semana/mês)
- Tabela detalhada com filtros por usuário, função e modelo
- Gestão de quotas por role

## 6. Widget do Usuário (perfil ou sidebar)
- Barra de progresso: X/Y requests usados no mês
- Lista das últimas chamadas com custo estimado
- Alerta quando próximo do limite (80%+)

## RLS
- Usuários só veem seus próprios logs
- Admins veem todos os logs
- Apenas admins podem gerenciar quotas
- Insert restrito a `service_role` (via edge functions)
