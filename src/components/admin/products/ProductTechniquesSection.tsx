/**
 * ProductTechniquesSection — Seletor de técnicas de personalização do produto
 * Busca técnicas do BD externo (tecnica_gravacao) e permite vincular via product_print_areas ou exibição
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Search, Paintbrush } from 'lucide-react';
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
  // Buscar print areas do produto que têm técnica vinculada
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_print_areas', operation: 'select', filters: { product_id: productId }, limit: 200 },
  });
  if (error) throw new Error(error.message);
  const records = data?.data?.records || [];
  // Extrair technique_ids únicos
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
    try {
      if (isLinked) {
        // Buscar todas as print areas com essa technique para esse produto e deletar
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
        // Criar uma print area padrão com essa técnica
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
    }
  }, [productId, queryClient]);

  const isLoading = loadingTechs || loadingLinks;

  const filtered = techniques
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando técnicas...
      </div>
    );
  }

  const linkedCount = linkedTechIds.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Paintbrush className="h-4 w-4" />
        <span>{linkedCount} {linkedCount === 1 ? 'técnica vinculada' : 'técnicas vinculadas'}</span>
      </div>

      {linkedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {techniques.filter(t => linkedTechIds.has(t.id)).map(t => (
            <Badge
              key={t.id}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => toggleTechnique(t.id, true)}
            >
              {t.name}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar técnicas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <ScrollArea className="max-h-[200px] border rounded-md p-2">
        <div className="space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">Nenhuma técnica encontrada</p>
          ) : (
            filtered.map(tech => {
              const isLinked = linkedTechIds.has(tech.id);
              return (
                <label
                  key={tech.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent/30 transition-colors',
                    isLinked && 'bg-primary/5'
                  )}
                >
                  <Checkbox checked={isLinked} onCheckedChange={() => toggleTechnique(tech.id, isLinked)} />
                  <span>{tech.name}</span>
                  {tech.code && <span className="text-xs text-muted-foreground">({tech.code})</span>}
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
