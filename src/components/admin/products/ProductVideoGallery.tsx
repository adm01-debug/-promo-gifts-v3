/**
 * ProductVideoGallery — Galeria de vídeos do produto
 * Upload de arquivos de vídeo para Supabase Storage (bucket product-videos)
 * + registro no banco externo via external-db-bridge
 * Com filtro por variação de cor e tipo de vídeo.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Film,
  Plus,
  Trash2,
  Play,
  Loader2,
  Video,
  Star,
  Filter,
  Palette,
  Link2,
  Unlink,
  Clapperboard,
  Mic,
  Sparkles,
  Upload,
  FileVideo,
  ImagePlus,
  RefreshCw,
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
import { logger } from "@/lib/logger";
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

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg', 'video/ogg'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Extrai o primeiro frame de um arquivo de vídeo como Blob JPEG usando canvas.
 * Retorna null se falhar (codec não suportado, etc).
 */
function extractThumbnailFromVideo(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.addEventListener('loadeddata', () => {
      // Seek to 1 second or 0 if shorter
      video.currentTime = Math.min(1, video.duration || 0);
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 640);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(null); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          cleanup();
          resolve(blob);
        }, 'image/jpeg', 0.8);
      } catch {
        cleanup();
        resolve(null);
      }
    });

    video.addEventListener('error', () => { cleanup(); resolve(null); });

    // Timeout safety - 10s max
    setTimeout(() => { cleanup(); resolve(null); }, 10000);
  });
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
  const [uploadVideoType, setUploadVideoType] = useState('product_video');
  const [uploadVariant, setUploadVariant] = useState('none');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [filterVariant, setFilterVariant] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [linkingVideoId, setLinkingVideoId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [isBulkRegenerating, setIsBulkRegenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .eq('product_id', productId!);
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
      if (filterType !== 'all' && (video.video_type || 'product_video') !== filterType) {
        return false;
      }
      if (filterVariant === 'all') return true;
      if (filterVariant === 'general') {
        return !videoLinksMap.has(video.id) || videoLinksMap.get(video.id)!.length === 0;
      }
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
        product_id: productId!,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['video-variant-links', productId] });
      toast.success(`Vídeo vinculado a ${variant.color_name || variant.name}`);
    } catch {
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

  // Upload a single video file + auto-generate thumbnail
  const uploadFile = useCallback(async (file: File): Promise<{ url: string; size: number; thumbnailUrl: string | null } | null> => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast.error(`"${file.name}" não é um formato de vídeo suportado`);
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`"${file.name}" excede o limite de 100MB`);
      return null;
    }

    const fileExt = file.name.split('.').pop() || 'mp4';
    const baseName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const videoPath = `videos/${productId || 'new'}/${baseName}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-videos')
      .upload(videoPath, file, { cacheControl: '3600', upsert: false });

    if (error) {
      toast.error(`Erro no upload de "${file.name}"`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('product-videos')
      .getPublicUrl(data.path);

    // Auto-generate thumbnail from first frame
    let thumbnailUrl: string | null = null;
    let thumbFailed = false;
    try {
      const thumbBlob = await extractThumbnailFromVideo(file);
      if (thumbBlob) {
        const thumbPath = `thumbnails/${productId || 'new'}/${baseName}.jpg`;
        const { data: td, error: te } = await supabase.storage
          .from('product-videos')
          .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', cacheControl: '86400', upsert: false });
        if (!te && td) {
          const { data: tu } = supabase.storage.from('product-videos').getPublicUrl(td.path);
          thumbnailUrl = tu.publicUrl;
        } else {
          thumbFailed = true;
        }
      } else {
        thumbFailed = true;
      }
    } catch (e) {
      logger.warn('Thumbnail generation failed:', e);
      thumbFailed = true;
    }

    if (thumbFailed) {
      toast.warning(`Thumbnail não gerada para "${file.name}" — você pode regenerá-la depois`, {
        duration: 5000,
      });
    }

    return { url: urlData.publicUrl, size: file.size, thumbnailUrl };
  }, [productId]);

  // Create external DB record for uploaded video
  const createExternalVideoRecord = useCallback(async (
    url: string,
    fileSize: number,
    fileName: string,
    thumbnailUrl: string | null,
  ): Promise<string | null> => {
    if (!productId) return null;
    const nextOrder = videos.length > 0
      ? Math.max(...videos.map(v => v.display_order || 0)) + 1
      : 0;

    const { data, error } = await supabase.functions.invoke('external-db-bridge', {
      body: {
        table: 'product_videos',
        operation: 'insert',
        data: {
          product_id: productId,
          url_original: url,
          url_stream: url,
          url_thumbnail: thumbnailUrl,
          video_type: uploadVideoType,
          display_order: nextOrder,
          is_primary: videos.length === 0,
          is_active: true,
          title: fileName,
          file_size_bytes: fileSize,
        },
      },
    });

    if (error || !data?.success) return null;
    return data?.data?.id || null;
  }, [productId, uploadVideoType, videos]);

  // Process upload batch
  const processUploadBatch = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    if (!productId) {
      toast.error('Salve o produto antes de enviar vídeos');
      return;
    }

    setIsUploading(true);
    setUploadCount(files.length);

    try {
      let successCount = 0;

      for (const file of files) {
        const result = await uploadFile(file);
        if (!result) continue;

        const videoId = await createExternalVideoRecord(result.url, result.size, file.name, result.thumbnailUrl);

        if (videoId && uploadVariant !== 'none') {
          const variant = variantMap.get(uploadVariant);
          if (variant) {
            await supabase.from('video_variant_links').insert({
              video_id: videoId,
              variant_id: variant.id,
              variant_name: variant.color_name || variant.name,
              variant_color_hex: variant.color_hex,
              supplier_code: variant.supplier_code || null,
              product_id: productId,
            });
          }
        }
        successCount++;
      }

      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['product-videos-ext', productId] });
        queryClient.invalidateQueries({ queryKey: ['video-variant-links', productId] });
        toast.success(`${successCount} vídeo(s) enviado(s)!`);
      }
    } catch (err) {
      toast.error('Erro ao enviar vídeos');
    } finally {
      setIsUploading(false);
      setUploadCount(0);
    }
  }, [productId, uploadFile, createExternalVideoRecord, uploadVariant, variantMap, queryClient]);

  const handleRemove = useCallback(async (videoId: string) => {
    try {
      await supabase.from('video_variant_links').delete().eq('video_id', videoId);
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

  // Regenerate thumbnail from video URL
  const regenerateThumbnail = useCallback(async (video: ExternalVideo) => {
    const videoUrl = video.url_original || video.url_stream;
    if (!videoUrl || !productId) {
      toast.error('URL do vídeo não disponível');
      return;
    }

    setRegeneratingId(video.id);
    try {
      // Fetch video as blob and extract thumbnail
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Falha ao baixar vídeo');
      const blob = await response.blob();
      const file = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });

      const thumbBlob = await extractThumbnailFromVideo(file);
      if (!thumbBlob) {
        toast.error('Não foi possível extrair frame do vídeo');
        return;
      }

      const baseName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const thumbPath = `thumbnails/${productId}/${baseName}.jpg`;
      const { data: td, error: te } = await supabase.storage
        .from('product-videos')
        .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', cacheControl: '86400', upsert: false });

      if (te || !td) {
        toast.error('Erro ao salvar thumbnail');
        return;
      }

      const { data: tu } = supabase.storage.from('product-videos').getPublicUrl(td.path);

      // Update external record
      await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_videos',
          operation: 'update',
          id: video.id,
          data: { url_thumbnail: tu.publicUrl },
        },
      });

      queryClient.invalidateQueries({ queryKey: ['product-videos-ext', productId] });
      toast.success('Thumbnail regenerada!');
    } catch (err: any) {
      toast.error('Erro ao regenerar thumbnail: ' + (err.message || 'desconhecido'));
    } finally {
      setRegeneratingId(null);
    }
  }, [productId, queryClient]);

  // Bulk regenerate thumbnails for videos without one
  const bulkRegenerateThumbnails = useCallback(async () => {
    const withoutThumb = videos.filter(v => !v.url_thumbnail && !v.source_youtube_id && (v.url_original || v.url_stream));
    if (withoutThumb.length === 0) {
      toast.info('Todos os vídeos já possuem thumbnail');
      return;
    }

    setIsBulkRegenerating(true);
    let successCount = 0;
    for (const video of withoutThumb) {
      try {
        await regenerateThumbnail(video);
        successCount++;
      } catch { /* individual errors handled inside */ }
    }
    setIsBulkRegenerating(false);
    if (successCount > 0) {
      toast.success(`${successCount} thumbnail(s) regenerada(s)`);
    }
  }, [videos, regenerateThumbnail]);

  const getThumbnail = (video: ExternalVideo): string | null => {
    if (video.url_thumbnail) return video.url_thumbnail;
    if (video.source_youtube_id) {
      return `https://img.youtube.com/vi/${video.source_youtube_id}/mqdefault.jpg`;
    }
    return null;
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => ACCEPTED_VIDEO_TYPES.includes(f.type));
    if (files.length > 0) {
      processUploadBatch(files);
    } else {
      toast.error('Nenhum arquivo de vídeo válido encontrado');
    }
  }, [processUploadBatch]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processUploadBatch(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processUploadBatch]);

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
          {/* Bulk regenerate thumbnails */}
          {videos.some(v => !v.url_thumbnail && !v.source_youtube_id) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-muted-foreground hover:text-primary"
                  onClick={bulkRegenerateThumbnails}
                  disabled={isBulkRegenerating}
                >
                  {isBulkRegenerating ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Gerar thumbnails
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                Gerar thumbnails para {videos.filter(v => !v.url_thumbnail && !v.source_youtube_id).length} vídeo(s) sem miniatura
              </TooltipContent>
            </Tooltip>
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
                      {video.title || 'Vídeo'}
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
                  {/* Regenerate thumbnail */}
                  {!video.url_thumbnail && !video.source_youtube_id && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 bg-black/50 hover:bg-amber-600 text-white"
                          disabled={regeneratingId === video.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            regenerateThumbnail(video);
                          }}
                        >
                          {regeneratingId === video.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ImagePlus className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Gerar thumbnail</TooltipContent>
                    </Tooltip>
                  )}
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
        </div>
      )}

      {/* Upload dropzone — same visual pattern as image gallery */}
      <div className="rounded-lg border-2 border-dashed border-border overflow-hidden transition-colors hover:border-primary/40">
        {/* Type & variant selector bar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 via-muted/40 to-muted/30 border-b border-primary/20">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background/80 border border-primary/30 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              {(() => {
                const activeType = VIDEO_TYPES.find(t => t.value === uploadVideoType);
                return activeType ? <activeType.icon className="h-4 w-4" /> : <Film className="h-4 w-4" />;
              })()}
              <span>Tipo:</span>
            </div>
            <Select value={uploadVideoType} onValueChange={setUploadVideoType}>
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
              <Select value={uploadVariant} onValueChange={setUploadVariant}>
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

        {/* Drop zone */}
        <div
          className={cn(
            'p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer',
            isDragOver ? 'bg-primary/10' : 'bg-background/50',
            isUploading && 'opacity-60 pointer-events-none'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/mpeg,video/ogg"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                Enviando {uploadCount} vídeo(s)...
              </span>
            </>
          ) : (
            <>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                isDragOver ? "bg-primary/20" : "bg-muted/40"
              )}>
                {isDragOver ? (
                  <FileVideo className="h-6 w-6 text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isDragOver ? 'Solte os vídeos aqui' : 'Arraste vídeos ou clique para selecionar'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  MP4, WebM, MOV • Máx. 100MB por arquivo
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Selecionar vídeos
              </Button>
            </>
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
                {previewVideo.url_stream || previewVideo.url_original ? (
                  <video
                    src={previewVideo.url_stream || previewVideo.url_original || ''}
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
                {(videoLinksMap.get(previewVideo.id) || []).map(link => (
                  <Badge key={link.id} variant="outline" className="text-[10px] flex items-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: link.variant_color_hex || '#999' }}
                    />
                    {link.variant_name}
                  </Badge>
                ))}
                {previewVideo.file_size_bytes && previewVideo.file_size_bytes > 0 && (
                  <span>{formatBytes(previewVideo.file_size_bytes)}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
