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
 *   1. Aria-label do badge === `freshness.label` (visualmente também,
 *      pois o variant inline imprime o label direto no `<span>`).
 *   2. Pluralização correta: "hoje" / "há 1 dia" / "há N dias".
 *   3. Copy de stale === "Preço pode estar defasado (há Nd)".
 *   4. Copy de unknown === "Data de atualização não informada".
 *   5. Tooltip contém data por extenso pt-BR e a janela de validade
 *      configurada (ambos derivados das mesmas funções da utility).
 *
 * Regressões aqui significam que badge e utility divergiram — quem
 * lê o badge na UI veria um copy diferente do que os testes da
 * função garantem.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";
import { getPriceFreshness } from "@/utils/price-freshness";

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
 * que imprime o `freshness.label` integralmente no DOM (compact e icon-only
 * usam um copy curto "há Nd"; pdp tem layout próprio rico). Isto garante
 * que a paridade textual seja verificável tanto pelo aria-label quanto
 * pelo conteúdo visual.
 */
function renderInline(priceUpdatedAt: string | null, thresholdDays = 60) {
  return render(
    <PriceFreshnessBadge
      priceUpdatedAt={priceUpdatedAt}
      thresholdDays={thresholdDays}
      variant="inline"
    />,
  );
}

describe("PriceFreshnessBadge — paridade de rótulos com getPriceFreshness", () => {
  describe("rótulo principal (aria-label e texto visível)", () => {
    it("usa 'Atualizado hoje' quando o preço foi atualizado no mesmo dia", () => {
      const expected = getPriceFreshness(new Date(FIXED_NOW).toISOString(), 60).label;
      renderInline(new Date(FIXED_NOW).toISOString());
      const badge = screen.getByRole("status");
      // Mesmo string que a utility produz — sem manipulação extra na UI.
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

    it("renderiza copy de stale 'Preço pode estar defasado (há Nd)' acima do threshold", () => {
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

  describe("paridade ao mudar a janela de validade (threshold)", () => {
    it("respeita threshold custom: 40 dias com janela de 30 vira stale (== utility)", () => {
      const expected = getPriceFreshness(daysAgo(40), 30).label;
      expect(expected).toMatch(/^Preço pode estar defasado/);
      renderInline(daysAgo(40), 30);
      expect(screen.getByRole("status").textContent).toBe(expected);
    });

    it("respeita threshold custom: 40 dias com janela de 90 ainda é fresh (== utility)", () => {
      const expected = getPriceFreshness(daysAgo(40), 90).label;
      expect(expected).toBe("Atualizado há 40 dias");
      renderInline(daysAgo(40), 90);
      expect(screen.getByRole("status").textContent).toBe(expected);
    });
  });

  describe("tooltip (mesma fonte de verdade da utility)", () => {
    /**
     * O tooltip do `PriceFreshnessBadge` é um Radix Tooltip. Em jsdom ele só
     * monta o conteúdo após o focus/hover do trigger. Helper abre o tooltip
     * e devolve o nó com o conteúdo já renderizado.
     */
    async function openTooltipAndGetContent() {
      const trigger = screen.getByRole("status");
      // O Radix tooltip ouve focus no asChild trigger.
      fireEvent.focus(trigger);
      // Espera o portal montar.
      const tip = await waitFor(() => {
        const node = document.querySelector("[role='tooltip']");
        expect(node).not.toBeNull();
        return node as HTMLElement;
      });
      return tip;
    }

    it("inclui a data por extenso em pt-BR (mesmo formato usado pela utility)", async () => {
      // A utility usa Intl.DateTimeFormat pt-BR com mês por extenso.
      // O tooltip do badge precisa exibir o mesmo formato para auditoria.
      renderInline(daysAgo(10));
      const tip = await openTooltipAndGetContent();
      // Padrão: "DD de <mês minúsculo> de AAAA" — mesma regex do
      // teste price-freshness-coverage.
      expect(tip.textContent).toMatch(/\d{1,2} de [a-zçãéíúô]+ de \d{4}/i);
    });

    it("inclui a janela de validade configurada (mesma usada por getPriceFreshness)", async () => {
      // A utility mostra "Validade configurada: N dias" no tooltip; o badge
      // monta sua própria estrutura, mas precisa expor o mesmo número.
      renderInline(daysAgo(10), 45);
      const tip = await openTooltipAndGetContent();
      // O badge formata como "(... 45 dias ...)" dentro da regra. Validamos
      // que o número aparece de forma inequívoca.
      expect(tip.textContent).toMatch(/45\s*dias/);
    });

    it("orienta confirmar com o fornecedor para itens stale (paridade com utility)", async () => {
      renderInline(daysAgo(120), 60);
      const tip = await openTooltipAndGetContent();
      // A utility diz "confirme o valor com o fornecedor"; o badge usa o
      // mesmo verbo + sujeito. Garantimos a presença de ambos os termos.
      expect(tip.textContent?.toLowerCase()).toContain("fornecedor");
      expect(tip.textContent?.toLowerCase()).toMatch(/confirm/);
    });

    it("orienta recomendar confirmação para itens aging (paridade com utility)", async () => {
      renderInline(daysAgo(45), 60);
      const tip = await openTooltipAndGetContent();
      expect(tip.textContent?.toLowerCase()).toMatch(/recomendamos confirmar/);
    });
  });
});
