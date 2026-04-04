## Plano de Implementação — Melhorias Frontend

### Fase 1: Cron Jobs (cleanup/digest/process-queue)
1. Garantir que `cleanup-notifications`, `cleanup-novelties`, `send-digest`, e `process-queue` estão configurados como pg_cron jobs (sem necessidade de UI)

### Fase 2: Integração `ai-recommendations` no Frontend
2. Criar hook `useAIRecommendations` e componente de recomendações no catálogo/dashboard

### Fase 3: Integração `send-notification` no Frontend  
3. Criar `notificationService` que dispara notificações nos eventos-chave (mudança status orçamento, novo pedido, etc.)

### Fase 4: UI Admin — Login Attempts Dashboard
4. Criar página `/admin/login-attempts` com tabela de tentativas de login

### Fase 5: UI — Histórico de Mockups  
5. Criar página `/mockups/historico` dedicada

### Fase 6: UI Admin — Video Variant Links
6. Criar gerenciamento de vídeos por variante de produto

### Fase 7: Integração `generate-mockup-nanobanana`
7. Conectar gerador alternativo de mockup no fluxo existente

### Fase 8: Integração `dropbox-list`
8. Criar componente de navegação de arquivos Dropbox

### Fase 9: `external-db-inspect` Admin Tool
9. Criar ferramenta de debug admin para inspeção do banco externo

### Fase 10: Webhooks (product-webhook, webhook-dispatcher)
10. Criar painel admin de webhooks com logs
