/**
 * ProductCustomizationOptions — Seletor de personalização v6
 *
 * Usa fn_get_product_customization_options para obter locais e técnicas.
 * Fluxo: Local (tabs) → Técnica (cards) → Dimensões/Cores → Preço.
 *
 * Briefing v6 (12/02/2026).
 */

import { useState, useCallback, useRef } from 'react';
import { Paintbrush, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProductCustomizationOptions } from '@/hooks/useProductCustomizationOptions';
import { LocationPanel } from './customization/LocationPanel';
import type { CustomizationPriceResponseV6, PersonalizationItem } from '@/types/customization';

interface ProductCustomizationOptionsProps {
  productId: string;
  productSku?: string;
  quantity?: number;
  onSelectionChange?: (personalizations: PersonalizationItem[]) => void;
}

export function ProductCustomizationOptions({
  productId,
  quantity = 100,
  onSelectionChange,
}: ProductCustomizationOptionsProps) {
  const { data: options, isLoading } = useProductCustomizationOptions(productId);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  // Track prices per location
  const pricesRef = useRef<Map<string, PersonalizationItem>>(new Map());

  const handlePriceCalculated = useCallback(
    (
      locationCode: string,
      techniqueId: string,
      price: CustomizationPriceResponseV6 | null,
      dimensions?: { width?: number; height?: number },
    ) => {
      const location = options?.locations.find((l) => l.location_code === locationCode);
      const technique = location?.options.find((t) => t.technique_id === techniqueId);

      if (price && technique) {
        pricesRef.current.set(locationCode, {
          locationCode,
          locationName: location?.location_name || locationCode,
          techniqueId,
          techniqueName: technique.tecnica_nome,
          codigoTabela: technique.codigo_tabela,
          grupoTecnica: technique.grupo_tecnica,
          width: dimensions?.width,
          height: dimensions?.height,
          numberOfColors: price.num_cores,
          usaDimensao: technique.usa_dimensao,
          price,
        });
      } else {
        pricesRef.current.delete(locationCode);
      }

      // Notify parent
      const items = Array.from(pricesRef.current.values());
      onSelectionChange?.(items);
    },
    [options, onSelectionChange],
  );

  // Set first location as active when data loads
  if (options?.locations?.length && !activeLocation) {
    setActiveLocation(options.locations[0].location_code);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!options?.locations?.length) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Este produto não possui opções de personalização configuradas.
      </div>
    );
  }

  const locations = options.locations;
  const currentLocation = locations.find((l) => l.location_code === activeLocation);
  const totalSelected = pricesRef.current.size;
  const totalPrice = Array.from(pricesRef.current.values()).reduce(
    (sum, p) => sum + (p.price?.total_cobrado ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Paintbrush className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">Personalização</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {locations.length} loca{locations.length !== 1 ? 'is' : 'l'}
        </Badge>
      </div>

      {/* Location tabs */}
      <div className="flex flex-wrap gap-2">
        {locations.map((loc) => {
          const isActive = activeLocation === loc.location_code;
          const hasPrice = pricesRef.current.has(loc.location_code);
          return (
            <button
              key={loc.location_code}
              onClick={() => setActiveLocation(loc.location_code)}
              className={cn(
                'rounded-xl border px-4 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : hasPrice
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-secondary text-secondary-foreground hover:bg-secondary/80',
              )}
            >
              {loc.location_name}
              {hasPrice && !isActive && <span className="ml-1.5 text-xs">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Current location panel */}
      {currentLocation && (
        <LocationPanel
          key={currentLocation.location_code}
          location={currentLocation}
          quantity={quantity}
          onPriceCalculated={handlePriceCalculated}
        />
      )}

      {/* Summary */}
      {totalSelected > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
          <span className="font-medium text-foreground">
            {totalSelected} loca{totalSelected !== 1 ? 'is' : 'l'} personalizado
            {totalSelected !== 1 ? 's' : ''}
          </span>
          <span className="font-semibold text-primary">
            Total gravação: R$ {totalPrice.toFixed(2)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
          Selecione uma técnica para ver o preço de gravação
        </div>
      )}
    </div>
  );
}
