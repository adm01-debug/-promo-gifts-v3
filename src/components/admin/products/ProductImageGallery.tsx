/**
 * ProductImageGallery — Galeria avançada com drag & drop, imagem principal, multi-upload e previews
 * Sincroniza com BD externo (product_images) + campos: image_type, alt_text, vinculação a cor/variante
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Pencil,
  Save,
  Type,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

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
  applies_to_color?: boolean;
}

const IMAGE_TYPES = [
  { value: 'main', label: 'Principal' },
  { value: 'gallery', label: 'Galeria' },
  { value: 'detail', label: 'Detalhe' },
  { value: 'component', label: 'Componente' },
  { value: 'box', label: 'Embalagem' },
  { value: 'mockup', label: 'Mockup' },
];

interface ProductImageGalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  productId?: string;
}

// Inline editor for image metadata
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
    <div className="absolute inset-0 bg-black/80 p-2 flex flex-col gap-1.5 z-10 rounded-lg">
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
            <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch external images if productId is provided
  const { data: externalImages = [] } = useQuery<ExternalImage[]>({
    queryKey: ['product-images-ext', productId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_images',
          operation: 'select',
          filters: { product_id: productId },
          limit: 100,
          orderBy: { column: 'display_order', ascending: true },
        },
      });
      if (error) return [];
      return data?.data?.records || [];
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  // Build a map from URL to external image record for metadata access
  const extImageMap = new Map<string, ExternalImage>();
  externalImages.forEach(img => {
    const url = img.url_cdn || img.url_original || img.url || '';
    if (url) extImageMap.set(url, img);
  });

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
      toast.success('Metadados da imagem atualizados');
      setEditingIndex(null);
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['product-images-ext', productId] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar imagem');
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

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadCount(files.length);

    const results = await Promise.all(files.map(uploadFile));
    const validUrls = results.filter(Boolean) as string[];

    if (validUrls.length > 0) {
      onChange([...images, ...validUrls]);
      toast.success(`${validUrls.length} imagem(ns) enviada(s)!`);
    }

    setIsUploading(false);
    setUploadCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [moved] = newImages.splice(index, 1);
    newImages.unshift(moved);
    onChange(newImages);
    toast.success('Imagem principal definida');
  };

  // Drag & drop reorder
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [moved] = newImages.splice(dragIndex, 1);
    newImages.splice(dropIndex, 0, moved);
    onChange(newImages);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Drop zone for new images
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
      toast.success(`${validUrls.length} imagem(ns) enviada(s)!`);
    }

    setIsUploading(false);
    setUploadCount(0);
  }, [images, onChange]);

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {images.map((img, index) => {
            const ext = extImageMap.get(img);
            const typeLabel = ext?.image_type ? IMAGE_TYPES.find(t => t.value === ext.image_type)?.label : null;

            return (
              <div
                key={`${img}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'relative group rounded-lg border-2 overflow-hidden aspect-square transition-all',
                  index === 0 ? 'border-primary ring-1 ring-primary/30' : 'border-border',
                  dragIndex === index && 'opacity-50 scale-95',
                  dragOverIndex === index && dragIndex !== index && 'border-primary border-dashed',
                )}
              >
                <img
                  src={img}
                  alt={ext?.alt_text || `Imagem ${index + 1}`}
                  className="w-full h-full object-contain bg-muted/30"
                />

                {/* Primary badge */}
                {index === 0 && (
                  <Badge className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-primary text-primary-foreground">
                    Principal
                  </Badge>
                )}

                {/* Type badge */}
                {typeLabel && index !== 0 && (
                  <Badge variant="secondary" className="absolute top-1 left-1 text-[9px] px-1 py-0">
                    {typeLabel}
                  </Badge>
                )}

                {/* OG badge */}
                {ext?.is_og_image && (
                  <Badge variant="secondary" className="absolute top-1 right-1 text-[9px] px-1 py-0">
                    OG
                  </Badge>
                )}

                {/* Inline metadata editor */}
                {editingIndex === index && ext && (
                  <ImageMetaEditor
                    image={ext}
                    onSave={(data) => updateExternalImageMeta(img, data)}
                    onCancel={() => setEditingIndex(null)}
                  />
                )}

                {/* Hover overlay */}
                {editingIndex !== index && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <GripVertical className="absolute top-1 left-1 h-4 w-4 text-white/70 cursor-grab" />
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white hover:bg-white/20"
                      onClick={() => setPreviewUrl(img)}
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>

                    {/* Edit metadata button (only if external image exists) */}
                    {ext && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white hover:bg-white/20"
                        onClick={() => setEditingIndex(index)}
                        title="Editar metadados"
                      >
                        <Type className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {index !== 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-yellow-400 hover:bg-white/20"
                        onClick={() => handleSetPrimary(index)}
                        title="Definir como principal"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:bg-white/20"
                      onClick={() => handleRemove(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* External image stats */}
      {externalImages.length > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground px-1">
          <span>{externalImages.length} no BD externo</span>
          {externalImages.filter(i => i.alt_text).length > 0 && (
            <span>• {externalImages.filter(i => i.alt_text).length} com alt text</span>
          )}
          {externalImages.filter(i => i.image_type && i.image_type !== 'main').length > 0 && (
            <span>• {externalImages.filter(i => i.image_type && i.image_type !== 'main').length} tipados</span>
          )}
        </div>
      )}

      {/* Upload area */}
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

      {/* Fullscreen preview */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl p-2">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
