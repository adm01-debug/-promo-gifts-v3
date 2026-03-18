/**
 * Classification section — lazy-loaded since it imports 6+ heavy sub-components
 */
import { ProductVariantsSection } from '../ProductVariantsSection';
import { ProductMaterialsSection } from '../ProductMaterialsSection';
import { ProductTagsSection } from '../ProductTagsSection';
import { ProductRamosSection } from '../ProductRamosSection';
import { ProductMarketingSection } from '../ProductMarketingSection';
import { ProductTechniquesSection } from '../ProductTechniquesSection';
import { ProductKitComponentsSection } from '../ProductKitComponentsSection';
import { SectionCard } from '../ProductFormHelpers';
import {
  Layers,
  Palette,
  Tag,
  Building2,
  Megaphone,
  Paintbrush,
  Info,
} from 'lucide-react';

interface Props {
  productId?: string;
  isEdit: boolean;
  isKit: boolean;
  productName: string;
  productSku: string;
  internalDimensions: {
    height_cm: number | null;
    width_cm: number | null;
    length_cm: number | null;
  };
}

export default function ProductClassificationSection({
  productId,
  isEdit,
  isKit,
  productName,
  productSku,
  internalDimensions,
}: Props) {
  return (
    <SectionCard id="classification" title="Classificação e Vínculos" icon={Layers} subtitle="Cores, materiais, tags, ramos e técnicas">
      {isEdit && productId && (
        <>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold">Variações de Cor</h4>
            </div>
            <ProductVariantsSection productId={productId} productName={productName} productSku={productSku} />
          </div>

          {isKit && (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold">Componentes do Kit</h4>
              </div>
              <ProductKitComponentsSection
                productId={productId}
                boxInternalDimensions={internalDimensions}
              />
            </div>
          )}

          {[
            { title: 'Materiais', icon: Layers, content: <ProductMaterialsSection productId={productId} /> },
            { title: 'Tags', icon: Tag, content: <ProductTagsSection productId={productId} /> },
            { title: 'Ramos de Atividade', icon: Building2, content: <ProductRamosSection productId={productId} /> },
            { title: 'Marketing', icon: Megaphone, content: <ProductMarketingSection productId={productId} /> },
            { title: 'Técnicas de Personalização', icon: Paintbrush, content: <ProductTechniquesSection productId={productId} /> },
          ].map(({ title, icon: SIcon, content }) => (
            <div key={title} className="rounded-lg border border-border/40 bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <SIcon className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold">{title}</h4>
              </div>
              {content}
            </div>
          ))}
        </>
      )}

      {!isEdit && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Salve o produto primeiro para gerenciar classificações e vínculos.
        </div>
      )}
    </SectionCard>
  );
}
