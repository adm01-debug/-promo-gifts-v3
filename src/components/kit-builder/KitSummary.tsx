/**
 * Kit Summary
 * Resumo final do kit com breakdown de preços
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Gift, Palette, FileText, Download, ShoppingCart, Printer, Check, Loader2, Image, AlertTriangle, TrendingUp, Percent, Scale, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKitStockValidation } from '@/hooks/useKitStockValidation';
import { KitVisualPreview } from './KitVisualPreview';
import { DiscontinuedItemsAlert } from './DiscontinuedItemsAlert';
import { FreightEstimator } from './FreightEstimator';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatVolume,
  formatDimensions,
  generatePriceBreakdown,
  calculateTotalKitPrice,
} from '@/lib/kit-builder';
import type { KitState } from '@/lib/kit-builder';

interface KitSummaryProps {
  kitState: KitState;
  kitQuantity: number;
  kitName: string;
  onKitNameChange: (name: string) => void;
  onKitQuantityChange: (quantity: number) => void;
  onAddToQuote?: () => void;
  onExportPDF?: () => void;
  isAddingToQuote?: boolean;
}

export function KitSummary({
  kitState,
  kitQuantity,
  kitName,
  onKitNameChange,
  onKitQuantityChange,
  onAddToQuote,
  onExportPDF,
  isAddingToQuote,
}: KitSummaryProps) {
  const navigate = useNavigate();
  const [markupPercent, setMarkupPercent] = useState<number>(30);
  const { box, items, personalization } = kitState;
  
  const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity);
  const breakdown = generatePriceBreakdown(box, items, personalization, kitQuantity);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const personalizedCount = (personalization.box.enabled ? 1 : 0) +
    Object.values(personalization.items).filter(p => p.enabled).length;

  // Stock validation
  const { alerts: stockAlerts, isLoading: isLoadingStock, stockByProduct } = useKitStockValidation(items, box, kitQuantity);

  const handleOpenMockup = (productId: string, techniqueName?: string) => {
    const params = new URLSearchParams();
    params.set('product_id', productId);
    if (techniqueName) params.set('technique', techniqueName);
    navigate(`/mockup-generator?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Nome do Kit e Quantidade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Identificação do Kit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kit-name">Nome do Kit</Label>
              <Input
                id="kit-name"
                placeholder="Ex: Kit Boas-Vindas Premium"
                value={kitName}
                onChange={(e) => onKitNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kit-qty">Quantidade de Kits</Label>
              <Input
                id="kit-qty"
                type="number"
                min={1}
                value={kitQuantity}
                onChange={(e) => onKitQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Visual */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Caixa */}
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">1</p>
            <p className="text-sm text-muted-foreground">Embalagem</p>
            {box && (
              <p className="text-xs text-muted-foreground mt-1 truncate px-2">
                {box.name}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Itens */}
        <Card>
          <CardContent className="pt-6 text-center">
            <Gift className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{totalItems}</p>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'itens diferentes'}
            </p>
          </CardContent>
        </Card>

        {/* Personalizações */}
        <Card>
          <CardContent className="pt-6 text-center">
            <Palette className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{personalizedCount}</p>
            <p className="text-sm text-muted-foreground">
              {personalizedCount === 1 ? 'Personalização' : 'Personalizações'}
            </p>
          </CardContent>
        </Card>

        {/* Peso Total */}
        <Card>
          <CardContent className="pt-6 text-center">
            <Scale className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">
              {kitState.totalWeight >= 1000
                ? `${(kitState.totalWeight / 1000).toFixed(1)}kg`
                : `${kitState.totalWeight}g`}
            </p>
            <p className="text-sm text-muted-foreground">Peso estimado</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Preview */}
      <KitVisualPreview kitState={kitState} />

      {/* Discontinued Items Alert */}
      <DiscontinuedItemsAlert items={items} />

      {/* Composição do Kit */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Composição do Kit</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Caixa */}
          {box && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 mb-3">
              <div className="w-12 h-12 rounded-md bg-background overflow-hidden">
                {box.imageUrl ? (
                  <img src={box.imageUrl} alt={box.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{box.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDimensions(box.internalWidth, box.internalHeight, box.internalDepth)} • {formatVolume(box.internalVolume)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(box.price)}</p>
                <p className="text-xs text-muted-foreground">por kit</p>
              </div>
            </div>
          )}

          {/* Itens */}
          <div className="space-y-2">
            {items.map(item => {
              const itemPersonalization = personalization.items[item.id];
              return (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30">
                  <div className="w-10 h-10 rounded-md bg-secondary overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.quantity}x</span>
                      <span className="truncate">{item.name}</span>
                      {itemPersonalization?.enabled && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          <Palette className="h-3 w-3 mr-1" />
                          {itemPersonalization.techniqueName}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{item.sku}</span>
                        {item.weight ? ` • ${item.weight >= 1000 ? `${(item.weight / 1000).toFixed(1)}kg` : `${item.weight}g`}` : ''}
                        {item.material ? ` • ${item.material}` : ''}
                        {item.isOptional && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">Opcional</Badge>}
                      </p>
                      {stockByProduct.has(item.id) && (
                        <Badge
                          variant={stockByProduct.get(item.id)! >= item.quantity * kitQuantity ? 'secondary' : 'destructive'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {stockByProduct.get(item.id)! >= item.quantity * kitQuantity
                            ? `${stockByProduct.get(item.id)} em estoque`
                            : `⚠ ${stockByProduct.get(item.id)} disponível`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Botão Gerar Mockup */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenMockup(
                              item.id,
                              itemPersonalization?.enabled ? itemPersonalization.techniqueName : undefined
                            )}
                          >
                            <Image className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Gerar Mockup</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown de Preços */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Detalhamento de Preços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {breakdown.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between py-2",
                  item.isPersonalization && "text-primary pl-4"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(item.isPersonalization && "text-sm")}>
                    {item.label}
                  </span>
                  {item.quantity && item.quantity > 1 && (
                    <span className="text-xs text-muted-foreground">
                      ({item.quantity}x {formatCurrency(item.unitPrice)})
                    </span>
                  )}
                </div>
                <span className={cn("font-medium", item.isPersonalization && "text-sm")}>
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Subtotais */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Produtos ({kitQuantity} {kitQuantity === 1 ? 'kit' : 'kits'})</span>
              <span>{formatCurrency(pricing.subtotal)}</span>
            </div>
            {pricing.personalizationPrice > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>Personalização</span>
                <span>{formatCurrency(pricing.personalizationPrice)}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold">Total</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(pricing.unitPrice)}/kit
              </p>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(pricing.total)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Comparativa por Quantidade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Preço por Quantidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[50, 100, 200, 500, 1000].map(qty => {
              const qtyPricing = calculateTotalKitPrice(box, items, personalization, qty);
              const isCurrentQty = qty === kitQuantity;
              return (
                <button
                  key={qty}
                  onClick={() => onKitQuantityChange(qty)}
                  className={cn(
                    "rounded-lg p-2.5 border transition-all cursor-pointer",
                    isCurrentQty
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border/50 bg-secondary/30 hover:border-primary/30"
                  )}
                >
                  <p className="text-[11px] text-muted-foreground">{qty} kits</p>
                  <p className={cn("text-sm font-bold", isCurrentQty && "text-primary")}>
                    {formatCurrency(qtyPricing.unitPrice)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/kit</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Simulação de Margem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1 w-[180px]">
              <Label htmlFor="markup" className="text-sm">Markup (%)</Label>
              <div className="relative">
                <Input
                  id="markup"
                  type="number"
                  min={0}
                  max={500}
                  step={5}
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="pr-8"
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex gap-1.5 pt-5">
              {[20, 30, 50, 80, 100].map((v) => (
                <Button
                  key={v}
                  variant={markupPercent === v ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setMarkupPercent(v)}
                >
                  {v}%
                </Button>
              ))}
            </div>
          </div>

          {(() => {
            const costPerKit = pricing.unitPrice;
            const sellPerKit = costPerKit * (1 + markupPercent / 100);
            const sellTotal = sellPerKit * kitQuantity;
            const profitPerKit = sellPerKit - costPerKit;
            const profitTotal = sellTotal - pricing.total;
            const marginPercent = sellPerKit > 0 ? (profitPerKit / sellPerKit) * 100 : 0;

            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">Venda/Kit</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(sellPerKit)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">Venda Total ({kitQuantity}x)</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(sellTotal)}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">Lucro/Kit</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(profitPerKit)}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">Lucro Total</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(profitTotal)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
                  <span className="text-muted-foreground">Margem Líquida</span>
                  <span className={cn("font-bold text-lg", marginPercent >= 20 ? "text-primary" : "text-destructive")}>
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Alertas de Estoque */}
      {stockAlerts.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-6">
            <h4 className="font-medium text-warning flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4" />
              Alerta de Estoque ({stockAlerts.length} {stockAlerts.length === 1 ? 'item' : 'itens'})
            </h4>
            <ul className="space-y-2">
              {stockAlerts.map(alert => (
                <li key={alert.itemId} className="text-sm flex items-center justify-between bg-background/50 rounded-lg p-2">
                  <div>
                    <p className="font-medium">{alert.isBox ? '📦 ' : ''}{alert.itemName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{alert.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      <span className="text-destructive font-bold">{alert.available}</span>
                      <span className="text-muted-foreground"> / {alert.required} necessários</span>
                    </p>
                    <p className="text-xs text-destructive">Faltam {alert.deficit} un.</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Freight Estimator */}
      <FreightEstimator totalWeightGrams={kitState.totalWeight} kitQuantity={kitQuantity} />

      {/* Validação */}
      {!kitState.isValid && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <h4 className="font-medium text-destructive mb-2">Pendências</h4>
            <ul className="space-y-1">
              {kitState.validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-destructive flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-destructive" />
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          variant="outline"
          onClick={onExportPDF}
        >
          <Printer className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
        <Button
          disabled={!kitState.isValid || isAddingToQuote}
          onClick={onAddToQuote}
        >
          {isAddingToQuote ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4 mr-2" />
          )}
          {isAddingToQuote ? 'Criando...' : 'Criar Orçamento'}
        </Button>
        <Button
          variant="outline"
          className="border-emerald-500/50 text-primary hover:bg-primary/10 dark:text-primary"
          disabled={!kitState.isValid}
          onClick={() => {
            const kitLabel = kitName || 'Kit Personalizado';
            const itemsList = items.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
            const text = `*${kitLabel}* (${kitQuantity}x)\n\n${itemsList}\n\n💰 *${formatCurrency(pricing.unitPrice)}/kit*\n📦 Total: *${formatCurrency(pricing.total)}*`;
            const encoded = encodeURIComponent(text);
            window.open(`https://wa.me/?text=${encoded}`, '_blank');
          }}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
}
