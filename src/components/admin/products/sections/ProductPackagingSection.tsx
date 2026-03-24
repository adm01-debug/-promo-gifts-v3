/**
 * Packaging section — box/packaging dimensions and specs
 */
import { Input } from '@/components/ui/input';
import { FieldLabel, SectionCard } from '../ProductFormHelpers';
import { Package } from 'lucide-react';
import type { FormSectionProps } from '../ProductFormHelpers';

type Props = FormSectionProps;

export function ProductPackagingSection({ register, numericProps }: Props) {
  return (
    <SectionCard id="packaging" title="Embalagem (Caixa)" icon={Package} subtitle="Dimensões e especificações da embalagem">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <FieldLabel htmlFor="packing_type">Tipo de Embalagem</FieldLabel>
          <select id="packing_type" {...register('packing_type')} className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">Selecione...</option>
            <option value="Caixa">Caixa</option>
            <option value="Bolsa">Bolsa</option>
            <option value="Estojo">Estojo</option>
            <option value="Sacola">Sacola</option>
            <option value="Envelope">Envelope</option>
            <option value="Lata">Lata</option>
            <option value="Tubo">Tubo</option>
            <option value="Sem embalagem">Sem embalagem</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="packaging_material">Material</FieldLabel>
          <select id="packaging_material" {...register('packaging_material')} className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">Selecione...</option>
            <option value="Papelão">Papelão</option>
            <option value="Papel Kraft">Papel Kraft</option>
            <option value="Plástico">Plástico</option>
            <option value="TNT">TNT</option>
            <option value="Veludo">Veludo</option>
            <option value="Metal">Metal</option>
            <option value="Madeira">Madeira</option>
            <option value="Acrílico">Acrílico</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="packaging_color">Cor</FieldLabel>
          <select id="packaging_color" {...register('packaging_color')} className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">Selecione...</option>
            <option value="Kraft">Kraft</option>
            <option value="Branco">Branco</option>
            <option value="Preto">Preto</option>
            <option value="Transparente">Transparente</option>
            <option value="Prata">Prata</option>
            <option value="Dourado">Dourado</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="packaging_finish">Acabamento</FieldLabel>
          <select id="packaging_finish" {...register('packaging_finish')} className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">Selecione...</option>
            <option value="Fosco">Fosco</option>
            <option value="Brilhante">Brilhante</option>
            <option value="Acetinado">Acetinado</option>
            <option value="Texturizado">Texturizado</option>
            <option value="Laminado">Laminado</option>
          </select>
        </div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Externas</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel htmlFor="box_height_mm">Altura (cm)</FieldLabel>
          <Input id="box_height_mm" {...numericProps('box_height_mm')} min="0" step="0.1" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="box_width_mm">Largura (cm)</FieldLabel>
          <Input id="box_width_mm" {...numericProps('box_width_mm')} min="0" step="0.1" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="box_length_mm">Profundidade (cm)</FieldLabel>
          <Input id="box_length_mm" {...numericProps('box_length_mm')} min="0" step="0.1" className="h-9" />
        </div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 mt-3">Internas</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel htmlFor="box_internal_height_cm">Altura (cm)</FieldLabel>
          <Input id="box_internal_height_cm" {...numericProps('box_internal_height_cm' as any)} min="0" step="0.1" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="box_internal_width_cm">Largura (cm)</FieldLabel>
          <Input id="box_internal_width_cm" {...numericProps('box_internal_width_cm' as any)} min="0" step="0.1" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="box_internal_length_cm">Profundidade (cm)</FieldLabel>
          <Input id="box_internal_length_cm" {...numericProps('box_internal_length_cm' as any)} min="0" step="0.1" className="h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-1">
        <div>
          <FieldLabel htmlFor="box_weight_kg">Peso (kg)</FieldLabel>
          <Input id="box_weight_kg" {...numericProps('box_weight_kg')} min="0" step="0.01" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="box_volume_cm3">Volume (cm³)</FieldLabel>
          <Input id="box_volume_cm3" {...numericProps('box_volume_cm3')} min="0" className="h-9" />
        </div>
      </div>
    </SectionCard>
  );
}
