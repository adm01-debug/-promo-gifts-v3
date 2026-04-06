/**
 * ProductTechniquesSection — Seletor de técnicas de personalização (padrão Super Filtro)
 * Gradientes, badges removíveis, busca, contadores
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Search, Paintbrush, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductTechniquesSectionProps {
  productId: string;
}

interface Technique {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

interface ProductTechniqueLink {
  id: string;
  product_id: string;
  technique_id: string;
}

async function fetchTechniques(): Promise<Technique[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'personalization_techniques', operation: 'select', filters: { is_active: true }, limit: 200, orderBy: { column: 'name', ascending: true } },
  });
  if (error) throw new Error(error.message);
  return data?.data?.records || [];
}

async function fetchProductTechniques(productId: string): Promise<ProductTechniqueLink[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_print_areas', operation: 'select', filters: { product_id: productId }, limit: 200 },
  });
  if (error) throw new Error(error.message);
  const records = data?.data?.records || [];
  const seen = new Map<string, ProductTechniqueLink>();
  for (const r of records) {
    if (r.technique_id && !seen.has(r.technique_id)) {
      seen.set(r.technique_id, { id: r.id, product_id: r.product_id, technique_id: r.technique_id });
    }
  }
  return Array.from(seen.values());
}

export function ProductTechniquesSection({ productId }: ProductTechniquesSectionProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { data: techniques = [], isLoading: loadingTechs } = useQuery({
    queryKey: ['external-techniques-admin'],
    queryFn: fetchTechniques,
    staleTime: 5 * 60 * 1000,
  });

  const { data: linkedTechs = [], isLoading: loadingLinks } = useQuery({
    queryKey: ['product-techniques', productId],
    queryFn: () => fetchProductTechniques(productId),
    enabled: !!productId,
  });

  const linkedTechIds = new Set(linkedTechs.map(lt => lt.technique_id));

  const toggleTechnique = useCallback(async (techId: string, isLinked: boolean) => {
    if (togglingIds.has(techId)) return;
    setTogglingIds(prev => new Set(prev).add(techId));
    try {
      if (isLinked) {
        const { data: findData } = await supabase.functions.invoke('external-db-bridge', {
          body: { table: 'product_print_areas', operation: 'select', filters: { product_id: productId, technique_id: techId }, limit: 50 },
        });
        const records = findData?.data?.records || [];
        for (const r of records) {
          await supabase.functions.invoke('external-db-bridge', {
            body: { table: 'product_print_areas', operation: 'delete', id: r.id },
          });
        }
        toast.success('Técnica removida');
      } else {
        await supabase.functions.invoke('external-db-bridge', {
          body: {
            table: 'product_print_areas',
            operation: 'insert',
            data: {
              product_id: productId,
              technique_id: techId,
              area_name: 'Área Principal',
              is_active: true,
            },
          },
        });
        toast.success('Técnica adicionada');
      }
      queryClient.invalidateQueries({ queryKey: ['product-techniques', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar técnica');
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(techId); return next; });
    }
  }, [productId, queryClient, togglingIds]);

  const clearAll = useCallback(async () => {
    const linked = techniques.filter(t => linkedTechIds.has(t.id));
    for (const t of linked) {
      await toggleTechnique(t.id, true);
    }
  }, [techniques, linkedTechIds, toggleTechnique]);

  const isLoading = loadingTechs || loadingLinks;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (techniques.length === 0) {
    return (
      <div className="text-center py-8">
        <Paintbrush className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma técnica disponível</p>
      </div>
    );
  }

  const linkedCount = linkedTechIds.size;
  const searchLower = search.toLowerCase();

  const filtered = techniques
    .filter(t => !search || t.name.toLowerCase().includes(searchLower) || t.code?.toLowerCase().includes(searchLower));

  return (
    <div className="space-y-3">
      {/* Badges dos selecionados */}
      {linkedCount > 0 && (
        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary flex items-center gap-1.5">
              <Paintbrush className="h-3 w-3" />
              Selecionadas
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Limpar todas
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {techniques
              .filter(t => linkedTechIds.has(t.id))
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
              .map(t => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border border-border bg-background text-foreground hover:bg-muted/50 cursor-pointer transition-all duration-200"
                  onClick={() => toggleTechnique(t.id, true)}
                >
                  <span className="truncate max-w-[120px]">{t.name}</span>
                  {t.code && (
                    <span className="text-muted-foreground font-normal">({t.code})</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) = aria-label="Fechar"> { e.stopPropagation(); toggleTechnique(t.id, true); }}
                    className="rounded-full p-0.5 ml-0.5 hover:bg-destructive/20 hover:text-destructive transition-all duration-150"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar técnicas..."
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
        <span>{techniques.length} técnicas</span>
        <span>•</span>
        <span className={cn("font-medium", linkedCount > 0 && "text-primary")}>
          {linkedCount} selecionadas
        </span>
      </div>

      {/* Lista */}
      <ScrollArea className="h-56">
        <div className="space-y-0.5 pr-3">
          {filtered.length === 0 && search ? (
            <div className="text-center py-6">
              <Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma técnica encontrada para "<span className="font-medium">{search}</span>"
              </p>
            </div>
          ) : (
            filtered.map(tech => {
              const isLinked = linkedTechIds.has(tech.id);
              return (
                <label
                  key={tech.id}
                  className={cn(
                    "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150",
                    isLinked
                      ? "bg-primary/15 text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {togglingIds.has(tech.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <Checkbox
                      checked={isLinked}
                      onCheckedChange={() => toggleTechnique(tech.id, isLinked)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  )}
                  <span className="truncate flex-1">{tech.name}</span>
                  {tech.code && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                      isLinked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {tech.code}
                    </span>
                  )}
                  {isLinked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
