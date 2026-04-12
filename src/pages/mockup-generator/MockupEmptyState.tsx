/**
 * Empty state for MockupGenerator when no product is selected
 */
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";

export function MockupEmptyState() {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center justify-center py-16">
        <div className="text-center text-muted-foreground max-w-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-primary/50" />
          </div>
          <p className="font-medium text-foreground mb-1">Selecione um produto</p>
          <p className="text-sm mb-3">
            Comece escolhendo uma empresa e produto no painel ao lado para posicionar o logo
          </p>
          <div className="flex flex-col gap-1.5 text-xs text-left mx-auto max-w-[200px]">
            {["Selecione a empresa", "Escolha o produto", "Defina a técnica", "Faça upload do logo"].map((label, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
