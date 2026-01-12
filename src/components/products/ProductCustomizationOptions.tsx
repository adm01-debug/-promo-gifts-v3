import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPromobrindProductBySku } from "@/lib/external-db";
import { 
  Paintbrush, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Maximize2,
  Check,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ComponentLocation {
  id: string;
  location_name: string;
  location_code: string;
  max_area_cm2: number | null;
  max_width_cm: number | null;
  max_height_cm: number | null;
  techniques: {
    id: string;
    technique_id: string;
    composed_code: string;
    is_default: boolean;
    technique: {
      id: string;
      name: string;
      code: string;
      description: string | null;
      unit_cost: number | null;
      setup_cost: number | null;
    };
  }[];
}

interface ProductComponent {
  id: string;
  component_name: string;
  component_code: string;
  is_personalizable: boolean;
  image_url: string | null;
  sort_order: number;
  locations: ComponentLocation[];
}

interface ProductCustomizationOptionsProps {
  productId: string;
  productSku?: string;
}

export function ProductCustomizationOptions({ productId, productSku }: ProductCustomizationOptionsProps) {
  const [expandedComponents, setExpandedComponents] = useState<string[]>([]);

  const { data: components, isLoading, error } = useQuery({
    queryKey: ["product-components", productId, productSku],
    queryFn: async () => {
      // Primeiro, tentar encontrar o produto no banco pelo ID ou SKU
      let dbProductId = productId;
      
      // Se o productId não é um UUID válido, tentar buscar pelo SKU no Promobrind
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId) && productSku) {
        const promobrindProduct = await fetchPromobrindProductBySku(productSku);
        
        if (promobrindProduct) {
          dbProductId = promobrindProduct.id;
        }
      }

      // Buscar componentes do produto
      const { data: componentsData, error: componentsError } = await supabase
        .from("product_components")
        .select(`
          id,
          component_name,
          component_code,
          is_personalizable,
          image_url,
          sort_order
        `)
        .eq("product_id", dbProductId)
        .eq("is_active", true)
        .order("sort_order");

      if (componentsError) throw componentsError;
      if (!componentsData?.length) return [];

      // Para cada componente, buscar localizações
      const componentsWithLocations = await Promise.all(
        componentsData.map(async (component) => {
          const { data: locationsData, error: locationsError } = await supabase
            .from("product_component_locations")
            .select(`
              id,
              location_name,
              location_code,
              max_area_cm2,
              max_width_cm,
              max_height_cm
            `)
            .eq("component_id", component.id)
            .eq("is_active", true);

          if (locationsError) throw locationsError;

          // Para cada localização, buscar técnicas
          const locationsWithTechniques = await Promise.all(
            (locationsData || []).map(async (location) => {
              const { data: techniquesData, error: techniquesError } = await supabase
                .from("product_component_location_techniques")
                .select(`
                  id,
                  technique_id,
                  composed_code,
                  is_default,
                  personalization_techniques (
                    id,
                    name,
                    code,
                    description,
                    unit_cost,
                    setup_cost
                  )
                `)
                .eq("component_location_id", location.id)
                .eq("is_active", true);

              if (techniquesError) throw techniquesError;

              return {
                ...location,
                techniques: (techniquesData || []).map((t) => ({
                  id: t.id,
                  technique_id: t.technique_id,
                  composed_code: t.composed_code,
                  is_default: t.is_default,
                  technique: t.personalization_techniques as any,
                })),
              };
            })
          );

          return {
            ...component,
            locations: locationsWithTechniques,
          };
        })
      );

      return componentsWithLocations as ProductComponent[];
    },
    enabled: !!productId,
  });

  const toggleComponent = (componentId: string) => {
    setExpandedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !components?.length) {
    return null;
  }

  const personalizableComponents = components.filter((c) => c.is_personalizable && c.locations.length > 0);

  if (personalizableComponents.length === 0) {
    return null;
  }

  const totalLocations = personalizableComponents.reduce(
    (acc, c) => acc + c.locations.length,
    0
  );

  const totalTechniques = personalizableComponents.reduce(
    (acc, c) => acc + c.locations.reduce((lacc, l) => lacc + l.techniques.length, 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Paintbrush className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Opções de Personalização
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {personalizableComponents.length} componente{personalizableComponents.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalLocations} área{totalLocations !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Components List */}
      <div className="space-y-2">
        {personalizableComponents.map((component) => {
          const isExpanded = expandedComponents.includes(component.id);
          const defaultTechnique = component.locations
            .flatMap((l) => l.techniques)
            .find((t) => t.is_default);

          return (
            <Collapsible
              key={component.id}
              open={isExpanded}
              onOpenChange={() => toggleComponent(component.id)}
            >
              <div
                className={cn(
                  "rounded-xl border transition-all duration-200",
                  isExpanded
                    ? "bg-card border-primary/30 shadow-lg shadow-primary/5"
                    : "bg-card/50 border-border hover:border-primary/20 hover:bg-card"
                )}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold transition-colors",
                          isExpanded
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {component.component_code}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {component.component_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {component.locations.length} localização
                          {component.locations.length !== 1 ? "ões" : ""} disponível
                          {component.locations.length !== 1 ? "eis" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {defaultTechnique && !isExpanded && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {defaultTechnique.technique.name}
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    {component.locations.map((location) => (
                      <div
                        key={location.id}
                        className="p-3 rounded-lg bg-secondary/50 border border-border/50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-mono text-muted-foreground">
                              {location.location_code}
                            </div>
                            <span className="font-medium text-sm text-foreground">
                              {location.location_name}
                            </span>
                          </div>
                          {location.max_width_cm && location.max_height_cm && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
                                    <Maximize2 className="h-3 w-3" />
                                    {location.max_width_cm} x {location.max_height_cm} cm
                                    {location.max_area_cm2 && (
                                      <span className="text-primary font-medium">
                                        ({location.max_area_cm2} cm²)
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Área máxima de gravação</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>

                        {/* Techniques */}
                        <div className="flex flex-wrap gap-2">
                          {location.techniques.map((tech) => (
                            <TooltipProvider key={tech.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={tech.is_default ? "default" : "outline"}
                                    className={cn(
                                      "text-xs cursor-help transition-all",
                                      tech.is_default
                                        ? "bg-primary hover:bg-primary/90"
                                        : "hover:bg-secondary"
                                    )}
                                  >
                                    {tech.is_default && (
                                      <Check className="h-3 w-3 mr-1" />
                                    )}
                                    {tech.technique.name}
                                    <span className="ml-1.5 opacity-70 font-mono text-[10px]">
                                      {tech.technique.code}
                                    </span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-medium">{tech.technique.name}</p>
                                    {tech.technique.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {tech.technique.description}
                                      </p>
                                    )}
                                    <p className="text-xs font-mono text-muted-foreground">
                                      Código: {tech.composed_code}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
        <span className="text-muted-foreground">
          Total de {totalTechniques} técnica{totalTechniques !== 1 ? "s" : ""} de gravação disponível
          {totalTechniques !== 1 ? "eis" : ""}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Info className="h-4 w-4 mr-1" />
                Como funciona?
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm" side="top">
              <p className="text-sm">
                Cada componente do produto pode ser personalizado em diferentes localizações
                usando técnicas específicas. O preço final da personalização depende da
                técnica escolhida e da área de gravação.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
