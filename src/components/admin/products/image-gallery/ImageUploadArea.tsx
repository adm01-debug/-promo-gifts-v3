import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Upload, Loader2, ImageIcon, Filter, Palette } from 'lucide-react';
import type { VariantInfo } from './types';
import { IMAGE_TYPES } from './types';

interface Props {
  productId?: string;
  variants: VariantInfo[];
  variantMap: Map<string, VariantInfo>;
  uploadVariant: string;
  setUploadVariant: (v: string) => void;
  uploadImageType: string;
  setUploadImageType: (v: string) => void;
  isUploading: boolean;
  uploadCount: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDropZone: (e: React.DragEvent) => void;
}

export function ImageUploadArea({
  productId, variants, variantMap, uploadVariant, setUploadVariant,
  uploadImageType, setUploadImageType, isUploading, uploadCount,
  fileInputRef, handleFilesChange, handleDropZone,
}: Props) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border overflow-hidden transition-colors hover:border-primary/40">
      {/* Upload context selectors */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 via-muted/40 to-muted/30 border-b border-primary/20">
        {productId && variants.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Palette className="h-3 w-3" /><span className="font-medium">Vincular a:</span>
            </div>
            <Select value={uploadVariant} onValueChange={setUploadVariant}>
              <SelectTrigger className="h-7 w-[180px] text-[11px] bg-background/80"><SelectValue placeholder="Sem variação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  <span className="flex items-center gap-1.5"><ImageIcon className="h-3 w-3 text-muted-foreground" />Imagem geral (sem cor)</span>
                </SelectItem>
                {variants.map(v => (
                  <SelectItem key={v.id} value={v.supplier_code || v.id} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      {v.color_hex ? <div className="w-3 h-3 rounded-full border border-border/60" style={{ backgroundColor: v.color_hex }} /> : <Palette className="h-3 w-3 text-muted-foreground" />}
                      {v.color_name || v.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="h-4 w-px bg-border/50" />
          </>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background/80 border border-primary/30 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            {(() => { const a = IMAGE_TYPES.find(t => t.value === uploadImageType); return a ? <a.icon className={cn("h-4 w-4", a.color)} /> : <Filter className="h-4 w-4" />; })()}
            <span>Tipo:</span>
          </div>
          <Select value={uploadImageType} onValueChange={setUploadImageType}>
            <SelectTrigger className="h-8 w-[160px] text-xs font-medium bg-primary/5 border-primary/20 text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              {IMAGE_TYPES.filter(t => t.value !== 'video').map(t => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  <span className="flex items-center gap-1.5"><t.icon className={cn("h-3.5 w-3.5", t.color)} />{t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(uploadVariant !== 'none' || uploadImageType !== 'gallery') && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/5 border-primary/20 text-primary">
            {uploadVariant !== 'none' && (
              <span className="flex items-center gap-1">
                {(() => { const v = variantMap.get(uploadVariant); return v?.color_hex ? <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color_hex }} /> : null; })()}
                {variantMap.get(uploadVariant)?.color_name || variantMap.get(uploadVariant)?.name}
              </span>
            )}
            {uploadVariant !== 'none' && uploadImageType !== 'gallery' && ' • '}
            {uploadImageType !== 'gallery' && IMAGE_TYPES.find(t => t.value === uploadImageType)?.label}
          </Badge>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropZone}
        className={cn('p-4 text-center transition-colors cursor-pointer hover:bg-primary/5', isUploading && 'bg-primary/5')}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesChange} className="hidden" />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Enviando {uploadCount} imagem(ns)...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Upload className="h-4 w-4" /><span>Arraste imagens aqui ou clique para enviar</span></div>
            <p className="text-xs text-muted-foreground/70">
              PNG, JPG até 5MB • Múltiplas imagens permitidas
              {uploadVariant !== 'none' && <span className="text-primary/70"> • Vinculado à variação selecionada</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
