/**
 * ProductRamosSection — Seletor hierárquico de Ramos de Atividade (Público-Alvo / Segmentos)
 * Usa ramoAtividadeService para buscar ramos → segmentos e vincular via produto_ramo_atividade
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ramoAtividadeService } from '@/services/ramoAtividadeService';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, ChevronRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ProductRamosSectionProps {
  productId: string;
}

export function ProductRamosSection({ productId }: ProductRamosSectionProps) {
  const queryClient = useQueryClient();
  const [expandedRamos, setExpandedRamos] = useState<Set<string>>(new Set());

  const { data: ramosData, isLoading: loadingRamos } = useQuery({
    queryKey: ['ramos-atividade-admin'],
    queryFn: () => ramoAtividadeService.getRamos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: segmentosData, isLoading: loadingSegmentos } = useQuery({
    queryKey: ['segmentos-atividade-admin'],
    queryFn: () => ramoAtividadeService.getSegmentos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: produtoRamosData, isLoading: loadingLinks } = useQuery({
    queryKey: ['produto-ramos', productId],
    queryFn: () => ramoAtividadeService.getRamosDoProduto(productId),
    enabled: !!productId,
  });

  const linkedSegmentoIds = new Set(
    (produtoRamosData?.associacoes || []).map(a => a.ramo_atividade_filho_id)
  );

  const ramos = ramosData?.ramos || [];
  const segmentos = segmentosData?.segmentos || [];

  const segmentosByRamo = segmentos.reduce<Record<string, typeof segmentos>>((acc, s) => {
    if (!acc[s.ramo_atividade_id]) acc[s.ramo_atividade_id] = [];
    acc[s.ramo_atividade_id].push(s);
    return acc;
  }, {});

  const toggleSegmento = useCallback(async (segmentoId: string, isLinked: boolean) => {
    try {
      if (isLinked) {
        await ramoAtividadeService.removeRamoDoProduto(productId, segmentoId);
        toast.success('Segmento removido');
      } else {
        await ramoAtividadeService.addRamoAoProduto(productId, segmentoId);
        toast.success('Segmento adicionado');
      }
      queryClient.invalidateQueries({ queryKey: ['produto-ramos', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar segmento');
    }
  }, [productId, queryClient]);

  const toggleRamo = (ramoId: string) => {
    setExpandedRamos(prev => {
      const next = new Set(prev);
      if (next.has(ramoId)) next.delete(ramoId);
      else next.add(ramoId);
      return next;
    });
  };

  const isLoading = loadingRamos || loadingSegmentos || loadingLinks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando ramos de atividade...
      </div>
    );
  }

  const linkedCount = linkedSegmentoIds.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>{linkedCount} {linkedCount === 1 ? 'segmento vinculado' : 'segmentos vinculados'}</span>
      </div>

      {linkedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {segmentos
            .filter(s => linkedSegmentoIds.has(s.id))
            .map(s => (
              <Badge
                key={s.id}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => toggleSegmento(s.id, true)}
              >
                {s.nome}
                <X className="h-3 w-3" />
              </Badge>
            ))}
        </div>
      )}

      <ScrollArea className="max-h-[280px] border rounded-md p-2">
        <div className="space-y-1">
          {ramos.map(ramo => {
            const children = segmentosByRamo[ramo.id] || [];
            const linkedInRamo = children.filter(s => linkedSegmentoIds.has(s.id)).length;
            const isExpanded = expandedRamos.has(ramo.id);

            return (
              <Collapsible key={ramo.id} open={isExpanded} onOpenChange={() => toggleRamo(ramo.id)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors">
                  <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
                  {ramo.cor && (
                    <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: ramo.cor }} />
                  )}
                  <span className="font-medium">{ramo.nome}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {linkedInRamo > 0 && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 mr-1">
                        {linkedInRamo}
                      </Badge>
                    )}
                    {children.length} segmentos
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 space-y-0.5 py-1">
                    {children.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-2">Nenhum segmento neste ramo</p>
                    ) : (
                      children.map(seg => {
                        const isLinked = linkedSegmentoIds.has(seg.id);
                        return (
                          <label
                            key={seg.id}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent/30 transition-colors',
                              isLinked && 'bg-primary/5'
                            )}
                          >
                            <Checkbox checked={isLinked} onCheckedChange={() => toggleSegmento(seg.id, isLinked)} />
                            <span>{seg.nome}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
