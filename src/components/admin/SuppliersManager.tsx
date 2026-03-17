import { useState, useEffect, useMemo, useCallback } from 'react';
import { invokeExternalDb, invokeExternalDbSingle, invokeExternalDbDelete } from '@/lib/external-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Plus, Pencil, Trash2, Loader2, Building2, Phone, DollarSign,
  Settings2, RefreshCw, ExternalLink, CheckCircle2, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  code: string;
  trading_name: string | null;
  cnpj: string | null;
  active: boolean;
  organization_id: string | null;
  contact_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  default_markup_percent: number | null;
  min_order_value: number | null;
  minimum_order_value: number | null;
  delivery_time_days: number | null;
  payment_terms: string | null;
  shipping_terms: string | null;
  priority: number | null;
  notes: string | null;
  is_product_supplier: boolean;
  is_engraving_supplier: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_SUPPLIER: Partial<Supplier> = {
  name: '', code: '', trading_name: '', cnpj: '',
  contact_name: '', contact_person: '', email: '', phone: '', address: '', website: '',
  default_markup_percent: null, min_order_value: null, delivery_time_days: null,
  payment_terms: '', shipping_terms: '', priority: 50, notes: '',
  is_product_supplier: true, is_engraving_supplier: false, active: true,
};

const ORGANIZATION_ID = '5db5aee1-064b-4ef4-9193-345dcd8274ea';

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'engraving'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invokeExternalDb<Supplier>({
        table: 'suppliers',
        operation: 'select',
        select: '*',
        orderBy: { column: 'name', ascending: true },
        limit: 200,
      });
      setSuppliers(result.records || []);
    } catch (err: any) {
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.trading_name?.toLowerCase().includes(q)) ||
      (s.cnpj?.includes(q)) ||
      (s.email?.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const handleNew = () => {
    setEditingSupplier({ ...EMPTY_SUPPLIER });
    setIsNew(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier({ ...supplier });
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!editingSupplier?.name?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        name: editingSupplier.name!.trim(),
        code: editingSupplier.code?.trim() || editingSupplier.name!.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20),
        trading_name: editingSupplier.trading_name?.trim() || null,
        cnpj: editingSupplier.cnpj?.trim() || null,
        active: editingSupplier.active ?? true,
        contact_name: editingSupplier.contact_name?.trim() || null,
        contact_person: editingSupplier.contact_person?.trim() || null,
        email: editingSupplier.email?.trim() || null,
        phone: editingSupplier.phone?.trim() || null,
        address: editingSupplier.address?.trim() || null,
        website: editingSupplier.website?.trim() || null,
        default_markup_percent: editingSupplier.default_markup_percent ?? null,
        min_order_value: editingSupplier.min_order_value ?? null,
        minimum_order_value: editingSupplier.min_order_value ?? null,
        delivery_time_days: editingSupplier.delivery_time_days ?? null,
        payment_terms: editingSupplier.payment_terms?.trim() || null,
        shipping_terms: editingSupplier.shipping_terms?.trim() || null,
        priority: editingSupplier.priority ?? 50,
        notes: editingSupplier.notes?.trim() || null,
        is_product_supplier: editingSupplier.is_product_supplier ?? true,
        is_engraving_supplier: editingSupplier.is_engraving_supplier ?? false,
        updated_at: now,
      };

      if (isNew) {
        payload.organization_id = ORGANIZATION_ID;
        payload.created_at = now;
        await invokeExternalDbSingle({ table: 'suppliers', operation: 'insert', data: payload });
        toast.success(`Fornecedor "${editingSupplier.name}" criado`);
      } else {
        await invokeExternalDbSingle({
          table: 'suppliers',
          operation: 'update',
          id: editingSupplier.id,
          data: payload,
        });
        toast.success(`Fornecedor "${editingSupplier.name}" atualizado`);
      }

      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Deseja realmente excluir o fornecedor "${supplier.name}"?`)) return;
    setDeleting(supplier.id);
    try {
      await invokeExternalDbDelete('suppliers', supplier.id);
      toast.success(`Fornecedor "${supplier.name}" excluído`);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir fornecedor');
    } finally {
      setDeleting(null);
    }
  };

  const updateField = (field: string, value: unknown) => {
    setEditingSupplier(prev => prev ? { ...prev, [field]: value } : null);
  };

  const fieldClass = "mt-1.5 h-9";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSuppliers} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleNew} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Badge variant="secondary" className="gap-1.5">
          <Building2 className="h-3 w-3" />
          {suppliers.length} fornecedores
        </Badge>
        <Badge variant="secondary" className="gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          {suppliers.filter(s => s.active).length} ativos
        </Badge>
        {search && (
          <Badge variant="outline" className="gap-1.5">
            {filtered.length} resultado(s)
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Markup</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-right">Prioridade</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {search ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(supplier => (
                  <TableRow key={supplier.id} className="group cursor-pointer hover:bg-accent/50" onClick={() => handleEdit(supplier)}>
                    <TableCell>
                      {supplier.active ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{supplier.name}</p>
                        {supplier.trading_name && (
                          <p className="text-xs text-muted-foreground">{supplier.trading_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{supplier.code}</code>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {supplier.email && <p>{supplier.email}</p>}
                        {supplier.phone && <p className="text-muted-foreground">{supplier.phone}</p>}
                        {!supplier.email && !supplier.phone && <p className="text-muted-foreground">—</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {supplier.default_markup_percent != null ? (
                        <span className="text-sm font-mono">{supplier.default_markup_percent}%</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        {supplier.is_product_supplier && (
                          <Badge variant="outline" className="text-[10px] px-1.5">Produtos</Badge>
                        )}
                        {supplier.is_engraving_supplier && (
                          <Badge variant="outline" className="text-[10px] px-1.5">Gravação</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-mono">{supplier.priority ?? '—'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleEdit(supplier); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(supplier); }}
                          disabled={deleting === supplier.id}
                        >
                          {deleting === supplier.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={(open) => { if (!open) setEditingSupplier(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {isNew ? 'Novo Fornecedor' : `Editar: ${editingSupplier?.name}`}
            </DialogTitle>
          </DialogHeader>

          {editingSupplier && (
            <Tabs defaultValue="basic" className="mt-2">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="basic" className="text-xs gap-1.5"><Building2 className="h-3.5 w-3.5" />Dados</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs gap-1.5"><Phone className="h-3.5 w-3.5" />Contato</TabsTrigger>
                <TabsTrigger value="commercial" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" />Comercial</TabsTrigger>
                <TabsTrigger value="classification" className="text-xs gap-1.5"><Settings2 className="h-3.5 w-3.5" />Tipo</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Nome <span className="text-destructive">*</span></Label>
                    <Input value={editingSupplier.name || ''} onChange={e => updateField('name', e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Código <span className="text-destructive">*</span></Label>
                    <Input value={editingSupplier.code || ''} onChange={e => updateField('code', e.target.value)} className={`${fieldClass} font-mono uppercase`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Nome Fantasia</Label>
                    <Input value={editingSupplier.trading_name || ''} onChange={e => updateField('trading_name', e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">CNPJ</Label>
                    <Input value={editingSupplier.cnpj || ''} onChange={e => updateField('cnpj', maskCnpj(e.target.value))} className={`${fieldClass} font-mono`} maxLength={18} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label className="text-sm">Ativo</Label>
                  <Switch checked={editingSupplier.active ?? true} onCheckedChange={v => updateField('active', v)} />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Nome do Contato</Label>
                    <Input value={editingSupplier.contact_name || ''} onChange={e => updateField('contact_name', e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Pessoa de Contato</Label>
                    <Input value={editingSupplier.contact_person || ''} onChange={e => updateField('contact_person', e.target.value)} className={fieldClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <Input type="email" value={editingSupplier.email || ''} onChange={e => updateField('email', e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Telefone</Label>
                    <Input value={editingSupplier.phone || ''} onChange={e => updateField('phone', maskPhone(e.target.value))} className={fieldClass} maxLength={15} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Endereço</Label>
                  <Input value={editingSupplier.address || ''} onChange={e => updateField('address', e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Website</Label>
                  <Input value={editingSupplier.website || ''} onChange={e => updateField('website', e.target.value)} className={fieldClass} />
                </div>
              </TabsContent>

              <TabsContent value="commercial" className="space-y-4 pt-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Markup (%)</Label>
                    <Input type="number" value={editingSupplier.default_markup_percent ?? ''} onChange={e => updateField('default_markup_percent', e.target.value ? parseFloat(e.target.value) : null)} className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Pedido Mínimo (R$)</Label>
                    <Input type="number" value={editingSupplier.min_order_value ?? ''} onChange={e => updateField('min_order_value', e.target.value ? parseFloat(e.target.value) : null)} className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Prazo (dias)</Label>
                    <Input type="number" value={editingSupplier.delivery_time_days ?? ''} onChange={e => updateField('delivery_time_days', e.target.value ? parseInt(e.target.value) : null)} className={fieldClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Cond. Pagamento</Label>
                    <Input value={editingSupplier.payment_terms || ''} onChange={e => updateField('payment_terms', e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Cond. Frete</Label>
                    <Input value={editingSupplier.shipping_terms || ''} onChange={e => updateField('shipping_terms', e.target.value)} className={fieldClass} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Prioridade (0-100)</Label>
                  <Input type="number" value={editingSupplier.priority ?? 50} onChange={e => updateField('priority', e.target.value ? parseInt(e.target.value) : 50)} className={`${fieldClass} w-24`} min={0} max={100} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Observações</Label>
                  <Textarea value={editingSupplier.notes || ''} onChange={e => updateField('notes', e.target.value)} className="mt-1.5 min-h-[80px]" />
                </div>
              </TabsContent>

              <TabsContent value="classification" className="space-y-6 pt-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">Fornecedor de Produtos</p>
                    <p className="text-xs text-muted-foreground">Fornece produtos físicos para revenda</p>
                  </div>
                  <Switch checked={editingSupplier.is_product_supplier ?? true} onCheckedChange={v => updateField('is_product_supplier', v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">Fornecedor de Gravação</p>
                    <p className="text-xs text-muted-foreground">Fornece serviços de personalização/gravação</p>
                  </div>
                  <Switch checked={editingSupplier.is_engraving_supplier ?? false} onCheckedChange={v => updateField('is_engraving_supplier', v)} />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button variant="ghost" size="sm" onClick={() => setEditingSupplier(null)}>Cancelar</Button>
            <Button size="sm" disabled={saving} onClick={handleSave} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {isNew ? 'Criar Fornecedor' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
