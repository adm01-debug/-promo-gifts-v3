/**
 * ProductVideoGallery — Galeria de vídeos do produto via tabela product_videos (Cloudflare Stream + YouTube)
 * Busca vídeos do BD externo, exibe thumbnails, permite preview inline e adicionar novos vídeos por URL.
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Film,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  Loader2,
  Youtube,
  Video,
  Star,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Types ──

interface ExternalVideo {
  id: string;
  product_id: string;
  url_stream: string | null;
  url_hls: string | null;
  url_thumbnail: string | null;
  url_original: string | null;
  source_youtube_id: string | null;
  cloudflare_video_id: string | null;
  cloudflare_status: string | null;
  video_type: string | null;
  display_order: number;
  is_primary: boolean;
  is_active: boolean;
  title: string | null;
  description: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
}

const VIDEO_TYPES = [
  { value: 'product_video', label: 'Produto', icon: Video },
  { value: 'tutorial', label: 'Tutorial', icon: Play },
  { value: 'unboxing', label: 'Unboxing', icon: Film },
  { value: 'review', label: 'Review', icon: Star },
];

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Props ──

interface ProductVideoGalleryProps {
  productId: string;
}

export function ProductVideoGallery({ productId }: ProductVideoGalleryProps) {
  const queryClient = useQueryClient();
  const [previewVideo, setPreviewVideo] = useState<ExternalVideo | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoType, setNewVideoType] = useState('product_video');
  const [isAdding, setIsAdding] = useState(false);

  // Fetch videos from external DB
  const { data: videos = [], isLoading } = useQuery<ExternalVideo[]>({
    queryKey: ['product-videos-ext', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_videos',
          operation: 'select',
          filters: { product_id: productId, is_active: true },
          orderBy: { column: 'display_order', ascending: true },
          limit: 50,
        },
      });
      if (error) return [];
      return data?.data?.records || [];
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  const handleAddVideo = useCallback(async () => {
    if (!newVideoUrl.trim()) return;

    setIsAdding(true);
    try {
      const youtubeId = extractYoutubeId(newVideoUrl);
      const nextOrder = videos.length > 0
        ? Math.max(...videos.map(v => v.display_order || 0)) + 1
        : 0;

      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_videos',
          operation: 'insert',
          data: {
            product_id: productId,
            url_original: newVideoUrl.trim(),
            source_youtube_id: youtubeId,
            url_stream: youtubeId
              ? `https://www.youtube.com/embed/${youtubeId}`
              : null,
            url_thumbnail: youtubeId
              ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
              : null,
            video_type: newVideoType,
            display_order: nextOrder,
            is_primary: videos.length === 0,
            is_active: true,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao adicionar vídeo');

      queryClient.invalidateQueries({ queryKey: ['product-videos-ext', productId] });
      setNewVideoUrl('');
      toast.success('Vídeo adicionado!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar vídeo');
    } finally {
      setIsAdding(false);
    }
  }, [newVideoUrl, newVideoType, productId, videos, queryClient]);

  const handleRemove = useCallback(async (videoId: string) => {
    try {
      await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_videos',
          operation: 'update',
          id: videoId,
          data: { is_active: false },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['product-videos-ext', productId] });
      toast.success('Vídeo removido');
    } catch {
      toast.error('Erro ao remover vídeo');
    }
  }, [productId, queryClient]);

  const getVideoEmbedUrl = (video: ExternalVideo): string | null => {
    if (video.source_youtube_id) {
      return `https://www.youtube.com/embed/${video.source_youtube_id}`;
    }
    if (video.url_stream) return video.url_stream;
    return null;
  };

  const getThumbnail = (video: ExternalVideo): string | null => {
    if (video.url_thumbnail) return video.url_thumbnail;
    if (video.source_youtube_id) {
      return `https://img.youtube.com/vi/${video.source_youtube_id}/mqdefault.jpg`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando vídeos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video grid */}
      {videos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {videos.map((video) => {
            const thumbnail = getThumbnail(video);
            const typeInfo = VIDEO_TYPES.find(t => t.value === video.video_type);

            return (
              <div
                key={video.id}
                className={cn(
                  'relative group rounded-lg border-2 overflow-hidden aspect-video transition-all cursor-pointer',
                  video.is_primary ? 'border-primary ring-1 ring-primary/30' : 'border-border/60',
                )}
                onClick={() => setPreviewVideo(video)}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={video.title || 'Vídeo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                    <Film className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <Play className="h-5 w-5 text-white ml-0.5" />
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
                  {video.is_primary && (
                    <Badge className="text-[9px] px-1 py-0 bg-primary text-primary-foreground">
                      Principal
                    </Badge>
                  )}
                  {video.source_youtube_id && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 flex items-center gap-0.5">
                      <Youtube className="h-2.5 w-2.5 text-red-500" />
                      YouTube
                    </Badge>
                  )}
                  {!video.source_youtube_id && video.cloudflare_video_id && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0">
                      Cloudflare
                    </Badge>
                  )}
                  {typeInfo && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 bg-background/80 backdrop-blur-sm">
                      {typeInfo.label}
                    </Badge>
                  )}
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/80 truncate max-w-[70%]">
                      {video.title || (video.source_youtube_id ? `YT: ${video.source_youtube_id}` : 'Vídeo')}
                    </span>
                    {video.file_size_bytes && video.file_size_bytes > 0 && (
                      <span className="text-[9px] text-white/60">
                        {formatBytes(video.file_size_bytes)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Remove button */}
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 bg-black/50 hover:bg-destructive text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(video.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Remover vídeo</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {videos.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground px-1 py-1.5 rounded-lg bg-muted/20 border border-border/30">
          <span className="font-medium text-foreground/70">{videos.length} vídeo(s)</span>
          {videos.filter(v => v.source_youtube_id).length > 0 && (
            <span className="flex items-center gap-1">
              <Youtube className="h-2.5 w-2.5 text-red-500" />
              {videos.filter(v => v.source_youtube_id).length} YouTube
            </span>
          )}
          {videos.filter(v => v.cloudflare_video_id && !v.source_youtube_id).length > 0 && (
            <span>
              {videos.filter(v => v.cloudflare_video_id && !v.source_youtube_id).length} Cloudflare Stream
            </span>
          )}
        </div>
      )}

      {/* Add video form */}
      <div className="rounded-lg border border-dashed border-border/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <Plus className="h-3 w-3" />
          Adicionar vídeo
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... ou URL do vídeo"
            className="h-8 text-xs flex-1 min-w-[200px]"
          />
          <Select value={newVideoType} onValueChange={setNewVideoType}>
            <SelectTrigger className="h-8 w-[130px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <t.icon className="h-3 w-3 text-muted-foreground" />
                    {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={handleAddVideo}
            disabled={isAdding || !newVideoUrl.trim()}
          >
            {isAdding ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            Adicionar
          </Button>
        </div>
        {newVideoUrl && extractYoutubeId(newVideoUrl) && (
          <div className="rounded-md border border-border/40 overflow-hidden aspect-video max-w-xs">
            <img
              src={`https://img.youtube.com/vi/${extractYoutubeId(newVideoUrl)}/mqdefault.jpg`}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {videos.length === 0 && !isLoading && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Film className="h-5 w-5 mx-auto mb-2 opacity-40" />
          Nenhum vídeo cadastrado
        </div>
      )}

      {/* Video preview dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewVideo && (
            <div className="space-y-2">
              <div className="aspect-video rounded-md overflow-hidden bg-black">
                {getVideoEmbedUrl(previewVideo) ? (
                  <iframe
                    src={getVideoEmbedUrl(previewVideo)!}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                    title={previewVideo.title || 'Vídeo'}
                  />
                ) : previewVideo.url_hls ? (
                  <video
                    src={previewVideo.url_hls}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Film className="h-8 w-8 opacity-40" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 px-2 pb-1 text-[11px] text-muted-foreground">
                {previewVideo.title && <span className="font-medium text-foreground/70">{previewVideo.title}</span>}
                {previewVideo.video_type && (
                  <Badge variant="secondary" className="text-[10px]">
                    {VIDEO_TYPES.find(t => t.value === previewVideo.video_type)?.label || previewVideo.video_type}
                  </Badge>
                )}
                {previewVideo.cloudflare_status && (
                  <Badge variant="outline" className="text-[10px]">
                    {previewVideo.cloudflare_status}
                  </Badge>
                )}
                {previewVideo.file_size_bytes && previewVideo.file_size_bytes > 0 && (
                  <span>{formatBytes(previewVideo.file_size_bytes)}</span>
                )}
                {previewVideo.url_original && (
                  <a
                    href={previewVideo.url_original}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-primary hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Original
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
