

# Filtro "Banco vs Variável de ambiente" em `/admin/conexoes`

## Diagnóstico

O backend `secrets-manager` já devolve `source: "db" | "env" | "none"` em cada credencial listada (linhas 162/172 da edge function). O frontend já mostra um hint sutil "· env" no `SecretField`, mas não há:

- Visão consolidada de quais credenciais ainda vêm de variáveis de ambiente
- Filtro para esconder/mostrar credenciais por origem
- Ação de "migrar para o banco" (re-salvar com mesmo valor)

Hoje o admin precisa abrir cada aba e olhar campo por campo para descobrir o que ainda está em env.

## Solução

### 1. Novo componente `CredentialsSourceFilter` (chips no topo da página)

Renderiza logo acima das `Tabs` em `AdminConexoesPage`, lendo o resultado do `secrets-manager` action `list`. Mostra contagens por origem:

```text
Origem das credenciais:
[ Todas (13) ] [ ✓ Banco (8) ] [ ⚠ Env (3) ] [ ○ Não configuradas (2) ]
                                  └ recomendado migrar
```

- Estado padrão: **Todas** (sem filtro)
- Estado é mantido em `URLSearchParams` (`?source=env`) para permitir compartilhar link "veja o que falta migrar"
- Contagens calculadas client-side a partir do `secrets` array já carregado por `useSecretsManager`

### 2. Contexto compartilhado `CredentialsSourceFilterContext`

Provider colocado em `AdminConexoesPage` que expõe:

```ts
{
  filter: "all" | "db" | "env" | "none",
  setFilter: (f) => void,
  matchesFilter: (status?: SecretStatus) => boolean,
}
```

Cada `SecretField` consome o contexto via `useCredentialsSourceFilter()`. Quando o filtro está ativo e o secret não bate:
- Renderiza com `opacity-40` + `pointer-events-none` (visual fade, não esconde) — assim o admin ainda vê a estrutura do card mas o foco vai para o que importa
- Alternativa por prop `hideWhenFiltered` para casos onde queremos esconder totalmente (fica fora desta onda)

Cards inteiros que tenham 100% dos secrets fora do filtro recebem badge sutil "Sem credenciais nesta origem" no rodapé, mas continuam visíveis.

### 3. Visual reforçado por origem dentro do `SecretField`

Substitui o `· env` discreto atual por um badge inline mais visível ao lado do sufixo:

```text
Service Role Key   ✓ ••••YZ89 (203 chars) · atualizado há 2d  [DB]
Anon Key           ✓ ••••AB12 (104 chars)                      [ENV ⚠]
Webhook URL        — Não configurado                           [—]
```

Cores:
- `[DB]`: badge verde-success outline
- `[ENV ⚠]`: badge amarelo-warning com tooltip "Valor herdado de variável de ambiente. Salve novamente para migrar para o banco e habilitar rotação/auditoria."
- `[—]`: muted

### 4. Ação rápida "Migrar para o banco" em campos `env`

Quando `status.source === "env"`, o `SecretField` ganha um botão extra ao lado de "Atualizar":

```text
[ ••••••••••• ]  [Atualizar]  [Migrar para o banco ↓]
```

Ao clicar:
- Abre o input em modo `set` com placeholder "Cole novamente o valor para persistir no banco" + helper text explicando que o valor da env não pode ser lido pelo frontend (segurança)
- Após salvar, `source` vira `"db"` automaticamente (re-list dispara)

Não tentamos copiar o valor da env automaticamente — `secrets-manager` nunca devolve plaintext, e expor isso quebraria a política de segurança atual.

### 5. Card-resumo no `IntegrationsHealthCard`

Adicionar uma linha extra no card de saúde existente:

```text
┌─ Saúde das integrações ────────────────────────────┐
│ 5 ativas · 1 com erro · 2 nunca verificadas        │
│ 8 credenciais no banco · 3 ainda em env · 2 vazias │  ← NOVO
└────────────────────────────────────────────────────┘
```

A linha vira link clicável que aplica o filtro `?source=env` e rola até a primeira aba com pendência.

### 6. Persistência via URL e atalho

- `?source=env` aplica o filtro no carregamento
- Atalho `Shift+E` alterna entre "todas" e "apenas env" (para diagnóstico rápido)
- O `setFilter` atualiza a URL via `useSearchParams` sem recarregar

## O que o usuário verá

Ao abrir `/admin/conexoes?source=env`:

```text
┌─ Saúde das integrações ─────────────────────────────┐
│ 5 ativas · 1 com erro · 2 nunca verificadas         │
│ 8 no banco · 3 ainda em env · 2 vazias              │
└─────────────────────────────────────────────────────┘

Origem: [ Todas (13) ] [ ✓ Banco (8) ] [● ⚠ Env (3) ] [ ○ Não configuradas (2) ]

[ Visão geral das conexões... ]

[Tabs: Bancos | Bitrix24 | n8n | MCP | Webhooks]

┌─ CRM Promobrind ─────────────────────────── [✓ Ativo] ─┐
│ URL              ✓ ••••.co (28 chars)            [DB]  │  ← faded (não bate)
│ Anon Key         ✓ ••••AB12 (104 chars)         [ENV ⚠]│  ← destacado
│                  [•••••••]  [Atualizar]  [Migrar para o banco ↓]
│ Service Role Key ✓ ••••YZ89 (203 chars)          [DB]  │  ← faded
└────────────────────────────────────────────────────────┘
```

Limpando o filtro, todos voltam à opacidade normal.

## Arquivos tocados

**Frontend (novos)**
- `src/components/admin/connections/CredentialsSourceFilter.tsx` (~80 linhas): chips com contagens, sincronia com URL.
- `src/components/admin/connections/CredentialsSourceFilterContext.tsx` (~40 linhas): contexto + hook `useCredentialsSourceFilter`.
- `src/components/admin/connections/CredentialSourceBadge.tsx` (~30 linhas): badge `[DB]`/`[ENV ⚠]`/`[—]` com tooltip.

**Frontend (editados)**
- `src/pages/admin/AdminConexoesPage.tsx`: envolver com `<CredentialsSourceFilterProvider>` e renderizar `<CredentialsSourceFilter />` acima de `<ConnectionsOverviewTable />`. Carregar `secrets` uma vez no nível da página para alimentar contagens.
- `src/components/admin/connections/SecretField.tsx`:
  - Consumir `useCredentialsSourceFilter()` e aplicar `opacity-40 pointer-events-none` quando não bate
  - Substituir `· env` pelo `<CredentialSourceBadge source={status?.source} />`
  - Adicionar botão "Migrar para o banco" quando `source === "env"`
- `src/components/admin/connections/IntegrationsHealthCard.tsx`: adicionar linha "X no banco · Y em env · Z vazias" como link para `?source=...`.
- `src/hooks/useSecretsManager.ts`: já expõe `source` no tipo (linha 9 do hook). Sem mudanças.

**Backend**
- Nenhuma mudança. `secrets-manager` action `list` já devolve `source: "db" | "env" | "none"` (verificado nas linhas 162/172 da edge function).

## Fora de escopo

- Não permite migrar automaticamente lendo o valor da env (segurança — frontend nunca recebe plaintext)
- Não adiciona bulk action "migrar todas em env" (cada uma exige re-paste manual do valor)
- Não muda a precedência do `_shared/credentials.ts` (DB > env > null permanece igual)
- Não adiciona alerta/notificação automática de "X credenciais ainda em env há mais de 30d" (pode vir em onda futura via cron `connections-health-check`)

