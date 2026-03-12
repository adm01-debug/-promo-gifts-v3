/**
 * ProductTagsSection — Seletor de tags do produto via tabela product_tags
 * Busca tags do BD externo e permite vincular/desvincular
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductTagsSectionProps {
  productId: string;
}

interface ExternalTag {
  id: string;
  name: string;
  slug?: string;
  color?: string;
}

interface ProductTag {
  id: string;
  product_id: string;
  tag_id: string;
}

async function fetchTags(): Promise<ExternalTag[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'tags', operation: 'select', limit: 500, orderBy: { column: 'name', ascending: true } },
  });
  if (error) throw new Error(error.message);
  return data?.data?.records || [];
}

async function fetchProductTags(productId: string): Promise<ProductTag[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_tags', operation: 'select', filters: { product_id: productId }, limit: 500 },
  });
  if (error) throw new Error(error.message);
  return data?.data?.records || [];
}

export function ProductTagsSection({ productId }: ProductTagsSectionProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['external-tags-admin'],
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000,
  });

  const { data: productTags = [], isLoading: loadingLinks } = useQuery({
    queryKey: ['product-tags', productId],
    queryFn: () => fetchProductTags(productId),
    enabled: !!productId,
  });

  const linkedTagIds = new Set(productTags.map(pt => pt.tag_id));

  const toggleTag = useCallback(async (tagId: string, isLinked: boolean) => {
    try {
      if (isLinked) {
        const record = productTags.find(pt => pt.tag_id === tagId);
        if (!record?.id) {
          // Fallback: buscar
          const { data: findData } = await supabase.functions.invoke('external-db-bridge', {
            body: { table: 'product_tags', operation: 'select', filters: { product_id: productId, tag_id: tagId }, limit: 1 },
          });
          const found = findData?.data?.records?.[0];
          if (!found?.id) { toast.error('Registro não encontrado'); return; }
          await supabase.functions.invoke('external-db-bridge', {
            body: { table: 'product_tags', operation: 'delete', id: found.id },
          });
        } else {
          await supabase.functions.invoke('external-db-bridge', {
            body: { table: 'product_tags', operation: 'delete', id: record.id },
          });
        }
        toast.success('Tag removida');
      } else {
        await supabase.functions.invoke('external-db-bridge', {
          body: { table: 'product_tags', operation: 'insert', data: { product_id: productId, tag_id: tagId } },
        });
        toast.success('Tag adicionada');
      }
      queryClient.invalidateQueries({ queryKey: ['product-tags', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar tag');
    }
  }, [productId, productTags, queryClient]);

  const isLoading = loadingTags || loadingLinks;

  const filtered = tags
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando tags...
      </div>
    );
  }

  const linkedCount = linkedTagIds.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Tag className="h-4 w-4" />
        <span>{linkedCount} {linkedCount === 1 ? 'tag vinculada' : 'tags vinculadas'}</span>
      </div>

      {linkedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.filter(t => linkedTagIds.has(t.id)).map(t => (
            <Badge
              key={t.id}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => toggleTag(t.id, true)}
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
          placeholder="Buscar tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <ScrollArea className="max-h-[200px] border rounded-md p-2">
        <div className="space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">Nenhuma tag encontrada</p>
          ) : (
            filtered.map(tag => {
              const isLinked = linkedTagIds.has(tag.id);
              return (
                <label
                  key={tag.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent/30 transition-colors',
                    isLinked && 'bg-primary/5'
                  )}
                >
                  <Checkbox checked={isLinked} onCheckedChange={() => toggleTag(tag.id, isLinked)} />
                  <span>{tag.name}</span>
                  {tag.color && (
                    <div className="h-2.5 w-2.5 rounded-full border" style={{ backgroundColor: tag.color }} />
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
