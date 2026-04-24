/**
 * Paridade de rótulos pt-BR — `PriceFreshnessBadge` × `getPriceFreshness`.
 *
 * Os testes em `tests/utils/price-freshness-coverage.test.ts` travam o
 * contrato textual da função `getPriceFreshness` (rótulos canônicos,
 * pluralização, copy de stale/aging/fresh/unknown e estrutura do tooltip).
 *
 * Aqui garantimos que o `PriceFreshnessBadge` — quando renderizado no
 * variant `inline` (PDP/Quick View, sem CTA, sem confirmação) — expõe
 * exatamente os mesmos rótulos no **texto visível** (DOM). O aria-label
 * passou a ser um copy enriquecido de a11y a partir da mudança
 * "Acessibilidade do selo": leitores de tela ouvem agora "Preço atualizado…",
 * "Atenção: preço possivelmente defasado…", etc., em vez do label cru da
 * utility. Por isso esta suíte valida:
 *   1. Texto visível === `freshness.label` (sem sufixo de limite quando
 *      o produto usa o threshold default global).
 *   2. Aria-label CONTÉM um termo distintivo do status (atualizado /
 *      próximo do limite / possivelmente defasado / não informada) —
 *      leitor de tela continua ouvindo a categoria correta.
 *   3. Pluralização correta no DOM: "hoje" / "há 1 dia" / "há N dias".
 *   4. Copy de stale (DOM) === "Preço pode estar defasado (há Nd)".
 *   5. Copy de unknown (DOM) === "Data de atualização não informada".
 *   6. Quando o threshold é explícito (per-product), o badge anexa
 *      "(limite Yd)" ao label da utility — paridade preservada como
 *      *prefixo* no DOM.
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

/**
 * Quando há data válida, o `inline` anexa " · em DD/MM/AAAA" ao
 * `freshness.label`. O `aria-label` continua sendo o label puro
 * (sem o sufixo numérico) — leitores de tela ouvem só o status.
 */
function expectedInlineText(priceUpdatedAt: string | null, opts: { thresholdDays?: number } = {}) {
  const t = opts.thresholdDays ?? null;
  const label = getPriceFreshness(priceUpdatedAt, t).label;
  const limit = typeof opts.thresholdDays === "number" ? ` (limite ${opts.thresholdDays}d)` : "";
  if (!priceUpdatedAt) return label + limit;
  const d = new Date(priceUpdatedAt);
  if (Number.isNaN(d.getTime())) return label + limit;
  return `${label} · em ${formatPriceDateShort(d)}${limit}`;
}

/** Termo distintivo no aria-label rico (a11y) por status. */
const ARIA_KEYWORDS = {
  fresh: /atualizado/i,
  aging: /próximo do limite/i,
  stale: /possivelmente defasado/i,
  unknown: /não informada/i,
};

describe("PriceFreshnessBadge — paridade de rótulos com getPriceFreshness", () => {
  describe("rótulo principal sem threshold explícito (catálogo padrão)", () => {
    it("usa 'Atualizado hoje' quando o preço foi atualizado no mesmo dia", () => {
      const textExpected = expectedInlineText(new Date(FIXED_NOW).toISOString());
      renderInline(new Date(FIXED_NOW).toISOString());
      const badge = screen.getByRole("status");
      // Aria-label rico: contém o termo distintivo do status fresh.
      expect(badge.getAttribute("aria-label")).toMatch(ARIA_KEYWORDS.fresh);
      expect(badge.textContent).toBe(textExpected);
    });

    it("usa singular 'há 1 dia' quando faz exatamente 1 dia", () => {
      const labelExpected = getPriceFreshness(daysAgo(1), 60).label;
      expect(labelExpected).toBe("Atualizado há 1 dia");
      renderInline(daysAgo(1));
      const badge = screen.getByRole("status");
      expect(badge.getAttribute("aria-label")).toMatch(ARIA_KEYWORDS.fresh);
      // Aria-label deve mencionar a data ("há 1 dia") quando há data válida.
      expect(badge.getAttribute("aria-label")).toMatch(/há 1 dia/);
      expect(badge.textContent).toBe(expectedInlineText(daysAgo(1)));
    });

    it("usa plural 'há N dias' para 2+ dias (status fresh)", () => {
      const labelExpected = getPriceFreshness(daysAgo(7), 60).label;
      expect(labelExpected).toBe("Atualizado há 7 dias");
      renderInline(daysAgo(7));
      const badge = screen.getByRole("status");
      expect(badge.getAttribute("aria-label")).toMatch(ARIA_KEYWORDS.fresh);
      expect(badge.getAttribute("aria-label")).toMatch(/há 7 dias/);
      expect(badge.textContent).toBe(expectedInlineText(daysAgo(7)));
    });

    it("renderiza copy de stale 'Preço pode estar defasado (há Nd)' acima do threshold default", () => {
      const labelExpected = getPriceFreshness(daysAgo(90), 60).label;
      expect(labelExpected).toBe("Preço pode estar defasado (há 90 dias)");
      renderInline(daysAgo(90));
      const badge = screen.getByRole("status");
      // Stale: leitor de tela ouve "Atenção: preço possivelmente defasado…".
      expect(badge.getAttribute("aria-label")).toMatch(ARIA_KEYWORDS.stale);
      expect(badge.getAttribute("aria-label")).toMatch(/há 90 dias/);
      expect(badge.textContent).toBe(expectedInlineText(daysAgo(90)));
    });

    it("renderiza copy de aging idêntico ao label da utility (entre meio e threshold)", () => {
      const labelExpected = getPriceFreshness(daysAgo(45), 60).label;
      expect(labelExpected).toBe("Atualizado há 45 dias");
      renderInline(daysAgo(45));
      const badge = screen.getByRole("status");
      // Aging: aria-label fala "próximo do limite" mesmo com label visual fresh-like.
      expect(badge.getAttribute("aria-label")).toMatch(ARIA_KEYWORDS.aging);
      expect(badge.textContent).toBe(expectedInlineText(daysAgo(45)));
    });

    it("renderiza copy de unknown 'Data de atualização não informada' quando priceUpdatedAt é null", () => {
      const labelExpected = getPriceFreshness(null, 60).label;
      expect(labelExpected).toBe("Data de atualização não informada");
      renderInline(null);
      const badge = screen.getByRole("status");
      expect(badge.getAttribute("aria-label")).toMatch(ARIA_KEYWORDS.unknown);
      // Sem data válida: textContent === label puro (sem sufixo "em ...")
      expect(badge.textContent).toBe(labelExpected);
    });
  });

  describe("paridade ao mudar a janela de validade (threshold per-produto)", () => {
    it("respeita threshold custom: 40 dias com janela de 30 vira stale (== utility)", () => {
      const expected = getPriceFreshness(daysAgo(40), 30).label;
      expect(expected).toMatch(/^Preço pode estar defasado/);
      renderInline(daysAgo(40), { thresholdDays: 30 });
      // Paridade preservada: o `freshness.label` aparece como prefixo do
      // copy renderizado, e o sufixo "(limite Yd)" + " · em DD/MM/AAAA"
      // são adições estáveis.
      const text = screen.getByRole("status").textContent ?? "";
      expect(text.startsWith(expected)).toBe(true);
      expect(text).toContain("(limite 30d)");
      expect(text).toMatch(/· em \d{2}\/\d{2}\/\d{4}/);
    });

    it("respeita threshold custom: 40 dias com janela de 90 ainda é fresh (== utility)", () => {
      const expected = getPriceFreshness(daysAgo(40), 90).label;
      expect(expected).toBe("Atualizado há 40 dias");
      renderInline(daysAgo(40), { thresholdDays: 90 });
      const text = screen.getByRole("status").textContent ?? "";
      expect(text.startsWith(expected)).toBe(true);
      expect(text).toContain("(limite 90d)");
      expect(text).toMatch(/· em \d{2}\/\d{2}\/\d{4}/);
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
