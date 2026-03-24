/**
 * Fiscal data section — NCM, EAN, GTIN, tax rates, origin
 */
import { Input } from '@/components/ui/input';
import { FieldLabel, SectionCard } from '../ProductFormHelpers';
import { FileText } from 'lucide-react';
import type { FormSectionProps } from '../ProductFormHelpers';

type Props = FormSectionProps;

export function ProductFiscalSection({ register, numericProps }: Props) {
  return (
    <SectionCard id="fiscal" title="Dados Fiscais" icon={FileText} subtitle="NCM, EAN, GTIN, IPI, ICMS, PIS/COFINS e origem">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="ncm_code" hint="Nomenclatura Comum do Mercosul — código de 8 dígitos usado na classificação fiscal">Código NCM</FieldLabel>
          <Input id="ncm_code" {...register('ncm_code')} placeholder="Ex: 96081000" className="font-mono h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="cest" hint="Código Especificador da Substituição Tributária">CEST</FieldLabel>
          <Input id="cest" {...register('cest')} placeholder="Ex: 2000100" className="font-mono h-9" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="ean" hint="Código de barras padrão europeu (13 dígitos)">Código EAN</FieldLabel>
          <Input id="ean" {...register('ean')} placeholder="Código de barras EAN" className="font-mono h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="gtin" hint="Global Trade Item Number — identificação global do produto">GTIN</FieldLabel>
          <Input id="gtin" {...register('gtin')} placeholder="Global Trade Item Number" className="font-mono h-9" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="cfop" hint="Código Fiscal de Operações e Prestações — ex: 5102 (venda dentro do estado)">CFOP</FieldLabel>
          <Input id="cfop" {...register('cfop')} placeholder="Ex: 5102" className="font-mono h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="csosn" hint="Código de Situação da Operação no Simples Nacional">CSOSN</FieldLabel>
          <Input id="csosn" {...register('csosn')} placeholder="Ex: 102" className="font-mono h-9" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <FieldLabel htmlFor="ipi_rate" hint="Imposto sobre Produtos Industrializados">Alíquota IPI (%)</FieldLabel>
          <Input id="ipi_rate" {...numericProps('ipi_rate')} min="0" step="0.01" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="icms_rate" hint="Imposto sobre Circulação de Mercadorias e Serviços">Alíquota ICMS (%)</FieldLabel>
          <Input id="icms_rate" {...numericProps('icms_rate')} min="0" step="0.01" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="pis_rate" hint="Programa de Integração Social">Alíquota PIS (%)</FieldLabel>
          <Input id="pis_rate" {...numericProps('pis_rate')} min="0" step="0.01" className="h-9" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <FieldLabel htmlFor="cofins_rate" hint="Contribuição para o Financiamento da Seguridade Social">Alíquota COFINS (%)</FieldLabel>
          <Input id="cofins_rate" {...numericProps('cofins_rate')} min="0" step="0.01" className="h-9" />
        </div>
        <div>
          <FieldLabel htmlFor="tax_regime" hint="Regime tributário aplicável ao produto">Regime Tributário</FieldLabel>
          <select
            id="tax_regime"
            {...register('tax_regime')}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Selecione...</option>
            <option value="simples_nacional">Simples Nacional</option>
            <option value="lucro_presumido">Lucro Presumido</option>
            <option value="lucro_real">Lucro Real</option>
            <option value="mei">MEI</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="country_of_origin">País de Origem</FieldLabel>
          <Input id="country_of_origin" {...register('country_of_origin')} placeholder="Ex: Brasil, China" className="h-9" />
        </div>
      </div>
    </SectionCard>
  );
}
