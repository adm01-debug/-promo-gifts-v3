/**
 * Kit Summary
 * Resumo final do kit com breakdown de preços
 */

import { Package, Gift, Palette, FileText, Download, ShoppingCart, Printer, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const { box, items, personalization } = kitState;
  
  const pricing = calculateTotalKitPrice(box, items, personalization, kitQuantity);
  const breakdown = generatePriceBreakdown(box, items, personalization, kitQuantity);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const personalizedCount = (personalization.box.enabled ? 1 : 0) +
    Object.values(personalization.items).filter(p => p.enabled).length;

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
            <Package className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">
              {kitState.totalWeight >= 1000
                ? `${(kitState.totalWeight / 1000).toFixed(1)}kg`
                : `${kitState.totalWeight}g`}
            </p>
            <p className="text-sm text-muted-foreground">Peso estimado</p>
          </CardContent>
        </Card>
      </div>

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
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{item.sku}</span>
                      {item.weight ? ` • ${item.weight >= 1000 ? `${(item.weight / 1000).toFixed(1)}kg` : `${item.weight}g`}` : ''}
                      {item.material ? ` • ${item.material}` : ''}
                      {item.isOptional && <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">Opcional</Badge>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
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
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onExportPDF}
        >
          <Printer className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
        <Button
          className="flex-1"
          disabled={!kitState.isValid}
          onClick={onAddToQuote}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Adicionar ao Orçamento
        </Button>
      </div>
    </div>
  );
}
