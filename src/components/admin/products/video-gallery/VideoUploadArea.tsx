import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Upload, Loader2, Plus, FileVideo, Film, Palette, Youtube } from 'lucide-react';
import type { VideoVariant } from './types';
import { VIDEO_TYPES } from './types';

interface Props {
  productId?: string;
  variants: VideoVariant[];
  uploadVideoType: string;
  setUploadVideoType: (v: string) => void;
  uploadVariant: string;
  setUploadVariant: (v: string) => void;
  isUploading: boolean;
  uploadCount: number;
  uploadProgress: number;
  isDragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOverZone: (e: React.DragEvent) => void;
  handleDragLeaveZone: (e: React.DragEvent) => void;
  handleDropZone: (e: React.DragEvent) => void;
  youtubeUrl: string;
  setYoutubeUrl: (v: string) => void;
  addYoutubeVideo: () => void;
  isAddingYoutube: boolean;
}

export function VideoUploadArea({
  productId, variants, uploadVideoType, setUploadVideoType,
  uploadVariant, setUploadVariant, isUploading, uploadCount, uploadProgress,
  isDragOver, fileInputRef, handleFileSelect,
  handleDragOverZone, handleDragLeaveZone, handleDropZone,
  youtubeUrl, setYoutubeUrl, addYoutubeVideo, isAddingYoutube,
}: Props) {
  return (
    <div className={cn(
      "rounded-lg border-2 border-dashed overflow-hidden transition-colors",
      isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
    )}>
      {/* Type & variant selector */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/10 via-muted/40 to-muted/30 border-b border-primary/20">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background/80 border border-primary/30 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            {(() => { const a = VIDEO_TYPES.find(t => t.value === uploadVideoType); return a ? <a.icon className="h-4 w-4" /> : <Film className="h-4 w-4" />; })()}
            <span>Tipo:</span>
          </div>
          <Select value={uploadVideoType} onValueChange={setUploadVideoType}>
            <SelectTrigger className="h-8 w-[140px] text-xs font-medium bg-primary/5 border-primary/20 text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VIDEO_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  <span className="flex items-center gap-1.5"><t.icon className="h-3.5 w-3.5 text-muted-foreground" />{t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {variants.length > 0 && (
          <>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Palette className="h-3 w-3" /><span className="font-medium">Vincular a:</span>
            </div>
            <Select value={uploadVariant} onValueChange={setUploadVariant}>
              <SelectTrigger className="h-8 w-[160px] text-[11px] bg-background/80"><SelectValue placeholder="Sem variação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">Sem variação</SelectItem>
                {variants.map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full border border-border/60 shrink-0" style={{ backgroundColor: v.color_hex || '#999' }} />
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
        onDragOver={handleDragOverZone}
        onDragLeave={handleDragLeaveZone}
        onDrop={handleDropZone}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/mpeg,video/ogg" multiple className="hidden" onChange={handleFileSelect} />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Enviando {uploadProgress}/{uploadCount} vídeo(s)...</span>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadCount > 0 ? (uploadProgress / uploadCount) * 100 : 0}%` }} />
            </div>
          </div>
        ) : (
          <>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", isDragOver ? "bg-primary/20" : "bg-muted/40")}>
              {isDragOver ? <FileVideo className="h-6 w-6 text-primary" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isDragOver ? 'Solte os vídeos aqui' : 'Arraste vídeos ou clique para selecionar'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">MP4, WebM, MOV • Máx. 100MB por arquivo</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Selecionar vídeos
            </Button>
          </>
        )}
      </div>

      {/* YouTube URL input */}
      {productId && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/30 bg-muted/10" onClick={(e) => e.stopPropagation()}>
          <Youtube className="h-4 w-4 text-red-500 shrink-0" />
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Cole uma URL do YouTube..."
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addYoutubeVideo()}
          />
          <Button
            type="button"
            size="sm"
            className="h-7 text-[11px]"
            disabled={!youtubeUrl.trim() || isAddingYoutube}
            onClick={addYoutubeVideo}
          >
            {isAddingYoutube ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Adicionar'}
          </Button>
        </div>
      )}
    </div>
  );
}
