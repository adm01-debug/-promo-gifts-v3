/**
 * useLogoColorAnalysis — Hook para análise de cores de logo
 *
 * Envia a imagem para a edge function, recebe cores detectadas,
 * e mapeia para Pantone mais próximo via Delta-E.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBestPantoneMatch, type PantoneMatch } from '@/utils/color-matching';
import { toast } from 'sonner';

export interface DetectedColor {
  name: string;
  hex: string;
  pantoneMatch: PantoneMatch;
  /** User can override the Pantone selection */
  selectedPantone: string;
}

export interface LogoColorAnalysisResult {
  colors: DetectedColor[];
  isAnalyzing: boolean;
  error: string | null;
}

export function useLogoColorAnalysis() {
  const [colors, setColors] = useState<DetectedColor[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyzeImage = useCallback(async (imageBase64: string) => {
    // Cancel any in-flight analysis
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsAnalyzing(true);
    setError(null);
    setColors([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-logo-colors', {
        body: { imageBase64 },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        throw new Error(data.error);
      }

      const rawColors: { name: string; hex: string }[] = data?.colors || [];

      if (rawColors.length === 0) {
        setError('Nenhuma cor detectada na imagem');
        return [];
      }

      // Map each detected color to nearest Pantone
      const mapped: DetectedColor[] = rawColors.map((c) => {
        const match = getBestPantoneMatch(c.hex);
        return {
          name: c.name,
          hex: c.hex,
          pantoneMatch: match,
          selectedPantone: match.pantoneCode,
        };
      });

      setColors(mapped);
      toast.success(`${mapped.length} cor(es) detectada(s) na logo`);
      return mapped;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return [];
      if (controller.signal.aborted) return [];
      const msg = err instanceof Error ? err.message : 'Erro ao analisar cores da logo';
      setError(msg);
      toast.error(msg);
      return [];
    } finally {
      if (!controller.signal.aborted) setIsAnalyzing(false);
    }
  }, []);

  const updatePantone = useCallback((index: number, pantoneCode: string) => {
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selectedPantone: pantoneCode } : c)),
    );
  }, []);

  const clearAnalysis = useCallback(() => {
    setColors([]);
    setError(null);
  }, []);

  return {
    colors,
    isAnalyzing,
    error,
    analyzeImage,
    updatePantone,
    clearAnalysis,
  };
}
