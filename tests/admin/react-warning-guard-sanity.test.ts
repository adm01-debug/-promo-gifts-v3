/**
 * Sanity check do guard: garante que o helper `installReactWarningGuard`
 * realmente detecta o warning canônico do React. Sem este teste, um bug
 * silencioso no guard tornaria o resto da suíte falsamente verde.
 */
import { describe, it, expect, afterEach } from "vitest";
import { installReactWarningGuard } from "../helpers/react-warning-guard";

describe("react-warning-guard — sanity", () => {
  let guard: ReturnType<typeof installReactWarningGuard>;
  afterEach(() => guard?.dispose());

  it("captura o warning canônico de ref em function component", () => {
    guard = installReactWarningGuard();
    // Simula exatamente como o React loga (template + nome do componente)
    console.error(
      "Warning: Function components cannot be given refs. " +
        "Attempts to access this ref will fail. Did you mean to use React.forwardRef()?%s",
      "\n    in MyComp",
    );
    expect(() => guard.expectNoRefWarning()).toThrow(/ref warning/i);
    expect(guard.refWarnings.length).toBeGreaterThan(0);
  });

  it("não falha quando não há warnings", () => {
    guard = installReactWarningGuard();
    expect(() => guard.expectNoRefWarning()).not.toThrow();
  });
});
