/**
 * ProductEngravingSection — Aba dedicada para Gravação (Técnicas + Locais de Personalização)
 */
import { ProductTechniquesSection } from '../ProductTechniquesSection';
import { ProductPersonalizationAreasSection } from '../ProductPersonalizationAreasSection';
import { SectionCard } from '../ProductFormHelpers';
import { Paintbrush, MapPin, Info } from 'lucide-react';

interface Props {
  productId?: string;
  isEdit: boolean;
}

export default function ProductEngravingSection({ productId, isEdit }: Props) {
  if (!isEdit || !productId) {
    return (
      <SectionCard id="engraving" title="Gravação e Personalização" icon={Paintbrush} subtitle="Técnicas e locais de personalização do produto">
        <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Salve o produto primeiro para configurar técnicas e locais de gravação.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard id="engraving" title="Gravação e Personalização" icon={Paintbrush} subtitle="Técnicas e locais de personalização do produto">
      <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Paintbrush className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-semibold">Técnicas de Personalização</h4>
        </div>
        <ProductTechniquesSection productId={productId} />
      </div>

      <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-semibold">Locais e Áreas de Personalização</h4>
        </div>
        <ProductPersonalizationAreasSection productId={productId} />
      </div>
    </SectionCard>
  );
}
