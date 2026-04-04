/**
 * useAIRecommendations — Hook that calls the ai-recommendations edge function
 * to get AI-powered product suggestions for a client profile.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientProfile {
  name: string;
  company?: string;
  industry?: string;
  preferences?: string[];
  purchaseHistory?: string[];
  budget?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  priceRange?: string;
  tags?: string[];
}

interface AIRecommendation {
  productId: string;
  score: number;
  reason: string;
}

interface AIRecommendationsResult {
  recommendations: AIRecommendation[];
  insights: string;
}

export function useAIRecommendations() {
  const [recommendations, setRecommendations] = useState<AIRecommendationsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = useCallback(async (
    client: ClientProfile,
    products: Product[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-recommendations", {
        body: { client, products },
      });

      if (fnError) throw fnError;

      setRecommendations(data);
      return data as AIRecommendationsResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar recomendações";
      setError(message);
      toast.error("Erro nas recomendações IA", { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearRecommendations = useCallback(() => {
    setRecommendations(null);
    setError(null);
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    getRecommendations,
    clearRecommendations,
  };
}
