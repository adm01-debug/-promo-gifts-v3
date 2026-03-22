import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { invokeExternalDb, invokeExternalDbSingle, invokeExternalDbDelete } from '@/lib/external-db';
import { supabase } from '@/integrations/supabase/client';
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
  Settings2, RefreshCw, ExternalLink, CheckCircle2, XCircle, ImagePlus, X,
  MapPin, Globe, UserPlus, Landmark,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SupplierContact {
  id: string;
  role: string;
  name: string;
  signature: string;
  nickname: string;
  email: string;
  phone: string;
}

const CONTACT_ROLES = [
  'Proprietário', 'Diretor', 'Gerente', 'Vendedor',
  'Financeiro', 'Compras', 'Logística', 'Suporte', 'Outro',
] as const;

const createEmptyContact = (): SupplierContact => ({
  id: crypto.randomUUID(), role: '', name: '', signature: '', nickname: '', email: '', phone: '',
});
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
  logo_url: string | null;
  contacts: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  tiktok: string | null;
  // Endereço estruturado (company_addresses)
  tipo_logradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  pais: string | null;
  ponto_referencia: string | null;
  google_maps_url: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  horario_funcionamento: string | null;
  instrucoes_entrega: string | null;
  created_at: string;
  updated_at: string;
}

const EMPTY_SUPPLIER: Partial<Supplier> = {
  name: '', code: '', trading_name: '', cnpj: '',
  contact_name: '', contact_person: '', email: '', phone: '', address: '', website: '',
  default_markup_percent: null, min_order_value: null, delivery_time_days: null,
  payment_terms: '', shipping_terms: '', priority: 50, notes: '',
  is_product_supplier: true, is_engraving_supplier: false, active: true, logo_url: null,
  tipo_logradouro: '', logradouro: '', numero: '', complemento: '', bairro: '',
  cidade: '', estado: '', cep: '', pais: 'Brasil',
  ponto_referencia: '', google_maps_url: '', google_place_id: '',
  latitude: null, longitude: null, horario_funcionamento: '', instrucoes_entrega: '',
};

const ORGANIZATION_ID = '5db5aee1-064b-4ef4-9193-345dcd8274ea';

import { maskCnpj, maskPhone, validateCnpj, maskCep, ESTADOS_BR } from '@/utils/masks';
import { fetchAddressByCep } from '@/utils/viacep';
import { fetchCnpjData } from '@/utils/cnpj-lookup';
import { logger } from "@/lib/logger";

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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [contacts, setContacts] = useState<SupplierContact[]>([createEmptyContact()]);
  const [formaPagamento, setFormaPagamento] = useState<string[]>([]);

  interface PixKey { id: string; tipo: string; chave: string; favorecido: string; principal: boolean; }
  const createEmptyPixKey = (principal = false): PixKey => ({ id: crypto.randomUUID(), tipo: '', chave: '', favorecido: '', principal });
  const [pixKeys, setPixKeys] = useState<PixKey[]>([createEmptyPixKey(true)]);

  const updatePixKey = (id: string, field: keyof Omit<PixKey, 'id'>, value: string | boolean) => {
    setPixKeys(prev => prev.map(k => {
      if (k.id !== id) return field === 'principal' && value === true ? { ...k, principal: false } : k;
      return { ...k, [field]: value };
    }));
  };
  const addPixKey = () => setPixKeys(prev => [...prev, createEmptyPixKey(prev.length === 0)]);
  const removePixKey = (id: string) => setPixKeys(prev => {
    const next = prev.filter(k => k.id !== id);
    if (next.length > 0 && !next.some(k => k.principal)) next[0].principal = true;
    return next.length > 0 ? next : [createEmptyPixKey(true)];
  });

  const [foneFixo1, setFoneFixo1] = useState('');
  const [foneFixo2, setFoneFixo2] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const updateContact = (id: string, field: keyof SupplierContact, value: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const addContact = () => setContacts(prev => [...prev, createEmptyContact()]);
  const removeContact = (id: string) => setContacts(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);

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
    let result = suppliers;

    // Filter by type
    if (filterType === 'product') result = result.filter(s => s.is_product_supplier);
    else if (filterType === 'engraving') result = result.filter(s => s.is_engraving_supplier);

    // Filter by status
    if (filterStatus === 'active') result = result.filter(s => s.active);
    else if (filterStatus === 'inactive') result = result.filter(s => !s.active);

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.trading_name?.toLowerCase().includes(q)) ||
        (s.cnpj?.includes(q)) ||
        (s.email?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [suppliers, search, filterType, filterStatus]);

  const handleNew = () => {
    setEditingSupplier({ ...EMPTY_SUPPLIER });
    setContacts([createEmptyContact()]);
    setIsNew(true);
  };

  const handleEdit = (supplier: Supplier) => {
    const s = { ...supplier };

    // Parse address_details JSON if available
    try {
      const addr = supplier.address_details ? JSON.parse(supplier.address_details as string) : null;
      if (addr && typeof addr === 'object') {
        Object.assign(s, addr);
      }
    } catch { /* ignore */ }

    // Parse social_details JSON if available
    try {
      const social = supplier.social_details ? JSON.parse(supplier.social_details as string) : null;
      if (social && typeof social === 'object') {
        Object.assign(s, social);
      }
    } catch { /* ignore */ }

    setEditingSupplier(s);

    // Parse contacts from JSON if available
    try {
      const parsed = supplier.contacts ? JSON.parse(supplier.contacts) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setContacts(parsed.map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() })));
      } else {
        // Fallback: create from legacy single-contact fields
        const legacy = createEmptyContact();
        if (supplier.contact_name) legacy.name = supplier.contact_name;
        if (supplier.contact_person) legacy.role = supplier.contact_person;
        if (supplier.email) legacy.email = supplier.email;
        if (supplier.phone) legacy.phone = supplier.phone;
        setContacts([legacy]);
      }
    } catch {
      setContacts([createEmptyContact()]);
    }

    // Parse financial data from notes
    const notesStr = supplier.notes || '';
    
    // Try new multi-PIX format first
    const finMatchNew = notesStr.match(/\[Financeiro: Forma: (.*?), PIX: (.*?), PIX Atualizado: (.*?)\]/);
    // Fallback to legacy single-PIX format
    const finMatchLegacy = notesStr.match(/\[Financeiro: Forma: (.*?), PIX Tipo: (.*?), PIX Número: (.*?), PIX Favorecido: (.*?), PIX Atualizado: (.*?)\]/);
    
    if (finMatchNew) {
      const formas = finMatchNew[1] !== '-' ? finMatchNew[1].split(',').filter(Boolean) : [];
      setFormaPagamento(formas);
      const pixData = finMatchNew[2];
      if (pixData && pixData !== '-') {
        const keys = pixData.split(';;').map(entry => {
          const [tipo, chave, favorecido, principal] = entry.split('|');
          return { id: crypto.randomUUID(), tipo: tipo === '-' ? '' : tipo, chave, favorecido: favorecido === '-' ? '' : favorecido, principal: principal === '1' };
        });
        if (keys.length > 0 && !keys.some(k => k.principal)) keys[0].principal = true;
        setPixKeys(keys.length > 0 ? keys : [createEmptyPixKey(true)]);
      } else {
        setPixKeys([createEmptyPixKey(true)]);
      }
    } else if (finMatchLegacy) {
      const formas = finMatchLegacy[1] !== '-' ? finMatchLegacy[1].split(',').filter(Boolean) : [];
      setFormaPagamento(formas);
      const tipo = finMatchLegacy[2] !== '-' ? finMatchLegacy[2] : '';
      const chave = finMatchLegacy[3] !== '-' ? finMatchLegacy[3] : '';
      const favorecido = finMatchLegacy[4] !== '-' ? finMatchLegacy[4] : '';
      if (chave) {
        setPixKeys([{ id: crypto.randomUUID(), tipo, chave, favorecido, principal: true }]);
      } else {
        setPixKeys([createEmptyPixKey(true)]);
      }
    } else {
      setFormaPagamento([]);
      setPixKeys([createEmptyPixKey(true)]);
    }

    // Parse landline phones from notes
    const foneMatch = notesStr.match(/\[Fones Fixos: 01: (.*?), 02: (.*?)\]/);
    if (foneMatch) {
      setFoneFixo1(foneMatch[1] !== '-' ? foneMatch[1] : '');
      setFoneFixo2(foneMatch[2] !== '-' ? foneMatch[2] : '');
    } else {
      setFoneFixo1(''); setFoneFixo2('');
    }

    setIsNew(false);
  };

  const handleSave = async () => {
    if (!editingSupplier?.name?.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const cnpjRaw = editingSupplier.cnpj?.replace(/\D/g, '') || '';
    if (cnpjRaw.length > 0 && !validateCnpj(cnpjRaw)) {
      toast.error('CNPJ informado é inválido');
      return;
    }
    setSaving(true);

    // === Verificação de duplicidade por CNPJ (excluindo o próprio registro) ===
    if (cnpjRaw.length === 14 && editingSupplier.cnpj) {
      try {
        const { invokeExternalDb } = await import('@/lib/external-db');
        const existing = await invokeExternalDb<{ id: string; name: string; cnpj: string }>({
          table: 'suppliers',
          operation: 'select',
          select: 'id,name,cnpj',
          filters: { cnpj: editingSupplier.cnpj.trim() },
          limit: 5,
        });
        const duplicate = existing.records?.find(r => r.id !== editingSupplier.id);
        if (duplicate) {
          toast.error(`Já existe outro fornecedor com este CNPJ: "${duplicate.name}". Cadastro duplicado não é permitido.`);
          setSaving(false);
          return;
        }
      } catch (err) {
        logger.warn('[SuppliersManager] Falha ao verificar duplicidade de CNPJ:', err);
      }
    }

    // === Verificação de duplicidade por Nome/Razão Social (excluindo o próprio) ===
    if (editingSupplier.name?.trim()) {
      try {
        const { invokeExternalDb: invokeDbName } = await import('@/lib/external-db');
        const existingByName = await invokeDbName<{ id: string; name: string }>({
          table: 'suppliers',
          operation: 'select',
          select: 'id,name',
          filters: { name: editingSupplier.name.trim() },
          limit: 5,
        });
        const dupByName = existingByName.records?.find(r => r.id !== editingSupplier.id);
        if (dupByName) {
          toast.error(`Já existe outro fornecedor com este nome: "${dupByName.name}". Cadastro duplicado não é permitido.`);
          setSaving(false);
          return;
        }
      } catch (err) {
        logger.warn('[SuppliersManager] Falha ao verificar duplicidade de nome:', err);
      }
    }

    // === Verificação de duplicidade por Nome Fantasia (trading_name), excluindo o próprio ===
    if (editingSupplier.trading_name?.trim()) {
      try {
        const { invokeExternalDb: invokeDbTN } = await import('@/lib/external-db');
        const existingByTN = await invokeDbTN<{ id: string; name: string; trading_name: string }>({
          table: 'suppliers',
          operation: 'select',
          select: 'id,name,trading_name',
          filters: { trading_name: editingSupplier.trading_name.trim() },
          limit: 5,
        });
        const dupByTN = existingByTN.records?.find(r => r.id !== editingSupplier.id);
        if (dupByTN) {
          toast.error(`Já existe outro fornecedor com este Nome Fantasia: "${dupByTN.trading_name || dupByTN.name}". Cadastro duplicado não é permitido.`);
          setSaving(false);
          return;
        }
      } catch (err) {
        logger.warn('[SuppliersManager] Falha ao verificar duplicidade de nome fantasia:', err);
      }
    }

    try {
      const now = new Date().toISOString();
      // Build rich address string from individual fields
      const es = editingSupplier;
      const addressParts = [
        es.tipo_logradouro && es.logradouro ? `${es.tipo_logradouro} ${es.logradouro}` : es.logradouro,
        es.numero, es.complemento, es.bairro, es.cidade, es.estado,
        es.cep ? `CEP ${es.cep}` : null,
      ].filter(Boolean).join(', ') || es.address?.trim() || null;

      // addressDetails and socialDetails are kept in-memory only for the edit form
      // The external DB only has 'address' (string), plus individual social columns

      const payload: Record<string, unknown> = {
        name: es.name!.trim(),
        code: es.code?.trim() || es.name!.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20),
        trading_name: es.trading_name?.trim() || null,
        cnpj: es.cnpj?.trim() || null,
        active: es.active ?? true,
        contact_name: contacts[0]?.name?.trim() || null,
        contact_person: contacts[0]?.role?.trim() || null,
        email: contacts[0]?.email?.trim() || null,
        phone: contacts[0]?.phone?.trim() || null,
        // contacts/social columns don't exist in external DB
        address: addressParts,
        website: es.website?.trim() || null,
        default_markup_percent: es.default_markup_percent ?? null,
        min_order_value: es.min_order_value ?? null,
        minimum_order_value: es.min_order_value ?? null,
        delivery_time_days: es.delivery_time_days ?? null,
        payment_terms: es.payment_terms?.trim() || null,
        shipping_terms: es.shipping_terms?.trim() || null,
        priority: es.priority ?? 50,
        notes: (() => {
          const parts: string[] = [];
          const userNotes = es.notes?.trim()
            ?.replace(/\[Contato 1 extras:.*?\]/g, '')
            ?.replace(/\[Contatos adicionais:.*?\]/g, '')
            ?.replace(/\[Redes Sociais:.*?\]/g, '')
            ?.replace(/\[Financeiro:.*?\]/g, '')
            ?.replace(/\[Fones Fixos:.*?\]/g, '')
            ?.trim();
          if (userNotes) parts.push(userNotes);
          const c0 = contacts[0];
          if (c0?.signature?.trim() || c0?.nickname?.trim()) {
            parts.push(`[Contato 1 extras: Assinatura: ${c0.signature?.trim() || '-'}, Apelido: ${c0.nickname?.trim() || '-'}]`);
          }
          const extraContacts = contacts.slice(1).filter(c => c.name.trim());
          if (extraContacts.length > 0) {
            const extraInfo = `[Contatos adicionais: ${extraContacts.map(c => `${c.role || 'N/A'} - ${c.name} (${c.email || '-'}, ${c.phone || '-'}, Assinatura: ${c.signature?.trim() || '-'}, Apelido: ${c.nickname?.trim() || '-'})`).join('; ')}]`;
            parts.push(extraInfo);
          }
          // Persist financial/PIX data
          if (formaPagamento.length > 0 || pixKeys.some(k => k.chave.trim())) {
            const now_date = new Date().toISOString().split('T')[0];
            const pixData = pixKeys.filter(k => k.chave.trim()).map(k => `${k.tipo || '-'}|${k.chave}|${k.favorecido || '-'}|${k.principal ? '1' : '0'}`).join(';;');
            parts.push(`[Financeiro: Forma: ${formaPagamento.join(',') || '-'}, PIX: ${pixData || '-'}, PIX Atualizado: ${now_date}]`);
          }
          // Persist landline phones
          if (foneFixo1.trim() || foneFixo2.trim()) {
            parts.push(`[Fones Fixos: 01: ${foneFixo1.trim() || '-'}, 02: ${foneFixo2.trim() || '-'}]`);
          }
          return parts.join('\n') || null;
        })(),
        is_product_supplier: es.is_product_supplier ?? true,
        is_engraving_supplier: es.is_engraving_supplier ?? false,
        updated_at: now,
      };

      // logo_url: incluir condicionalmente (coluna pode não existir ainda no banco externo)
      // Se tem valor, envia. Se tinha valor e foi removido (null explícito em edição), também envia.
      if (editingSupplier.logo_url) {
        payload.logo_url = editingSupplier.logo_url;
      } else if (!isNew && editingSupplier.logo_url === null) {
        // Em edição, se o usuário removeu a logo, tentar enviar null
        // (só funciona se a coluna existir no banco externo)
        try {
          payload.logo_url = null;
        } catch { /* ignore if column doesn't exist */ }
      }

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB');
      return;
    }
    setUploadingLogo(true);
    try {
      // Padrão CRM: suppliers/{id}.ext — usa id do fornecedor ou timestamp para novos
      const supplierId = editingSupplier?.id || `new-${Date.now()}`;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `suppliers/${supplierId}.${ext}`;

      // Upload ao bucket local seguindo o padrão de naming do CRM
      const { error } = await supabase.storage
        .from('supplier-logos')
        .upload(filePath, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('supplier-logos')
        .getPublicUrl(filePath);

      updateField('logo_url', urlData.publicUrl);
      toast.success('Logo enviada com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
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

      {/* Filters & Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-border p-1">
          <Button variant={filterType === 'all' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setFilterType('all')}>Todos</Button>
          <Button variant={filterType === 'product' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setFilterType('product')}>Produtos</Button>
          <Button variant={filterType === 'engraving' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setFilterType('engraving')}>Gravação</Button>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border p-1">
          <Button variant={filterStatus === 'all' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setFilterStatus('all')}>Todos</Button>
          <Button variant={filterStatus === 'active' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setFilterStatus('active')}>
            <CheckCircle2 className="h-3 w-3" />Ativos
          </Button>
          <Button variant={filterStatus === 'inactive' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setFilterStatus('inactive')}>
            <XCircle className="h-3 w-3" />Inativos
          </Button>
        </div>
        <div className="flex gap-2 ml-auto">
          <Badge variant="secondary" className="gap-1.5">
            <Building2 className="h-3 w-3" />
            {suppliers.length} fornecedores
          </Badge>
          {(search || filterType !== 'all' || filterStatus !== 'all') && (
            <Badge variant="outline" className="gap-1.5">
              {filtered.length} resultado(s)
            </Badge>
          )}
        </div>
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
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {supplier.logo_url ? (
                          <img src={supplier.logo_url} alt="" className="w-8 h-8 rounded object-contain border border-border bg-muted shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded border border-border bg-muted flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{supplier.name}</p>
                          {supplier.trading_name && (
                            <p className="text-xs text-muted-foreground">{supplier.trading_name}</p>
                          )}
                        </div>
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
              <TabsList className="grid w-full grid-cols-7 h-9">
                <TabsTrigger value="basic" className="text-xs gap-1.5"><Building2 className="h-3.5 w-3.5" />Dados</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs gap-1.5"><Phone className="h-3.5 w-3.5" />Contatos</TabsTrigger>
                <TabsTrigger value="address" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" />Endereço</TabsTrigger>
                <TabsTrigger value="social" className="text-xs gap-1.5"><Globe className="h-3.5 w-3.5" />Site/Redes</TabsTrigger>
                <TabsTrigger value="commercial" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" />Comercial</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs gap-1.5"><Landmark className="h-3.5 w-3.5" />Financeiro</TabsTrigger>
                <TabsTrigger value="classification" className="text-xs gap-1.5"><Settings2 className="h-3.5 w-3.5" />Tipo</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-3">
                {/* 1 - LOGO + 2 - NOME FANTASIA */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    {editingSupplier.logo_url ? (
                      <div className="relative w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted">
                        <img src={editingSupplier.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => updateField('logo_url', null)}
                          className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="h-5 w-5" />
                            <span className="text-[10px]">Logo</span>
                          </>
                        )}
                      </button>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs font-semibold">Nome Fantasia</Label>
                    <Input value={editingSupplier.trading_name || ''} onChange={e => updateField('trading_name', e.target.value)} className={fieldClass} />
                  </div>
                </div>

                {/* 3 - RAZÃO SOCIAL */}
                <div>
                  <Label className="text-xs font-semibold">Razão Social <span className="text-destructive">*</span></Label>
                  <Input value={editingSupplier.name || ''} onChange={e => updateField('name', e.target.value)} className={fieldClass} />
                </div>

                {/* 4 - CNPJ + 5 - CÓDIGO */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">CNPJ</Label>
                    <div className="flex gap-1.5">
                      <Input value={editingSupplier.cnpj || ''} onChange={e => updateField('cnpj', maskCnpj(e.target.value))} className={`${fieldClass} font-mono flex-1`} maxLength={18} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 shrink-0"
                        disabled={fetchingCnpj || (editingSupplier.cnpj?.replace(/\D/g, '') || '').length !== 14}
                        onClick={async () => {
                          const digits = editingSupplier.cnpj?.replace(/\D/g, '') || '';
                          if (!validateCnpj(digits)) { toast.error('CNPJ inválido'); return; }
                          setFetchingCnpj(true);
                          try {
                            const data = await fetchCnpjData(digits);
                            if (data) {
                              if (data.razao_social) updateField('name', data.razao_social);
                              if (data.nome_fantasia) updateField('trading_name', data.nome_fantasia);
                              if (data.logradouro) updateField('logradouro', data.logradouro);
                              if (data.numero) updateField('numero', data.numero);
                              if (data.complemento) updateField('complemento', data.complemento);
                              if (data.bairro) updateField('bairro', data.bairro);
                              if (data.cidade) updateField('cidade', data.cidade);
                              if (data.estado) updateField('estado', data.estado);
                              if (data.cep) updateField('cep', maskCep(data.cep));
                              if (data.email) updateField('email', data.email);
                              if (data.telefone) updateField('phone', data.telefone);
                              toast.success('Dados preenchidos via CNPJ!');
                            }
                          } catch (err: any) {
                            toast.error(err.message || 'Erro ao consultar CNPJ');
                          } finally {
                            setFetchingCnpj(false);
                          }
                        }}
                      >
                        {fetchingCnpj ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Código <span className="text-destructive">*</span></Label>
                    <Input value={editingSupplier.code || ''} onChange={e => updateField('code', e.target.value)} className={`${fieldClass} font-mono uppercase`} />
                  </div>
                </div>

                {/* Fone Fixo 01 + Fone Fixo 02 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Fone Fixo 01</Label>
                    <Input value={foneFixo1} onChange={e => setFoneFixo1(maskPhone(e.target.value))} placeholder="(00) 0000-0000" className={fieldClass} maxLength={15} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Fone Fixo 02</Label>
                    <Input value={foneFixo2} onChange={e => setFoneFixo2(maskPhone(e.target.value))} placeholder="(00) 0000-0000" className={fieldClass} maxLength={15} />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label className="text-sm">Ativo</Label>
                  <Switch checked={editingSupplier.active ?? true} onCheckedChange={v => updateField('active', v)} />
                </div>
              </TabsContent>

              {/* CONTATOS */}
              <TabsContent value="contact" className="space-y-3 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">
                    Adicione os contatos do fornecedor (proprietário, vendedor, gerente, etc.)
                  </p>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addContact}>
                    <UserPlus className="h-3.5 w-3.5" />
                    Adicionar Contato
                  </Button>
                </div>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {contacts.map((contact, index) => (
                    <div key={contact.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Contato {index + 1}</span>
                        {contacts.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeContact(contact.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Função / Cargo</Label>
                          <Select value={contact.role} onValueChange={(v) => updateContact(contact.id, 'role', v)}>
                            <SelectTrigger className={`${fieldClass} w-full`}>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTACT_ROLES.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Nome</Label>
                          <Input value={contact.name} onChange={(e) => updateContact(contact.id, 'name', e.target.value)} placeholder="Ex.: João" className={fieldClass} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Assinatura</Label>
                          <Input value={contact.signature} onChange={(e) => updateContact(contact.id, 'signature', e.target.value)} placeholder="Ex.: Silva" className={fieldClass} />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Apelido</Label>
                          <Input value={contact.nickname} onChange={(e) => updateContact(contact.id, 'nickname', e.target.value)} placeholder="Ex: Joãozinho" className={fieldClass} />
                        </div>
                      </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div>
                           <Label className="text-xs font-semibold">Telefone</Label>
                           <Input value={contact.phone} onChange={(e) => updateContact(contact.id, 'phone', maskPhone(e.target.value))} placeholder="(11) 99999-9999" className={fieldClass} maxLength={15} />
                         </div>
                         <div>
                           <Label className="text-xs font-semibold">E-mail</Label>
                           <Input type="email" value={contact.email} onChange={(e) => updateContact(contact.id, 'email', e.target.value)} placeholder="contato@fornecedor.com" className={fieldClass} />
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ENDEREÇO */}
              <TabsContent value="address" className="space-y-3 pt-3">
                {/* Linha 1: CEP + Tipo Logradouro */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">CEP</Label>
                    <Input value={editingSupplier.cep || ''} onChange={async e => {
                      const masked = maskCep(e.target.value);
                      updateField('cep', masked);
                      if (masked.replace(/\D/g, '').length === 8) {
                        const addr = await fetchAddressByCep(masked);
                        if (addr) {
                          if (addr.logradouro) updateField('logradouro', addr.logradouro);
                          if (addr.bairro) updateField('bairro', addr.bairro);
                          if (addr.localidade) updateField('cidade', addr.localidade);
                          if (addr.uf) updateField('estado', addr.uf);
                          toast.success('Endereço preenchido via CEP');
                        }
                      }
                    }} placeholder="00000-000" className={`${fieldClass} font-mono`} maxLength={9} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Tipo Logradouro</Label>
                    <select value={editingSupplier.tipo_logradouro || ''} onChange={e => updateField('tipo_logradouro', e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Selecione</option>
                      {['Rua', 'Avenida', 'Alameda', 'Travessa', 'Praça', 'Rodovia', 'Estrada', 'Viela', 'Largo', 'Outro'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {/* Linha 2: Logradouro */}
                <div>
                  <Label className="text-xs font-semibold">Logradouro</Label>
                  <Input value={editingSupplier.logradouro || ''} onChange={e => updateField('logradouro', e.target.value)} placeholder="Nome da rua" className={fieldClass} />
                </div>
                {/* Linha 3: Número + Complemento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Número</Label>
                    <Input value={editingSupplier.numero || ''} onChange={e => updateField('numero', e.target.value)} placeholder="123" className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Complemento</Label>
                    <Input value={editingSupplier.complemento || ''} onChange={e => updateField('complemento', e.target.value)} placeholder="Sala 101, Bloco A" className={fieldClass} />
                  </div>
                </div>
                {/* Linha 4: Bairro + Cidade */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Bairro</Label>
                    <Input value={editingSupplier.bairro || ''} onChange={e => updateField('bairro', e.target.value)} placeholder="Centro" className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Cidade</Label>
                    <Input value={editingSupplier.cidade || ''} onChange={e => updateField('cidade', e.target.value)} placeholder="São Paulo" className={fieldClass} />
                  </div>
                </div>
                {/* Linha 5: Estado + País */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Estado</Label>
                    <select value={editingSupplier.estado || ''} onChange={e => updateField('estado', e.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Selecione</option>
                      {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">País</Label>
                    <Input value={editingSupplier.pais || 'Brasil'} onChange={e => updateField('pais', e.target.value)} className={fieldClass} />
                  </div>
                </div>
                {/* Linha 6: Ponto de Referência */}
                <div>
                  <Label className="text-xs font-semibold">Ponto de Referência</Label>
                  <Input value={editingSupplier.ponto_referencia || ''} onChange={e => updateField('ponto_referencia', e.target.value)} placeholder="Próximo ao..." className={fieldClass} />
                </div>
                {/* Linha 7: Latitude + Longitude */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Latitude</Label>
                    <Input type="number" step="any" value={editingSupplier.latitude ?? ''} onChange={e => updateField('latitude', e.target.value ? parseFloat(e.target.value) : null)} placeholder="-23.5505" className={`${fieldClass} font-mono`} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Longitude</Label>
                    <Input type="number" step="any" value={editingSupplier.longitude ?? ''} onChange={e => updateField('longitude', e.target.value ? parseFloat(e.target.value) : null)} placeholder="-46.6333" className={`${fieldClass} font-mono`} />
                  </div>
                </div>
                {/* Linha 8: Google Maps URL + Place ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Google Maps URL</Label>
                    <Input value={editingSupplier.google_maps_url || ''} onChange={e => updateField('google_maps_url', e.target.value)} placeholder="https://maps.google.com/..." className={fieldClass} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Google Place ID</Label>
                    <Input value={editingSupplier.google_place_id || ''} onChange={e => updateField('google_place_id', e.target.value)} placeholder="ChIJ..." className={fieldClass} />
                  </div>
                </div>
                {/* Linha 9: Horário */}
                <div>
                  <Label className="text-xs font-semibold">Horário de Funcionamento</Label>
                  <Input value={editingSupplier.horario_funcionamento || ''} onChange={e => updateField('horario_funcionamento', e.target.value)} placeholder="Seg-Sex 08:00-18:00" className={fieldClass} />
                </div>
                {/* Linha 10: Instruções de Entrega */}
                <div>
                  <Label className="text-xs font-semibold">Instruções de Entrega</Label>
                  <Textarea value={editingSupplier.instrucoes_entrega || ''} onChange={e => updateField('instrucoes_entrega', e.target.value)} placeholder="Entrar pela portaria lateral..." className="mt-1.5 min-h-[60px]" />
                </div>
              </TabsContent>

              {/* SITE E REDES SOCIAIS */}
              <TabsContent value="social" className="space-y-4 pt-3">
                <div>
                  <Label className="text-xs font-semibold">Website</Label>
                  <Input value={editingSupplier.website || ''} onChange={e => updateField('website', e.target.value)} placeholder="https://www.fornecedor.com.br" className={fieldClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Instagram</Label>
                  <Input value={editingSupplier.instagram || ''} onChange={e => updateField('instagram', e.target.value)} placeholder="@fornecedor" className={fieldClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Facebook</Label>
                  <Input value={editingSupplier.facebook || ''} onChange={e => updateField('facebook', e.target.value)} placeholder="facebook.com/fornecedor" className={fieldClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">LinkedIn</Label>
                  <Input value={editingSupplier.linkedin || ''} onChange={e => updateField('linkedin', e.target.value)} placeholder="linkedin.com/company/fornecedor" className={fieldClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">YouTube</Label>
                  <Input value={editingSupplier.youtube || ''} onChange={e => updateField('youtube', e.target.value)} placeholder="youtube.com/@fornecedor" className={fieldClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold">TikTok</Label>
                  <Input value={editingSupplier.tiktok || ''} onChange={e => updateField('tiktok', e.target.value)} placeholder="@fornecedor" className={fieldClass} />
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

              {/* FINANCEIRO */}
              <TabsContent value="financial" className="space-y-4 pt-3">
                <div>
                  <Label className="text-xs font-semibold">Formas de Pagamento</Label>
                  <div className="flex gap-3 mt-1.5">
                    {['Boleto', 'PIX', 'Transferência', 'Cartão'].map(method => (
                      <label key={method} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formaPagamento.includes(method)}
                          onChange={(e) => {
                            if (e.target.checked) setFormaPagamento(prev => [...prev, method]);
                            else setFormaPagamento(prev => prev.filter(m => m !== method));
                          }}
                          className="rounded border-border"
                        />
                        {method}
                      </label>
                    ))}
                  </div>
                </div>

                {formaPagamento.includes('PIX') && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do PIX</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold">Tipo de Chave PIX</Label>
                        <Select value={pixTipo} onValueChange={setPixTipo}>
                          <SelectTrigger className={`${fieldClass} w-full`}>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CNPJ">CNPJ</SelectItem>
                            <SelectItem value="CPF">CPF</SelectItem>
                            <SelectItem value="Email">E-mail</SelectItem>
                            <SelectItem value="Telefone">Telefone</SelectItem>
                            <SelectItem value="Aleatória">Chave Aleatória</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Chave PIX</Label>
                        <Input value={pixNumero} onChange={e => setPixNumero(e.target.value)} placeholder="Ex: 00.000.000/0000-00" className={fieldClass} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold">Favorecido (Nome)</Label>
                        <Input value={pixFavorecido} onChange={e => setPixFavorecido(e.target.value)} placeholder="Nome do titular da conta PIX" className={fieldClass} />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Data de Cadastro/Atualização</Label>
                        <Input value={pixDataCadastro} disabled className={`${fieldClass} text-muted-foreground`} placeholder="Atualizado automaticamente" />
                      </div>
                    </div>
                  </div>
                )}
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
