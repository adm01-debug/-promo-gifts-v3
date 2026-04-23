

# Botão "Testar novamente" com debounce no card

## Diagnóstico

Hoje em cada aba (`Bitrix24Tab`, `N8nTab`, `SupabaseConnectionsTab`, `McpTab`):
- Existe o botão **"Testar conexão"** (`onTest`) que chama `test()` do `useConnectionTester`, atualiza `last` e bumpa `historyKey` para forçar refresh do painel inline.
- A linha "Última verificação" (`<LastTestLine info={last} />`) já reflete o resultado imediatamente após o teste — sem reload.
- **O que falta**: um botão dedicado de **"Testar novamente"** ao lado do `LastTestLine`, com:
  - Debounce de 3s (evita spam acidental de cliques)
  - Spinner inline próprio (sem reusar o botão grande do card)
  - Atualização otimista da própria linha (já funciona via `setLast`)
  - Cooldown visual com countdown ("Aguarde 3s…") durante o debounce

## Solução

### 1. Novo componente `RetestButton`

`src/components/admin/connections/RetestButton.tsx` (~60 linhas):

Botão `ghost` `size="sm"` com ícone `RefreshCw` que:
- Recebe props: `onRetest: () => Promise<void>`, `disabled?: boolean`, `cooldownMs?: number` (default 3000)
- Estado interno: `isRunning` (durante o await) e `cooldownUntil` (timestamp)
- Durante `isRunning`: ícone gira (`animate-spin`), label "Testando…", desabilitado
- Durante cooldown: ícone estático, label "Aguarde Ns" com contagem regressiva por `setInterval`, desabilitado
- Idle: ícone estático, label "Testar novamente", clicável

```tsx
<Button variant="ghost" size="sm" disabled={isRunning || inCooldown || disabled}
  onClick={handleClick}>
  <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
  {isRunning ? "Testando…" : inCooldown ? `Aguarde ${secondsLeft}s` : "Testar novamente"}
</Button>
```

### 2. Integração ao lado de `LastTestLine`

Modificar `LastTestLine.tsx` (ou envolver na aba) para aceitar uma prop opcional `action?: ReactNode` que renderiza à direita do texto:

```tsx
<div className="flex items-center justify-between gap-2">
  <div className="text-xs text-muted-foreground">Última verificação: {fmt(info)}</div>
  {action}
</div>
```

Em cada aba, passar `<RetestButton onRetest={onTest} disabled={!credsLooksValid} />` como `action`.

### 3. Reuso do `onTest` existente

Não duplicar lógica. O handler `onTest` de cada aba já:
- Chama `test()` do hook
- Atualiza `setLast({...})`
- Bumpa `historyKey` para refresh do painel inline

`RetestButton` apenas envolve esse handler com debounce + UI states. Nenhuma mudança em `useConnectionTester`.

### 4. Aplicação nas 4 abas

Adicionar `<RetestButton onRetest={onTest} disabled={!credsLooksValid} />` em:
- `Bitrix24Tab.tsx`
- `N8nTab.tsx`
- `SupabaseConnectionsTab.tsx` (1 botão por env: promobrind, crm)
- `McpTab.tsx`

### 5. Comportamento

- Click → `setIsRunning(true)` → `await onRetest()` → `setIsRunning(false)` → `setCooldownUntil(now + 3000)`
- Durante cooldown, countdown atualizado a cada 250ms via `setInterval` (limpo no unmount)
- Se `disabled={true}` (credenciais inválidas), botão fica disabled com tooltip "Configure credenciais válidas primeiro"
- Toast de sucesso/erro continua vindo do `useConnectionTester` (sem duplicação)

### 6. Estado visual

```text
Última verificação: há 12s · 245ms · OK         [↻ Testar novamente]
Última verificação: há 2s · 198ms · OK          [⟳ Testando…]      (disabled)
Última verificação: há 5s · 245ms · OK          [↻ Aguarde 2s]     (disabled)
```

## Arquivos tocados

**Frontend (novos)**
- `src/components/admin/connections/RetestButton.tsx` (~60 linhas): botão com debounce, spinner, countdown.

**Frontend (editados)**
- `src/components/admin/connections/LastTestLine.tsx`: adicionar prop opcional `action?: ReactNode` renderizada à direita.
- `src/components/admin/connections/Bitrix24Tab.tsx`: passar `<RetestButton>` como `action` do `LastTestLine`.
- `src/components/admin/connections/N8nTab.tsx`: idem.
- `src/components/admin/connections/SupabaseConnectionsTab.tsx`: idem (1 por env).
- `src/components/admin/connections/McpTab.tsx`: idem.

## Fora de escopo

- Não muda o botão grande "Testar conexão" original (continua existindo, com seu próprio fluxo).
- Não muda `useConnectionTester` nem `connection-tester` (edge function).
- Não persiste o cooldown entre reloads (in-memory; reload reseta).
- Não adiciona debounce no botão original — só no novo `RetestButton` inline.
- Não adiciona atalho de teclado (pode vir depois se solicitado).

