import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeExternalDb } from "@/lib/external-db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus,
  Trash2,
  Loader2,
  Package,
  Layers,
  MapPin,
  Check,
  X,
  Copy,
  Link,
  Unlink,
  Search,
} from "lucide-react";
import { InlineEditField } from "./InlineEditField";
import { ImageUploadButton } from "./ImageUploadButton";
import { SortableItem } from "./SortableItem";
import { logger } from "@/lib/logger";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface ProductGroup {
  id: string;
  group_code: string;
  group_name: string;
}

interface ProductGroupMember {
  id: string;
  product_id: string;
  product_group_id: string;
  use_group_rules: boolean;
  product_group?: ProductGroup;
}

interface Component {
  id: string;
  product_id: string;
  component_code: string;
  component_name: string;
  is_personalizable: boolean;
  is_active: boolean;
  sort_order: number;
}

interface Location {
  id: string;
  component_id: string;
  location_code: string;
  location_name: string;
  max_width_cm: number | null;
  max_height_cm: number | null;
  max_area_cm2: number | null;
  area_image_url: string | null;
  is_active: boolean;
}

interface Technique {
  id: string;
  code: string;
  name: string;
}

interface LocationTechnique {
  id: string;
  component_location_id: string;
  technique_id: string;
  composed_code: string;
  max_colors: number | null;
  is_default: boolean;
  is_active: boolean;
  technique?: Technique;
}

export function ProductPersonalizationManager() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isAddTechniqueOpen, setIsAddTechniqueOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const [newComponent, setNewComponent] = useState({ code: "", name: "" });
  const [newLocation, setNewLocation] = useState({ code: "", name: "", maxWidth: "", maxHeight: "", maxArea: "" });
  const [newTechniqueId, setNewTechniqueId] = useState("");
  const [newMaxColors, setNewMaxColors] = useState("");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch products from Promobrind - sem limite para buscar todos
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products-promobrind-full"],
    queryFn: async () => {
      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const productsData = await fetchPromobrindProducts(); // Sem limit = paginação automática
      return productsData.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
      })) as Product[];
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  // Fetch product groups for search
  const { data: productGroups } = useQuery({
    queryKey: ["admin-product-groups-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select("id, group_code, group_name")
        .eq("is_active", true);
      if (error) throw error;
      return data as ProductGroup[];
    },
  });

  // Fetch all group memberships for search
  const { data: allMemberships } = useQuery({
    queryKey: ["admin-all-memberships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_group_members")
        .select("product_id, product_group_id");
      if (error) throw error;
      return data as { product_id: string; product_group_id: string }[];
    },
  });

  // Filter products based on search query
  const filteredProducts = products?.filter((product) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const matchesName = product.name.toLowerCase().includes(query);
    const matchesSku = product.sku.toLowerCase().includes(query);
    
    // Check if product belongs to a group that matches search
    const membership = allMemberships?.find((m) => m.product_id === product.id);
    const group = membership 
      ? productGroups?.find((g) => g.id === membership.product_group_id)
      : null;
    const matchesGroup = group?.group_name.toLowerCase().includes(query) || 
                         group?.group_code.toLowerCase().includes(query);
    
    return matchesName || matchesSku || matchesGroup;
  }) || [];

  // Fetch product group membership
  const { data: productMembership } = useQuery({
    queryKey: ["product-membership", selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return null;
      const { data, error } = await supabase
        .from("product_group_members")
        .select(`
          *,
          product_group:product_groups(id, group_code, group_name)
        `)
        .eq("product_id", selectedProduct)
        .maybeSingle();
      if (error) throw error;
      return data as ProductGroupMember | null;
    },
    enabled: !!selectedProduct,
  });

  // Fetch components for selected product
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ["product-components", selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const { data, error } = await supabase
        .from("product_components")
        .select("*")
        .eq("product_id", selectedProduct)
        .order("sort_order");
      if (error) throw error;
      return data as Component[];
    },
    enabled: !!selectedProduct,
  });

  // Fetch locations for all components
  // NOTE: product_component_locations table may not exist in local DB
  const { data: locations } = useQuery({
    queryKey: ["component-locations", selectedProduct],
    queryFn: async () => {
      if (!components?.length) return [];
      try {
        const componentIds = components.map((c) => c.id);
        const { data, error } = await supabase
          .from("product_component_locations" as any)
          .select("*")
          .in("component_id", componentIds);
        if (error) {
          logger.warn("[Admin] product_component_locations table not available:", error.message);
          return [];
        }
        return data as Location[];
      } catch {
        return [];
      }
    },
    enabled: !!components?.length,
  });

  // Fetch techniques from external DB
  const { data: techniques } = useQuery({
    queryKey: ["techniques-external"],
    queryFn: async () => {
      const result = await invokeExternalDb<Technique>({
        table: "personalization_techniques",
        operation: "select",
        select: "id, code, name",
        filters: { is_active: true },
        orderBy: { column: "name", ascending: true },
        limit: 100,
      });
      return result.records;
    },
  });

  // Fetch location techniques
  // NOTE: product_component_location_techniques table may not exist in local DB
  const { data: locationTechniques } = useQuery({
    queryKey: ["location-techniques", selectedProduct],
    queryFn: async () => {
      if (!locations?.length) return [];
      try {
        const locationIds = locations.map((l) => l.id);
        const { data, error } = await supabase
          .from("product_component_location_techniques" as any)
          .select(`
            *,
            technique:personalization_techniques(id, code, name)
          `)
          .in("component_location_id", locationIds);
        if (error) {
          logger.warn("[Admin] product_component_location_techniques table not available:", error.message);
          return [];
        }
        return data as LocationTechnique[];
      } catch {
        return [];
      }
    },
    enabled: !!locations?.length,
  });

  // Toggle use_group_rules
  const toggleGroupRulesMutation = useMutation({
    mutationFn: async ({ id, use_group_rules }: { id: string; use_group_rules: boolean }) => {
      const { error } = await supabase
        .from("product_group_members")
        .update({ use_group_rules })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-membership"] });
      toast.success("Modo de regras atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar modo"),
  });

  // Copy group rules to product
  const copyGroupRulesToProduct = async () => {
    if (!selectedProduct || !productMembership?.product_group_id) return;

    setIsCopying(true);
    try {
      // Fetch group components
      const { data: groupComponents } = await supabase
        .from("product_group_components" as any)
        .select("*")
        .eq("product_group_id", productMembership.product_group_id);

      if (!groupComponents?.length) {
        toast.error("Grupo não possui componentes configurados");
        return;
      }

      // Delete existing product components
      await supabase
        .from("product_components")
        .delete()
        .eq("product_id", selectedProduct);

      // Create product components from group template
      for (const gc of groupComponents) {
        const { data: newComponent, error: compError } = await supabase
          .from("product_components")
          .insert({
            product_id: selectedProduct,
            component_code: gc.component_code,
            component_name: gc.component_name,
            is_personalizable: gc.is_personalizable,
            is_active: gc.is_active,
            sort_order: gc.sort_order,
          })
          .select()
          .single();

        if (compError) throw compError;

        // Fetch group locations for this component
        const { data: groupLocations } = await supabase
          .from("product_group_locations" as any)
          .select("*")
          .eq("group_component_id", gc.id);

        if (groupLocations?.length) {
          for (const gl of groupLocations) {
            const { data: newLocation, error: locError } = await supabase
              .from("product_component_locations" as any)
              .insert({
                component_id: newComponent.id,
                location_code: gl.location_code,
                location_name: gl.location_name,
                max_width_cm: gl.max_width_cm,
                max_height_cm: gl.max_height_cm,
                max_area_cm2: gl.max_area_cm2,
                area_image_url: gl.area_image_url,
                is_active: gl.is_active,
              })
              .select()
              .single();

            if (locError) throw locError;

            // Fetch group techniques for this location
            const { data: groupTechniques } = await supabase
              .from("product_group_location_techniques" as any)
              .select("*")
              .eq("group_location_id", gl.id);

            if (groupTechniques?.length) {
              for (const gt of groupTechniques) {
                const technique = techniques?.find(t => t.id === gt.technique_id);
                const composedCode = `${gc.component_code}-${gl.location_code}-${technique?.code || ""}`;

                await supabase
                  .from("product_component_location_techniques" as any)
                  .insert({
                    component_location_id: newLocation.id,
                    technique_id: gt.technique_id,
                    composed_code: composedCode,
                    max_colors: gt.max_colors,
                    is_default: gt.is_default,
                    is_active: gt.is_active,
                  });
              }
            }
          }
        }
      }

      // Set use_group_rules to false (now using custom)
      await supabase
        .from("product_group_members")
        .update({ use_group_rules: false })
        .eq("id", productMembership.id);

      queryClient.invalidateQueries({ queryKey: ["product-components"] });
      queryClient.invalidateQueries({ queryKey: ["component-locations"] });
      queryClient.invalidateQueries({ queryKey: ["location-techniques"] });
      queryClient.invalidateQueries({ queryKey: ["product-membership"] });

      toast.success("Regras do grupo copiadas! Agora você pode customizar.");
    } catch (error) {
      console.error("Error copying rules:", error);
      toast.error("Erro ao copiar regras do grupo");
    } finally {
      setIsCopying(false);
    }
  };

  // Mutations for components, locations, techniques
  const addComponentMutation = useMutation({
    mutationFn: async (data: { product_id: string; component_code: string; component_name: string }) => {
      const { error } = await supabase.from("product_components").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-components"] });
      setIsAddComponentOpen(false);
      setNewComponent({ code: "", name: "" });
      toast.success("Componente adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar componente"),
  });

  const updateComponentMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; component_code?: string; component_name?: string; is_personalizable?: boolean; is_active?: boolean }) => {
      const { error } = await supabase.from("product_components").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-components"] });
      toast.success("Componente atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar componente"),
  });

  const deleteComponentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-components"] });
      toast.success("Componente removido!");
    },
    onError: () => toast.error("Erro ao remover componente"),
  });

  const addLocationMutation = useMutation({
    mutationFn: async (data: {
      component_id: string;
      location_code: string;
      location_name: string;
      max_width_cm?: number;
      max_height_cm?: number;
      max_area_cm2?: number;
    }) => {
      const { error } = await untypedFrom("product_component_locations").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-locations"] });
      setIsAddLocationOpen(false);
      setNewLocation({ code: "", name: "", maxWidth: "", maxHeight: "", maxArea: "" });
      toast.success("Localização adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar localização — tabela pode não existir"),
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; location_code?: string; location_name?: string; max_width_cm?: number | null; max_height_cm?: number | null; max_area_cm2?: number | null; area_image_url?: string | null; is_active?: boolean }) => {
      const { error } = await untypedFrom("product_component_locations").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-locations"] });
      toast.success("Localização atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar localização"),
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await untypedFrom("product_component_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-locations"] });
      toast.success("Localização removida!");
    },
    onError: () => toast.error("Erro ao remover localização"),
  });

  const addTechniqueMutation = useMutation({
    mutationFn: async (data: {
      component_location_id: string;
      technique_id: string;
      composed_code: string;
      max_colors?: number;
    }) => {
      const { error } = await untypedFrom("product_component_location_techniques").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-techniques"] });
      setIsAddTechniqueOpen(false);
      setNewTechniqueId("");
      setNewMaxColors("");
      toast.success("Técnica associada!");
    },
    onError: () => toast.error("Erro ao associar técnica"),
  });

  const updateTechniqueMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; is_default?: boolean; max_colors?: number | null; is_active?: boolean }) => {
      const { error } = await untypedFrom("product_component_location_techniques").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-techniques"] });
      toast.success("Técnica atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar técnica"),
  });

  const deleteTechniqueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await untypedFrom("product_component_location_techniques").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-techniques"] });
      toast.success("Técnica removida!");
    },
    onError: () => toast.error("Erro ao remover técnica"),
  });

  const handleAddComponent = () => {
    if (!selectedProduct || !newComponent.code || !newComponent.name) return;
    addComponentMutation.mutate({
      product_id: selectedProduct,
      component_code: newComponent.code.toUpperCase(),
      component_name: newComponent.name,
    });
  };

  const handleAddLocation = () => {
    if (!selectedComponentId || !newLocation.code || !newLocation.name) return;
    addLocationMutation.mutate({
      component_id: selectedComponentId,
      location_code: newLocation.code.toUpperCase(),
      location_name: newLocation.name,
      max_width_cm: newLocation.maxWidth ? parseFloat(newLocation.maxWidth) : undefined,
      max_height_cm: newLocation.maxHeight ? parseFloat(newLocation.maxHeight) : undefined,
      max_area_cm2: newLocation.maxArea ? parseFloat(newLocation.maxArea) : undefined,
    });
  };

  const handleAddTechnique = () => {
    if (!selectedLocationId || !newTechniqueId) return;
    const location = locations?.find((l) => l.id === selectedLocationId);
    const component = components?.find((c) => c.id === location?.component_id);
    const technique = techniques?.find((t) => t.id === newTechniqueId);
    if (!location || !component || !technique) return;

    const composedCode = `${component.component_code}-${location.location_code}-${technique.code}`;
    addTechniqueMutation.mutate({
      component_location_id: selectedLocationId,
      technique_id: newTechniqueId,
      composed_code: composedCode,
      max_colors: newMaxColors ? parseInt(newMaxColors) : undefined,
    });
  };

  const getLocationsForComponent = (componentId: string) => {
    return locations?.filter((l) => l.component_id === componentId) || [];
  };

  const getTechniquesForLocation = (locationId: string) => {
    return locationTechniques?.filter((lt) => lt.component_location_id === locationId) || [];
  };

  // Drag and drop handler
  const handleComponentDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !components) return;

    const oldIndex = components.findIndex((c) => c.id === active.id);
    const newIndex = components.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(components, oldIndex, newIndex);

    // Update sort_order for all affected components
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].sort_order !== i) {
        await supabase
          .from("product_components")
          .update({ sort_order: i })
          .eq("id", reordered[i].id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["product-components"] });
    toast.success("Ordem atualizada!");
  };

  const isUsingGroupRules = productMembership?.use_group_rules ?? false;
  const hasGroup = !!productMembership;

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Personalização por Produto
          </CardTitle>
          <CardDescription>
            Configure regras específicas de personalização para cada produto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, SKU ou grupo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Product selector */}
          <Select value={selectedProduct || ""} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecione um produto..." />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {productsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const membership = allMemberships?.find((m) => m.product_id === product.id);
                  const group = membership 
                    ? productGroups?.find((g) => g.id === membership.product_group_id)
                    : null;
                  
                  return (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <span>{product.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({product.sku})
                        </span>
                        {group && (
                          <Badge variant="outline" className="text-xs ml-1">
                            {group.group_code}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>

          {searchQuery && (
            <p className="text-xs text-muted-foreground">
              {filteredProducts.length} de {products?.length || 0} produtos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Group Inheritance Section */}
      {selectedProduct && hasGroup && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  {isUsingGroupRules ? (
                    <Link className="h-5 w-5 text-primary" />
                  ) : (
                    <Unlink className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Grupo: {productMembership.product_group?.group_name}
                  </CardTitle>
                  <CardDescription>
                    {isUsingGroupRules
                      ? "Este produto herda as regras do grupo"
                      : "Este produto usa regras customizadas"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isUsingGroupRules ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={isCopying}>
                        {isCopying ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Customizar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Customizar regras do produto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso irá copiar todas as regras do grupo para este produto, permitindo
                          que você as modifique individualmente. Alterações futuras no grupo não
                          afetarão este produto.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={copyGroupRulesToProduct}>
                          Copiar e Customizar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <Link className="h-4 w-4 mr-2" />
                        Voltar para Grupo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Voltar a usar regras do grupo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso irá descartar as regras customizadas deste produto e usar novamente
                          as regras definidas no grupo. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            toggleGroupRulesMutation.mutate({
                              id: productMembership.id,
                              use_group_rules: true,
                            })
                          }
                        >
                          Usar Regras do Grupo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Show message if using group rules */}
      {selectedProduct && hasGroup && isUsingGroupRules && (
        <Card>
          <CardContent className="py-12 text-center">
            <Link className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
            <h3 className="text-lg font-medium mb-2">Usando regras do grupo</h3>
            <p className="text-muted-foreground mb-4">
              Este produto está herdando as configurações do grupo{" "}
              <strong>{productMembership?.product_group?.group_name}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Clique em "Customizar" acima para criar regras específicas para este produto.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Components Management - Only show if not using group rules or has no group */}
      {selectedProduct && (!hasGroup || !isUsingGroupRules) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Componentes do Produto
                </CardTitle>
                <CardDescription>
                  {hasGroup ? "Regras customizadas para este produto" : "Configure as áreas de personalização"}
                </CardDescription>
              </div>
              <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Componente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Componente</DialogTitle>
                    <DialogDescription>
                      Adicione um componente personalizável ao produto
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Código</Label>
                      <Input
                        placeholder="Ex: CORPO, TAMPA"
                        value={newComponent.code}
                        onChange={(e) => setNewComponent({ ...newComponent, code: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Nome</Label>
                      <Input
                        placeholder="Ex: Corpo, Tampa"
                        value={newComponent.name}
                        onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddComponentOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddComponent} disabled={addComponentMutation.isPending}>
                      {addComponentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {componentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !components?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum componente configurado</p>
                <p className="text-sm">Adicione componentes para definir as áreas de personalização</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleComponentDragEnd}
              >
                <SortableContext
                  items={components.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Accordion type="multiple" className="space-y-2">
                    {components.map((component) => (
                      <SortableItem key={component.id} id={component.id}>
                        <AccordionItem value={component.id} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 flex-1">
                              <Badge variant="outline" className="font-mono">
                                {component.component_code}
                              </Badge>
                              <span className="font-medium">{component.component_name}</span>
                              <div className="flex items-center gap-2 ml-auto mr-4">
                                {component.is_personalizable && (
                                  <Badge variant="secondary" className="text-xs">Personalizável</Badge>
                                )}
                                {!component.is_active && (
                                  <Badge variant="destructive" className="text-xs">Inativo</Badge>
                                )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      {/* Component fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg mb-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Código</Label>
                          <InlineEditField
                            value={component.component_code}
                            onSave={(value) => updateComponentMutation.mutate({ id: component.id, component_code: value.toUpperCase() })}
                            className="font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <InlineEditField
                            value={component.component_name}
                            onSave={(value) => updateComponentMutation.mutate({ id: component.id, component_name: value })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={component.is_personalizable}
                            onCheckedChange={(checked) => updateComponentMutation.mutate({ id: component.id, is_personalizable: checked })}
                          />
                          <Label className="text-sm">Personalizável</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={component.is_active}
                            onCheckedChange={(checked) => updateComponentMutation.mutate({ id: component.id, is_active: checked })}
                          />
                          <Label className="text-sm">Ativo</Label>
                        </div>
                      </div>

                      {/* Locations */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Localizações
                          </h4>
                          <Dialog
                            open={isAddLocationOpen && selectedComponentId === component.id}
                            onOpenChange={(open) => {
                              setIsAddLocationOpen(open);
                              if (open) setSelectedComponentId(component.id);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Plus className="h-3 w-3 mr-1" />
                                Localização
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Nova Localização</DialogTitle>
                                <DialogDescription>
                                  Defina uma área de personalização para {component.component_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Código</Label>
                                    <Input
                                      placeholder="Ex: FRENTE, VERSO"
                                      value={newLocation.code}
                                      onChange={(e) => setNewLocation({ ...newLocation, code: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Nome</Label>
                                    <Input
                                      placeholder="Ex: Frente, Verso"
                                      value={newLocation.name}
                                      onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <Label>Largura Máx. (cm)</Label>
                                    <Input
                                      type="number"
                                      placeholder="10"
                                      value={newLocation.maxWidth}
                                      onChange={(e) => setNewLocation({ ...newLocation, maxWidth: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Altura Máx. (cm)</Label>
                                    <Input
                                      type="number"
                                      placeholder="5"
                                      value={newLocation.maxHeight}
                                      onChange={(e) => setNewLocation({ ...newLocation, maxHeight: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Área Máx. (cm²)</Label>
                                    <Input
                                      type="number"
                                      placeholder="50"
                                      value={newLocation.maxArea}
                                      onChange={(e) => setNewLocation({ ...newLocation, maxArea: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddLocationOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleAddLocation} disabled={addLocationMutation.isPending}>
                                  {addLocationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                  Salvar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {getLocationsForComponent(component.id).length === 0 ? (
                          <p className="text-sm text-muted-foreground pl-6">Nenhuma localização cadastrada</p>
                        ) : (
                          <div className="space-y-3 pl-6">
                            {getLocationsForComponent(component.id).map((location) => (
                              <div key={location.id} className="border rounded-lg p-3 bg-muted/30">
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Código</Label>
                                    <InlineEditField
                                      value={location.location_code}
                                      onSave={(value) => updateLocationMutation.mutate({ id: location.id, location_code: value.toUpperCase() })}
                                      className="font-mono text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Nome</Label>
                                    <InlineEditField
                                      value={location.location_name}
                                      onSave={(value) => updateLocationMutation.mutate({ id: location.id, location_name: value })}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Larg. (cm)</Label>
                                    <InlineEditField
                                      value={location.max_width_cm?.toString() || ""}
                                      onSave={(value) => updateLocationMutation.mutate({ id: location.id, max_width_cm: value ? parseFloat(value) : null })}
                                      type="number"
                                      placeholder="—"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Alt. (cm)</Label>
                                    <InlineEditField
                                      value={location.max_height_cm?.toString() || ""}
                                      onSave={(value) => updateLocationMutation.mutate({ id: location.id, max_height_cm: value ? parseFloat(value) : null })}
                                      type="number"
                                      placeholder="—"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Área (cm²)</Label>
                                    <InlineEditField
                                      value={location.max_area_cm2?.toString() || ""}
                                      onSave={(value) => updateLocationMutation.mutate({ id: location.id, max_area_cm2: value ? parseFloat(value) : null })}
                                      type="number"
                                      placeholder="—"
                                    />
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <div className="flex items-center gap-1">
                                      <Switch
                                        checked={location.is_active}
                                        onCheckedChange={(checked) => updateLocationMutation.mutate({ id: location.id, is_active: checked })}
                                      />
                                      <Label className="text-xs">Ativo</Label>
                                    </div>
                                    <ImageUploadButton
                                      currentImageUrl={location.area_image_url}
                                      onUpload={(url) => updateLocationMutation.mutate({ id: location.id, area_image_url: url })}
                                      onRemove={() => updateLocationMutation.mutate({ id: location.id, area_image_url: null })}
                                      folder={`products/${selectedProduct}`}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                      onClick={() => deleteLocationMutation.mutate(location.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Techniques */}
                                <div className="border-t pt-2 mt-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">Técnicas permitidas:</span>
                                    <Dialog
                                      open={isAddTechniqueOpen && selectedLocationId === location.id}
                                      onOpenChange={(open) => {
                                        setIsAddTechniqueOpen(open);
                                        if (open) setSelectedLocationId(location.id);
                                      }}
                                    >
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-6 px-2">
                                          <Plus className="h-3 w-3 mr-1" />
                                          <span className="text-xs">Técnica</span>
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Associar Técnica</DialogTitle>
                                          <DialogDescription>
                                            Adicione uma técnica permitida para {location.location_name}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Técnica</Label>
                                            <Select value={newTechniqueId} onValueChange={setNewTechniqueId}>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {techniques?.map((tech) => (
                                                  <SelectItem key={tech.id} value={tech.id}>
                                                    {tech.name} ({tech.code})
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label>Máximo de Cores</Label>
                                            <Input
                                              type="number"
                                              placeholder="Ex: 4"
                                              value={newMaxColors}
                                              onChange={(e) => setNewMaxColors(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Deixe em branco para sem limite
                                            </p>
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <Button variant="outline" onClick={() => setIsAddTechniqueOpen(false)}>
                                            Cancelar
                                          </Button>
                                          <Button onClick={handleAddTechnique} disabled={addTechniqueMutation.isPending}>
                                            {addTechniqueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            Associar
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {getTechniquesForLocation(location.id).map((lt) => (
                                      <Tooltip key={lt.id}>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant={lt.is_default ? "default" : "outline"}
                                            className="text-xs gap-1 group cursor-pointer"
                                            onClick={() => updateTechniqueMutation.mutate({ id: lt.id, is_default: !lt.is_default })}
                                          >
                                            {lt.is_default && <Check className="h-2 w-2" />}
                                            {lt.technique?.name}
                                            {lt.max_colors && (
                                              <span className="opacity-70">({lt.max_colors} cores)</span>
                                            )}
                                            <button
                                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTechniqueMutation.mutate(lt.id);
                                              }}
                                            >
                                              <X className="h-2 w-2" />
                                            </button>
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Clique para {lt.is_default ? "remover" : "definir"} como padrão</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                    {getTechniquesForLocation(location.id).length === 0 && (
                                      <span className="text-xs text-muted-foreground">Nenhuma técnica associada</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Component actions */}
                      <div className="flex justify-end mt-4 pt-4 border-t">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteComponentMutation.mutate(component.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Componente
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </SortableItem>
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
