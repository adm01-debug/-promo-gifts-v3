/**
 * useAIRecommendations — Hook para consumir a edge function ai-recommendations.
 * Recebe perfil de cliente + lista de produtos e retorna recomendações rankeadas por IA.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================
// TIPOS
// ============================================

export interface ClientProfile {
  name: string;
  company?: string;
  industry?: string;
  preferences?: string[];
  purchaseHistory?: string[];
  budget?: string;
}

export interface ProductForRecommendation {
  id: string;
  name: string;
  category: string;
  description?: string;
  priceRange?: string;
  tags?: string[];
}

export interface Recommendation {
  productId: string;
  score: number;
  reason: string;
}

export interface AIRecommendationsResult {
  recommendations: Recommendation[];
  insights: string;
}

// ============================================
// HOOK
// ============================================

export function useAIRecommendations() {
  const [data, setData] = useState<AIRecommendationsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(
    async (client: ClientProfile, products: ProductForRecommendation[]) => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        if (!client.name) {
          throw new Error("Nome do cliente é obrigatório");
        }
        if (!products.length) {
          throw new Error("É necessário fornecer pelo menos um produto");
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error("Usuário não autenticado");
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-recommendations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ client, products }),
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Limite de requisições excedido. Tente novamente em alguns minutos.");
          }
          if (response.status === 402) {
            throw new Error("Créditos de IA esgotados. Contate o administrador.");
          }
          const errText = await response.text().catch(() => "");
          throw new Error(`Erro ao gerar recomendações: ${response.status} ${errText}`);
        }

        const result: AIRecommendationsResult = await response.json();
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    recommendations: data?.recommendations ?? [],
    insights: data?.insights ?? "",
    isLoading,
    error,
    fetchRecommendations,
    reset,
  };
}
