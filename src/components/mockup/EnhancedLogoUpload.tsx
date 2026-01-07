import { useCallback, useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, Image as ImageIcon, X, FileImage, CheckCircle2, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface EnhancedLogoUploadProps {
  logoPreview: string | null;
  onLogoChange: (logo: string | null) => void;
  areaName?: string;
  className?: string;
  disabled?: boolean;
  showTips?: boolean;
}

export function EnhancedLogoUpload({
  logoPreview,
  onLogoChange,
  areaName = "Logo",
  className,
  disabled = false,
  showTips = true,
}: EnhancedLogoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset success state after animation
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  const processFile = useCallback((file: File) => {
    setError(null);
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError("Formato inválido. Use PNG, JPG, SVG ou WebP");
      toast.error("Por favor, selecione uma imagem válida (PNG, JPG, SVG, WebP)");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 10MB");
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    setIsLoading(true);
    setLoadProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 50);

    const reader = new FileReader();
    reader.onload = (e) => {
      clearInterval(progressInterval);
      setLoadProgress(100);
      
      setTimeout(() => {
        const result = e.target?.result as string;
        onLogoChange(result);
        setIsLoading(false);
        setUploadSuccess(true);
        setLoadProgress(0);
        toast.success(`${areaName} carregado com sucesso!`, {
          icon: <Sparkles className="h-4 w-4 text-primary" />,
        });
      }, 200);
    };
    reader.onerror = () => {
      clearInterval(progressInterval);
      setError("Erro ao processar a imagem. Tente novamente.");
      toast.error("Erro ao processar a imagem");
      setIsLoading(false);
      setLoadProgress(0);
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
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

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
    setError(null);
    toast.info("Logo removido");
  }, [onLogoChange]);

  const handleClick = useCallback(() => {
    if (!disabled && !isLoading) {
      inputRef.current?.click();
    }
  }, [disabled, isLoading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isLoading) {
      e.preventDefault();
      handleClick();
    }
  }, [disabled, isLoading, handleClick]);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled || isLoading) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            toast.info("Imagem colada da área de transferência");
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [disabled, isLoading, processFile]);

  return (
    <Card className={cn("overflow-hidden transition-shadow duration-200", uploadSuccess && "shadow-glow-success", className)}>
      <CardContent className="p-0">
        <div
          className={cn(
            "relative transition-all duration-300",
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
            disabled={disabled || isLoading}
            aria-label={`Upload de ${areaName}`}
          />

          {logoPreview ? (
            /* Preview State */
            <div className="relative group h-full">
              {/* Checkered background for transparency */}
              <div className="aspect-video bg-[repeating-conic-gradient(hsl(var(--muted))_0_90deg,transparent_90deg_180deg)] bg-[length:16px_16px] flex items-center justify-center p-4 relative overflow-hidden">
                <img
                  src={logoPreview}
                  alt={`Preview ${areaName}`}
                  className={cn(
                    "max-h-[180px] max-w-full object-contain drop-shadow-lg",
                    "transition-all duration-300",
                    uploadSuccess ? "animate-bounce-in" : "animate-scale-in"
                  )}
                />
                
                {/* Success ripple effect */}
                {uploadSuccess && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 rounded-full bg-success/20 animate-pulse-ring" />
                  </div>
                )}
              </div>
              
              {/* Success Badge */}
              <div className={cn(
                "absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300",
                uploadSuccess 
                  ? "bg-success text-success-foreground scale-110" 
                  : "bg-success/90 text-success-foreground"
              )}>
                <CheckCircle2 className={cn("h-3 w-3", uploadSuccess && "animate-bounce")} />
                {uploadSuccess ? "Sucesso!" : "Carregado"}
              </div>

              {/* File size indicator */}
              {showTips && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-[10px] text-muted-foreground">
                  Ctrl+V para colar novo
                </div>
              )}

              {/* Actions Overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent",
                "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                "transition-opacity duration-200 flex items-end justify-center gap-2 p-4"
              )}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleClick}
                  disabled={disabled || isLoading}
                  aria-label={`Trocar ${areaName}`}
                  className="shadow-md"
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  Trocar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={disabled || isLoading}
                  aria-label={`Remover ${areaName}`}
                  className="shadow-md"
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
              aria-disabled={disabled || isLoading}
              className={cn(
                "h-full min-h-[220px] flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-6",
                "border-2 border-dashed rounded-xl m-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isDragOver
                  ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
                  : error
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5",
                disabled && "opacity-50 cursor-not-allowed",
                isLoading && "pointer-events-none"
              )}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isLoading ? (
                <div className="text-center space-y-4 w-full max-w-[200px]">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center relative">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse-ring" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Processando...</p>
                    <Progress value={loadProgress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{loadProgress}%</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-sm font-medium text-destructive mb-1">{error}</p>
                  <p className="text-xs text-muted-foreground">Clique para tentar novamente</p>
                </div>
              ) : (
                <>
                  {/* Icon with animation */}
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 relative",
                      isDragOver
                        ? "bg-primary/20 scale-110"
                        : "bg-muted group-hover:bg-primary/10"
                    )}
                  >
                    {isDragOver ? (
                      <Sparkles className="h-8 w-8 text-primary animate-bounce" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
                    )}
                    
                    {/* Pulse ring on hover */}
                    <div className={cn(
                      "absolute inset-0 rounded-full border-2 border-primary/30 opacity-0 transition-opacity",
                      isDragOver && "opacity-100 animate-pulse-ring"
                    )} />
                  </div>

                  {/* Text */}
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {isDragOver ? (
                        <span className="text-primary">Solte a imagem aqui!</span>
                      ) : (
                        `Arraste o ${areaName} ou clique`
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, SVG ou WebP • até 10MB
                    </p>
                    {showTips && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Dica: Use Ctrl+V para colar da área de transferência
                      </p>
                    )}
                  </div>

                  {/* Supported formats */}
                  <div className="flex items-center gap-1.5 mt-4">
                    {["PNG", "JPG", "SVG", "WebP"].map((format, i) => (
                      <span
                        key={format}
                        className={cn(
                          "px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded transition-all duration-200",
                          isDragOver && "bg-primary/10 text-primary"
                        )}
                        style={{ animationDelay: `${i * 50}ms` }}
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
