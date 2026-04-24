/**
 * Quick View — `PriceFreshnessBadge` com `alwaysShow=false`.
 *
 * Por padrão o Quick View do catálogo passa `alwaysShow` (ver
 * `ProductQuickView.tsx`), garantindo que o vendedor sempre veja o
 * estado do preço — inclusive em fresh e unknown. Esta suíte trava o
 * comportamento INVERSO: se `alwaysShow=false` (cenário de hosts que
 * podem reaproveitar o componente sem destaque obrigatório, como
 * carrosséis ou widgets), a variante `inline` deve seguir a regra
 * padrão do catálogo — só renderizar em aging|stale, ficando oculta
 * em fresh e unknown.
 *
 * Garante que o `alwaysShow` é o ÚNICO override da regra de
 * visibilidade e que removê-lo restabelece o comportamento normal,
 * sem regressão silenciosa em outros pontos do app.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

const FIXED_NOW = new Date("2026-04-24T12:00:00.000Z").getTime();
const daysAgo = (d: number) =>
  new Date(FIXED_NOW - d * 86400000).toISOString();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterAll(() => {
  vi.useRealTimers();
});

/** Mesmo conjunto de produtos do E2E do catálogo. */
const SCENARIOS = {
  fresh: { date: daysAgo(5), threshold: 60 },
  aging: { date: daysAgo(45), threshold: 60 },
  stale: { date: daysAgo(90), threshold: 60 },
  unknown: { date: null as string | null, threshold: 60 },
} as const;

/** Renderiza a invocação do Quick View SEM o flag alwaysShow. */
function renderQuickViewBadge(
  scenario: (typeof SCENARIOS)[keyof typeof SCENARIOS],
  alwaysShow = false,
) {
  return render(
    <div data-testid="qv-host">
      <PriceFreshnessBadge
        priceUpdatedAt={scenario.date}
        thresholdDays={scenario.threshold}
        variant="inline"
        alwaysShow={alwaysShow}
      />
    </div>,
  );
}

describe("Quick View — alwaysShow=false respeita a regra aging|stale", () => {
  // ════════════════════════════════════════════════════════════════════
  // Sem alwaysShow: comportamento padrão do catálogo
  // ════════════════════════════════════════════════════════════════════
  describe("sem alwaysShow (alwaysShow=false)", () => {
    it("fresh: NÃO renderiza badge", () => {
      renderQuickViewBadge(SCENARIOS.fresh);
      expect(screen.getByTestId("qv-host")).toBeEmptyDOMElement();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("unknown: NÃO renderiza badge", () => {
      renderQuickViewBadge(SCENARIOS.unknown);
      expect(screen.getByTestId("qv-host")).toBeEmptyDOMElement();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("aging: RENDERIZA badge (regra do catálogo se mantém)", () => {
      renderQuickViewBadge(SCENARIOS.aging);
      const badge = screen.getByRole("status");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/text-amber-700/);
      expect(badge.textContent).toMatch(/há 45 dias/);
    });

    it("stale: RENDERIZA badge com cópia 'defasado'", () => {
      renderQuickViewBadge(SCENARIOS.stale);
      const badge = screen.getByRole("status");
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toMatch(/preço pode estar defasado/i);
      expect(badge.textContent).toMatch(/há 90 dias/);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Comparação direta com alwaysShow=true (default real do Quick View)
  // ════════════════════════════════════════════════════════════════════
  describe("alwaysShow=true (uso atual do Quick View) — referência de paridade", () => {
    it("fresh: RENDERIZA (alwaysShow vence a regra de visibilidade)", () => {
      renderQuickViewBadge(SCENARIOS.fresh, true);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("unknown: RENDERIZA (alwaysShow vence a regra de visibilidade)", () => {
      renderQuickViewBadge(SCENARIOS.unknown, true);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("aging: RENDERIZA (mesma saída de alwaysShow=false)", () => {
      renderQuickViewBadge(SCENARIOS.aging, true);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("stale: RENDERIZA (mesma saída de alwaysShow=false)", () => {
      renderQuickViewBadge(SCENARIOS.stale, true);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Invariante: alwaysShow só altera fresh/unknown — nunca aging/stale
  // ════════════════════════════════════════════════════════════════════
  describe("alwaysShow é o único override da regra de visibilidade", () => {
    it("aging|stale renderizam idênticos com qualquer valor de alwaysShow", () => {
      const cases = [SCENARIOS.aging, SCENARIOS.stale];
      for (const scenario of cases) {
        const a = render(
          <PriceFreshnessBadge
            priceUpdatedAt={scenario.date}
            thresholdDays={scenario.threshold}
            variant="inline"
            alwaysShow={false}
          />,
        );
        const textWithout = a.container
          .querySelector('[role="status"]')!
          .textContent?.replace(/\s+/g, " ")
          .trim();
        a.unmount();

        const b = render(
          <PriceFreshnessBadge
            priceUpdatedAt={scenario.date}
            thresholdDays={scenario.threshold}
            variant="inline"
            alwaysShow={true}
          />,
        );
        const textWith = b.container
          .querySelector('[role="status"]')!
          .textContent?.replace(/\s+/g, " ")
          .trim();
        b.unmount();

        expect(textWith).toBe(textWithout);
      }
    });

    it("fresh|unknown SOMENTE renderizam com alwaysShow=true", () => {
      const cases = [SCENARIOS.fresh, SCENARIOS.unknown];
      for (const scenario of cases) {
        const off = render(
          <PriceFreshnessBadge
            priceUpdatedAt={scenario.date}
            thresholdDays={scenario.threshold}
            variant="inline"
            alwaysShow={false}
          />,
        );
        expect(off.container).toBeEmptyDOMElement();
        off.unmount();

        const on = render(
          <PriceFreshnessBadge
            priceUpdatedAt={scenario.date}
            thresholdDays={scenario.threshold}
            variant="inline"
            alwaysShow={true}
          />,
        );
        expect(on.container.querySelector('[role="status"]')).not.toBeNull();
        on.unmount();
      }
    });
  });
});
