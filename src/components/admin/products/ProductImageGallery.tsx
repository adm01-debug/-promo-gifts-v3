/**
 * ProductImageGallery — Galeria avançada com:
 * - Agrupamento por variação de cor (supplier_code/variant_id)
 * - Filtros por tipo de imagem (main, gallery, detail, box, component, mockup, video)
 * - Drag & drop para reordenar
 * - Edição inline de metadados (alt_text, image_type, caption)
 * - Multi-upload com drop zone
 * - Preview fullscreen
 * - Estatísticas por tipo e variação
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Upload,
  X,
  Star,
  GripVertical,
  Loader2,
  ImageIcon,
  ZoomIn,
  Save,
  Type,
  Film,
  Package,
  Eye,
  Layers,
  Filter,
  Palette,
  AlertCircle,
  CheckCircle2,
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

// ── Types ──

interface ExternalImage {
  id: string;
  product_id: string;
  url_cdn?: string;
  url_original?: string;
  url?: string;
  alt_text?: string;
  title_text?: string;
  image_type?: string;
  is_primary?: boolean;
  is_og_image?: boolean;
  display_order?: number;
  caption?: string;
  format?: string;
  width_px?: number;
  height_px?: number;
  file_size_bytes?: number;
  color_id?: string;
  variant_id?: string;
  supplier_code?: string;
  is_active?: boolean;
  applies_to_color?: boolean;
}

const IMAGE_TYPES = [
  { value: 'main', label: 'Principal', icon: Star, color: 'text-amber-500' },
  { value: 'gallery', label: 'Galeria', icon: ImageIcon, color: 'text-blue-500' },
  { value: 'detail', label: 'Detalhe', icon: ZoomIn, color: 'text-emerald-500' },
  { value: 'component', label: 'Componente', icon: Layers, color: 'text-violet-500' },
  { value: 'box', label: 'Embalagem', icon: Package, color: 'text-orange-500' },
  { value: 'mockup', label: 'Mockup', icon: Eye, color: 'text-pink-500' },
  { value: 'video', label: 'Vídeo', icon: Film, color: 'text-red-500' },
  { value: 'set', label: 'Conjunto', icon: Layers, color: 'text-teal-500' },
  { value: 'logo', label: 'Logo', icon: Type, color: 'text-indigo-500' },
];

type FilterMode = 'all' | 'general' | 'by-variant' | string; // string = specific image_type

interface ProductImageGalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  productId?: string;
}

// ── ImageMetaEditor ──

function ImageMetaEditor({
  image,
  onSave,
  onCancel,
}: {
  image: ExternalImage;
  onSave: (data: { alt_text: string; image_type: string; caption: string }) => void;
  onCancel: () => void;
}) {
  const [altText, setAltText] = useState(image.alt_text || '');
  const [imageType, setImageType] = useState(image.image_type || 'main');
  const [caption, setCaption] = useState(image.caption || '');

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm p-2 flex flex-col gap-1.5 z-10 rounded-lg">
      <Input
        value={altText}
        onChange={(e) => setAltText(e.target.value)}
        placeholder="Alt text (SEO)"
        className="h-6 text-[10px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
      />
      <Select value={imageType} onValueChange={setImageType}>
        <SelectTrigger className="h-6 text-[10px] bg-white/10 border-white/20 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IMAGE_TYPES.map(t => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              <span className="flex items-center gap-1.5">
                <t.icon className={cn("h-3 w-3", t.color)} />
                {t.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Legenda"
        className="h-6 text-[10px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
      />
      <div className="flex gap-1 mt-auto">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-white hover:bg-white/20"
          onClick={() => onSave({ alt_text: altText, image_type: imageType, caption })}
        >
          <Save className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-white hover:bg-white/20"
          onClick={onCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ── VariantColorDot ──

function VariantColorDot({ code, name }: { code: string; name?: string }) {
  // Simple hash to generate a color from the code
  const hash = code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="w-4 h-4 rounded-full border border-border/60 shrink-0"
          style={{ backgroundColor: `hsl(${hue}, 60%, 55%)` }}
        />
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        {name || `Variação ${code}`}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Main component ──

export function ProductImageGallery({
  images,
  onChange,
  folder = 'products',
  productId,
}: ProductImageGalleryProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  // Upload context state
  const [uploadVariant, setUploadVariant] = useState<string>('none');
  const [uploadImageType, setUploadImageType] = useState<string>('gallery');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch external images
  const { data: externalImages = [], isLoading: isLoadingExt } = useQuery<ExternalImage[]>({
    queryKey: ['product-images-ext', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_images',
          operation: 'select',
          filters: { product_id: productId },
          limit: 200,
          orderBy: { column: 'display_order', ascending: true },
        },
      });
      if (error) return [];
      return data?.data?.records || [];
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch variants for color names
  const { data: variants = [] } = useQuery<{ id: string; color_name: string | null; color_hex: string | null; supplier_code?: string; name: string }[]>({
    queryKey: ['product-variants-for-gallery', productId],
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
      return records.map((r: any) => ({ ...r, supplier_code: r.color_code }));
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  // URL → ExternalImage map
  const extImageMap = useMemo(() => {
    const map = new Map<string, ExternalImage>();
    externalImages.forEach(img => {
      const url = img.url_cdn || img.url_original || img.url || '';
      if (url) map.set(url, img);
    });
    return map;
  }, [externalImages]);

  // Statistics
  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    const byVariant = new Map<string, number>();
    let withAlt = 0;
    let withoutVariant = 0;

    externalImages.forEach(img => {
      const type = img.image_type || 'untyped';
      byType.set(type, (byType.get(type) || 0) + 1);

      const varKey = img.supplier_code || img.variant_id;
      if (varKey) {
        byVariant.set(varKey, (byVariant.get(varKey) || 0) + 1);
      } else {
        withoutVariant++;
      }

      if (img.alt_text) withAlt++;
    });

    return { byType, byVariant, withAlt, withoutVariant, total: externalImages.length };
  }, [externalImages]);

  // Variant lookup map
  const variantMap = useMemo(() => {
    const map = new Map<string, typeof variants[0]>();
    variants.forEach(v => {
      if (v.id) map.set(v.id, v);
      if (v.supplier_code) map.set(v.supplier_code, v);
    });
    return map;
  }, [variants]);

  // Filtered images
  const filteredImages = useMemo(() => {
    let filtered = [...images];

    // Build ext lookup for filtering
    if (typeFilter !== 'all' || filterMode !== 'all') {
      filtered = filtered.filter(url => {
        const ext = extImageMap.get(url);
        if (!ext) return filterMode === 'all' && typeFilter === 'all';

        // Type filter
        if (typeFilter !== 'all') {
          if ((ext.image_type || 'untyped') !== typeFilter) return false;
        }

        // Mode filter
        if (filterMode === 'general') {
          return !ext.supplier_code && !ext.variant_id;
        } else if (filterMode === 'by-variant') {
          return !!(ext.supplier_code || ext.variant_id);
        } else if (filterMode !== 'all') {
          // Specific variant code
          return ext.supplier_code === filterMode || ext.variant_id === filterMode;
        }

        return true;
      });
    }

    return filtered;
  }, [images, filterMode, typeFilter, extImageMap]);

  // ── Handlers ──

  const updateExternalImageMeta = useCallback(async (
    imgUrl: string,
    data: { alt_text: string; image_type: string; caption: string }
  ) => {
    const ext = extImageMap.get(imgUrl);
    if (!ext?.id) {
      toast.error('Imagem não encontrada no banco externo');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_images',
          operation: 'update',
          id: ext.id,
          data: {
            alt_text: data.alt_text.trim() || null,
            image_type: data.image_type || 'main',
            caption: data.caption.trim() || null,
          },
        },
      });
      if (error) throw new Error(error.message);
      toast.success('Metadados atualizados');
      setEditingIndex(null);
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product-images-ext', productId] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  }, [extImageMap, productId, queryClient]);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error(`"${file.name}" não é uma imagem válida`);
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`"${file.name}" excede 5MB`);
      return null;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('personalization-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) {
      toast.error(`Erro ao enviar "${file.name}"`);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from('personalization-images')
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  // Create external DB record for uploaded image
  const createExternalImageRecord = useCallback(async (url: string, variantCode: string, imageType: string) => {
    if (!productId) return;
    try {
      const variant = variantCode !== 'none' ? variantMap.get(variantCode) : null;
      const nextOrder = externalImages.length > 0
        ? Math.max(...externalImages.map(i => i.display_order || 0)) + 1
        : 0;

      await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_images',
          operation: 'insert',
          data: {
            product_id: productId,
            url_cdn: url,
            url_original: url,
            image_type: imageType,
            is_primary: imageType === 'main' && externalImages.filter(i => i.is_primary).length === 0,
            is_og_image: false,
            display_order: nextOrder,
            is_active: true,
            supplier_code: variant?.supplier_code || null,
            variant_id: variant?.id || null,
            alt_text: null,
          },
        },
      });
    } catch (err) {
      console.warn('Erro ao criar registro no BD externo:', err);
    }
  }, [productId, variantMap, externalImages]);

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadCount(files.length);
    const results = await Promise.all(files.map(uploadFile));
    const validUrls = results.filter(Boolean) as string[];
    if (validUrls.length > 0) {
      onChange([...images, ...validUrls]);
      // Create records in external DB with variant/type context
      if (productId) {
        await Promise.all(validUrls.map(url =>
          createExternalImageRecord(url, uploadVariant, uploadImageType)
        ));
        queryClient.invalidateQueries({ queryKey: ['product-images-ext', productId] });
      }
      const variantLabel = uploadVariant !== 'none'
        ? variantMap.get(uploadVariant)?.color_name || variantMap.get(uploadVariant)?.name || uploadVariant
        : null;
      const typeLabel = IMAGE_TYPES.find(t => t.value === uploadImageType)?.label || uploadImageType;
      toast.success(
        `${validUrls.length} imagem(ns) enviada(s)${variantLabel ? ` → ${variantLabel}` : ''} (${typeLabel})`
      );
    }
    setIsUploading(false);
    setUploadCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (url: string) => {
    onChange(images.filter(i => i !== url));
  };

  const handleSetPrimary = (url: string) => {
    const idx = images.indexOf(url);
    if (idx <= 0) return;
    const newImages = [...images];
    const [moved] = newImages.splice(idx, 1);
    newImages.unshift(moved);
    onChange(newImages);
    toast.success('Imagem principal definida');
  };

  // Drag & drop
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setDragOverIndex(null); return; }
    const newImages = [...images];
    const [moved] = newImages.splice(dragIndex, 1);
    newImages.splice(dropIndex, 0, moved);
    onChange(newImages);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const handleDropZone = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadCount(files.length);
    const results = await Promise.all(files.map(uploadFile));
    const validUrls = results.filter(Boolean) as string[];
    if (validUrls.length > 0) {
      onChange([...images, ...validUrls]);
      if (productId) {
        await Promise.all(validUrls.map(url =>
          createExternalImageRecord(url, uploadVariant, uploadImageType)
        ));
        queryClient.invalidateQueries({ queryKey: ['product-images-ext', productId] });
      }
      toast.success(`${validUrls.length} imagem(ns) enviada(s)!`);
    }
    setIsUploading(false);
    setUploadCount(0);
  }, [images, onChange, productId, uploadVariant, uploadImageType, createExternalImageRecord, queryClient]);

  // ── Active type filters ──
  const activeTypes = useMemo(() => {
    const types = new Set<string>();
    externalImages.forEach(img => types.add(img.image_type || 'untyped'));
    return types;
  }, [externalImages]);

  const hasVariants = stats.byVariant.size > 0;

  return (
    <div className="space-y-3">
      {/* ── Filter bar ── */}
      {externalImages.length > 0 && (
        <div className="space-y-2">
          {/* View mode + type filter row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View mode pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/40">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                  filterMode === 'all'
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('general')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                  filterMode === 'general'
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Gerais ({stats.withoutVariant})
              </button>
              {hasVariants && (
                <button
                  type="button"
                  onClick={() => setFilterMode('by-variant')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1",
                    filterMode === 'by-variant'
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Palette className="h-3 w-3" />
                  Por Cor ({stats.byVariant.size})
                </button>
              )}
            </div>

            {/* Separator */}
            <div className="h-5 w-px bg-border/50" />

            {/* Type filter chips */}
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="h-3 w-3 text-muted-foreground/60 mr-0.5" />
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border",
                  typeFilter === 'all'
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Todos tipos
              </button>
              {IMAGE_TYPES.filter(t => activeTypes.has(t.value)).map(t => {
                const count = stats.byType.get(t.value) || 0;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTypeFilter(typeFilter === t.value ? 'all' : t.value)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border flex items-center gap-1",
                      typeFilter === t.value
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <t.icon className={cn("h-2.5 w-2.5", t.color)} />
                    {t.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variant filter row (when "Por Cor" is active) */}
          {filterMode === 'by-variant' && hasVariants && (
            <div className="flex flex-wrap gap-1.5 pl-1">
              {Array.from(stats.byVariant.entries()).map(([code, count]) => {
                const variant = variantMap.get(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setFilterMode(filterMode === code ? 'by-variant' : code)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all",
                      filterMode === code
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    {variant?.color_hex ? (
                      <div
                        className="w-3 h-3 rounded-full border border-border/60"
                        style={{ backgroundColor: variant.color_hex }}
                      />
                    ) : (
                      <Palette className="h-3 w-3" />
                    )}
                    <span>{variant?.color_name || variant?.name || code}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Image grid ── */}
      {filteredImages.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {filteredImages.map((img, index) => {
            const ext = extImageMap.get(img);
            const typeInfo = ext?.image_type ? IMAGE_TYPES.find(t => t.value === ext.image_type) : null;
            const isFirst = images.indexOf(img) === 0;
            const variantCode = ext?.supplier_code || ext?.variant_id;
            const variant = variantCode ? variantMap.get(variantCode) : null;
            const isVideo = ext?.image_type === 'video';
            const globalIndex = images.indexOf(img);

            return (
              <div
                key={`${img}-${index}`}
                draggable
                onDragStart={() => handleDragStart(globalIndex)}
                onDragOver={(e) => handleDragOver(e, globalIndex)}
                onDrop={(e) => handleDrop(e, globalIndex)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'relative group rounded-lg border-2 overflow-hidden aspect-square transition-all',
                  isFirst ? 'border-primary ring-1 ring-primary/30' : 'border-border/60',
                  dragIndex === globalIndex && 'opacity-50 scale-95',
                  dragOverIndex === globalIndex && dragIndex !== globalIndex && 'border-primary border-dashed',
                )}
              >
                {isVideo ? (
                  <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                    <Film className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                ) : (
                  <img
                    src={img}
                    alt={ext?.alt_text || `Imagem ${index + 1}`}
                    className="w-full h-full object-contain bg-muted/30"
                    loading="lazy"
                  />
                )}

                {/* Badges top-left stack */}
                <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                  {isFirst && (
                    <Badge className="text-[9px] px-1 py-0 bg-primary text-primary-foreground leading-tight">
                      Principal
                    </Badge>
                  )}
                  {typeInfo && !isFirst && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 leading-tight flex items-center gap-0.5">
                      <typeInfo.icon className={cn("h-2 w-2", typeInfo.color)} />
                      {typeInfo.label}
                    </Badge>
                  )}
                  {variant && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight bg-background/80 backdrop-blur-sm flex items-center gap-0.5">
                      {variant.color_hex && (
                        <div
                          className="w-2 h-2 rounded-full border border-border/40"
                          style={{ backgroundColor: variant.color_hex }}
                        />
                      )}
                      {variant.color_name || variant.name}
                    </Badge>
                  )}
                </div>

                {/* Top-right badges */}
                <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                  {ext?.is_og_image && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 leading-tight">
                      OG
                    </Badge>
                  )}
                  {ext?.alt_text && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 flex items-center justify-center">
                          <CheckCircle2 className="h-2 w-2 text-white" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="text-[10px] max-w-[180px]">
                        Alt: {ext.alt_text}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Inline metadata editor */}
                {editingIndex === globalIndex && ext && (
                  <ImageMetaEditor
                    image={ext}
                    onSave={(data) => updateExternalImageMeta(img, data)}
                    onCancel={() => setEditingIndex(null)}
                  />
                )}

                {/* Hover overlay */}
                {editingIndex !== globalIndex && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <GripVertical className="absolute top-1 left-1 h-4 w-4 text-white/70 cursor-grab" />

                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setPreviewUrl(img)}>
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>

                    {ext && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setEditingIndex(globalIndex)} title="Editar metadados">
                        <Type className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {!isFirst && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:bg-white/20" onClick={() => handleSetPrimary(img)} title="Definir como principal">
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-white/20" onClick={() => handleRemove(img)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty filtered state */}
      {filteredImages.length === 0 && images.length > 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Filter className="h-5 w-5 mx-auto mb-2 opacity-40" />
          Nenhuma imagem corresponde ao filtro selecionado
        </div>
      )}

      {/* ── Stats bar ── */}
      {externalImages.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground px-1 py-1.5 rounded-lg bg-muted/20 border border-border/30">
          <span className="font-medium text-foreground/70">
            {stats.total} no BD externo
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {stats.withAlt} com alt text
          </span>
          {stats.withoutVariant > 0 && (
            <span>{stats.withoutVariant} gerais (sem cor)</span>
          )}
          {Array.from(stats.byType.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const info = IMAGE_TYPES.find(t => t.value === type);
              return (
                <span key={type} className="flex items-center gap-1">
                  {info && <info.icon className={cn("h-2.5 w-2.5", info.color)} />}
                  {info?.label || type}: {count}
                </span>
              );
            })}
        </div>
      )}

      {/* ── Upload area ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={handleDropZone}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer hover:border-primary/50 hover:bg-primary/5',
          isUploading ? 'border-primary bg-primary/5' : 'border-border',
        )}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Enviando {uploadCount} imagem(ns)...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span>Arraste imagens aqui ou clique para enviar</span>
            </div>
            <p className="text-xs text-muted-foreground/70">
              PNG, JPG até 5MB • Múltiplas imagens permitidas
            </p>
          </div>
        )}
      </div>

      {/* ── Fullscreen preview ── */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && (
            <div className="space-y-2">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-[80vh] object-contain rounded"
              />
              {extImageMap.get(previewUrl) && (
                <div className="flex flex-wrap gap-2 px-2 pb-1 text-[11px] text-muted-foreground">
                  {(() => {
                    const ext = extImageMap.get(previewUrl)!;
                    const typeInfo = ext.image_type ? IMAGE_TYPES.find(t => t.value === ext.image_type) : null;
                    const variant = (ext.supplier_code || ext.variant_id) ? variantMap.get(ext.supplier_code || ext.variant_id || '') : null;
                    return (
                      <>
                        {typeInfo && (
                          <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                            <typeInfo.icon className={cn("h-3 w-3", typeInfo.color)} />
                            {typeInfo.label}
                          </Badge>
                        )}
                        {variant && (
                          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                            {variant.color_hex && (
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: variant.color_hex }} />
                            )}
                            {variant.color_name || variant.name}
                          </Badge>
                        )}
                        {ext.alt_text && <span>Alt: {ext.alt_text}</span>}
                        {ext.caption && <span>• {ext.caption}</span>}
                        {ext.width_px && ext.height_px && <span>• {ext.width_px}×{ext.height_px}px</span>}
                        {ext.file_size_bytes && <span>• {(ext.file_size_bytes / 1024).toFixed(0)}KB</span>}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
