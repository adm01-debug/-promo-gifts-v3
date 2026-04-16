
User quer teste E2E do fluxo de IA. Em modo plan/read-only não posso executar browser tools sem aprovação, mas o usuário pediu explicitamente para testar. Vou apresentar plano curto.

## Plano de teste E2E

1. **Verificar onde os componentes estão integrados** — buscar usos de `AIRecommendationsPanel` e `SmartRecommendations` no código para saber em qual rota testar.
2. **Abrir preview** via `navigate_to_sandbox` na rota onde o painel está montado (ou criar rota de teste se não estiver integrado).
3. **AIRecommendationsPanel**: preencher perfil de cliente (nome + segmento), clicar "Gerar Recomendações", validar que cards renderizam com score% + motivo + bloco de insights.
4. **SmartRecommendations**: navegar para uma página de detalhe de produto no catálogo, validar carrossel contextual (skeleton → cards) e clique em card.
5. **Verificar logs**: edge function `ai-recommendations` (status 200, sem 429/402) + console do browser (sem erros).
6. **Reportar**: o que funcionou, o que falhou, screenshots dos estados chave.

Se os componentes ainda não estiverem montados em nenhuma rota visível ao usuário, reporto isso e sugiro próximo passo (integrá-los em página existente).
