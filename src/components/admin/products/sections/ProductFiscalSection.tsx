/**
 * Fiscal data section — NCM, EAN, GTIN, tax rates, origin
 */
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldLabel, SectionCard } from '../ProductFormHelpers';
import { FileText } from 'lucide-react';
import type { FormSectionProps } from '../ProductFormHelpers';

type Props = FormSectionProps;

const TAX_REGIMES = [
  { value: 'simples_nacional', label: 'Simples Nacional' },
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real', label: 'Lucro Real' },
  { value: 'mei', label: 'MEI' },
];

export function ProductFiscalSection({ register, numericProps, watch, setValue }: Props) {
  const taxRegime = watch?.('tax_regime') || '';

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
          <FieldLabel htmlFor="tax_regime" hint="Regime tributário aplicável ao produto — define o cálculo dos impostos">Regime Tributário</FieldLabel>
          <Select value={taxRegime} onValueChange={(v) => setValue?.('tax_regime', v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {TAX_REGIMES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="country_of_origin" hint="País de fabricação/origem do produto para fins fiscais">País de Origem</FieldLabel>
          <Input id="country_of_origin" {...register('country_of_origin')} placeholder="Ex: Brasil, China" className="h-9" />
        </div>
      </div>
    </SectionCard>
  );
}
