/**
 * Dimensions section — Product physical dimensions + internal dims for box products
 */
import { Input } from '@/components/ui/input';
import { FieldLabel, SectionCard } from '../ProductFormHelpers';
import { Ruler } from 'lucide-react';
import type { FormSectionProps } from '../ProductFormHelpers';

interface Props extends FormSectionProps {
  isBoxProduct: boolean;
}

export function ProductDimensionsSection({ register, numericProps, isBoxProduct }: Props) {
  return (
    <SectionCard id="dimensions" title="Dimensões" icon={Ruler} subtitle="Dimensões do produto">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { id: 'height_cm', label: 'Altura (cm)' },
          { id: 'width_cm', label: 'Largura (cm)' },
          { id: 'length_cm', label: 'Profundidade (cm)' },
          { id: 'diameter_cm', label: 'Diâmetro (cm)' },
          { id: 'weight_g', label: 'Peso (g)' },
          { id: 'capacity_ml', label: 'Capacidade (ml)' },
        ].map(({ id: fId, label }) => (
          <div key={fId}>
            <FieldLabel htmlFor={fId}>{label}</FieldLabel>
            <Input id={fId} {...numericProps(fId as any)} min="0" step="0.1" className="h-9" />
          </div>
        ))}
      </div>
      {isBoxProduct && (
        <div className="border-t border-border/30 pt-4 mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Internas (para montagem de kits)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { id: 'internal_height_cm', label: 'Altura Int. (cm)' },
              { id: 'internal_width_cm', label: 'Largura Int. (cm)' },
              { id: 'internal_length_cm', label: 'Profundidade Int. (cm)' },
            ].map(({ id: fId, label }) => (
              <div key={fId}>
                <FieldLabel htmlFor={fId}>{label}</FieldLabel>
                <Input id={fId} {...numericProps(fId as any)} min="0" step="0.1" className="h-9" />
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
