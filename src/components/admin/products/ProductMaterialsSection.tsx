/**
 * ProductMaterialsSection — Seletor hierárquico de materiais (padrão Super Filtro)
 * Enriquecido com: part (parte do produto), percentage (composição %), notes
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { materialService, type MaterialType } from '@/services/materialService';
import { supabase } from '@/integrations/supabase/client';
import { MaterialBadge } from '@/components/materials/MaterialBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, X, ChevronDown, Search, Gem, Save, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductMaterialsSectionProps {
  productId: string;
}

interface LinkedMaterial {
  id: string;
  material_id: string;
  part?: string | null;
  percentage?: number | null;
  notes?: string | null;
}

// Inline edit form for material detail fields
function MaterialDetailEditor({
  linked,
  onSave,
  onCancel,
}: {
  linked: LinkedMaterial;
  onSave: (data: { part: string; percentage: number | null; notes: string }) => void;
  onCancel: () => void;
}) {
  const [part, setPart] = useState(linked.part || '');
  const [percentage, setPercentage] = useState<string>(linked.percentage != null ? String(linked.percentage) : '');
  const [notes, setNotes] = useState(linked.notes || '');

  return (
    <div className="flex items-center gap-2 mt-1 ml-7">
      <Input
        value={part}
        onChange={(e) => setPart(e.target.value)}
        placeholder="Parte (ex: corpo)"
        className="h-6 text-[11px] w-24 px-1.5"
      />
      <Input
        type="number"
        value={percentage}
        onChange={(e) => setPercentage(e.target.value)}
        placeholder="%"
        min="0"
        max="100"
        className="h-6 text-[11px] w-16 px-1.5"
      />
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Obs..."
        className="h-6 text-[11px] flex-1 px-1.5"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon" aria-label="Salvar"
        className="h-6 w-6"
        onClick={() => onSave({ part, percentage: percentage ? parseFloat(percentage) : null, notes })}
      >
        <Save className="h-3 w-3 text-primary" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel} aria-label="Fechar"><X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function ProductMaterialsSection({ productId }: ProductMaterialsSectionProps) {
  const queryClient = useQueryClient();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

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

  // Fetch full linked records (with part, percentage, notes)
  const { data: linkedRecords = [], isLoading: loadingProductMaterials } = useQuery<LinkedMaterial[]>({
    queryKey: ['product-materials-full', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_materials',
          operation: 'select',
          filters: { product_id: productId },
          limit: 200,
        },
      });
      if (error) throw new Error(error.message);
      return data?.data?.records || [];
    },
    enabled: !!productId,
  });

  const linkedMap = new Map<string, LinkedMaterial>(
    linkedRecords.map((r) => [r.material_id, r])
  );
  const linkedMaterialIds = new Set<string>(linkedMap.keys());

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
        const linked = linkedMap.get(materialId);
        if (!linked?.id) { toast.error('Registro não encontrado'); return; }
        const { error: delError } = await supabase.functions.invoke('external-db-bridge', {
          body: { table: 'product_materials', operation: 'delete', id: linked.id },
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
      queryClient.invalidateQueries({ queryKey: ['product-materials-full', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar material');
    }
  }, [productId, queryClient, linkedMap]);

  const updateMaterialDetail = useCallback(async (
    materialId: string,
    data: { part: string; percentage: number | null; notes: string }
  ) => {
    const linked = linkedMap.get(materialId);
    if (!linked?.id) return;

    try {
      const { error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_materials',
          operation: 'update',
          id: linked.id,
          data: {
            part: data.part.trim() || null,
            percentage: data.percentage,
            notes: data.notes.trim() || null,
          },
        },
      });
      if (error) throw new Error(error.message);
      toast.success('Detalhes atualizados');
      setEditingMaterialId(null);
      queryClient.invalidateQueries({ queryKey: ['product-materials-full', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  }, [productId, queryClient, linkedMap]);

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
                const linked = linkedMap.get(t.id);
                const hasDetail = linked?.part || linked?.percentage != null;
                return (
                  <div key={t.id} className="flex items-center gap-0.5">
                    <MaterialBadge
                      name={`${t.name}${hasDetail ? ` (${linked?.part || ''}${linked?.percentage != null ? ` ${linked.percentage}%` : ''})` : ''}`}
                      hexCode={group?.group_hex_code}
                      size="sm"
                      variant="outline"
                      onRemove={() => toggleMaterial(t.id, true)}
                    />
                    <button
                      type="button"
                      onClick={() = aria-label="Editar"> setEditingMaterialId(editingMaterialId === t.id ? null : t.id)}
                      className="text-muted-foreground hover:text-primary p-0.5"
                      title="Editar detalhes (parte, %, obs)"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
          </div>
          {/* Inline editor for selected material */}
          {editingMaterialId && linkedMap.has(editingMaterialId) && (
            <MaterialDetailEditor
              linked={linkedMap.get(editingMaterialId)!}
              onSave={(data) => updateMaterialDetail(editingMaterialId, data)}
              onCancel={() => setEditingMaterialId(null)}
            />
          )}
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
            onClick={() = aria-label="Fechar"> setSearch('')}
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
                    onClick={() = aria-label="Recolher"> toggleGroup(group.group_id)}
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
                        const linked = linkedMap.get(type.id);
                        const detailText = linked?.part || (linked?.percentage != null ? `${linked.percentage}%` : '');
                        return (
                          <div key={type.id}>
                            <label
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
                              {detailText && (
                                <span className="text-[10px] text-muted-foreground italic">{detailText}</span>
                              )}
                              {isLinked && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingMaterialId(editingMaterialId === type.id ? null : type.id);
                                  }}
                                  className="text-muted-foreground hover:text-primary p-0.5"
                                  title="Editar parte/% / obs"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              {isLinked && !editingMaterialId && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              )}
                            </label>
                            {editingMaterialId === type.id && isLinked && linked && (
                              <MaterialDetailEditor
                                linked={linked}
                                onSave={(data) => updateMaterialDetail(type.id, data)}
                                onCancel={() => setEditingMaterialId(null)}
                              />
                            )}
                          </div>
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
