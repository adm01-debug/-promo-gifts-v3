/**
 * ProductMaterialsSection — Seletor hierárquico de materiais (padrão Super Filtro)
 * Mesmo visual do AdvancedFilterPanel: gradientes, MaterialBadge, color dots, contadores
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { materialService, type MaterialType } from '@/services/materialService';
import { supabase } from '@/integrations/supabase/client';
import { MaterialBadge } from '@/components/materials/MaterialBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, X, ChevronDown, Layers, Search, Gem } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductMaterialsSectionProps {
  productId: string;
}

export function ProductMaterialsSection({ productId }: ProductMaterialsSectionProps) {
  const queryClient = useQueryClient();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const { data: groupsData, isLoading: loadingGroups } = useQuery({
    queryKey: ['material-groups-admin'],
    queryFn: () => materialService.getGroups(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: typesData, isLoading: loadingTypes } = useQuery({
    queryKey: ['material-types-admin'],
    queryFn: () => materialService.getTypes(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: productMaterialsData, isLoading: loadingProductMaterials } = useQuery({
    queryKey: ['product-materials', productId],
    queryFn: () => materialService.getProductMaterials(productId),
    enabled: !!productId,
  });

  const linkedMaterialIds = new Set<string>(
    (productMaterialsData?.materials || []).map((m: any) => m.material_id || m.id)
  );

  const allTypes = typesData?.types || [];
  const groups = groupsData?.groups || [];

  const typesByGroup = allTypes.reduce<Record<string, MaterialType[]>>((acc, t) => {
    const gid = t.group_id;
    if (!acc[gid]) acc[gid] = [];
    acc[gid].push(t);
    return acc;
  }, {});

  const toggleMaterial = useCallback(async (materialId: string, isLinked: boolean) => {
    try {
      if (isLinked) {
        const { data: findData, error: findError } = await supabase.functions.invoke('external-db-bridge', {
          body: {
            table: 'product_materials',
            operation: 'select',
            filters: { product_id: productId, material_id: materialId },
            limit: 1,
          },
        });
        if (findError) throw new Error(findError.message);
        const record = findData?.data?.records?.[0];
        if (!record?.id) { toast.error('Registro não encontrado'); return; }
        const { error: delError } = await supabase.functions.invoke('external-db-bridge', {
          body: { table: 'product_materials', operation: 'delete', id: record.id },
        });
        if (delError) throw new Error(delError.message);
        toast.success('Material removido');
      } else {
        const { error } = await supabase.functions.invoke('external-db-bridge', {
          body: {
            table: 'product_materials',
            operation: 'insert',
            data: { product_id: productId, material_id: materialId },
          },
        });
        if (error) throw new Error(error.message);
        toast.success('Material adicionado');
      }
      queryClient.invalidateQueries({ queryKey: ['product-materials', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar material');
    }
  }, [productId, queryClient]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const clearAll = useCallback(async () => {
    const linkedTypes = allTypes.filter(t => linkedMaterialIds.has(t.id));
    for (const t of linkedTypes) {
      await toggleMaterial(t.id, true);
    }
  }, [allTypes, linkedMaterialIds, toggleMaterial]);

  const isLoading = loadingGroups || loadingTypes || loadingProductMaterials;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <Gem className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum material disponível</p>
      </div>
    );
  }

  const linkedCount = linkedMaterialIds.size;
  const searchLower = search.toLowerCase();

  const filteredTypesByGroup = search
    ? Object.fromEntries(
        Object.entries(typesByGroup).map(([gid, types]) => [
          gid,
          types.filter(t => t.name.toLowerCase().includes(searchLower)),
        ])
      )
    : typesByGroup;

  const visibleGroups = [...groups]
    .filter(g =>
      !search ||
      g.group_name.toLowerCase().includes(searchLower) ||
      (filteredTypesByGroup[g.group_id]?.length || 0) > 0
    )
    .sort((a, b) => a.group_name.localeCompare(b.group_name, 'pt-BR'));

  return (
    <div className="space-y-3">
      {/* Badges dos materiais selecionados — padrão Super Filtro */}
      {linkedCount > 0 && (
        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary flex items-center gap-1.5">
              <Gem className="h-3 w-3" />
              Selecionados
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Limpar todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTypes
              .filter(t => linkedMaterialIds.has(t.id))
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
              .map(t => {
                const group = groups.find(g => g.group_id === t.group_id);
                return (
                  <MaterialBadge
                    key={t.id}
                    name={t.name}
                    hexCode={group?.group_hex_code}
                    size="sm"
                    variant="outline"
                    onRemove={() => toggleMaterial(t.id, true)}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar material ou grupo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm pl-8 pr-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>{groups.length} grupos</span>
        <span>•</span>
        <span>{allTypes.length} materiais</span>
        <span>•</span>
        <span className={cn("font-medium", linkedCount > 0 && "text-primary")}>
          {linkedCount} selecionados
        </span>
      </div>

      {/* Árvore de grupos — padrão Super Filtro */}
      <ScrollArea className="h-56">
        <div className="space-y-1.5 pr-3">
          {visibleGroups.map(group => {
            const types = (filteredTypesByGroup[group.group_id] || typesByGroup[group.group_id] || [])
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            const linkedInGroup = types.filter(t => linkedMaterialIds.has(t.id)).length;
            const isOpen = openGroups.has(group.group_id) || !!search;
            const hasAnySelection = linkedInGroup > 0;

            return (
              <div
                key={group.group_id}
                className={cn(
                  "rounded-lg overflow-hidden transition-all duration-200",
                  hasAnySelection
                    ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                {/* Header do grupo */}
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.group_id)}
                    className={cn(
                      "p-1 rounded-md transition-all duration-200",
                      isOpen ? "bg-primary/10" : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <ChevronDown className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                    )} />
                  </button>

                  {/* Color dot do grupo */}
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background transition-all",
                      hasAnySelection ? "ring-primary/50 scale-110" : "ring-border/50"
                    )}
                    style={{
                      backgroundColor: group.group_hex_code || 'hsl(var(--muted))',
                      boxShadow: group.group_hex_code ? `0 2px 8px ${group.group_hex_code}40` : 'none',
                    }}
                  />

                  {/* Nome */}
                  <span className={cn(
                    "text-sm font-medium truncate flex-1 transition-colors",
                    hasAnySelection ? "text-primary" : "text-foreground"
                  )}>
                    {group.group_name}
                  </span>

                  {/* Contadores */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {linkedInGroup > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {linkedInGroup}
                      </span>
                    )}
                    <span className={cn(
                      "text-[11px] px-1.5 py-0.5 rounded-full",
                      hasAnySelection
                        ? "bg-primary/20 text-primary font-medium"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {types.length}
                    </span>
                  </div>
                </div>

                {/* Tipos do grupo */}
                {isOpen && types.length > 0 && (
                  <div className="px-2.5 pb-2.5 space-y-0.5">
                    <div className="border-t border-border/30 pt-2 ml-8">
                      {types.map(type => {
                        const isLinked = linkedMaterialIds.has(type.id);
                        return (
                          <label
                            key={type.id}
                            className={cn(
                              "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150",
                              isLinked
                                ? "bg-primary/15 text-foreground font-medium shadow-sm"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            <Checkbox
                              checked={isLinked}
                              onCheckedChange={() => toggleMaterial(type.id, isLinked)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: group.group_hex_code || 'hsl(var(--muted))' }}
                            />
                            <span className="truncate flex-1">{type.name}</span>
                            {isLinked && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isOpen && types.length === 0 && (
                  <div className="px-2.5 pb-2.5">
                    <div className="border-t border-border/30 pt-2 ml-8">
                      <p className="text-xs text-muted-foreground italic py-2">
                        Nenhum material neste grupo
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visibleGroups.length === 0 && search && (
            <div className="text-center py-6">
              <Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum material encontrado para "<span className="font-medium">{search}</span>"
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
