/**
 * Basic info section — Name, SKU, description, brand, category, lead time, supply mode
 */
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CategorySelect } from '../CategorySelect';
import { NewCategoryDialog } from '../NewCategoryDialog';
import { FieldLabel, SectionCard } from '../ProductFormHelpers';
import { Info, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from '../ProductFormHelpers';

interface Props extends FormSectionProps {
  skuStatus: 'idle' | 'checking' | 'valid' | 'duplicate';
  duplicateName: string;
  skuManuallyEdited: boolean;
  onSkuManualEdit: () => void;
}

export function ProductInfoSection({
  register, setValue, watch, errors, numericProps,
  skuStatus, duplicateName, skuManuallyEdited, onSkuManualEdit,
}: Props) {
  const nameValue = watch('name') || '';
  const skuValue = watch('sku') || '';
  const supplierRefValue = watch('supplier_reference') || '';
  const descValue = watch('description') || '';
  const metaDescValue = watch('meta_description') || '';
  const categoryId = watch('category_id');

  return (
    <SectionCard id="info" title="Informações Básicas" icon={Info} subtitle="SKU, nome, descrição, marca e categoria">
      {/* Nome */}
      <div>
        <FieldLabel htmlFor="name" required charCount={nameValue.length} charMax={300}>Nome do Produto</FieldLabel>
        <Input id="name" {...register('name')} placeholder="Nome do produto" className={cn('h-9', errors.name && 'border-destructive')} />
        {errors.name && <p className="text-[10px] text-destructive mt-1">{errors.name.message}</p>}
      </div>

      {/* SKU Fornecedor | SKU Interno */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="supplier_reference" charCount={supplierRefValue.length} charMax={100}>SKU do Fornecedor</FieldLabel>
          <Input id="supplier_reference" {...register('supplier_reference')} placeholder="Ex: FORN-12345" className="font-mono h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="sku" required charCount={skuValue.length} charMax={50}>SKU Interno</FieldLabel>
          <div className="relative">
            <Input
              id="sku"
              {...register('sku', {
                onChange: () => { if (!skuManuallyEdited) onSkuManualEdit(); },
              })}
              placeholder="Ex: GS-001"
              className={cn(
                'font-mono pr-8 h-9',
                errors.sku && 'border-destructive',
                skuStatus === 'valid' && 'border-success/50',
                skuStatus === 'duplicate' && 'border-destructive',
              )}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {skuStatus === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              {skuStatus === 'valid' && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              {skuStatus === 'duplicate' && (
                <Tooltip>
                  <TooltipTrigger asChild><AlertCircle className="h-3.5 w-3.5 text-destructive" /></TooltipTrigger>
                  <TooltipContent className="text-xs">SKU já usado em "{duplicateName}"</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {errors.sku && <p className="text-[10px] text-destructive mt-1">{errors.sku.message}</p>}
          {skuStatus === 'duplicate' && <p className="text-[10px] text-destructive mt-1">SKU duplicado: "{duplicateName}"</p>}
        </div>
      </div>

      {/* Descrição */}
      <div>
        <FieldLabel htmlFor="description" charCount={descValue.length} charMax={5000}>Descrição Completa</FieldLabel>
        <Textarea id="description" {...register('description')} placeholder="Descrição detalhada do produto" rows={4} className="text-sm resize-y min-h-[80px]" />
      </div>

      {/* Meta Descrição */}
      <div>
        <FieldLabel htmlFor="meta_description" charCount={metaDescValue.length} charMax={500}>Meta Descrição (SEO)</FieldLabel>
        <Input id="meta_description" {...register('meta_description')} placeholder="Descrição para buscadores" className="h-9" />
      </div>

      {/* Marca + Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="brand">Marca</FieldLabel>
          <Input id="brand" {...register('brand')} placeholder="Ex: Tramontina" className="h-9" />
        </div>
        <div>
          <FieldLabel>Categoria</FieldLabel>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <CategorySelect value={categoryId || ''} onChange={(id) => setValue('category_id', id)} error={errors.category_id?.message} />
            </div>
            <NewCategoryDialog onCreated={(id) => setValue('category_id', id)} />
          </div>
        </div>
      </div>

      {/* Prazo + Modo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="lead_time_days" hint="Tempo médio em dias úteis para produção/entrega pelo fornecedor">Prazo Entrega (dias)</FieldLabel>
          <Input id="lead_time_days" {...numericProps('lead_time_days')} min="0" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="supply_mode" hint="Define se o produto é mantido em estoque ou fabricado sob demanda">Modo de Fornecimento</FieldLabel>
          <Select value={watch?.('supply_mode') || ''} onValueChange={(v) => setValue?.('supply_mode', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pronta_entrega_liso">Pronta Entrega Liso</SelectItem>
              <SelectItem value="fabricado_personalizado">Fabricado Personalizado</SelectItem>
              <SelectItem value="fabricado_liso">Fabricado Liso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </SectionCard>
  );
}
