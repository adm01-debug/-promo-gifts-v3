/**
 * Read-only fiscal info panel for a supplier source.
 * Shows CST, CFOP, ICMS, PIS, COFINS, CEST, CSOSN, operation_nature
 * from variant_supplier_sources + supplier_branches.
 * Shows "Herdado" badge when data comes from branch defaults.
 */
import { Badge } from '@/components/ui/badge';
import { Building2, FileText, Loader2, ArrowDownFromLine } from 'lucide-react';
import { useSupplierFiscalData } from '@/hooks/useSupplierFiscalData';

interface Props {
  productId: string | undefined;
  supplierId: string | undefined;
}

function FiscalField({ label, value, mono = false }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function formatRate(rate: number | null | undefined): string | null {
  if (rate == null) return null;
  return `${rate}%`;
}

function formatTaxRegime(regime: string | null): string | null {
  if (!regime) return null;
  const map: Record<string, string> = {
    simples_nacional: 'Simples Nacional',
    lucro_presumido: 'Lucro Presumido',
    lucro_real: 'Lucro Real',
    mei: 'MEI',
  };
  return map[regime] || regime;
}

export function SupplierFiscalInfo({ productId, supplierId }: Props) {
  const { data, isLoading } = useSupplierFiscalData(productId, supplierId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando dados fiscais...
      </div>
    );
  }

  if (!data) return null;

  const hasFiscal = data.cst || data.cfop || data.icms_rate != null || data.pis_rate != null;
  const hasBranch = data.branch_name || data.branch_cnpj;

  if (!hasFiscal && !hasBranch) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
      <div className="flex items-center gap-1.5">
        <FileText className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Fiscal do Fornecedor
        </span>
        {data.isInherited && (
          <Badge variant="outline" className="text-[10px] h-5 ml-1 gap-1 text-amber-600 border-amber-500/30 bg-amber-500/5">
            <ArrowDownFromLine className="h-2.5 w-2.5" />
            Herdado da filial
          </Badge>
        )}
      </div>

      {/* Branch info */}
      {hasBranch && (
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">{data.branch_name}</span>
          {data.branch_cnpj && (
            <Badge variant="outline" className="text-[10px] font-mono h-5">{data.branch_cnpj}</Badge>
          )}
          {data.branch_state_uf && (
            <Badge variant="secondary" className="text-[10px] h-5">{data.branch_state_uf}</Badge>
          )}
          {data.branch_tax_regime && (
            <Badge variant="secondary" className="text-[10px] h-5">{formatTaxRegime(data.branch_tax_regime)}</Badge>
          )}
        </div>
      )}

      {/* Fiscal fields */}
      {hasFiscal && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <FiscalField label="CST" value={data.cst} mono />
          <FiscalField label="CFOP" value={data.cfop} mono />
          <FiscalField label="ICMS" value={formatRate(data.icms_rate)} />
          <FiscalField label="PIS" value={formatRate(data.pis_rate)} />
          <FiscalField label="COFINS" value={formatRate(data.cofins_rate)} />
          {data.cest && <FiscalField label="CEST" value={data.cest} mono />}
          {data.csosn && <FiscalField label="CSOSN" value={data.csosn} mono />}
          {data.operation_nature && <FiscalField label="Natureza" value={data.operation_nature} />}
        </div>
      )}

      {/* Branch reference rates */}
      {(data.branch_icms_internal != null || data.branch_icms_interstate != null) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <FiscalField label="ICMS Ref. Interno" value={formatRate(data.branch_icms_internal)} />
          <FiscalField label="ICMS Ref. Interestadual" value={formatRate(data.branch_icms_interstate)} />
        </div>
      )}

      {/* Inheritance hint */}
      {data.isInherited && (
        <p className="text-[10px] text-muted-foreground/70 italic">
          Dados herdados da filial padrão. Serão substituídos por valores específicos quando configurados para este produto.
        </p>
      )}
    </div>
  );
}
