/**
 * ProductMaterialsSection — Seletor hierárquico de materiais do produto
 * Busca grupos e tipos do BD externo e permite vincular/desvincular materiais
 * Com busca interna e multi-seleção por checkboxes
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { materialService, type MaterialType } from '@/services/materialService';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, ChevronRight, Layers, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ProductMaterialsSectionProps {
  productId: string;
}

export function ProductMaterialsSection({ productId }: ProductMaterialsSectionProps) {
  const queryClient = useQueryClient();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
        if (!record?.id) {
          toast.error('Registro não encontrado');
          return;
        }
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
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const isLoading = loadingGroups || loadingTypes || loadingProductMaterials;
  const groups = groupsData?.groups || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando materiais...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum grupo de material cadastrado no banco externo.
      </p>
    );
  }

  const linkedCount = linkedMaterialIds.size;
  const searchLower = search.toLowerCase();

  // Filtrar tipos pela busca
  const filteredTypesByGroup = search
    ? Object.fromEntries(
        Object.entries(typesByGroup).map(([gid, types]) => [
          gid,
          types.filter(t => t.name.toLowerCase().includes(searchLower)),
        ])
      )
    : typesByGroup;

  // Filtrar grupos que têm tipos visíveis (ou sem busca)
  const visibleGroups = search
    ? groups.filter(g => (filteredTypesByGroup[g.group_id]?.length || 0) > 0 || g.group_name.toLowerCase().includes(searchLower))
    : groups;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Layers className="h-4 w-4" />
        <span>{linkedCount} {linkedCount === 1 ? 'material vinculado' : 'materiais vinculados'}</span>
      </div>

      {linkedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTypes
            .filter(t => linkedMaterialIds.has(t.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
            .map(t => (
              <Badge
                key={t.id}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => toggleMaterial(t.id, true)}
              >
                {t.name}
                <X className="h-3 w-3" />
              </Badge>
            ))}
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar materiais..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <ScrollArea className="max-h-[280px] border rounded-md p-2">
        <div className="space-y-1">
          {visibleGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">Nenhum material encontrado</p>
          ) : (
            visibleGroups.map(group => {
              const types = (filteredTypesByGroup[group.group_id] || typesByGroup[group.group_id] || [])
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
              const linkedInGroup = types.filter(t => linkedMaterialIds.has(t.id)).length;
              const isExpanded = expandedGroups.has(group.group_id) || !!search;

              return (
                <Collapsible
                  key={group.group_id}
                  open={isExpanded}
                  onOpenChange={() => toggleGroup(group.group_id)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors">
                    <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
                    {group.group_hex_code && (
                      <div
                        className="h-3 w-3 rounded-full border"
                        style={{ backgroundColor: group.group_hex_code }}
                      />
                    )}
                    <span className="font-medium">{group.group_name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {linkedInGroup > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 mr-1">
                          {linkedInGroup}
                        </Badge>
                      )}
                      {types.length} tipos
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-0.5 py-1">
                      {types.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-2">Nenhum tipo neste grupo</p>
                      ) : (
                        types.map(type => {
                          const isLinked = linkedMaterialIds.has(type.id);
                          return (
                            <label
                              key={type.id}
                              className={cn(
                                'flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent/30 transition-colors',
                                isLinked && 'bg-primary/5'
                              )}
                            >
                              <Checkbox
                                checked={isLinked}
                                onCheckedChange={() => toggleMaterial(type.id, isLinked)}
                              />
                              <span>{type.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
