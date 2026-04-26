/**
 * Garantia estrutural: TODA rota técnica (role === "dev" no SSOT
 * `RBAC_ROUTES`) precisa estar declarada dentro do bloco `<DevRoute>`
 * em `src/App.tsx`.
 *
 * Se este teste falhar, alguém adicionou uma rota técnica fora do guard
 * — risco de bypass via URL direta. Mover a rota para dentro do bloco
 * `<Route element={<DevRoute />}>` em `App.tsx`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RBAC_ROUTES } from "@/lib/rbac/route-matrix";

const APP_TSX = resolve(__dirname, "../../src/App.tsx");

function extractDevRouteBlock(source: string): string {
  // Encontra o bloco entre `<Route element={<DevRoute` e o `</Route>` que o fecha.
  const start = source.indexOf("<Route element={<DevRoute");
  if (start === -1) throw new Error("Bloco <DevRoute> não encontrado em App.tsx");
  // Procura o próximo `</Route>` no mesmo nível — heurística simples mas robusta
  // para o estilo atual do App.tsx (uma rota DevRoute por arquivo).
  const after = source.slice(start);
  const close = after.indexOf("</Route>");
  if (close === -1) throw new Error("Fechamento </Route> do <DevRoute> não encontrado");
  return after.slice(0, close);
}

describe("dev routes are guarded by <DevRoute> in App.tsx", () => {
  const source = readFileSync(APP_TSX, "utf8");
  const devBlock = extractDevRouteBlock(source);
  const devOnlyPaths = RBAC_ROUTES.filter((r) => r.role === "dev").map((r) => r.path);

  it.each(devOnlyPaths)(
    'rota técnica "%s" está dentro do bloco <DevRoute>',
    (path) => {
      // Aceita declaração com aspas simples ou duplas
      const needle1 = `path="${path}"`;
      const needle2 = `path='${path}'`;
      const present = devBlock.includes(needle1) || devBlock.includes(needle2);
      expect(present, `Rota técnica ${path} não está sob <DevRoute> em App.tsx`).toBe(true);
    },
  );

  it("nenhuma rota técnica é declarada fora do <DevRoute>", () => {
    const outside = source.replace(devBlock, ""); // remove o bloco DevRoute
    const offenders = devOnlyPaths.filter(
      (p) => outside.includes(`path="${p}"`) || outside.includes(`path='${p}'`),
    );
    expect(offenders, `Rotas técnicas declaradas fora do <DevRoute>: ${offenders.join(", ")}`).toEqual([]);
  });
});
