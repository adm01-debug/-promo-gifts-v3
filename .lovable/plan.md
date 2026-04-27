## Objetivo
A faixa "Backend reiniciando, aguarde alguns segundos…" (e demais mensagens técnicas equivalentes) deve aparecer **apenas para usuários com role `dev`**. Usuários comuns (agente/supervisor) não devem ver banners ou toasts sobre estado da infraestrutura — para eles, esses sintomas devem ser silenciosos (a UI já tem skeletons/loading e retries automáticos).

## Mensagens afetadas
Mapeei duas fontes globais montadas em `src/App.tsx`:

1. **`CloudStatusBanner`** (`src/components/system/CloudStatusBanner.tsx`)
   - "Backend reiniciando, aguarde alguns segundos…" (warming) ← a do screenshot
   - "Backend instável — algumas operações podem falhar momentaneamente." (degraded)
   - "Backend indisponível. Verifique sua conexão e tente novamente." (down)

2. **`BridgeStatusBanner`** (`src/components/BridgeStatusBanner.tsx`)
   - Toast "Reconectando ao catálogo externo…" (degraded)
   - Toast + banner sticky "Catálogo externo indisponível" (unavailable)
   - Toast "Conexão restabelecida" (recovered)

## Mudanças

### 1. `src/components/system/CloudStatusBanner.tsx`
- Importar `useAuth` de `@/contexts/AuthContext`.
- No início do componente: `const { isDev } = useAuth();`
- Sair cedo se não for dev: `if (!isDev) return null;` (antes do `AnimatePresence`).

### 2. `src/components/BridgeStatusBanner.tsx`
- Importar `useAuth`.
- `const { isDev } = useAuth();`
- Envolver o `useEffect` de assinatura no event bus com `if (!isDev) return;` no topo (e adicionar `isDev` às deps) — assim usuários não-dev nem registram o listener nem disparam toasts.
- Manter o `if (!unavailable) return null;` existente; também sair cedo do render quando `!isDev`.

### Notas
- Nenhuma lógica de retry/recuperação muda — apenas a **exibição** vira dev-only. Os hooks (`useCloudStatus`, retries do bridge) continuam rodando no provider, garantindo que a app se recupere sozinha.
- Tokens semânticos e a11y permanecem intactos.
- Sem migração de banco, sem mudança em edge functions.

## Arquivos editados
- `src/components/system/CloudStatusBanner.tsx`
- `src/components/BridgeStatusBanner.tsx`

## Validação
- Login como agente/supervisor → nenhum banner técnico aparece ao reiniciar backend.
- Login como dev → banner "Backend reiniciando…" volta a aparecer normalmente.
