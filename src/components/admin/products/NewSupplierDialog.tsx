import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Building2, Phone, DollarSign, Settings2, ImagePlus, X, Search, MapPin, Globe, Trash2, UserPlus, Landmark } from 'lucide-react';
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
  'Proprietário',
  'Diretor',
  'Gerente',
  'Vendedor',
  'Financeiro',
  'Compras',
  'Logística',
  'Suporte',
  'Outro',
] as const;

const createEmptyContact = (): SupplierContact => ({
  id: crypto.randomUUID(),
  role: '',
  name: '',
  signature: '',
  nickname: '',
  email: '',
  phone: '',
});
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { maskCnpj, maskPhone, validateCnpj, maskCep, ESTADOS_BR } from '@/utils/masks';
import { fetchAddressByCep } from '@/utils/viacep';
import { fetchCnpjData } from '@/utils/cnpj-lookup';

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
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [website, setWebsite] = useState('');

  // Social Media
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');

  // Contacts (multiple)
  const [contacts, setContacts] = useState<SupplierContact[]>([createEmptyContact()]);
  const [tipoLogradouro, setTipoLogradouro] = useState('');
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
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [horarioFuncionamento, setHorarioFuncionamento] = useState('');
  const [instrucoesEntrega, setInstrucoesEntrega] = useState('');

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

  const updateContact = (id: string, field: keyof SupplierContact, value: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addContact = () => {
    setContacts(prev => [...prev, createEmptyContact()]);
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);
  };

  const resetForm = () => {
    setName(''); setCode(''); setTradingName(''); setCnpj('');
    setContacts([createEmptyContact()]); setWebsite('');
    setInstagram(''); setFacebook(''); setLinkedin(''); setYoutube(''); setTiktok('');
    setTipoLogradouro(''); setLogradouro(''); setNumero(''); setComplemento(''); setBairro('');
    setCidade(''); setEstado(''); setCep(''); setPais('Brasil');
    setPontoReferencia(''); setGoogleMapsUrl(''); setGooglePlaceId('');
    setLatitude(''); setLongitude(''); setHorarioFuncionamento(''); setInstrucoesEntrega('');
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

      // Build rich address string from individual fields
      const addressParts = [
        tipoLogradouro && logradouro ? `${tipoLogradouro} ${logradouro}` : logradouro,
        numero, complemento, bairro, cidade, estado, cep ? `CEP ${cep}` : null,
      ].filter(Boolean).join(', ') || null;

      // Store detailed address/social fields as JSON metadata
      const addressDetails: Record<string, unknown> = {
        tipo_logradouro: tipoLogradouro.trim() || null,
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
        google_place_id: googlePlaceId.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        horario_funcionamento: horarioFuncionamento.trim() || null,
        instrucoes_entrega: instrucoesEntrega.trim() || null,
      };

      const socialDetails: Record<string, unknown> = {
        website: website.trim() || null,
        instagram: instagram.trim() || null,
        facebook: facebook.trim() || null,
        linkedin: linkedin.trim() || null,
        youtube: youtube.trim() || null,
        tiktok: tiktok.trim() || null,
      };

      const data: Record<string, unknown> = {
        name: name.trim(),
        code: generatedCode,
        trading_name: tradingName.trim() || null,
        cnpj: cnpj.trim() || null,
        active: true,
        organization_id: ORGANIZATION_ID,
        contact_name: contacts[0]?.name?.trim() || null,
        contact_person: contacts[0]?.role?.trim() || null,
        email: contacts[0]?.email?.trim() || null,
        phone: contacts[0]?.phone?.trim() || null,
        // contacts/social columns don't exist in external DB
        address: addressParts,
        website: website.trim() || null,
        default_markup_percent: defaultMarkup ? parseFloat(defaultMarkup) : null,
        min_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
        minimum_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
        delivery_time_days: deliveryTimeDays ? parseInt(deliveryTimeDays) : null,
        payment_terms: paymentTerms.trim() || null,
        shipping_terms: shippingTerms.trim() || null,
        priority: priority ? parseInt(priority) : 50,
        notes: (() => {
          const parts: string[] = [];
          const userNotes = notes.trim();
          if (userNotes) parts.push(userNotes);
          // Persist signature/nickname of primary contact
          const c0 = contacts[0];
          if (c0?.signature?.trim() || c0?.nickname?.trim()) {
            parts.push(`[Contato 1 extras: Assinatura: ${c0.signature?.trim() || '-'}, Apelido: ${c0.nickname?.trim() || '-'}]`);
          }
          // Persist extra contacts with all fields
          const extraContacts = contacts.slice(1).filter(c => c.name.trim());
          if (extraContacts.length > 0) {
            const extraInfo = `[Contatos adicionais: ${extraContacts.map(c => `${c.role || 'N/A'} - ${c.name} (${c.email || '-'}, ${c.phone || '-'}, Assinatura: ${c.signature?.trim() || '-'}, Apelido: ${c.nickname?.trim() || '-'})`).join('; ')}]`;
            parts.push(extraInfo);
          }
          return parts.join('\n') || null;
        })(),
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
          <TabsList className="grid w-full grid-cols-6 h-9">
            <TabsTrigger value="basic" className="text-xs gap-1">
              <Building2 className="h-3.5 w-3.5" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs gap-1">
              <Phone className="h-3.5 w-3.5" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="address" className="text-xs gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Endereço
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs gap-1">
              <Globe className="h-3.5 w-3.5" />
              Site/Redes
            </TabsTrigger>
            <TabsTrigger value="commercial" className="text-xs gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Comercial
            </TabsTrigger>
            <TabsTrigger value="classification" className="text-xs gap-1">
              <Settings2 className="h-3.5 w-3.5" />
              Tipo
            </TabsTrigger>
          </TabsList>

          {/* DADOS BÁSICOS */}
          <TabsContent value="basic" className="space-y-4 pt-3">
            {/* 1 - LOGO + 2 - NOME FANTASIA (lado a lado) */}
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
              <div className="flex-1">
                <Label className="text-xs font-semibold">Nome Fantasia</Label>
                <Input
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="Ex: Asia Import"
                  className={fieldClass}
                  autoFocus
                />
              </div>
            </div>

            {/* 3 - RAZÃO SOCIAL (linha inteira) */}
            <div>
              <Label className="text-xs font-semibold">
                Razão Social <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Asia Import Comércio LTDA"
                className={fieldClass}
              />
            </div>

            {/* 4 - CNPJ + 5 - CÓDIGO */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">CNPJ</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={cnpj}
                    onChange={(e) => { setCnpj(maskCnpj(e.target.value)); setCnpjError(''); }}
                    placeholder="00.000.000/0000-00"
                    className={`${fieldClass} font-mono flex-1 ${cnpjError ? 'border-destructive' : ''}`}
                    maxLength={18}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 shrink-0"
                    disabled={fetchingCnpj || cnpj.replace(/\D/g, '').length !== 14}
                    onClick={async () => {
                      const digits = cnpj.replace(/\D/g, '');
                      if (!validateCnpj(digits)) { setCnpjError('CNPJ inválido'); return; }
                      setFetchingCnpj(true);
                      try {
                        const data = await fetchCnpjData(digits);
                        if (data) {
                          if (data.razao_social) setName(data.razao_social);
                          if (data.nome_fantasia) setTradingName(data.nome_fantasia);
                          if (data.logradouro) setLogradouro(data.logradouro);
                          if (data.numero) setNumero(data.numero);
                          if (data.complemento) setComplemento(data.complemento);
                          if (data.bairro) setBairro(data.bairro);
                          if (data.cidade) setCidade(data.cidade);
                          if (data.estado) setEstado(data.estado);
                          if (data.cep) setCep(maskCep(data.cep));
                          if (data.email) updateContact(contacts[0].id, 'email', data.email);
                          if (data.telefone) updateContact(contacts[0].id, 'phone', data.telefone);
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
                {cnpjError && <p className="text-[10px] text-destructive mt-0.5">{cnpjError}</p>}
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeContact(contact.id)}
                      >
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
                      <Input
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                        placeholder="Ex: João Silva"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Assinatura</Label>
                      <Input
                        value={contact.signature}
                        onChange={(e) => updateContact(contact.id, 'signature', e.target.value)}
                        placeholder="Ex: João S. - Diretor Comercial"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Apelido</Label>
                      <Input
                        value={contact.nickname}
                        onChange={(e) => updateContact(contact.id, 'nickname', e.target.value)}
                        placeholder="Ex: Joãozinho"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <Label className="text-xs font-semibold">Telefone</Label>
                       <Input
                         value={contact.phone}
                         onChange={(e) => updateContact(contact.id, 'phone', maskPhone(e.target.value))}
                         placeholder="(11) 99999-9999"
                         className={fieldClass}
                         maxLength={15}
                       />
                     </div>
                     <div>
                       <Label className="text-xs font-semibold">E-mail</Label>
                       <Input
                         type="email"
                         value={contact.email}
                         onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                         placeholder="contato@fornecedor.com"
                         className={fieldClass}
                       />
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* SITE E REDES SOCIAIS */}
          <TabsContent value="social" className="space-y-4 pt-3">
            <div>
              <Label className="text-xs font-semibold">Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.fornecedor.com.br"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Instagram</Label>
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@fornecedor"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Facebook</Label>
              <Input
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/fornecedor"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">LinkedIn</Label>
              <Input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/fornecedor"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">YouTube</Label>
              <Input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@fornecedor"
                className={fieldClass}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">TikTok</Label>
              <Input
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@fornecedor"
                className={fieldClass}
              />
            </div>
          </TabsContent>

          {/* ENDEREÇO */}
          <TabsContent value="address" className="space-y-4 pt-3">
            <div>
              <Label className="text-xs font-semibold">CEP</Label>
              <Input value={cep} onChange={async (e) => {
                const masked = maskCep(e.target.value);
                setCep(masked);
                if (masked.replace(/\D/g, '').length === 8) {
                  const addr = await fetchAddressByCep(masked);
                  if (addr) {
                    if (addr.logradouro) setLogradouro(addr.logradouro);
                    if (addr.bairro) setBairro(addr.bairro);
                    if (addr.localidade) setCidade(addr.localidade);
                    if (addr.uf) setEstado(addr.uf);
                    toast.success('Endereço preenchido via CEP');
                  }
                }
              }} placeholder="00000-000" className={`${fieldClass} font-mono`} maxLength={9} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Tipo Logradouro</Label>
              <select
                value={tipoLogradouro}
                onChange={(e) => setTipoLogradouro(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione</option>
                {['Rua', 'Avenida', 'Alameda', 'Travessa', 'Praça', 'Rodovia', 'Estrada', 'Viela', 'Largo', 'Outro'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Logradouro</Label>
              <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Nome da rua" className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Número</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Complemento</Label>
              <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Sala 101, Bloco A" className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Bairro</Label>
              <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Centro" className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Cidade</Label>
              <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="São Paulo" className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Estado</Label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione</option>
                {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">País</Label>
              <Input value={pais} onChange={(e) => setPais(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Ponto de Referência</Label>
              <Input value={pontoReferencia} onChange={(e) => setPontoReferencia(e.target.value)} placeholder="Próximo ao..." className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Latitude</Label>
              <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-23.5505" className={`${fieldClass} font-mono`} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Longitude</Label>
              <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-46.6333" className={`${fieldClass} font-mono`} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Google Maps URL</Label>
              <Input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Google Place ID</Label>
              <Input value={googlePlaceId} onChange={(e) => setGooglePlaceId(e.target.value)} placeholder="ChIJ..." className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Horário de Funcionamento</Label>
              <Input value={horarioFuncionamento} onChange={(e) => setHorarioFuncionamento(e.target.value)} placeholder="Seg-Sex 08:00-18:00" className={fieldClass} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Instruções de Entrega</Label>
              <Textarea value={instrucoesEntrega} onChange={(e) => setInstrucoesEntrega(e.target.value)} placeholder="Entrar pela portaria lateral..." className="mt-1.5 min-h-[60px]" />
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
