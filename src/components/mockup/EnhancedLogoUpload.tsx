import { useCallback, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, Image as ImageIcon, X, FileImage, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface EnhancedLogoUploadProps {
  logoPreview: string | null;
  onLogoChange: (logo: string | null) => void;
  areaName?: string;
  className?: string;
  disabled?: boolean;
}

export function EnhancedLogoUpload({
  logoPreview,
  onLogoChange,
  areaName = "Logo",
  className,
  disabled = false,
}: EnhancedLogoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida (PNG, JPG, SVG)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onLogoChange(result);
      setIsLoading(false);
      toast.success(`${areaName} carregado com sucesso!`);
    };
    reader.onerror = () => {
      toast.error("Erro ao processar a imagem");
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  }, [onLogoChange, areaName]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [disabled, processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset input value so same file can be selected again
      e.target.value = "";
    },
    [processFile]
  );

  const handleRemove = useCallback(() => {
    onLogoChange(null);
    toast.info("Logo removido");
  }, [onLogoChange]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div
          className={cn(
            "relative transition-all duration-200",
            logoPreview ? "min-h-[200px]" : "min-h-[220px]"
          )}
        >
          {/* Hidden input with aria-label */}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
            aria-label={`Upload de ${areaName}`}
          />

          {logoPreview ? (
            /* Preview State */
            <div className="relative group h-full">
              <div className="aspect-video bg-[repeating-conic-gradient(#e5e7eb_0_90deg,transparent_90deg_180deg)] bg-[length:16px_16px] flex items-center justify-center p-4">
                <img
                  src={logoPreview}
                  alt={`Preview ${areaName}`}
                  className="max-h-[180px] max-w-full object-contain drop-shadow-lg animate-scale-in"
                />
              </div>
              
              {/* Success Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-success/90 text-success-foreground rounded-full text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Carregado
              </div>

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleClick}
                  disabled={disabled}
                  aria-label={`Trocar ${areaName}`}
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  Trocar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={disabled}
                  aria-label={`Remover ${areaName}`}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            /* Upload State */
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`Área de upload para ${areaName}. Arraste um arquivo ou pressione Enter para selecionar.`}
              className={cn(
                "h-full min-h-[220px] flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-6",
                "border-2 border-dashed rounded-lg m-3",
                isDragOver
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                disabled && "opacity-50 cursor-not-allowed",
                isLoading && "pointer-events-none"
              )}
              onClick={handleClick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isLoading ? (
                <div className="text-center animate-pulse">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileImage className="h-8 w-8 text-primary animate-bounce" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Processando...</p>
                </div>
              ) : (
                <>
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-200",
                      isDragOver
                        ? "bg-primary/20 scale-110"
                        : "bg-muted"
                    )}
                  >
                    <Upload
                      className={cn(
                        "h-8 w-8 transition-colors",
                        isDragOver ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>

                  {/* Text */}
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {isDragOver ? "Solte a imagem aqui" : `Arraste o ${areaName} ou clique`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, SVG ou WebP • até 10MB
                    </p>
                  </div>

                  {/* Supported formats */}
                  <div className="flex items-center gap-2 mt-4">
                    {["PNG", "JPG", "SVG"].map((format) => (
                      <span
                        key={format}
                        className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
