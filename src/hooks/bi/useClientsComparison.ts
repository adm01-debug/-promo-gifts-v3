/**
 * useClientsComparison — paraleliza dados de até 3 clientes para comparação lado-a-lado.
 * Composição de hooks BI existentes (sem novas RPCs).
 */
import { useClientHealthScore } from "./useClientHealthScore";
import { useClientBI } from "./useClientBI";
import { useClientSeasonality } from "./useClientSeasonality";
import { useClientAffinity } from "./useClientAffinity";
import { useCrmCompany } from "@/hooks/useCrmCompanies";
import { getCompanyDisplayName } from "@/types/crm";

export interface ClientComparisonRow {
  clientId: string;
  clientName: string;
  ramoAtividade: string | null;
  isLoading: boolean;
  score: number;
  tier: "healthy" | "attention" | "risk" | "unknown";
  ltv: number;
  avgTicket: number;
  ordersCount: number;
  daysSinceLastOrder: number | null;
  topCategory: string | null;
  nextPeakLabel: string;
  daysToNextPeak: number | null;
  shareOfWalletPct: number;
}

/** Hook por cliente (precisa ser chamado em ordem fixa). */
export function useSingleClientComparisonRow(clientId: string): ClientComparisonRow {
  const { data: company } = useCrmCompany(clientId);
  const ramo = company?.ramo_atividade ?? null;
  const health = useClientHealthScore(clientId, ramo);
  const bi = useClientBI(clientId);
  const seas = useClientSeasonality(clientId, ramo);
  const affinity = useClientAffinity(clientId);

  const topCategory =
    affinity.data?.categories?.[0]?.category ??
    bi.topCategories?.[0]?.category ??
    null;

  const nextPeakLabel =
    seas.daysToNextPeak === 0
      ? "Hoje"
      : seas.daysToNextPeak !== null && seas.nextPeakMonth !== null
        ? `${seas.daysToNextPeak}d`
        : "—";

  return {
    clientId,
    clientName: company ? getCompanyDisplayName(company) : "Cliente",
    ramoAtividade: ramo,
    isLoading: health.isLoading || bi.isLoading || seas.isLoading,
    score: health.score,
    tier: health.tier,
    ltv: bi.ltv,
    avgTicket: bi.avgTicket,
    ordersCount: bi.ordersCount,
    daysSinceLastOrder: bi.daysSinceLastOrder,
    topCategory,
    nextPeakLabel,
    daysToNextPeak: seas.daysToNextPeak,
    shareOfWalletPct: health.shareOfWalletPct,
  };
}
