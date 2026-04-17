
# Hotfix — `RangeError: Invalid time value` no BIDashboard

## Causa raiz
`src/pages/bi-dashboard/BIDashboardCharts.tsx` linha 232:
```tsx
<Badge>{format(parseISO(product.created_at), "dd/MM/yyyy", { locale: ptBR })}</Badge>
```
Quando `product.created_at` é `null`, `undefined` ou string inválida, `parseISO` retorna `Invalid Date` e `format()` lança `RangeError`. Isso quebra toda a página `/bi` via ErrorBoundary global.

## Fix
Envolver a formatação em helper defensivo: tenta parsear; se inválido, devolve fallback `"—"`. Aplicar inline na linha 232.

```tsx
{(() => {
  if (!product.created_at) return "—";
  const d = parseISO(product.created_at);
  return isValid(d) ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "—";
})()}
```

E adicionar `isValid` ao import existente de `date-fns`.

## Arquivo
**Editar:** `src/pages/bi-dashboard/BIDashboardCharts.tsx` (1 import + 1 linha de JSX).

Sem schema, sem dependências novas. Build volta a passar e a página `/bi` renderiza normalmente mesmo com produtos sem `created_at`.
