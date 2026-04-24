/**
 * Asserts de cópia pt-BR EXATA do `PriceFreshnessBadge` em cada variant
 * do catálogo (icon-only, compact, inline, pdp).
 *
 * Trava o texto literal renderizado para vendedor brasileiro:
 *   - fresh:   "Atualizado há X dias" (+ data DD/MM/AAAA em inline/pdp)
 *   - aging:   "Atualizado há X dias" (+ aria "próximo do limite")
 *   - stale:   "Preço pode estar defasado (há X dias)"
 *   - unknown: "Data de atualização não informada"
 *
 * As asserções usam `toBe(...)` quando o texto é totalmente determinístico
 * e `toMatch(/.../)` quando há sufixo dinâmico controlado (data formatada
 * pt-BR ou alias compacto "há Nd"). Isso garante que mudanças de cópia
 * sejam detectadas imediatamente, sem permitir regressões silenciosas.
 *
 * Variantes ocultas em fresh/unknown (icon-only / compact) são verificadas
 * separadamente: o asserts foca em aging|stale para essas variantes,
 * porque é o único momento em que renderizam texto.
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

/** Normaliza whitespace para comparações estáveis com texto multi-linha. */
const txt = (el: Element) => el.textContent!.replace(/\s+/g, " ").trim();

const SCENARIOS = {
  fresh: { date: daysAgo(5), threshold: 60, days: 5 },
  aging: { date: daysAgo(45), threshold: 60, days: 45 },
  stale: { date: daysAgo(90), threshold: 60, days: 90 },
  unknown: { date: null as string | null, threshold: 60 },
} as const;

describe("PriceFreshnessBadge — cópia pt-BR exata por variant", () => {
  // ════════════════════════════════════════════════════════════════════
  // VARIANT: inline (PDP / Quick View)
  // ════════════════════════════════════════════════════════════════════
  describe("variant=inline (PDP / Quick View)", () => {
    it("fresh: 'Atualizado em DD/MM/AAAA · há 5 dias'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="inline"
        />,
      );
      // Inline em fresh adiciona a data numérica como sufixo destacado.
      expect(txt(screen.getByRole("status"))).toBe(
        "Atualizado em 19/04/2026 · há 5 dias",
      );
    });

    it("aging: 'Atualizado há 45 dias' + aria-label de alerta", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="inline"
        />,
      );
      const badge = screen.getByRole("status");
      expect(txt(badge)).toBe("Atualizado há 45 dias");
      expect(badge.getAttribute("aria-label")).toMatch(
        /próximo do limite de 60 dias/i,
      );
    });

    it("stale: 'Preço pode estar defasado (há 90 dias)'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Preço pode estar defasado (há 90 dias)",
      );
    });

    it("unknown: 'Data de atualização não informada'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.unknown.date}
          variant="inline"
          alwaysShow
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Data de atualização não informada",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: pdp (página de detalhe — pílulas grandes)
  // ════════════════════════════════════════════════════════════════════
  describe("variant=pdp (página de detalhe)", () => {
    it("fresh: 'Atualizado em DD/MM/AAAA · há 5 dias'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="pdp"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Atualizado em 19/04/2026 · há 5 dias",
      );
    });

    it("aging: 'Atualizado em DD/MM/AAAA · há 45 dias'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="pdp"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Atualizado em 10/03/2026 · há 45 dias",
      );
    });

    it("stale: copy completa com chamada de ação", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="pdp"
        />,
      );
      // PDP em stale entrega a frase completa para o vendedor agir.
      expect(txt(screen.getByRole("status"))).toBe(
        "Preço pode estar defasado (há 90 dias) — confirme com o fornecedor antes de fechar o orçamento",
      );
    });

    it("unknown: 'Data de atualização não informada'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.unknown.date}
          variant="pdp"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe(
        "Data de atualização não informada",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: compact (lista densa / sticky header) — só aging|stale
  // ════════════════════════════════════════════════════════════════════
  describe("variant=compact (lista densa)", () => {
    it("aging: 'há Nd' (alias compacto)", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="compact"
        />,
      );
      // Compact comprime em dias (até 30) ou meses; 45d → "há 1m".
      expect(txt(screen.getByRole("status"))).toMatch(/^há \d+[dm]$/);
    });

    it("stale: 'há Nm' (alias compacto)", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="compact"
        />,
      );
      expect(txt(screen.getByRole("status"))).toMatch(/^há \d+[dm]$/);
    });

    it("aging dentro de 30 dias usa sufixo 'd'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={daysAgo(20)}
          thresholdDays={30}
          variant="compact"
        />,
      );
      expect(txt(screen.getByRole("status"))).toBe("há 20d");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // VARIANT: icon-only (cards / tabela densa) — texto vai para aria-label
  // ════════════════════════════════════════════════════════════════════
  describe("variant=icon-only (cards / tabela densa)", () => {
    it("aging: aria-label completo, sem texto visível além do alias", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.aging.date}
          thresholdDays={SCENARIOS.aging.threshold}
          variant="icon-only"
        />,
      );
      const badge = screen.getByRole("status");
      // Texto visível pode existir como sr-only / aria-label rico.
      expect(badge.getAttribute("aria-label")).toMatch(
        /próximo do limite de 60 dias/i,
      );
      expect(badge.getAttribute("aria-label")).toMatch(/há 45 dias/i);
    });

    it("stale: aria-label 'Possivelmente defasado · há 90 dias'", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.stale.date}
          thresholdDays={SCENARIOS.stale.threshold}
          variant="icon-only"
        />,
      );
      const badge = screen.getByRole("status");
      expect(badge.getAttribute("aria-label")).toMatch(
        /possivelmente defasado/i,
      );
      expect(badge.getAttribute("aria-label")).toMatch(/há 90 dias/i);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // PARIDADE — copy do utilitário aparece literalmente em inline/pdp
  // ════════════════════════════════════════════════════════════════════
  describe("paridade entre util e UI (texto não é reescrito pelos hosts)", () => {
    it("fresh: relativo 'há 5 dias' presente em inline e pdp", () => {
      const { unmount } = render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toContain("há 5 dias");
      unmount();

      render(
        <PriceFreshnessBadge
          priceUpdatedAt={SCENARIOS.fresh.date}
          thresholdDays={SCENARIOS.fresh.threshold}
          variant="pdp"
        />,
      );
      expect(txt(screen.getByRole("status"))).toContain("há 5 dias");
    });

    it("singular: 'há 1 dia' (sem 's') em inline com daysSince=1", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={daysAgo(1)}
          thresholdDays={60}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toMatch(/há 1 dia(?!s)/);
    });

    it("hoje: 'hoje' (sem 'há') em inline com daysSince=0", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={daysAgo(0)}
          thresholdDays={60}
          variant="inline"
        />,
      );
      expect(txt(screen.getByRole("status"))).toMatch(/hoje/i);
    });
  });
});
