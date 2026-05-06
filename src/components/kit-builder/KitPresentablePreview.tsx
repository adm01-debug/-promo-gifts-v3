/**
 * Kit Presentable Preview — client-facing proposal view
 * Renders the kit as a visual presentation card with narrative, items grid,
 * pricing summary and a "Generate public link" action. No quote required.
 */
import { useMemo, useState } from "react";
import { Sparkles, Link2, Copy, Check, Calendar, Package, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/kit-builder";
import { useKitShare } from "@/hooks/useKitShare";
import { useCustomKitPersistence } from "@/hooks/useCustomKitPersistence";
import { toast } from "sonner";
import type { KitState } from "@/lib/kit-builder";

interface KitPresentablePreviewProps {
  kitState: KitState;
  kitQuantity: number;
  kitName: string;
  currentKitId?: string;
}

function buildNarrative(kitState: KitState, kitName: string): string {
  const itemCount = kitState.items.length;
  const totalUnits = kitState.items.reduce((s, i) => s + i.quantity, 0);
  const personalized = Object.values(kitState.personalization.items).filter((p) => p.enabled).length
    + (kitState.personalization.box.enabled ? 1 : 0);
  const label = kitName?.trim() || "Este kit";
  const personalizationLine = personalized > 0
    ? ` Conta com ${personalized} ponto(s) de personalização para reforçar a identidade da sua marca.`
    : "";
  const boxLine = kitState.box ? ` Apresentado em ${kitState.box.name.toLowerCase()},` : "";
  return `${label} foi pensado para gerar conexão e gratidão.${boxLine} reúne ${itemCount} produto(s) selecionado(s) (${totalUnits} unidade(s) no total) que combinam utilidade, design e qualidade.${personalizationLine}`;
}

export function KitPresentablePreview({
  kitState,
  kitQuantity,
  kitName,
  currentKitId,
}: KitPresentablePreviewProps) {
  const { generateShareLink, isLoading: isSharing } = useKitShare();
  const { saveKit, isSaving } = useCustomKitPersistence();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const narrative = useMemo(() => buildNarrative(kitState, kitName), [kitState, kitName]);
  const grandTotal = kitState.totalPrice * kitQuantity;
  const validityDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("pt-BR");
  }, []);

  const handleGenerateLink = async () => {
    let kitId = currentKitId;
    if (!kitId) {
      try {
        const result = await saveKit(kitState, kitQuantity);
        if (result && "id" in result) kitId = (result as { id: string }).id;
      } catch {
        return;
      }
    }
    if (!kitId) {
      toast.error("Não foi possível salvar o kit antes de compartilhar");
      return;
    }
    const link = await generateShareLink(kitId);
    if (link) setShareUrl(link);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!kitState.box && kitState.items.length === 0) return null;

  return (
    <Card className="border-[1.5px] border-primary/20 overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              Apresentação para o cliente
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Calendar className="h-3 w-3" /> Válido até {validityDate}
          </Badge>
        </div>
        <h3 className="text-xl font-display font-bold leading-tight">
          {kitName?.trim() || "Kit Personalizado"}
        </h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{narrative}</p>
      </div>

      <CardContent className="p-6 space-y-5">
        {/* Items grid */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Composição
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {kitState.box && (
              <div className="rounded-xl border bg-card p-2 space-y-2">
                <div className="aspect-square rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden">
                  {kitState.box.imageUrl ? (
                    <img
                      src={kitState.box.imageUrl}
                      alt={kitState.box.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Badge variant="secondary" className="text-[9px] mb-1">Embalagem</Badge>
                  <p className="text-xs font-medium leading-tight line-clamp-2">{kitState.box.name}</p>
                </div>
              </div>
            )}
            {kitState.items.map((item) => (
              <div key={item.id} className="rounded-xl border bg-card p-2 space-y-2">
                <div className="aspect-square rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  {item.quantity > 1 && (
                    <Badge variant="outline" className="text-[9px] mb-1">{item.quantity}x</Badge>
                  )}
                  <p className="text-xs font-medium leading-tight line-clamp-2">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Pricing block */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quantidade</p>
            <p className="text-xl font-bold font-display">{kitQuantity}<span className="text-xs font-normal text-muted-foreground"> kits</span></p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Por kit</p>
            <p className="text-xl font-bold font-display">{formatCurrency(kitState.totalPrice)}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-3 border border-primary/20">
            <p className="text-[10px] uppercase tracking-wider text-primary">Investimento</p>
            <p className="text-xl font-bold font-display text-primary">{formatCurrency(grandTotal)}</p>
          </div>
        </div>

        <Separator />

        {/* Share link */}
        <div className="space-y-2">
          {!shareUrl ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGenerateLink}
              disabled={isSharing || isSaving}
            >
              {(isSharing || isSaving) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Gerar link de apresentação para o cliente
            </Button>
          ) : (
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">Link válido por 30 dias</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 text-xs bg-background border rounded px-2 py-1.5 font-mono truncate"
                  onFocus={(e) => e.target.select()}
                />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
