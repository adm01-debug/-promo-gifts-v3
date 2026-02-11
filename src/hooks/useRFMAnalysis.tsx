import { useQuery } from "@tanstack/react-query";
import { selectCrm } from "@/lib/crm-db";
import { CrmCompany, getCompanyDisplayName } from "@/types/crm";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface RFMScore {
  clientId: string;
  clientName: string;
  recency: number; // 1-5 score
  frequency: number; // 1-5 score
  monetary: number; // 1-5 score
  rfmScore: number; // Combined score
  segment: RFMSegment;
  daysSinceLastPurchase: number;
  totalOrders: number;
  totalSpent: number;
}

export type RFMSegment = 
  | "champions" // Best customers
  | "loyal" // Loyal customers
  | "potential_loyal" // Recent customers with potential
  | "new" // New customers
  | "promising" // Low spenders but recent
  | "needs_attention" // Above average but not recent
  | "about_to_sleep" // Below average, risk of leaving
  | "at_risk" // Big spenders who haven't bought recently
  | "hibernating" // Low engagement
  | "lost"; // Haven't bought in a long time

interface RFMConfig {
  recencyThresholds: number[]; // Days
  frequencyThresholds: number[]; // Number of orders
  monetaryThresholds: number[]; // Value
}

const DEFAULT_CONFIG: RFMConfig = {
  recencyThresholds: [30, 60, 90, 180], // 1-5 based on days
  frequencyThresholds: [2, 4, 6, 10], // 1-5 based on orders
  monetaryThresholds: [1000, 5000, 15000, 50000], // 1-5 based on value in BRL
};

const getSegment = (r: number, f: number, m: number): RFMSegment => {
  const rfm = `${r}${f}${m}`;
  
  // Champions: High in all dimensions
  if (r >= 4 && f >= 4 && m >= 4) return "champions";
  
  // Loyal: High frequency and monetary
  if (f >= 4 && m >= 4) return "loyal";
  
  // At Risk: Were good customers but haven't bought recently
  if (r <= 2 && f >= 3 && m >= 3) return "at_risk";
  
  // Potential Loyal: Recent with good frequency
  if (r >= 4 && f >= 3) return "potential_loyal";
  
  // New: Very recent, low frequency
  if (r >= 4 && f <= 2) return "new";
  
  // Promising: Recent but low monetary
  if (r >= 3 && m <= 2) return "promising";
  
  // Needs Attention: Above average but declining recency
  if (r === 3 && f >= 3 && m >= 3) return "needs_attention";
  
  // About to Sleep: Below average, haven't bought recently
  if (r === 2 && f <= 3) return "about_to_sleep";
  
  // Hibernating: Haven't bought in a while, low engagement
  if (r <= 2 && f <= 2 && m <= 2) return "hibernating";
  
  // Lost: Very old customers with low engagement
  if (r === 1) return "lost";
  
  return "needs_attention";
};

const getScore = (value: number, thresholds: number[], inverse: boolean = false): number => {
  let score = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (inverse ? value <= thresholds[i] : value >= thresholds[i]) {
      score = 5 - i;
      if (!inverse) score = i + 2;
    }
  }
  return Math.min(5, Math.max(1, inverse ? 6 - score : score));
};

export const SEGMENT_INFO: Record<RFMSegment, { label: string; color: string; description: string; action: string }> = {
  champions: {
    label: "Campeões",
    color: "bg-emerald-500",
    description: "Compraram recentemente, compram frequentemente e gastam muito",
    action: "Recompense-os! Podem se tornar promotores da marca",
  },
  loyal: {
    label: "Leais",
    color: "bg-blue-500",
    description: "Gastam bem e compram regularmente",
    action: "Upsell produtos premium, peça reviews",
  },
  potential_loyal: {
    label: "Potenciais Leais",
    color: "bg-cyan-500",
    description: "Clientes recentes com bom potencial",
    action: "Ofereça programa de fidelidade, recomende outros produtos",
  },
  new: {
    label: "Novos",
    color: "bg-violet-500",
    description: "Compraram recentemente pela primeira vez",
    action: "Inicie relacionamento, ofereça suporte, onboarding",
  },
  promising: {
    label: "Promissores",
    color: "bg-indigo-400",
    description: "Compradores recentes mas com baixo valor",
    action: "Crie reconhecimento de marca, ofereça trials gratuitos",
  },
  needs_attention: {
    label: "Precisam Atenção",
    color: "bg-amber-500",
    description: "Acima da média mas não compraram recentemente",
    action: "Reative com ofertas personalizadas, reconquiste",
  },
  about_to_sleep: {
    label: "Quase Dormindo",
    color: "bg-orange-500",
    description: "Abaixo da média, risco de perda",
    action: "Campanhas de reativação urgentes, ofertas limitadas",
  },
  at_risk: {
    label: "Em Risco",
    color: "bg-red-400",
    description: "Gastavam muito mas não compram há tempo",
    action: "Envie emails personalizados, ofereça renovações",
  },
  hibernating: {
    label: "Hibernando",
    color: "bg-gray-400",
    description: "Última compra foi há muito tempo, baixo engajamento",
    action: "Ofereça produtos relevantes e descontos",
  },
  lost: {
    label: "Perdidos",
    color: "bg-gray-600",
    description: "Menor recência, frequência e valor monetário",
    action: "Campanhas de reconquista ou aceitar a perda",
  },
};

export function useRFMAnalysis(config: Partial<RFMConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["crm-companies-rfm"],
    queryFn: async () => {
      const companies = await selectCrm<CrmCompany>("companies", {
        select: "id, razao_social, nome_fantasia, ultima_compra_em, total_gasto, bitrix_id",
        filters: { deleted_at: null },
        limit: 1000,
      });
      return companies.map(c => ({
        id: c.id,
        name: getCompanyDisplayName(c),
        last_purchase_date: c.ultima_compra_em,
        total_spent: c.total_gasto,
        bitrix_id: c.bitrix_id,
      }));
    },
  });

  const { data: deals, isLoading: isLoadingDeals } = useQuery({
    queryKey: ["bitrix-deals-rfm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bitrix_deals")
        .select("bitrix_client_id, value, created_at");

      if (error) throw error;
      return data;
    },
  });

  const rfmScores = useMemo(() => {
    if (!clients || !deals) return [];

    const now = new Date();
    const scores: RFMScore[] = [];

    // Group deals by client
    const dealsByClient = deals.reduce((acc, deal) => {
      if (!acc[deal.bitrix_client_id]) {
        acc[deal.bitrix_client_id] = [];
      }
      acc[deal.bitrix_client_id].push(deal);
      return acc;
    }, {} as Record<string, typeof deals>);

    for (const client of clients) {
      const clientDeals = dealsByClient[client.id] || [];
      
      // Calculate days since last purchase
      let daysSinceLastPurchase = 365;
      if (client.last_purchase_date) {
        const lastPurchase = new Date(client.last_purchase_date);
        daysSinceLastPurchase = Math.floor(
          (now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24)
        );
      } else if (clientDeals.length > 0) {
        const lastDeal = clientDeals.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        daysSinceLastPurchase = Math.floor(
          (now.getTime() - new Date(lastDeal.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Calculate total orders and total spent
      const totalOrders = clientDeals.length;
      const totalSpent = client.total_spent || clientDeals.reduce((sum, d) => sum + (d.value || 0), 0);

      // Calculate RFM scores (1-5)
      const recencyScore = getRecencyScore(daysSinceLastPurchase, finalConfig.recencyThresholds);
      const frequencyScore = getFrequencyScore(totalOrders, finalConfig.frequencyThresholds);
      const monetaryScore = getMonetaryScore(totalSpent, finalConfig.monetaryThresholds);

      const segment = getSegment(recencyScore, frequencyScore, monetaryScore);

      scores.push({
        clientId: client.id,
        clientName: client.name,
        recency: recencyScore,
        frequency: frequencyScore,
        monetary: monetaryScore,
        rfmScore: recencyScore * 100 + frequencyScore * 10 + monetaryScore,
        segment,
        daysSinceLastPurchase,
        totalOrders,
        totalSpent,
      });
    }

    return scores.sort((a, b) => b.rfmScore - a.rfmScore);
  }, [clients, deals, finalConfig]);

  // Calculate segment distribution
  const segmentDistribution = useMemo(() => {
    const distribution: Record<RFMSegment, number> = {
      champions: 0,
      loyal: 0,
      potential_loyal: 0,
      new: 0,
      promising: 0,
      needs_attention: 0,
      about_to_sleep: 0,
      at_risk: 0,
      hibernating: 0,
      lost: 0,
    };

    for (const score of rfmScores) {
      distribution[score.segment]++;
    }

    return distribution;
  }, [rfmScores]);

  // Calculate averages
  const averages = useMemo(() => {
    if (rfmScores.length === 0) return { recency: 0, frequency: 0, monetary: 0 };

    const totals = rfmScores.reduce(
      (acc, s) => ({
        recency: acc.recency + s.recency,
        frequency: acc.frequency + s.frequency,
        monetary: acc.monetary + s.monetary,
      }),
      { recency: 0, frequency: 0, monetary: 0 }
    );

    return {
      recency: totals.recency / rfmScores.length,
      frequency: totals.frequency / rfmScores.length,
      monetary: totals.monetary / rfmScores.length,
    };
  }, [rfmScores]);

  return {
    rfmScores,
    segmentDistribution,
    averages,
    isLoading: isLoadingClients || isLoadingDeals,
    totalClients: rfmScores.length,
    getClientsBySegment: (segment: RFMSegment) => 
      rfmScores.filter((s) => s.segment === segment),
  };
}

function getRecencyScore(days: number, thresholds: number[]): number {
  // Lower days = higher score
  if (days <= thresholds[0]) return 5;
  if (days <= thresholds[1]) return 4;
  if (days <= thresholds[2]) return 3;
  if (days <= thresholds[3]) return 2;
  return 1;
}

function getFrequencyScore(orders: number, thresholds: number[]): number {
  // More orders = higher score
  if (orders >= thresholds[3]) return 5;
  if (orders >= thresholds[2]) return 4;
  if (orders >= thresholds[1]) return 3;
  if (orders >= thresholds[0]) return 2;
  return 1;
}

function getMonetaryScore(value: number, thresholds: number[]): number {
  // Higher value = higher score
  if (value >= thresholds[3]) return 5;
  if (value >= thresholds[2]) return 4;
  if (value >= thresholds[1]) return 3;
  if (value >= thresholds[0]) return 2;
  return 1;
}
