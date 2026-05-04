/**
 * ComponentMediaManager — Mini gallery per kit component
 * Uses external-db-bridge (kit_component_media table) — no local storage
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, Video, Trash2, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
  fetchComponentMedia,
  updateComponentMedia,
  deleteComponentMedia,
  type ComponentMedia,
} from './api';

interface Props {
  componentId: string;
  productId: string;
  componentName: string;
}

export function ComponentMediaManager({ componentId, productId, componentName }: Props) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['component-media', componentId],
    queryFn: () => fetchComponentMedia(componentId),
    enabled: isOpen && !!componentId,
    staleTime: 5 * 60 * 1000,
  });

  const imageCount = media.filter(m => m.media_type === 'image').length;
  const videoCount = media.filter(m => m.media_type === 'video').length;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['component-media', componentId] });
  }, [queryClient, componentId]);

  const handleDelete = async (item: ComponentMedia) => {
    try {
      await deleteComponentMedia(item.id);
      toast.success('Mídia removida');
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  const handleSetCover = async (item: ComponentMedia) => {
    try {
      // Unset all covers first
      const currentCovers = media.filter(m => m.is_cover);
      for (const c of currentCovers) {
        await updateComponentMedia(c.id, { is_cover: false });
      }
      // Set new cover
      await updateComponentMedia(item.id, { is_cover: true });
      toast.success('Capa definida');
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao definir capa');
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 w-full px-3 py-1.5 text-[10px] rounded-b-lg border border-t-0 transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-accent/30',
            isOpen && 'bg-accent/20 text-foreground',
          )}
        >
          <Image className="h-3 w-3" />
          <span>Mídia</span>
          {(imageCount > 0 || videoCount > 0) && (
            <div className="flex items-center gap-1 ml-1">
              {imageCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                  {imageCount} <Image className="h-2 w-2 ml-0.5" />
                </Badge>
              )}
              {videoCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-warning/15 text-warning border-warning/30">
                  {videoCount} <Video className="h-2 w-2 ml-0.5" />
                </Badge>
              )}
            </div>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-lg p-3 space-y-3">
          {/* Media grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando mídia...
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-[11px]">
              Nenhuma mídia adicionada a este componente
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {media.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'relative group rounded-2xl border overflow-hidden aspect-square bg-muted/30',
                    item.is_cover && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                  )}
                >
                  {item.media_type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.title || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Video className="h-5 w-5 text-warning" />
                    </div>
                  )}

                  {/* Badge type */}
                  <div className="absolute top-1 left-1">
                    {item.media_type === 'video' && (
                      <Badge className="text-[8px] px-1 py-0 h-3.5 bg-warning/80 text-primary-foreground border-0">
                        Vídeo
                      </Badge>
                    )}
                    {item.is_cover && (
                      <Badge className="text-[8px] px-1 py-0 h-3.5 bg-primary/80 text-primary-foreground border-0">
                        Capa
                      </Badge>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {item.media_type === 'image' && !item.is_cover && (
                      <button
                        type="button"
                        onClick={() => handleSetCover(item)}
                        className="p-1.5 rounded-2xl bg-white/20 hover:bg-white/30 text-primary-foreground transition-colors"
                        title="Definir como capa"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-2xl bg-destructive/60 hover:bg-destructive/80 text-primary-foreground transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
