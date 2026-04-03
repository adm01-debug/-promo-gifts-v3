import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AIRecommendation {
  productId: string;
  score: number;
  reason: string;
}

interface AIRecommendationsResponse {
  recommendations: AIRecommendation[];
  insights: string;
}

interface ClientProfile {
  name: string;
  company?: string;
  industry?: string;
  preferences?: string[];
  purchaseHistory?: string[];
  budget?: string;
}

interface ProductForAI {
  id: string;
  name: string;
  category: string;
  description?: string;
  priceRange?: string;
  tags?: string[];
}

export function useAIRecommendations() {
  const { user } = useAuth();
  const [data, setData] = useState<AIRecommendationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (
    client: ClientProfile,
    products: ProductForAI[]
  ) => {
    if (!user) {
      toast.error('Faça login para usar recomendações IA');
      return null;
    }

    if (products.length === 0) {
      toast.error('Nenhum produto disponível para recomendação');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'ai-recommendations',
        {
          body: { client, products: products.slice(0, 50) },
        }
      );

      if (fnError) throw fnError;

      if (result?.error) {
        throw new Error(result.error);
      }

      const response = result as AIRecommendationsResponse;
      setData(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar recomendações';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchRecommendations,
    reset,
  };
}
