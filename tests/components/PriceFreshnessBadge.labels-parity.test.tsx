/**
 * Paridade de rótulos pt-BR — `PriceFreshnessBadge` × `getPriceFreshness`.
 *
 * Os testes em `tests/utils/price-freshness-coverage.test.ts` travam o
 * contrato textual da função `getPriceFreshness` (rótulos canônicos,
 * pluralização, copy de stale/aging/fresh/unknown e estrutura do tooltip).
 *
 * Aqui garantimos que o `PriceFreshnessBadge` — quando renderizado no
 * variant `inline` (PDP/Quick View, sem CTA, sem confirmação) — expõe
 * exatamente os mesmos rótulos:
 *   1. Aria-label do badge === `freshness.label`.
 *   2. Texto visível === `freshness.label` (sem sufixo de limite quando
 *      o produto usa o threshold default global).
 *   3. Pluralização correta: "hoje" / "há 1 dia" / "há N dias".
 *   4. Copy de stale === "Preço pode estar defasado (há Nd)".
 *   5. Copy de unknown === "Data de atualização não informada".
 *   6. Quando o threshold é explícito (per-product), o badge anexa
 *      "(limite Yd)" ao label da utility — paridade preservada como
 *      *prefixo*.
 *
 * Regressões aqui significam que badge e utility divergiram — quem
 * lê o badge na UI veria um copy diferente do que os testes da
 * função garantem.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";
import {
  getPriceFreshness,
  formatPriceDateLong,
  formatPriceDateShort,
} from "@/utils/price-freshness";

const FIXED_NOW = new Date("2025-06-15T12:00:00.000Z").getTime();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

const daysAgo = (d: number) =>
  new Date(FIXED_NOW - d * 86400000).toISOString();

/**
 * Renderiza o badge no variant `inline` (PDP/Quick View) — único variant
 * que imprime o `freshness.label` integralmente no DOM. Não passamos
 * `thresholdDays` quando queremos paridade textual exata: o badge só
 * adiciona o sufixo "(limite Yd)" quando o threshold é explicitamente
 * informado pelo produto. O default global (60 dias) suprime esse sufixo
 * para manter o catálogo limpo.
 */
function renderInline(
  priceUpdatedAt: string | null,
  opts: { thresholdDays?: number } = {},
) {
  return render(
    <PriceFreshnessBadge
      priceUpdatedAt={priceUpdatedAt}
      thresholdDays={opts.thresholdDays}
      variant="inline"
    />,
  );
}

describe("PriceFreshnessBadge — paridade de rótulos com getPriceFreshness", () => {
  describe("rótulo principal sem threshold explícito (catálogo padrão)", () => {
    it("usa 'Atualizado hoje' quando o preço foi atualizado no mesmo dia", () => {
      const expected = getPriceFreshness(new Date(FIXED_NOW).toISOString(), 60).label;
      renderInline(new Date(FIXED_NOW).toISOString());
      const badge = screen.getByRole("status");
      expect(badge).toHaveAccessibleName(expected);
      expect(badge.textContent).toBe(expected);
    });

    it("usa singular 'há 1 dia' quando faz exatamente 1 dia", () => {
      const expected = getPriceFreshness(daysAgo(1), 60).label;
      expect(expected).toBe("Atualizado há 1 dia");
      renderInline(daysAgo(1));
      const badge = screen.getByRole("status");
      expect(badge).toHaveAccessibleName(expected);
      expect(badge.textContent).toBe(expected);
    });

    it("usa plural 'há N dias' para 2+ dias (status fresh)", () => {
      const expected = getPriceFreshness(daysAgo(7), 60).label;
      expect(expected).toBe("Atualizado há 7 dias");
      renderInline(daysAgo(7));
      const badge = screen.getByRole("status");
      expect(badge).toHaveAccessibleName(expected);
      expect(badge.textContent).toBe(expected);
    });

    it("renderiza copy de stale 'Preço pode estar defasado (há Nd)' acima do threshold default", () => {
      const expected = getPriceFreshness(daysAgo(90), 60).label;
      expect(expected).toBe("Preço pode estar defasado (há 90 dias)");
      renderInline(daysAgo(90));
      const badge = screen.getByRole("status");
      expect(badge).toHaveAccessibleName(expected);
      expect(badge.textContent).toBe(expected);
    });

    it("renderiza copy de aging idêntico ao label da utility (entre meio e threshold)", () => {
      const expected = getPriceFreshness(daysAgo(45), 60).label;
      expect(expected).toBe("Atualizado há 45 dias");
      renderInline(daysAgo(45));
      const badge = screen.getByRole("status");
      expect(badge).toHaveAccessibleName(expected);
      expect(badge.textContent).toBe(expected);
    });

    it("renderiza copy de unknown 'Data de atualização não informada' quando priceUpdatedAt é null", () => {
      const expected = getPriceFreshness(null, 60).label;
      expect(expected).toBe("Data de atualização não informada");
      renderInline(null);
      const badge = screen.getByRole("status");
      expect(badge).toHaveAccessibleName(expected);
      expect(badge.textContent).toBe(expected);
    });
  });

  describe("paridade ao mudar a janela de validade (threshold per-produto)", () => {
    it("respeita threshold custom: 40 dias com janela de 30 vira stale (== utility)", () => {
      const expected = getPriceFreshness(daysAgo(40), 30).label;
      expect(expected).toMatch(/^Preço pode estar defasado/);
      renderInline(daysAgo(40), { thresholdDays: 30 });
      // O badge anexa o sufixo "(limite Yd)" quando o threshold é explícito.
      // Validamos paridade como prefixo: o `freshness.label` da utility está
      // integralmente presente no copy renderizado.
      const text = screen.getByRole("status").textContent ?? "";
      expect(text.startsWith(expected)).toBe(true);
      expect(text).toContain("(limite 30d)");
    });

    it("respeita threshold custom: 40 dias com janela de 90 ainda é fresh (== utility)", () => {
      const expected = getPriceFreshness(daysAgo(40), 90).label;
      expect(expected).toBe("Atualizado há 40 dias");
      renderInline(daysAgo(40), { thresholdDays: 90 });
      const text = screen.getByRole("status").textContent ?? "";
      expect(text.startsWith(expected)).toBe(true);
      expect(text).toContain("(limite 90d)");
    });
  });

  describe("paridade do conteúdo do tooltip (sem hover, via DOM mountado)", () => {
    /**
     * Em jsdom o Radix Tooltip não monta o conteúdo sem hover real, e
     * `vi.useFakeTimers` impede o `delayDuration` de avançar. Em vez de
     * tentar abrir o tooltip, validamos que o aria-label do trigger (lido
     * por leitores de tela quando o tooltip não está visível) carrega o
     * mesmo `freshness.label` da utility, e que a data por extenso
     * exposta pelo helper `formatPriceDateLong` corresponde à formatação
     * documentada nos testes de coverage da utility.
     */
    it("aria-label do badge cobre o leitor de tela com o mesmo copy da utility", () => {
      // Stale com threshold default — caso mais sensível para auditoria.
      const expected = getPriceFreshness(daysAgo(120), 60).label;
      renderInline(daysAgo(120));
      expect(screen.getByRole("status")).toHaveAccessibleName(expected);
    });

    it("formatPriceDateLong (usado pelo tooltip) produz data pt-BR por extenso", () => {
      // Mesma regex do `tests/utils/price-freshness-coverage.test.ts`.
      // Se o helper mudar de formato, ambos os testes (utility + badge)
      // quebram juntos — sinal claro de regressão de contrato.
      const sample = formatPriceDateLong(new Date(FIXED_NOW - 10 * 86400000));
      expect(sample).toMatch(/\d{1,2} de [a-zçãéíúô]+ de \d{4}/i);
    });

    it("tooltip da utility expõe a janela de validade configurada (string compartilhada)", () => {
      // O `freshness.tooltip` produzido pela utility é a fonte de verdade
      // que alimenta também o tooltip do badge (via FreshnessTooltipBody).
      // Garantimos aqui que o número do threshold sobrevive.
      const r = getPriceFreshness(daysAgo(10), 45);
      expect(r.tooltip).toContain("Validade configurada: 45 dias");
    });
  });
});
