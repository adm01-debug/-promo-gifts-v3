/**
 * Personalization Config
 * Configuração de personalização para caixa e itens
 */

import { useState } from 'react';
import { Palette, Package, ChevronDown, ChevronUp, Check, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/kit-builder';
import type { KitBox, KitItem, KitItemPersonalization } from '@/lib/kit-builder';

// Técnicas mock - em produção viriam do banco
const AVAILABLE_TECHNIQUES = [
  { id: 'silk', name: 'Serigrafia', code: 'SILK', basePrice: 2.5 },
  { id: 'laser', name: 'Gravação a Laser', code: 'LASER', basePrice: 3.0 },
  { id: 'uv', name: 'Impressão UV', code: 'UV', basePrice: 4.0 },
  { id: 'transfer', name: 'Transfer', code: 'TRANSFER', basePrice: 2.0 },
  { id: 'bordado', name: 'Bordado', code: 'BORDADO', basePrice: 5.0 },
];

interface PersonalizationConfigProps {
  box: KitBox | null;
  items: KitItem[];
  boxPersonalization: KitItemPersonalization;
  itemPersonalizations: Record<string, KitItemPersonalization>;
  onBoxPersonalizationChange: (config: KitItemPersonalization) => void;
  onItemPersonalizationChange: (itemId: string, config: KitItemPersonalization) => void;
}

interface ItemPersonalizationCardProps {
  item: KitItem | { id: 'box'; name: string; imageUrl: string | null };
  personalization: KitItemPersonalization;
  onChange: (config: KitItemPersonalization) => void;
  isBox?: boolean;
}

function ItemPersonalizationCard({
  item,
  personalization,
  onChange,
  isBox = false,
}: ItemPersonalizationCardProps) {
  const [isOpen, setIsOpen] = useState(personalization.enabled);

  const handleToggle = (enabled: boolean) => {
    onChange({ ...personalization, enabled });
    setIsOpen(enabled);
  };

  const handleTechniqueChange = (techniqueId: string) => {
    const technique = AVAILABLE_TECHNIQUES.find(t => t.id === techniqueId);
    if (technique) {
      const colors = personalization.colors || 1;
      const estimatedPrice = technique.basePrice * colors;
      
      onChange({
        ...personalization,
        techniqueId: technique.id,
        techniqueName: technique.name,
        techniqueCode: technique.code,
        estimatedPrice,
      });
    }
  };

  const handleColorsChange = (colors: number) => {
    const technique = AVAILABLE_TECHNIQUES.find(t => t.id === personalization.techniqueId);
    const basePrice = technique?.basePrice || 2.5;
    
    onChange({
      ...personalization,
      colors,
      estimatedPrice: basePrice * colors,
    });
  };

  return (
    <Card className={cn(personalization.enabled && "border-primary/50 bg-primary/5")}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Imagem pequena */}
              <div className="w-10 h-10 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {isBox ? (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Palette className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {item.name}
                  {isBox && (
                    <Badge variant="outline" className="text-xs">Caixa</Badge>
                  )}
                </CardTitle>
                {personalization.enabled && personalization.techniqueName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {personalization.techniqueName} • {personalization.colors || 1} cor(es)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {personalization.enabled && personalization.estimatedPrice && (
                <span className="text-sm font-semibold text-primary">
                  +{formatCurrency(personalization.estimatedPrice)}/un
                </span>
              )}

              <Switch
                checked={personalization.enabled}
                onCheckedChange={handleToggle}
              />

              {personalization.enabled && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Técnica */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Técnica de Gravação</Label>
                <Select
                  value={personalization.techniqueId || ''}
                  onValueChange={handleTechniqueChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TECHNIQUES.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Número de Cores</Label>
                <Select
                  value={String(personalization.colors || 1)}
                  onValueChange={(v) => handleColorsChange(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? 'cor' : 'cores'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dimensões opcionais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Largura (cm)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 5"
                  value={personalization.width || ''}
                  onChange={(e) => onChange({
                    ...personalization,
                    width: e.target.value ? parseFloat(e.target.value) : undefined,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 3"
                  value={personalization.height || ''}
                  onChange={(e) => onChange({
                    ...personalization,
                    height: e.target.value ? parseFloat(e.target.value) : undefined,
                  })}
                />
              </div>
            </div>

            {/* Posição */}
            <div className="space-y-2">
              <Label>Posição da Gravação</Label>
              <Input
                placeholder="Ex: Frontal, Tampa, Lateral..."
                value={personalization.position || ''}
                onChange={(e) => onChange({
                  ...personalization,
                  position: e.target.value,
                })}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function PersonalizationConfig({
  box,
  items,
  boxPersonalization,
  itemPersonalizations,
  onBoxPersonalizationChange,
  onItemPersonalizationChange,
}: PersonalizationConfigProps) {
  const totalPersonalizations = (boxPersonalization.enabled ? 1 : 0) +
    Object.values(itemPersonalizations).filter(p => p.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Personalização
          </h3>
          <p className="text-sm text-muted-foreground">
            Escolha quais itens serão personalizados e configure a técnica de gravação
          </p>
        </div>
        
        {totalPersonalizations > 0 && (
          <Badge variant="default" className="text-sm">
            <Check className="h-3 w-3 mr-1" />
            {totalPersonalizations} {totalPersonalizations === 1 ? 'item' : 'itens'} personalizado(s)
          </Badge>
        )}
      </div>

      {/* Caixa */}
      {box && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Embalagem</h4>
          <ItemPersonalizationCard
            item={{ id: 'box', name: box.name, imageUrl: box.imageUrl }}
            personalization={boxPersonalization}
            onChange={onBoxPersonalizationChange}
            isBox
          />
        </div>
      )}

      {/* Itens */}
      {items.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Itens do Kit ({items.length})
          </h4>
          <div className="space-y-3">
            {items.map(item => (
              <ItemPersonalizationCard
                key={item.id}
                item={item}
                personalization={itemPersonalizations[item.id] || { enabled: false }}
                onChange={(config) => onItemPersonalizationChange(item.id, config)}
              />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !box && (
        <div className="text-center py-12 text-muted-foreground">
          <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Selecione uma caixa e itens para configurar a personalização</p>
        </div>
      )}
    </div>
  );
}
