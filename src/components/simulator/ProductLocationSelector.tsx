/**
 * ProductLocationSelector - Seleção de local de gravação no produto
 * 
 * Busca locais disponíveis com base no produto e técnica selecionados,
 * mostrando dimensões máximas permitidas para cada área.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  Ruler,
  Maximize2,
  Palette,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { invokeExternalRpc } from "@/lib/external-rpc";
import { logger } from "@/lib/logger";

// Tipos
interface ProductLocation {
  id: string;
  component_id: string;
  component_name: string;
  location_code: string;
  location_name: string;
  max_width_cm: number | null;
  max_height_cm: number | null;
  max_area_cm2: number | null;
  area_image_url: string | null;
  techniques: LocationTechnique[];
}

interface LocationTechnique {
  id: string;
  technique_id: string;
  technique_name: string;
  technique_code: string;
  max_colors: number | null;
  is_default: boolean;
}

export interface SelectedLocation {
  locationId: string;
  componentName: string;
  locationName: string;
  maxWidth: number;
  maxHeight: number;
  maxArea: number;
  techniqueId: string | null;
  techniqueName: string | null;
  maxColors: number | null;
}

interface ProductLocationSelectorProps {
  productId: string | null;
  productName?: string;
  selectedTechniqueIds?: string[];
  onLocationSelect?: (location: SelectedLocation | null) => void;
  onDimensionsChange?: (width: number, height: number) => void;
  currentWidth?: number;
  currentHeight?: number;
}

export function ProductLocationSelector({
  productId,
  productName,
  selectedTechniqueIds = [],
  onLocationSelect,
  onDimensionsChange,
  currentWidth = 10,
  currentHeight = 10,
}: ProductLocationSelectorProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Buscar locais de gravação do produto
  const { data: locations, isLoading } = useQuery({
    queryKey: ["product-locations", productId],
    queryFn: async (): Promise<ProductLocation[]> => {
      if (!productId) return [];

      try {
        const result = await invokeExternalRpc<any>(
          'fn_get_product_customization_options',
          { p_product_id: productId }
        );

        if (!result?.locations?.length) return [];

        const productLocations: ProductLocation[] = [];
        result.locations.forEach((loc: any) => {
          const techniques: LocationTechnique[] = loc.options?.map((opt: any) => ({
            id: opt.technique_id,
            technique_id: opt.technique_id,
            technique_name: opt.tecnica_nome || "Técnica",
            technique_code: opt.codigo_tabela || "",
            max_colors: opt.max_cores ?? null,
            is_default: false,
          })) || [];

          productLocations.push({
            id: loc.location_code,
            component_id: loc.location_code,
            component_name: loc.location_name,
            location_code: loc.location_code,
            location_name: loc.location_name,
            max_width_cm: null,
            max_height_cm: null,
            max_area_cm2: null,
            area_image_url: null,
            techniques,
          });
        });

        return productLocations;
      } catch (err) {
        logger.warn("Error fetching product locations via v6:", err);
        return [];
      }
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });

  // Filtrar locais que suportam as técnicas selecionadas
  const availableLocations = useMemo(() => {
    if (!locations) return [];
    if (selectedTechniqueIds.length === 0) return locations;

    return locations.filter((loc) =>
      loc.techniques.some((t) => selectedTechniqueIds.includes(t.technique_id))
    );
  }, [locations, selectedTechniqueIds]);

  // Local selecionado
  const selectedLocation = useMemo(() => {
    if (!selectedLocationId || !locations) return null;
    return locations.find((l) => l.id === selectedLocationId) || null;
  }, [selectedLocationId, locations]);

  // Verificar se dimensões atuais excedem o máximo
  const dimensionWarning = useMemo(() => {
    if (!selectedLocation) return null;
    
    const maxW = selectedLocation.max_width_cm || 100;
    const maxH = selectedLocation.max_height_cm || 100;
    const maxA = selectedLocation.max_area_cm2 || 10000;
    const currentArea = currentWidth * currentHeight;

    if (currentWidth > maxW) {
      return `Largura excede o máximo de ${maxW}cm`;
    }
    if (currentHeight > maxH) {
      return `Altura excede o máximo de ${maxH}cm`;
    }
    if (currentArea > maxA) {
      return `Área excede o máximo de ${maxA}cm²`;
    }
    return null;
  }, [selectedLocation, currentWidth, currentHeight]);

  // Handler para seleção de local
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
    const location = locations?.find((l) => l.id === locationId);
    
    if (location) {
      // Encontrar técnica compatível
      const compatibleTechnique = location.techniques.find(
        (t) => selectedTechniqueIds.includes(t.technique_id)
      ) || location.techniques.find((t) => t.is_default) || location.techniques[0];

      const selected: SelectedLocation = {
        locationId: location.id,
        componentName: location.component_name,
        locationName: location.location_name,
        maxWidth: location.max_width_cm || 50,
        maxHeight: location.max_height_cm || 50,
        maxArea: location.max_area_cm2 || 2500,
        techniqueId: compatibleTechnique?.technique_id || null,
        techniqueName: compatibleTechnique?.technique_name || null,
        maxColors: compatibleTechnique?.max_colors || null,
      };

      onLocationSelect?.(selected);

      // Ajustar dimensões se excederem o máximo
      const newWidth = Math.min(currentWidth, selected.maxWidth);
      const newHeight = Math.min(currentHeight, selected.maxHeight);
      if (newWidth !== currentWidth || newHeight !== currentHeight) {
        onDimensionsChange?.(newWidth, newHeight);
      }
    }

    setIsDialogOpen(false);
  };

  // Se não houver produto ou locais
  if (!productId) {
    return null;
  }

  // Componente compacto para exibição inline
  const CompactView = () => (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 h-8",
                selectedLocation && "border-primary bg-primary/5",
                dimensionWarning && "border-warning bg-warning/5"
              )}
              onClick={() => setIsDialogOpen(true)}
            >
              <MapPin className="h-3.5 w-3.5" />
              {selectedLocation ? (
                <span className="max-w-[120px] truncate text-xs">
                  {selectedLocation.component_name} - {selectedLocation.location_name}
                </span>
              ) : (
                <span className="text-xs">Selecionar Local</span>
              )}
              {dimensionWarning && (
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {selectedLocation ? (
              <div className="space-y-1">
                <p className="font-medium">{selectedLocation.location_name}</p>
                <p className="text-xs text-muted-foreground">
                  Máx: {selectedLocation.max_width_cm}×{selectedLocation.max_height_cm}cm
                  ({selectedLocation.max_area_cm2}cm²)
                </p>
                {dimensionWarning && (
                  <p className="text-xs text-warning">{dimensionWarning}</p>
                )}
              </div>
            ) : (
              <p>Clique para selecionar o local de gravação</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {selectedLocation && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Ruler className="h-3 w-3" />
          <span>
            Máx: {selectedLocation.max_width_cm}×{selectedLocation.max_height_cm}cm
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <CompactView />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Local de Gravação
              {productName && (
                <Badge variant="outline" className="ml-2 font-normal">
                  {productName}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : availableLocations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum local de gravação configurado</p>
                <p className="text-sm mt-1">
                  {selectedTechniqueIds.length > 0
                    ? "Nenhum local suporta as técnicas selecionadas"
                    : "Este produto não possui locais de gravação cadastrados"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {availableLocations.map((location, idx) => {
                    const isSelected = selectedLocationId === location.id;
                    const compatibleTechniques = location.techniques.filter(
                      (t) =>
                        selectedTechniqueIds.length === 0 ||
                        selectedTechniqueIds.includes(t.technique_id)
                    );

                    return (
                      <motion.div
                        key={location.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <button
                          onClick={() => handleLocationSelect(location.id)}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50 bg-card hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            {/* Ícone/Imagem */}
                            <div
                              className={cn(
                                "w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0",
                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                              )}
                            >
                              {location.area_image_url ? (
                                <img
                                  src={location.area_image_url}
                                  alt={location.location_name}
                                  className="w-full h-full object-cover rounded-lg" loading="lazy" />
                              ) : (
                                <MapPin className="h-6 w-6" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{location.component_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {location.location_name}
                                </Badge>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                                )}
                              </div>

                              {/* Dimensões */}
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Ruler className="h-3.5 w-3.5" />
                                  {location.max_width_cm || "–"} × {location.max_height_cm || "–"} cm
                                </span>
                                <span className="flex items-center gap-1">
                                  <Maximize2 className="h-3.5 w-3.5" />
                                  {location.max_area_cm2 || "–"} cm²
                                </span>
                              </div>

                              {/* Técnicas compatíveis */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {compatibleTechniques.slice(0, 4).map((tech) => (
                                  <Badge
                                    key={tech.id}
                                    variant="secondary"
                                    className="text-[10px] h-5 gap-1"
                                  >
                                    {tech.technique_name}
                                    {tech.max_colors && (
                                      <span className="flex items-center gap-0.5 text-muted-foreground">
                                        <Palette className="h-2.5 w-2.5" />
                                        {tech.max_colors}
                                      </span>
                                    )}
                                  </Badge>
                                ))}
                                {compatibleTechniques.length > 4 && (
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    +{compatibleTechniques.length - 4}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>

          {selectedLocation && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium">
                    {selectedLocation.component_name} - {selectedLocation.location_name}
                  </span>
                </div>
                <Badge variant="outline">
                  Máx: {selectedLocation.max_width_cm}×{selectedLocation.max_height_cm}cm
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente resumido para exibição em card
export function LocationSummaryBadge({
  componentName,
  locationName,
  maxWidth,
  maxHeight,
  maxColors,
}: {
  componentName: string;
  locationName: string;
  maxWidth?: number;
  maxHeight?: number;
  maxColors?: number | null;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1.5 cursor-help">
            <MapPin className="h-3 w-3" />
            {componentName} - {locationName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-medium">{locationName}</p>
            {maxWidth && maxHeight && (
              <p>Área máxima: {maxWidth}×{maxHeight}cm</p>
            )}
            {maxColors && <p>Máx cores: {maxColors}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
