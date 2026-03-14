/**
 * ProductImageGallery — Galeria avançada com drag & drop, imagem principal, multi-upload e previews
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  ZoomIn,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ProductImageGalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
}

export function ProductImageGallery({
  images,
  onChange,
  folder = 'products',
}: ProductImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          {images.map((img, index) => (
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
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-contain bg-muted/30"
              />

              {/* Primary badge */}
              {index === 0 && (
                <Badge className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-primary text-primary-foreground">
                  Principal
                </Badge>
              )}

              {/* Hover overlay */}
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
            </div>
          ))}
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
