/**
 * ComponentMediaManager — Mini gallery per kit component
 * Supports image/video upload to Supabase storage + metadata in component_media table
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Image, Video, Plus, Trash2, Loader2, Star, Upload, Link2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ComponentMedia {
  id: string;
  component_id: string;
  product_id: string;
  media_type: 'image' | 'video';
  url: string;
  title: string | null;
  sort_order: number;
  is_cover: boolean;
}

interface Props {
  componentId: string;
  productId: string;
  componentName: string;
}

async function fetchComponentMedia(componentId: string): Promise<ComponentMedia[]> {
  const { data, error } = await supabase
    .from('component_media')
    .select('*')
    .eq('component_id', componentId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ComponentMedia[]) || [];
}

export function ComponentMediaManager({ componentId, productId, componentName }: Props) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [urlMediaType, setUrlMediaType] = useState<'image' | 'video'>('image');

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/');
        const mediaType = isVideo ? 'video' : 'image';
        const ext = file.name.split('.').pop();
        const path = `${productId}/${componentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('component-media')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('component-media')
          .getPublicUrl(path);

        const { error: insertError } = await supabase
          .from('component_media')
          .insert({
            component_id: componentId,
            product_id: productId,
            media_type: mediaType,
            url: urlData.publicUrl,
            title: file.name.replace(/\.[^/.]+$/, ''),
            sort_order: media.length,
          });

        if (insertError) throw insertError;
      }
      toast.success('Mídia adicionada com sucesso');
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddUrl = async () => {
    if (!externalUrl.trim()) return;

    try {
      const { error } = await supabase
        .from('component_media')
        .insert({
          component_id: componentId,
          product_id: productId,
          media_type: urlMediaType,
          url: externalUrl.trim(),
          title: null,
          sort_order: media.length,
        });

      if (error) throw error;
      toast.success('Mídia adicionada');
      setExternalUrl('');
      setShowUrlInput(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar');
    }
  };

  const handleDelete = async (item: ComponentMedia) => {
    try {
      // Try to delete from storage if it's from our bucket
      if (item.url.includes('component-media')) {
        const path = item.url.split('component-media/')[1];
        if (path) {
          await supabase.storage.from('component-media').remove([path]);
        }
      }

      const { error } = await supabase
        .from('component_media')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      toast.success('Mídia removida');
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  const handleSetCover = async (item: ComponentMedia) => {
    try {
      // Unset all covers first
      await supabase
        .from('component_media')
        .update({ is_cover: false })
        .eq('component_id', componentId);

      // Set new cover
      const { error } = await supabase
        .from('component_media')
        .update({ is_cover: true })
        .eq('id', item.id);

      if (error) throw error;
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
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/15 text-amber-600 border-amber-500/30">
                  {videoCount} <Video className="h-2 w-2 ml-0.5" />
                </Badge>
              )}
            </div>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-lg p-3 space-y-3">
          {/* Upload actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-colors',
                'hover:bg-accent/50 cursor-pointer',
                isUploading && 'opacity-50 cursor-not-allowed',
              )}>
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Upload
              </div>
            </label>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium hover:bg-accent/50 transition-colors"
            >
              <Link2 className="h-3 w-3" />
              URL Externa
            </button>
          </div>

          {/* External URL input */}
          {showUrlInput && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setUrlMediaType('image')}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                    urlMediaType === 'image' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Imagem
                </button>
                <button
                  type="button"
                  onClick={() => setUrlMediaType('video')}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                    urlMediaType === 'video' ? 'bg-amber-500/15 text-amber-600' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Vídeo
                </button>
              </div>
              <Input
                placeholder="https://..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="h-7 text-xs flex-1"
              />
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleAddUrl}>
                <Plus className="h-3 w-3" />
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowUrlInput(false); setExternalUrl(''); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

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
                    'relative group rounded-lg border overflow-hidden aspect-square bg-muted/30',
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
                      <Video className="h-5 w-5 text-amber-500" />
                    </div>
                  )}

                  {/* Badge type */}
                  <div className="absolute top-1 left-1">
                    {item.media_type === 'video' && (
                      <Badge className="text-[8px] px-1 py-0 h-3.5 bg-amber-500/80 text-white border-0">
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
                        className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors"
                        title="Definir como capa"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-md bg-destructive/60 hover:bg-destructive/80 text-white transition-colors"
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
