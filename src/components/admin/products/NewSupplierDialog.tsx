import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Building2, Phone, DollarSign, Settings2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { maskCnpj, maskPhone, validateCnpj, maskCep, ESTADOS_BR } from '@/utils/masks';

interface NewSupplierDialogProps {
  onCreated: (id: string) => void;
}

const ORGANIZATION_ID = '5db5aee1-064b-4ef4-9193-345dcd8274ea';

export function NewSupplierDialog({ onCreated }: NewSupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Basic
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState('');

  // Contact
  const [contactName, setContactName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [pais, setPais] = useState('Brasil');
  const [pontoReferencia, setPontoReferencia] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  // Commercial
  const [defaultMarkup, setDefaultMarkup] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [deliveryTimeDays, setDeliveryTimeDays] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [shippingTerms, setShippingTerms] = useState('');
  const [priority, setPriority] = useState('50');
  const [notes, setNotes] = useState('');

  // Classification
  const [isProductSupplier, setIsProductSupplier] = useState(true);
  const [isEngravingSupplier, setIsEngravingSupplier] = useState(false);

  const resetForm = () => {
    setName(''); setCode(''); setTradingName(''); setCnpj('');
    setContactName(''); setContactPerson(''); setEmail(''); setPhone(''); setWebsite('');
    setLogradouro(''); setNumero(''); setComplemento(''); setBairro('');
    setCidade(''); setEstado(''); setCep(''); setPais('Brasil');
    setPontoReferencia(''); setGoogleMapsUrl('');
    setDefaultMarkup(''); setMinOrderValue(''); setDeliveryTimeDays('');
    setPaymentTerms(''); setShippingTerms(''); setPriority('50'); setNotes('');
    setIsProductSupplier(true); setIsEngravingSupplier(false);
    setLogoUrl('');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2MB'); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `suppliers/new-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('supplier-logos').upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('supplier-logos').getPublicUrl(filePath);
      setLogoUrl(urlData.publicUrl);
      toast.success('Logo enviada');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Nome do fornecedor é obrigatório');
      return;
    }
    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (cnpjDigits.length > 0 && !validateCnpj(cnpjDigits)) {
      setCnpjError('CNPJ inválido');
      toast.error('CNPJ informado é inválido');
      return;
    }
    setCnpjError('');
    setSaving(true);
    try {
      const { invokeExternalDbSingle } = await import('@/lib/external-db');
      const now = new Date().toISOString();
      const generatedCode = code.trim() || name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20);

      const data: Record<string, unknown> = {
        name: name.trim(),
        code: generatedCode,
        trading_name: tradingName.trim() || null,
        cnpj: cnpj.trim() || null,
        active: true,
        organization_id: ORGANIZATION_ID,
        contact_name: contactName.trim() || null,
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: [logradouro, numero, bairro, cidade, estado].filter(Boolean).join(', ') || null,
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        cep: cep.trim() || null,
        pais: pais.trim() || 'Brasil',
        ponto_referencia: pontoReferencia.trim() || null,
        google_maps_url: googleMapsUrl.trim() || null,
        website: website.trim() || null,
        default_markup_percent: defaultMarkup ? parseFloat(defaultMarkup) : null,
        min_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
        minimum_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
        delivery_time_days: deliveryTimeDays ? parseInt(deliveryTimeDays) : null,
        payment_terms: paymentTerms.trim() || null,
        shipping_terms: shippingTerms.trim() || null,
        priority: priority ? parseInt(priority) : 50,
        notes: notes.trim() || null,
        is_product_supplier: isProductSupplier,
        is_engraving_supplier: isEngravingSupplier,
        created_at: now,
        updated_at: now,
      };

      // Só incluir logo_url se tiver valor (coluna pode não existir ainda no banco externo)
      if (logoUrl) {
        data.logo_url = logoUrl;
      }

      const result = await invokeExternalDbSingle<{ id: string }>({
        table: 'suppliers',
        operation: 'insert',
        data,
      });

      if (result?.id) {
        onCreated(result.id);
        toast.success(`Fornecedor "${name.trim()}" criado com sucesso`);
        setOpen(false);
        resetForm();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "mt-1.5 h-9";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
          <Plus className="h-3.5 w-3.5" />
          Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cadastrar Fornecedor
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="basic" className="text-xs gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Contato
            </TabsTrigger>
            <TabsTrigger value="commercial" className="text-xs gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Comercial
            </TabsTrigger>
            <TabsTrigger value="classification" className="text-xs gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Tipo
            </TabsTrigger>
          </TabsList>

          {/* DADOS BÁSICOS */}
          <TabsContent value="basic" className="space-y-4 pt-3">
            {/* Logo Upload */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {logoUrl ? (
                  <div className="relative w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
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
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">
                    Nome do Fornecedor <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Asia Import"
                    className={fieldClass}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">
                    Código <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Auto-gerado do nome"
                    className={`${fieldClass} font-mono uppercase`}
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Deixe vazio para gerar automaticamente</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Nome Fantasia</Label>
                <Input
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="Ex: Asia Import LTDA"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">CNPJ</Label>
                <Input
                  value={cnpj}
                  onChange={(e) => { setCnpj(maskCnpj(e.target.value)); setCnpjError(''); }}
                  placeholder="00.000.000/0000-00"
                  className={`${fieldClass} font-mono ${cnpjError ? 'border-destructive' : ''}`}
                  maxLength={18}
                />
                {cnpjError && <p className="text-[10px] text-destructive mt-0.5">{cnpjError}</p>}
              </div>
            </div>
          </TabsContent>

          {/* CONTATO */}
          <TabsContent value="contact" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Nome do Contato</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Pessoa de Contato</Label>
                <Input
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Ex: Depto. Comercial"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@fornecedor.com"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className={fieldClass}
                  maxLength={15}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Endereço</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, cidade - UF"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.fornecedor.com.br"
                className={fieldClass}
              />
            </div>
          </TabsContent>

          {/* COMERCIAL */}
          <TabsContent value="commercial" className="space-y-4 pt-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold">Markup Padrão (%)</Label>
                <Input
                  type="number"
                  value={defaultMarkup}
                  onChange={(e) => setDefaultMarkup(e.target.value)}
                  placeholder="Ex: 115"
                  className={fieldClass}
                  min={0}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Pedido Mínimo (R$)</Label>
                <Input
                  type="number"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  placeholder="Ex: 500"
                  className={fieldClass}
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Prazo Entrega (dias)</Label>
                <Input
                  type="number"
                  value={deliveryTimeDays}
                  onChange={(e) => setDeliveryTimeDays(e.target.value)}
                  placeholder="Ex: 15"
                  className={fieldClass}
                  min={0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Condições de Pagamento</Label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ex: 30/60/90 dias"
                  className={fieldClass}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Condições de Frete</Label>
                <Input
                  value={shippingTerms}
                  onChange={(e) => setShippingTerms(e.target.value)}
                  placeholder="Ex: CIF acima de R$1.000"
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Prioridade (0-100)</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="50"
                className={`${fieldClass} w-24`}
                min={0}
                max={100}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Maior = mais prioritário</p>
            </div>
            <div>
              <Label className="text-xs font-semibold">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais sobre o fornecedor..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          </TabsContent>

          {/* CLASSIFICAÇÃO */}
          <TabsContent value="classification" className="space-y-6 pt-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Fornecedor de Produtos</p>
                <p className="text-xs text-muted-foreground">Fornece produtos físicos para revenda</p>
              </div>
              <Switch checked={isProductSupplier} onCheckedChange={setIsProductSupplier} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Fornecedor de Gravação</p>
                <p className="text-xs text-muted-foreground">Fornece serviços de personalização/gravação</p>
              </div>
              <Switch checked={isEngravingSupplier} onCheckedChange={setIsEngravingSupplier} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || saving}
            onClick={handleCreate}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Criar Fornecedor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
