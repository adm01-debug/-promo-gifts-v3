/**
 * SEO section — meta title, keywords, slug, canonical
 */
import { Input } from '@/components/ui/input';
import { FieldLabel, SectionCard } from '../ProductFormHelpers';
import { Globe } from 'lucide-react';
import type { FormSectionProps } from '../ProductFormHelpers';

type Props = FormSectionProps;

export function ProductSeoSection({ register, watch }: Props) {
  const metaTitleValue = watch('meta_title') || '';
  const metaKeywordsValue = watch('meta_keywords') || '';

  return (
    <SectionCard id="seo" title="SEO e Metadados" icon={Globe} subtitle="Otimize o produto para buscadores">
      <div>
        <FieldLabel htmlFor="meta_title" charCount={metaTitleValue.length} charMax={200}>Meta Título</FieldLabel>
        <Input id="meta_title" {...register('meta_title')} placeholder="Título para buscadores (Google)" className="h-9" />
      </div>
      <div>
        <FieldLabel htmlFor="meta_keywords" charCount={metaKeywordsValue.length} charMax={500}>Palavras-chave (separadas por vírgula)</FieldLabel>
        <Input id="meta_keywords" {...register('meta_keywords')} placeholder="caneta, brinde, personalizado" className="h-9" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="slug">Slug (URL)</FieldLabel>
          <Input id="slug" {...register('slug')} placeholder="caneta-plastica-001" className="font-mono h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="canonical_url">URL Canônica</FieldLabel>
          <Input id="canonical_url" {...register('canonical_url')} placeholder="/produto/caneta-001" className="font-mono h-9" />
        </div>
      </div>
    </SectionCard>
  );
}
