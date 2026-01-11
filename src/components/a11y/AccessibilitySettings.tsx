import { useA11y } from "./AccessibilityProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Eye, Type, Contrast, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccessibilitySettingsProps {
  className?: string;
}

/**
 * Accessibility settings panel for users to customize their experience
 * WCAG 2.2 AA compliant
 */
export function AccessibilitySettings({ className }: AccessibilitySettingsProps) {
  const { 
    highContrast, 
    setHighContrast, 
    fontSize, 
    setFontSize,
    reducedMotion,
    keyboardMode 
  } = useA11y();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", className)}
          aria-label="Configurações de acessibilidade"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Acessibilidade
          </SheetTitle>
          <SheetDescription>
            Personalize sua experiência de acordo com suas necessidades
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label 
                htmlFor="high-contrast" 
                className="flex items-center gap-2 text-base font-medium"
              >
                <Contrast className="h-4 w-4" />
                Alto Contraste
              </Label>
              <p className="text-sm text-muted-foreground">
                Aumenta o contraste entre elementos
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={setHighContrast}
              aria-describedby="high-contrast-desc"
            />
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <Label 
              htmlFor="font-size" 
              className="flex items-center gap-2 text-base font-medium"
            >
              <Type className="h-4 w-4" />
              Tamanho da Fonte
            </Label>
            <Select
              value={fontSize}
              onValueChange={(value) => setFontSize(value as "normal" | "large" | "larger")}
            >
              <SelectTrigger id="font-size" className="w-full">
                <SelectValue placeholder="Selecione o tamanho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal (16px)</SelectItem>
                <SelectItem value="large">Grande (18px)</SelectItem>
                <SelectItem value="larger">Maior (20px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Indicators */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
            <h4 className="font-medium text-sm">Status do Sistema</h4>
            
            <div className="flex items-center gap-2 text-sm">
              <div className={cn(
                "w-2 h-2 rounded-full",
                reducedMotion ? "bg-warning" : "bg-success"
              )} />
              <span>Movimento Reduzido: {reducedMotion ? "Ativo" : "Inativo"}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Keyboard className="h-4 w-4" />
              <span>Navegação: {keyboardMode ? "Teclado" : "Mouse"}</span>
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-lg border border-info/30 bg-info/10 p-4 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              💡 Dicas de Navegação
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Tab</kbd> para navegar entre elementos</li>
              <li>• Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> ou <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Espaço</kbd> para ativar</li>
              <li>• Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> para fechar diálogos</li>
              <li>• Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> para busca rápida</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
