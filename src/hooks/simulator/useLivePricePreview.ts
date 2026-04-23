/**
 * useLivePricePreview - Debounced price estimate for StepSpecs
 * 
 * Fetches a quick price estimate from the cheapest technique
 * as the user adjusts dimensions/colors, before clicking "Compare".
 */

import { useState, useEffect, useRef } from 'react';
import { invokeExternalRpc } from '@/lib/external-rpc';
import type { CustomizationPriceResponse } from '@/hooks/useGravacaoPriceV2';
import { adaptPriceResponse } from '@/lib/personalization/adapters';
import type { EngravingLocation, EngravingSpecs } from '@/types/domain/simulator-wizard';

export interface LivePriceEstimate {
  cheapestName: string;
  cheapestCode: string;
  unitPrice: number;
  totalPrice: number;
  costPerUnit: number;
  productionDays: number | null;
}

interface UseLivePricePreviewParams {
  selectedLocation: EngravingLocation | null;
  engravingSpecs: EngravingSpecs;
  quantity: number;
  enabled?: boolean;
}

export function useLivePricePreview({
  selectedLocation,
  engravingSpecs,
  quantity,
  enabled = true,
}: UseLivePricePreviewParams) {
  const [estimate, setEstimate] = useState<LivePriceEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef(false);

  useEffect(() => {
    if (!enabled || !selectedLocation || selectedLocation.availableTechniques.length === 0) {
      setEstimate(null);
      return;
    }

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current = true; // Cancel in-flight

    timerRef.current = setTimeout(async () => {
      abortRef.current = false;
      setIsLoading(true);

      // Pick the first technique with pricing as a preview candidate
      const tech = selectedLocation.availableTechniques.find(t => t.hasPricing !== false);
      if (!tech) {
        setIsLoading(false);
        return;
      }

      try {
        const cobraPorCor = tech.cobraPorCor !== false;
        const effectiveColors = (!cobraPorCor || (tech.maxColors ?? 0) <= 1) ? 1 : engravingSpecs.colors;
        const usaDimensao = tech.usaDimensao !== false;

        const rpcParams: Record<string, unknown> = {
          p_area_id: tech.printAreaId,
          p_quantidade: quantity,
          p_num_cores: effectiveColors,
        };

        if (usaDimensao && engravingSpecs.width > 0 && engravingSpecs.height > 0) {
          rpcParams.p_largura_cm = engravingSpecs.width;
          rpcParams.p_altura_cm = engravingSpecs.height;
        }

        const result = await invokeExternalRpc<CustomizationPriceResponse>(
          'fn_get_customization_price',
          rpcParams
        );

        if (abortRef.current) return; // Stale response

        if (result?.success) {
          const flat = adaptPriceResponse(result);
          setEstimate({
            cheapestName: flat.technique || tech.techniqueName,
            cheapestCode: flat.tabela_codigo_curto || tech.techniqueCode,
            unitPrice: flat.unit_price,
            totalPrice: flat.total_price,
            costPerUnit: quantity > 0 ? flat.total_price / quantity : 0,
            productionDays: flat.production_days,
          });
        } else {
          setEstimate(null);
        }
      } catch {
        if (!abortRef.current) setEstimate(null);
      } finally {
        if (!abortRef.current) setIsLoading(false);
      }
    }, 800); // 800ms debounce

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current = true;
    };
  }, [selectedLocation, engravingSpecs.colors, engravingSpecs.width, engravingSpecs.height, quantity, enabled]);

  return { estimate, isLoading };
}
