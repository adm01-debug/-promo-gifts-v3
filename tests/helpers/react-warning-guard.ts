/**
 * react-warning-guard — instala um spy em console.error/console.warn que
 * captura warnings críticos do React e expõe utilitários para asserções.
 *
 * Foco: "Function components cannot be given refs" (causado por componentes
 * de função sob Radix `asChild`, motion, etc. sem forwardRef).
 *
 * Uso típico em testes:
 *
 *   const guard = installReactWarningGuard();
 *   render(<MyComponent />);
 *   guard.expectNoRefWarning();   // falha se aparecer o warning
 *   guard.dispose();
 */
import { vi } from "vitest";

const REF_WARNING_PATTERNS = [
  /Function components cannot be given refs/i,
  // React 19 / experimental moverá a mensagem para "Cannot read properties of"
  // em alguns casos — mantemos a forma canônica abaixo:
  /Attempts to access this ref will fail/i,
];

const OTHER_RELEVANT = [
  /Each child in a list should have a unique "key" prop/i,
  /validateDOMNesting/i,
];

export interface ReactWarningGuard {
  /** Mensagens capturadas (todas). */
  readonly messages: string[];
  /** Mensagens que casam com o padrão "ref em componente de função". */
  readonly refWarnings: string[];
  /** Falha o teste se houver pelo menos um ref warning. */
  expectNoRefWarning(context?: string): void;
  /** Falha o teste se houver qualquer warning relevante (ref + key + DOM nesting). */
  expectNoRelevantWarnings(context?: string): void;
  /** Restaura console.error/warn originais. */
  dispose(): void;
}

export function installReactWarningGuard(): ReactWarningGuard {
  const messages: string[] = [];
  const refWarnings: string[] = [];
  const relevantWarnings: string[] = [];

  const capture = (args: unknown[]) => {
    // React costuma passar (template, ...subs). Para detecção, basta concat.
    const msg = args
      .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : ""))
      .join(" ");
    if (!msg) return;
    messages.push(msg);
    if (REF_WARNING_PATTERNS.some((re) => re.test(msg))) refWarnings.push(msg);
    if (OTHER_RELEVANT.some((re) => re.test(msg))) relevantWarnings.push(msg);
  };

  const errSpy = vi.spyOn(console, "error").mockImplementation((...args) => capture(args));
  const warnSpy = vi.spyOn(console, "warn").mockImplementation((...args) => capture(args));

  return {
    get messages() { return messages; },
    get refWarnings() { return refWarnings; },
    expectNoRefWarning(context?: string) {
      if (refWarnings.length > 0) {
        const where = context ? ` (${context})` : "";
        throw new Error(
          `React ref warning detectado${where}:\n` +
            refWarnings.map((m, i) => `  [${i + 1}] ${m}`).join("\n") +
            "\n\nProvável causa: um componente de função recebeu `ref` sem usar React.forwardRef.\n" +
            "Comum sob Radix `asChild` (TooltipTrigger, PopoverTrigger, DropdownMenuTrigger).\n" +
            "Solução: wrap o filho em <span className=\"inline-flex\"> ou converta-o para forwardRef.",
        );
      }
    },
    expectNoRelevantWarnings(context?: string) {
      const all = [...refWarnings, ...relevantWarnings];
      if (all.length > 0) {
        const where = context ? ` (${context})` : "";
        throw new Error(
          `React warnings detectados${where}:\n` +
            all.map((m, i) => `  [${i + 1}] ${m}`).join("\n"),
        );
      }
    },
    dispose() {
      errSpy.mockRestore();
      warnSpy.mockRestore();
    },
  };
}
