/**
 * Marketing texts section — key benefits and use cases
 */
import { Textarea } from '@/components/ui/textarea';
import { FieldLabel, SectionCard } from '../ProductFormHelpers';
import { Megaphone } from 'lucide-react';
import type { FormSectionProps } from '../ProductFormHelpers';

type Props = Pick<FormSectionProps, 'register'>;

export function ProductMarketingTextsSection({ register }: Props) {
  return (
    <SectionCard id="marketing" title="Textos de Marketing" icon={Megaphone} subtitle="Benefícios e casos de uso">
      <div>
        <FieldLabel htmlFor="key_benefits">Benefícios Principais</FieldLabel>
        <Textarea id="key_benefits" {...register('key_benefits')} placeholder="Liste os benefícios do produto" rows={3} className="text-sm resize-y" />
      </div>
      <div>
        <FieldLabel htmlFor="use_cases">Casos de Uso</FieldLabel>
        <Textarea id="use_cases" {...register('use_cases')} placeholder="Cenários e ocasiões de uso" rows={3} className="text-sm resize-y" />
      </div>
    </SectionCard>
  );
}
