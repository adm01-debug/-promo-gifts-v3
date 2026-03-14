/**
 * ProductVideoGallery — Galeria de vídeos do produto via tabela product_videos (Cloudflare Stream + YouTube)
 * Com filtro por variação de cor (via tabela local video_variant_links) e por tipo de vídeo.
 */

import { useState, useCallback, useMemo } from 'react';
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
  Filter,
  Palette,
  Link2,
  Unlink,
  Clapperboard,
  Mic,
  Sparkles,
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

interface VariantLink {
  id: string;
  video_id: string;
  variant_id: string;
  variant_name: string | null;
  variant_color_hex: string | null;
  supplier_code: string | null;
  product_id: string;
}

interface Variant {
  id: string;
  name: string;
  color_name: string | null;
  color_hex: string | null;
  supplier_code?: string;
}

const VIDEO_TYPES = [
  { value: 'product_video', label: 'Produto', icon: Video },
  { value: 'tutorial', label: 'Tutorial', icon: Play },
  { value: 'unboxing', label: 'Unboxing', icon: Film },
  { value: 'review', label: 'Review', icon: Star },
  { value: 'demo', label: 'Demonstração', icon: Clapperboard },
  { value: 'recording', label: 'Gravação', icon: Mic },
  { value: 'lifestyle', label: 'Lifestyle', icon: Sparkles },
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
  productId?: string;
}

export function ProductVideoGallery({ productId }: ProductVideoGalleryProps) {
  const queryClient = useQueryClient();
  const [previewVideo, setPreviewVideo] = useState<ExternalVideo | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoType, setNewVideoType] = useState('product_video');
  const [newVideoVariant, setNewVideoVariant] = useState('none');
  const [isAdding, setIsAdding] = useState(false);
  const [filterVariant, setFilterVariant] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [linkingVideoId, setLinkingVideoId] = useState<string | null>(null);

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

  // Fetch variants from external DB
  const { data: variants = [] } = useQuery<Variant[]>({
    queryKey: ['product-variants-for-videos', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_variants',
          operation: 'select',
          select: 'id, name, color_name, color_hex, color_code',
          filters: { product_id: productId, is_active: true },
          limit: 200,
          orderBy: { column: 'name', ascending: true },
        },
      });
      if (error) return [];
      const records = data?.data?.records || [];
      return records.map((r: any) => ({
        id: String(r.id),
        name: String(r.name ?? r.color_name ?? 'Variação'),
        color_name: r.color_name ?? null,
        color_hex: r.color_hex ?? null,
        supplier_code: r.color_code != null ? String(r.color_code) : undefined,
      }));
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch variant links from local DB
  const { data: variantLinks = [] } = useQuery<VariantLink[]>({
    queryKey: ['video-variant-links', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_variant_links')
        .select('*')
        .eq('product_id', productId);
      if (error) return [];
      return data || [];
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  // Build lookup maps
  const videoLinksMap = useMemo(() => {
    const map = new Map<string, VariantLink[]>();
    variantLinks.forEach(link => {
      const existing = map.get(link.video_id) || [];
      existing.push(link);
      map.set(link.video_id, existing);
    });
    return map;
  }, [variantLinks]);

  const variantMap = useMemo(() => {
    const map = new Map<string, Variant>();
    variants.forEach(v => {
      map.set(v.id, v);
      if (v.supplier_code) map.set(v.supplier_code, v);
    });
    return map;
  }, [variants]);

  // Filtered videos
  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      // Type filter
      if (filterType !== 'all' && (video.video_type || 'product_video') !== filterType) {
        return false;
      }

      // Variant filter
      if (filterVariant === 'all') return true;
      if (filterVariant === 'general') {
        // Videos without any variant link
        return !videoLinksMap.has(video.id) || videoLinksMap.get(video.id)!.length === 0;
      }
      // Specific variant
      const links = videoLinksMap.get(video.id) || [];
      return links.some(l => l.variant_id === filterVariant || l.supplier_code === filterVariant);
    });
  }, [videos, filterType, filterVariant, videoLinksMap]);

  // Stats
  const stats = useMemo(() => {
    const linkedCount = videos.filter(v => videoLinksMap.has(v.id) && videoLinksMap.get(v.id)!.length > 0).length;
    return { total: videos.length, linked: linkedCount, unlinked: videos.length - linkedCount };
  }, [videos, videoLinksMap]);

  // Link video to variant
  const linkVideoToVariant = useCallback(async (videoId: string, variantId: string) => {
    const variant = variantMap.get(variantId);
    if (!variant) return;

    try {
      const { error } = await supabase.from('video_variant_links').insert({
        video_id: videoId,
        variant_id: variant.id,
        variant_name: variant.color_name || variant.name,
        variant_color_hex: variant.color_hex,
        supplier_code: variant.supplier_code || null,
        product_id: productId,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['video-variant-links', productId] });
      toast.success(`Vídeo vinculado a ${variant.color_name || variant.name}`);
    } catch (err) {
      toast.error('Erro ao vincular vídeo');
    }
    setLinkingVideoId(null);
  }, [productId, variantMap, queryClient]);

  // Unlink video from variant
  const unlinkVideoFromVariant = useCallback(async (linkId: string) => {
    try {
      const { error } = await supabase.from('video_variant_links').delete().eq('id', linkId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['video-variant-links', productId] });
      toast.success('Vínculo removido');
    } catch {
      toast.error('Erro ao desvincular');
    }
  }, [productId, queryClient]);

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

      // If variant selected, link it after video creation
      const newVideoId = data?.data?.id;
      if (newVideoVariant !== 'none' && newVideoId) {
        const variant = variantMap.get(newVideoVariant);
        if (variant) {
          await supabase.from('video_variant_links').insert({
            video_id: newVideoId,
            variant_id: variant.id,
            variant_name: variant.color_name || variant.name,
            variant_color_hex: variant.color_hex,
            supplier_code: variant.supplier_code || null,
            product_id: productId,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['product-videos-ext', productId] });
      queryClient.invalidateQueries({ queryKey: ['video-variant-links', productId] });
      setNewVideoUrl('');
      setNewVideoVariant('none');
      toast.success('Vídeo adicionado!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar vídeo');
    } finally {
      setIsAdding(false);
    }
  }, [newVideoUrl, newVideoType, newVideoVariant, productId, videos, variantMap, queryClient]);

  const handleRemove = useCallback(async (videoId: string) => {
    try {
      // Remove variant links first
      await supabase.from('video_variant_links').delete().eq('video_id', videoId);
      // Soft-delete video
      await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_videos',
          operation: 'update',
          id: videoId,
          data: { is_active: false },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['product-videos-ext', productId] });
      queryClient.invalidateQueries({ queryKey: ['video-variant-links', productId] });
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

  const hasFilters = filterVariant !== 'all' || filterType !== 'all';

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
      {/* Filter bar */}
      {videos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/30">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          {/* Type filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-7 w-[120px] text-[11px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os tipos</SelectItem>
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

          {/* Variant filter */}
          {variants.length > 0 && (
            <Select value={filterVariant} onValueChange={setFilterVariant}>
              <SelectTrigger className="h-7 w-[160px] text-[11px]">
                <SelectValue placeholder="Variação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <Palette className="h-3 w-3 text-muted-foreground" />
                    Todas as variações
                  </span>
                </SelectItem>
                <SelectItem value="general" className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <Video className="h-3 w-3 text-muted-foreground" />
                    Sem variação (geral)
                  </span>
                </SelectItem>
                {variants.map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border border-border/60 shrink-0"
                        style={{ backgroundColor: v.color_hex || '#999' }}
                      />
                      {v.color_name || v.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-muted-foreground"
              onClick={() => { setFilterVariant('all'); setFilterType('all'); }}
            >
              Limpar filtros
            </Button>
          )}

          <span className="ml-auto text-[10px] text-muted-foreground">
            {filteredVideos.length}/{videos.length}
          </span>
        </div>
      )}

      {/* Video grid */}
      {filteredVideos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredVideos.map((video) => {
            const thumbnail = getThumbnail(video);
            const typeInfo = VIDEO_TYPES.find(t => t.value === video.video_type);
            const links = videoLinksMap.get(video.id) || [];

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

                {/* Top-left badges */}
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

                {/* Variant color dots (bottom-left) */}
                {links.length > 0 && (
                  <div className="absolute bottom-7 left-1.5 flex gap-0.5">
                    {links.map(link => (
                      <Tooltip key={link.id}>
                        <TooltipTrigger asChild>
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-sm"
                            style={{ backgroundColor: link.variant_color_hex || '#999' }}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px]">
                          {link.variant_name || 'Variação'}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}

                {/* Bottom info bar */}
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

                {/* Action buttons (top-right) */}
                <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Link to variant button */}
                  {variants.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 bg-black/50 hover:bg-primary text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkingVideoId(linkingVideoId === video.id ? null : video.id);
                          }}
                        >
                          <Link2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Vincular a variação</TooltipContent>
                    </Tooltip>
                  )}
                  {/* Remove button */}
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

                {/* Linking panel (inline) */}
                {linkingVideoId === video.id && (
                  <div
                    className="absolute inset-0 bg-black/85 backdrop-blur-sm p-2 flex flex-col gap-1 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] text-white/80 font-medium">Vincular a variação:</span>
                    <div className="flex-1 overflow-y-auto space-y-0.5">
                      {variants.map(v => {
                        const isLinked = links.some(l => l.variant_id === v.id);
                        const existingLink = links.find(l => l.variant_id === v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            className={cn(
                              "w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] transition-colors",
                              isLinked
                                ? "bg-primary/30 text-white"
                                : "hover:bg-white/10 text-white/70"
                            )}
                            onClick={() => {
                              if (isLinked && existingLink) {
                                unlinkVideoFromVariant(existingLink.id);
                              } else {
                                linkVideoToVariant(video.id, v.id);
                              }
                            }}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                              style={{ backgroundColor: v.color_hex || '#999' }}
                            />
                            <span className="truncate">{v.color_name || v.name}</span>
                            {isLinked && <Unlink className="h-2.5 w-2.5 ml-auto shrink-0 text-white/60" />}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-5 text-[9px] text-white/60 hover:text-white"
                      onClick={() => setLinkingVideoId(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {videos.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground px-1 py-1.5 rounded-lg bg-muted/20 border border-border/30">
          <span className="font-medium text-foreground/70">{stats.total} vídeo(s)</span>
          <span className="flex items-center gap-1">
            <Link2 className="h-2.5 w-2.5" />
            {stats.linked} vinculado(s)
          </span>
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
      <div className="rounded-lg border-2 border-dashed border-border overflow-hidden transition-colors hover:border-primary/40">
        {/* Type & variant selector bar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 via-muted/40 to-muted/30 border-b border-primary/20">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background/80 border border-primary/30 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              {(() => {
                const activeType = VIDEO_TYPES.find(t => t.value === newVideoType);
                return activeType ? <activeType.icon className="h-4 w-4" /> : <Film className="h-4 w-4" />;
              })()}
              <span>Tipo:</span>
            </div>
            <Select value={newVideoType} onValueChange={setNewVideoType}>
              <SelectTrigger className="h-8 w-[140px] text-xs font-medium bg-primary/5 border-primary/20 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {variants.length > 0 && (
            <>
              <div className="h-4 w-px bg-border/50" />
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Palette className="h-3 w-3" />
                <span className="font-medium">Vincular a:</span>
              </div>
              <Select value={newVideoVariant} onValueChange={setNewVideoVariant}>
                <SelectTrigger className="h-8 w-[160px] text-[11px] bg-background/80">
                  <SelectValue placeholder="Sem variação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Sem variação</SelectItem>
                  {variants.map(v => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-border/60 shrink-0"
                          style={{ backgroundColor: v.color_hex || '#999' }}
                        />
                        {v.color_name || v.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* URL input + add button */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... ou URL do vídeo"
              className="h-8 text-xs flex-1 min-w-[200px]"
            />
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
      </div>

      {/* Empty state */}
      {filteredVideos.length === 0 && !isLoading && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Film className="h-5 w-5 mx-auto mb-2 opacity-40" />
          {hasFilters ? 'Nenhum vídeo encontrado com os filtros selecionados' : 'Nenhum vídeo cadastrado'}
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
                {/* Show variant links */}
                {(videoLinksMap.get(previewVideo.id) || []).map(link => (
                  <Badge key={link.id} variant="outline" className="text-[10px] flex items-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: link.variant_color_hex || '#999' }}
                    />
                    {link.variant_name}
                  </Badge>
                ))}
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
