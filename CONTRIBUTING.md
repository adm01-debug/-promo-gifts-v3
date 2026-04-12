# 🤝 Guia de Contribuição — Promo Gifts

## 🔄 Fluxo de Trabalho

### Branches
- `main` — branch de produção (protegida)
- `feature/*` — novas funcionalidades
- `fix/*` — correções de bugs
- `hotfix/*` — correções urgentes em produção

### Processo
1. Crie branch a partir de `main`
2. Implemente a mudança
3. Garanta que `npm run lint` passa (0 erros)
4. Garanta que `npm run test` passa
5. Abra PR com descrição clara
6. Aguarde review e aprovação

## 📏 Padrões de Código

### TypeScript
- **Strict mode obrigatório** — `strict: true`
- **Zero `as any`** — use generics ou type guards
- **Return types explícitos** em funções públicas/hooks
- **Zod para validação runtime** em edge functions

### Componentes React
- **< 200 linhas** por componente
- **Responsabilidade única** — se faz mais de uma coisa, extraia
- **Props tipadas** — sem `Partial` desnecessário
- **Lazy loading** — use `lazyWithRetry()` para páginas

### Edge Functions
- **Auth**: Use `authenticateRequest()` de `_shared/auth.ts`
- **CORS**: Use `getCorsHeaders(req)` de `_shared/cors.ts`
- **Validação**: Use Zod schemas com `parseBodyWithSchema()` de `_shared/zod-validate.ts`
- **Erros**: Sempre try-catch com response JSON estruturado

### CSS/Tailwind
- **Tokens semânticos** — use variáveis CSS (`--primary`, `--background`), nunca cores diretas
- **HSL** em index.css e tailwind.config.ts
- **Mobile-first** — sempre considere responsividade

## 🧪 Testes

### Estrutura
```
tests/
├── components/     # Testes de componentes React
├── hooks/          # Testes de hooks
├── rls/            # Testes de Row Level Security
└── setup.ts        # Configuração global
```

### Convenções
- Arquivo de teste: `tests/<domínio>/<NomeDoComponente>.test.tsx`
- Use `describe` para agrupar, `it` para cada caso
- Mock de dependências externas (Supabase, APIs)
- Testes devem ser determinísticos — sem dependência de estado externo

### Executar
```bash
npm run test           # Todos os testes
npm run test:watch     # Modo interativo
npm run test:coverage  # Com relatório de cobertura
```

## 🗄️ Banco de Dados

### Migrations
- Use a ferramenta de migration do Supabase — nunca SQL manual em produção
- Toda tabela **DEVE** ter RLS habilitado
- Use `SECURITY DEFINER` functions para evitar recursão em policies
- Triggers de validação em vez de CHECK constraints para campos de status

### Naming
- Tabelas: `snake_case` (ex: `quote_items`)
- Colunas: `snake_case` (ex: `created_at`)
- Índices: `idx_<tabela>_<colunas>` (ex: `idx_quotes_seller_status`)
- Policies: Nome descritivo em inglês (ex: "Users can manage own quotes")

## 🔐 Segurança

### Obrigatório
- ✅ RLS em 100% das tabelas
- ✅ Validação Zod em edge functions
- ✅ `authenticateRequest()` em endpoints autenticados
- ✅ Sem secrets no código (usar Supabase Vault)
- ✅ Sem console.log em produção (usar `logger` de `src/lib/logger.ts`)

### Proibido
- ❌ `as any` sem justificativa documentada
- ❌ `console.log` em código de produção
- ❌ Secrets/credenciais hardcoded
- ❌ SQL raw sem parameterização
- ❌ Modificar `src/integrations/supabase/client.ts` ou `types.ts`

## 📋 Checklist de PR

- [ ] TypeScript compila sem erros (`npm run lint`)
- [ ] Testes passam (`npm run test`)
- [ ] Sem novos `as any`
- [ ] Sem `console.log` em código de produção
- [ ] RLS policies para novas tabelas
- [ ] Validação Zod em novas edge functions
- [ ] Componentes < 200 linhas
