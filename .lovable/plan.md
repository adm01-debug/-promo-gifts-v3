

Usuário pediu para continuar executando melhorias rumo ao 10/10, autonomamente, uma de cada vez. Como estou em plan mode, preciso apresentar o plano da próxima onda de melhorias antes de executar.

Status atual conhecido (via `mem://infrastructure/hardening-roadmap`): **10/10 já atingido** nas 28 melhorias da auditoria original (Ondas 1, 2, 3 ✅). Então o que ainda faz sentido executar agora? Olhando o histórico recente desta sessão, fizemos 3 remoções grandes (Performance Comercial, Performance Runtime, Comissões) e a unificação de Gestão de Descontos em Usuários. Isso gera **dívida residual**: arquivos órfãos, referências quebradas em docs, memórias desatualizadas, possíveis testes RLS ainda apontando para tabelas dropadas, e oportunidades de polimento descobertas no caminho.

## Próxima onda — "Polimento pós-remoções + hardening incremental"

Vou executar **6 melhorias atômicas**, uma por vez, em ordem de menor risco → maior valor:

### 1. Auditoria de referências órfãs (3 features removidas)
Buscar no código, docs e testes por menções residuais a:
- `commission_entries`, `commission_rules`, `useCommissions`, `/comissoes`
- `web_vitals`, `useWebVitalsSummary`, `/admin/performance`, `initWebVitals`
- `AdminDiscountApprovalsPage`, `/admin/aprovacoes-desconto` (exceto o redirect)

Limpar imports mortos, comentários obsoletos, links quebrados em `docs/`. Atualizar `docs/DATA_DICTIONARY.md`, `docs/RUNBOOK.md`, `docs/EDGE_FUNCTIONS.md` se ainda houver resquícios.

### 2. Atualizar memória `quote-discount-approval-workflow`
Refletir nova localização (`/admin/usuarios?tab=discounts`) e remover qualquer URL antiga.

### 3. Atualizar `mem://index.md`
Garantir que entradas removidas (Performance Runtime Dashboard) estão fora do índice, e que a entrada de discount-approval menciona a nova URL.

### 4. Verificar e remover dependências NPM órfãs
Checar `package.json` para libs que só serviam aos módulos removidos (ex: alguma lib de chart usada exclusivamente no Performance Dashboard que sobrou após o `web-vitals` ter sido removido).

### 5. Lint pass focado
Rodar `eslint` no escopo dos arquivos editados nesta sessão (`src/pages/admin/AdminUsuariosPage.tsx`, `src/components/admin/DiscountManagementPanel.tsx`, `src/App.tsx`, sidebar) e corrigir warnings residuais (cores hardcoded → tokens semânticos, `any` → tipos estritos, `useEffect` deps).

### 6. Smoke test E2E atualizado
Garantir que `e2e/discount-approval.spec.ts` (que acabei de atualizar) passa no padrão de auth-redirect e que não há outros testes E2E referenciando rotas mortas.

## Política de execução

- **Uma melhoria por vez**, em commits lógicos separados.
- Nenhuma migration nova de banco (apenas docs/code/memória).
- Não-destrutivo, totalmente reversível.
- Sem perguntas durante a execução — sigo até concluir as 6.
- Se descobrir uma 7ª melhoria de alto impacto durante a execução (ex.: rota morta ainda referenciada em algum menu), executo na sequência sem pausar.

Ao aprovar, começo pela #1 e sigo até a #6.

