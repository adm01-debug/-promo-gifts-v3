

Status: 10/10 da auditoria original mantido + Onda de polimento (6/6) ✅ + Onda 4 Excelência Contínua (6/6) ✅. Agora proponho **Onda 5 — Excelência Operacional**, focada em adoção real das ferramentas criadas e fechamento de pontas soltas observadas no histórico.

## Onda 5 — 6 melhorias atômicas

### 1. Adotar `fetchWithBreaker` em edge functions com APIs externas
A onda 4 criou o wrapper `external-fetch.ts` mas só `external-db-bridge` e `crm-db-bridge` usam o breaker direto. Auditar e migrar para `fetchWithBreaker(<service>, ...)`:
- `bitrix-sync` + `sync-quote-bitrix` → service: `bitrix`
- `cnpj-lookup` → service: `cnpja`
- `dropbox-list` → service: `dropbox`
- `elevenlabs-tts` + `elevenlabs-scribe-token` → service: `elevenlabs`
- `image-proxy` (fetch a CDNs externos) → service: `image-cdn`

Cada chamada externa ganha graceful degradation automática.

### 2. Aplicar `<DeprecatedRoute>` nos paths legados
O componente foi criado mas ainda não está montado. Substituir o redirect "mudo" de `/comissoes`, `/admin/comissoes`, `/admin/performance`, `/admin/performance-comercial` por `<DeprecatedRoute message="..." redirectTo="..." />` em `App.tsx`.

### 3. Centralizar redirect legado de descontos via `<DeprecatedRoute>`
O `Navigate` atual de `/admin/aprovacoes-desconto → /admin/usuarios?tab=discounts` é silencioso. Trocar por `<DeprecatedRoute message="A gestão de descontos foi movida para a aba 'Descontos' em Usuários." redirectTo="/admin/usuarios?tab=discounts" />`.

### 4. Lint baseline + CI gate
Rodar `npm run lint:check` (criado na onda 4) pela primeira vez no escopo `src/**` e corrigir os warnings de baixo esforço (cores hardcoded residuais, imports não-usados, deps de hooks). Registrar contagem inicial em `mem://infrastructure/hardening-roadmap.md` como baseline.

### 5. Zod validation no `external-fetch.ts` — guard de URL
Adicionar validação que rejeita `url` sem `https://` (exceto em dev) para evitar SSRF acidental quando devs passam URLs montadas dinamicamente. Pequeno hardening defensivo.

### 6. Atualizar `mem://infrastructure/hardening-roadmap.md` com Onda 5
Documentar Onda 5 (status: completa) + introduzir seção "Adoção" para rastrear quais edge functions já migraram para `fetchWithBreaker`.

## Política

- Uma melhoria por vez, commits separados.
- Sem migration de banco.
- Reversível.
- Sem pausas, sem perguntas — sigo até o fim.
- Se descobrir uma 7ª de alto valor durante a execução, executo na sequência.

