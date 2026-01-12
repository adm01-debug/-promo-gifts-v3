import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, Ruler } from 'lucide-react';
import type { ProductTechnique, SizeOption } from './types';

interface CustomizationOptionsProps {
  technique: ProductTechnique;
  colors: number;
  onColorsChange: (colors: number) => void;
  sizeOption: string;
  onSizeChange: (size: string) => void;
  availableSizes: SizeOption[];
}

export function CustomizationOptions({
  technique,
  colors,
  onColorsChange,
  sizeOption,
  onSizeChange,
  availableSizes,
}: CustomizationOptionsProps) {
  const maxColors = technique.maxColors || 4;

  return (
    <div className="space-y-6">
      {/* Colors */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          Número de Cores
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxColors }, (_, i) => i + 1).map((num) => (
            <Button
              key={num}
              variant={colors === num ? 'default' : 'outline'}
              size="sm"
              onClick={() => onColorsChange(num)}
              className="min-w-12"
            >
              {num} {num === 1 ? 'cor' : 'cores'}
            </Button>
          ))}
        </div>
      </div>

      {/* Size */}
      {availableSizes.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            Tamanho da Gravação
          </label>
          <Select value={sizeOption} onValueChange={onSizeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tamanho" />
            </SelectTrigger>
            <SelectContent>
              {availableSizes.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                  {size.modifier !== 1 && (
                    <span className="text-muted-foreground ml-2">
                      ({size.modifier > 1 ? '+' : ''}
                      {((size.modifier - 1) * 100).toFixed(0)}%)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Area info */}
      {technique.maxWidth && technique.maxHeight && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="text-muted-foreground">
            Área máxima de gravação:{' '}
            <strong>
              {technique.maxWidth} x {technique.maxHeight} mm
            </strong>
            {technique.maxArea && <span> ({technique.maxArea} cm²)</span>}
          </p>
        </div>
      )}
    </div>
  );
}
