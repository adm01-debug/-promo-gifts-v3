# Restringir overlay "Bridge metrics · preview only" ao papel `dev`

Hoje o `BridgeMetricsOverlay` (chip flutuante com latências/erros do bridge, toggle por backtick) é montado em `main.tsx` para qualquer build não-produção. No preview, isso significa que **qualquer usuário logado** (agente, supervisor) pode abrir o painel pressionando `` ` `` ou ver o botão flutuante. Vamos gateá-lo pelo mesmo SSOT usado pelos banners (`shouldShowDevInfraMessages(isDev)`), que respeita a precedência **`VITE_SHOW_DEV_INFRA_MESSAGES` (build-time) > `localStorage.show_dev_infra_messages` (runtime) > role `dev`**.

## Mudanças

### 1. `src/main.tsx` — remover montagem fora do AuthProvider
Tirar o `lazy()` + `<Suspense><BridgeMetricsOverlay /></Suspense>` do root. O componente passa a ser montado dentro do `App` (onde existe o `AuthProvider`).

### 2. `src/App.tsx` — montar dentro do AuthProvider, gateado
- Adicionar import lazy: `const BridgeMetricsOverlay = lazyWithRetry(() => import("@/components/dev/BridgeMetricsOverlay"))` (em build PROD, o componente retorna `null` no topo, então o chunk segue tree-shakable).
- Logo após `<BridgeStatusBanner />` (linha 198), montar:
  ```tsx
  <DevOnlyBridgeOverlay />
  ```
- Criar pequeno wrapper local em `src/components/dev/DevOnlyBridgeOverlay.tsx`:
  ```tsx
  import { Suspense, lazy } from 'react';
  import { useAuth } from '@/contexts/AuthContext';
  import { shouldShowDevInfraMessages } from '@/lib/system/dev-infra-messages';

  const Overlay = lazy(() => import('./BridgeMetricsOverlay'));

  export function DevOnlyBridgeOverlay() {
    const { isDev } = useAuth();
    if (!shouldShowDevInfraMessages(isDev)) return null;
    return (
      <Suspense fallback={null}>
        <Overlay />
      </Suspense>
    );
  }
  ```
  Vantagens: o `lazy()` só dispara o import quando o gate aprova, então usuários comuns nunca baixam o chunk; em produção continua tree-shaken pelo guard `if (import.meta.env.PROD) return null` já existente no overlay.

### 3. `src/components/dev/BridgeMetricsOverlay.tsx` — defesa em profundidade
Logo após o guard `if (import.meta.env.PROD) return null` (linha 56), reforçar com o gate (caso alguém monte o componente em outro lugar no futuro):
```ts
const { isDev } = useAuth();
if (!shouldShowDevInfraMessages(isDev)) return null;
```
Também guardar o handler global de tecla `` ` `` (linhas ~83-95) para que ele só registre o listener quando o gate autoriza — assim o atalho não abre o overlay para não-devs nem mesmo se o componente for mantido montado.

### 4. Testes — `tests/components/BridgeMetricsOverlay.test.tsx` (novo)
Padrão idêntico aos testes recém-criados (mock de `useAuth` + `shouldShowDevInfraMessages`):
- Não-dev: componente renderiza vazio, listener de teclado **não** é registrado, pressionar `` ` `` não abre nada.
- Dev: botão flutuante aparece, atalho `` ` `` abre o painel.
- Gate desligado (env `false`) com `isDev=true`: não renderiza.
- Gate ligado por override com `isDev=false`: renderiza.

### 5. Memória — atualizar `mem://features/dev-infra-messages-gate`
Adicionar `BridgeMetricsOverlay` (via `DevOnlyBridgeOverlay`) à lista de consumidores do gate, junto de `CloudStatusBanner` e `BridgeStatusBanner`.

## Resultado
Em produção: continua sendo tree-shaken (zero bytes baixados). Em preview, somente usuários com papel `dev` (ou com override explícito via env/localStorage) veem o botão flutuante e podem abrir o overlay com `` ` ``. Agentes e supervisores logados no preview não têm mais acesso ao painel técnico de telemetria do bridge.