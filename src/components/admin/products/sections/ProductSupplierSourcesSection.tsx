/**
 * Multi-supplier sources section — allows linking N suppliers to a product
 */
import { useState } from 'react';
import { SectionCard } from '../ProductFormHelpers';
import { SupplierSelect } from '../SupplierSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Truck, Plus, Star, Trash2, Pencil, PackageCheck, Clock, DollarSign, Loader2 } from 'lucide-react';
import { useProductSupplierSources, type SupplierSourceInput } from '@/hooks/useProductSupplierSources';
import { cn } from '@/lib/utils';

interface Props {
  productId?: string;
  isEdit: boolean;
  /** Current primary supplier from form */
  primarySupplierId: string;
  primarySupplierName: string;
}

const emptyForm = {
  supplier_id: '',
  supplier_name: '',
  supplier_sku: '',
  cost_price: 0,
  sale_price: 0,
  lead_time_days: null as number | null,
  stock_quantity: 0,
  min_order_quantity: 1,
  notes: '',
};

export function ProductSupplierSourcesSection({ productId, isEdit, primarySupplierId, primarySupplierName }: Props) {
  const { sources, isLoading, addSource, removeSource, setPreferred } = useProductSupplierSources(productId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  if (!isEdit || !productId) {
    return (
      <SectionCard id="supplier-sources" title="Fontes de Fornecimento" icon={Truck} subtitle="Fornecedores alternativos para este produto">
        <div className="text-center py-6">
          <PackageCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Salve o produto primeiro para adicionar fontes de fornecimento alternativas.
          </p>
        </div>
      </SectionCard>
    );
  }

  const handleAdd = async () => {
    if (!form.supplier_id) return;
    setSaving(true);
    const input: SupplierSourceInput = {
      product_id: productId!,
      supplier_id: form.supplier_id,
      supplier_name: form.supplier_name,
      supplier_sku: form.supplier_sku || null,
      cost_price: form.cost_price,
      sale_price: form.sale_price,
      lead_time_days: form.lead_time_days,
      stock_quantity: form.stock_quantity,
      min_order_quantity: form.min_order_quantity,
      is_preferred: sources.length === 0,
      is_active: true,
      notes: form.notes || null,
    };
    const ok = await addSource(input);
    setSaving(false);
    if (ok) {
      setForm(emptyForm);
      setDialogOpen(false);
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <SectionCard id="supplier-sources" title="Fontes de Fornecimento" icon={Truck} subtitle="Gerencie fornecedores alternativos com preços e prazos distintos">
      {/* Primary supplier info */}
      {primarySupplierId && (
        <Card className="border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-sm font-medium">Fornecedor Principal:</span>
            <span className="text-sm text-muted-foreground">{primarySupplierName || 'Não definido'}</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">Do cadastro</Badge>
          </div>
        </Card>
      )}

      {/* Source list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sources.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma fonte alternativa cadastrada.
        </p>
      ) : (
        <div className="space-y-2">
          {sources.map((src) => (
            <Card
              key={src.id}
              className={cn(
                'p-3 transition-colors',
                src.is_preferred && 'border-primary/30 bg-primary/5'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{src.supplier_name}</span>
                    {src.is_preferred && (
                      <Badge className="text-[10px] bg-primary/20 text-primary border-0">
                        <Star className="h-3 w-3 mr-0.5 fill-current" /> Preferencial
                      </Badge>
                    )}
                    {!src.is_active && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Inativo</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {src.supplier_sku && (
                      <span className="font-mono">SKU: {src.supplier_sku}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Custo: {formatCurrency(src.cost_price)} · Venda: {formatCurrency(src.sale_price)}
                    </span>
                    {src.lead_time_days != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {src.lead_time_days}d
                      </span>
                    )}
                    <span>Estoque: {src.stock_quantity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!src.is_preferred && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => setPreferred(src.id)}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Definir como preferencial</TooltipContent>
                    </Tooltip>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover fonte?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O fornecedor "{src.supplier_name}" será desvinculado deste produto.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeSource(src.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add button + Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full mt-1">
            <Plus className="h-4 w-4 mr-1.5" /> Adicionar Fornecedor Alternativo
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Fonte de Fornecimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Fornecedor</label>
              <SupplierSelect
                value={form.supplier_id}
                onChange={(id, name) => setForm(f => ({ ...f, supplier_id: id, supplier_name: name || '' }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">SKU do Fornecedor</label>
              <Input
                value={form.supplier_sku}
                onChange={e => setForm(f => ({ ...f, supplier_sku: e.target.value }))}
                placeholder="Código ref. do fornecedor"
                className="h-9 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Preço de Custo</label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.cost_price || ''}
                  onChange={e => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Preço de Venda</label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.sale_price || ''}
                  onChange={e => setForm(f => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Prazo (dias)</label>
                <Input
                  type="number" min="0"
                  value={form.lead_time_days ?? ''}
                  onChange={e => setForm(f => ({ ...f, lead_time_days: e.target.value ? parseInt(e.target.value) : null }))}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Estoque</label>
                <Input
                  type="number" min="0"
                  value={form.stock_quantity || ''}
                  onChange={e => setForm(f => ({ ...f, stock_quantity: parseInt(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Qtd Mín.</label>
                <Input
                  type="number" min="1"
                  value={form.min_order_quantity || ''}
                  onChange={e => setForm(f => ({ ...f, min_order_quantity: parseInt(e.target.value) || 1 }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!form.supplier_id || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
