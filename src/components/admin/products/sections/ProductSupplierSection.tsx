/**
 * Supplier selection section — top card with supplier picker
 */
import { SupplierSelect } from '../SupplierSelect';
import { NewSupplierDialog } from '../NewSupplierDialog';
import { Card } from '@/components/ui/card';
import { Truck } from 'lucide-react';
import type { FormSectionProps } from '../ProductFormHelpers';

interface Props extends Pick<FormSectionProps, 'setValue' | 'errors'> {
  supplierId: string;
  onSupplierChange: (id: string, name?: string, markup?: number | null) => void;
}

export function ProductSupplierSection({ supplierId, onSupplierChange, setValue, errors }: Props) {
  return (
    <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Fornecedor</h3>
            <p className="text-[11px] text-muted-foreground">Selecione ou cadastre o fornecedor do produto</p>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <SupplierSelect
              value={supplierId}
              onChange={onSupplierChange}
              error={errors.supplier_id?.message}
            />
          </div>
          <NewSupplierDialog onCreated={(id) => setValue('supplier_id', id)} />
        </div>
      </div>
    </Card>
  );
}
