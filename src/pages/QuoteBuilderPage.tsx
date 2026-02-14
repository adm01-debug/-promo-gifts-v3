import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Search,
  User,
  Calendar,
  Save,
  Send,
  Package,
  Loader2,
  BookTemplate,
  ArrowLeft,
  Edit,
  X,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { useQuotes, type QuoteItem, type QuoteItemPersonalization } from "@/hooks/useQuotes";
import { useQuoteTemplates, type QuoteTemplate, type QuoteTemplateItem } from "@/hooks/useQuoteTemplates";
import { QuoteTemplateSelector } from "@/components/quotes/QuoteTemplateSelector";
import { SaveAsTemplateButton } from "@/components/quotes/SaveAsTemplateButton";
import { QuoteProductCustomization } from "@/components/quotes/QuoteProductCustomization";
import { CompanyContactSelector, type SelectedCompanyInfo, type SelectedContactInfo } from "@/components/quotes/CompanyContactSelector";
import { QuoteAutoSave } from "@/components/quotes/QuoteAutoSave";
import { DraggableQuoteItems } from "@/components/quotes/DraggableQuoteItems";
import { QuoteProductColorSelector } from "@/components/quotes/QuoteProductColorSelector";
import { useAuth } from "@/contexts/AuthContext";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import { findKnownHex } from "@/hooks/useProducts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProductColor {
  name: string;
  hex?: string;
  stock?: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[] | null;
  colors?: ProductColor[];
  minQuantity?: number;
  totalStock?: number;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function QuoteBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(quoteId);
  
  const { user } = useAuth();
  const { createQuote, updateQuote, fetchQuote, techniques, isLoading: quotesLoading } = useQuotes();
  const { templates } = useQuoteTemplates();

  // Quote state
  const [clientId, setClientId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [companyInfo, setCompanyInfo] = useState<SelectedCompanyInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<SelectedContactInfo | null>(null);
  const [validUntil, setValidUntil] = useState<string>(
    format(addDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [quoteNumber, setQuoteNumber] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>("draft");

  // Product search modal
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  // Color selection step
  const [selectedProductForColor, setSelectedProductForColor] = useState<Product | null>(null);

  // Template applied notification
  const [templateApplied, setTemplateApplied] = useState<string | null>(null);
  
  // Loading state for edit mode
  const [loadingQuote, setLoadingQuote] = useState(isEditMode);

  // Personalization expanded states
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Load existing quote data when editing
  useEffect(() => {
    if (isEditMode && quoteId) {
      setLoadingQuote(true);
      fetchQuote(quoteId).then((quote) => {
        if (quote) {
          setClientId(quote.client_id || "");
          setValidUntil(quote.valid_until || format(addDays(new Date(), 30), "yyyy-MM-dd"));
          setNotes(quote.notes || "");
          setInternalNotes(quote.internal_notes || "");
          setQuoteNumber(quote.quote_number || "");
          setCurrentStatus(quote.status);
          
          if (quote.discount_percent && quote.discount_percent > 0) {
            setDiscountType("percent");
            setDiscountValue(quote.discount_percent);
          } else if (quote.discount_amount && quote.discount_amount > 0) {
            setDiscountType("amount");
            setDiscountValue(quote.discount_amount);
          }
          
          if (quote.items) {
            setItems(quote.items);
          }
        }
        setLoadingQuote(false);
      });
    }
  }, [isEditMode, quoteId]);

  // Pre-fill from simulator when navigating with state
  useEffect(() => {
    const state = location.state as { fromSimulator?: boolean; simulationData?: any } | null;
    if (!state?.fromSimulator || !state.simulationData) return;

    const { product, quantity, personalizations } = state.simulationData;
    if (!product) return;

    // Map simulator personalizations to QuoteItemPersonalization[]
    const quotePersonalizations: QuoteItemPersonalization[] = (personalizations || []).map((p: any) => ({
      technique_id: p.technique?.id || '',
      technique_name: p.technique?.name || '',
      colors_count: p.specs?.colors || 1,
      positions_count: 1,
      area_cm2: (p.specs?.width || 0) * (p.specs?.height || 0),
      setup_cost: p.pricing?.setupPrice || 0,
      unit_cost: p.pricing?.unitPrice || 0,
      total_cost: p.pricing?.totalPrice || 0,
    }));

    const newItem: QuoteItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku || '',
      product_image_url: product.imageUrl || undefined,
      quantity: quantity || 1,
      unit_price: product.price || 0,
      personalizations: quotePersonalizations,
    };

    setItems([newItem]);

    // Auto-expand personalization panel if there are personalizations
    if (quotePersonalizations.length > 0) {
      setExpandedItems(new Set([0]));
    }

    toast.success(`Produto "${product.name}" importado do simulador com ${quotePersonalizations.length} gravação(ões)`);

    // Clear the state to prevent re-import on re-render
    window.history.replaceState({}, document.title);
  }, [location.state]);

  // Pre-fill from cart when navigating with state
  useEffect(() => {
    const state = location.state as {
      fromCart?: boolean;
      cartId?: string;
      companyId?: string;
      companyName?: string;
      companyLocation?: string;
      items?: Array<{
        product_id: string;
        product_name: string;
        product_sku?: string;
        product_image_url?: string;
        unit_price: number;
        quantity: number;
        color_name?: string;
        color_hex?: string;
      }>;
    } | null;

    if (!state?.fromCart || !state.items?.length) return;

    // Set company
    if (state.companyId) {
      setClientId(state.companyId);
    }

    // Map cart items to QuoteItem[]
    const cartItems: QuoteItem[] = state.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_sku: i.product_sku || '',
      product_image_url: i.product_image_url || undefined,
      quantity: i.quantity,
      unit_price: i.unit_price,
      color_name: i.color_name || undefined,
      color_hex: i.color_hex || undefined,
      personalizations: [],
    }));

    setItems(cartItems);

    const companyLabel = state.companyName
      ? state.companyLocation
        ? `${state.companyName} – ${state.companyLocation}`
        : state.companyName
      : '';

    toast.success(`${cartItems.length} item(ns) importado(s) do carrinho`, {
      description: companyLabel || undefined,
    });

    window.history.replaceState({}, document.title);
  }, [location.state]);

  // Fetch products from Promobrind - sem limite para buscar todos
  const { data: products } = useQuery({
    queryKey: ["quote-products-promobrind-full"],
    queryFn: async () => {
      const { fetchPromobrindProducts, getProductImageUrl } = await import('@/lib/external-db');
      const productsData = await fetchPromobrindProducts(); // Sem limit = paginação automática
      
      // Mapear para formato esperado - usar getProductImageUrl para garantir thumbnail
      return productsData.map(p => {
        const imgUrl = getProductImageUrl(p);
        const images = (p.images && p.images.length > 0) 
          ? p.images 
          : (imgUrl ? [imgUrl] : []);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.sale_price ?? p.base_price ?? 0,
          images,
          colors: (p.colors || []).map((c: any) => {
            const name = typeof c === 'string' ? c : c.name;
            const hex = (typeof c === 'string' ? undefined : c.hex) || findKnownHex(name) || undefined;
            return {
              name,
              hex,
              stock: typeof c === 'string' ? undefined : c.stock,
            };
          }),
          minQuantity: p.min_quantity ?? 1,
          totalStock: p.stock_quantity ?? (p.colors || []).reduce((sum: number, c: any) => sum + (typeof c === 'object' ? (c.stock ?? 0) : 0), 0),
        };
      }) as Product[];
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  // Clients are now handled by CompanyContactSelector component

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products?.slice(0, 20) || [];
    const search = productSearch.toLowerCase();
    return products?.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search)
    ).slice(0, 20) || [];
  }, [products, productSearch]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate personalization total for an item
  const calculateItemPersonalizationTotal = (item: QuoteItem) => {
    return (item.personalizations || []).reduce(
      (sum, p) => sum + (p.total_cost || 0),
      0
    );
  };

  // Calculate full item total (base + personalization)
  const calculateItemTotal = (item: QuoteItem) => {
    const baseTotal = item.quantity * item.unit_price;
    const personalizationTotal = calculateItemPersonalizationTotal(item);
    return baseTotal + personalizationTotal;
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (discountType === "percent") {
      return subtotal * (discountValue / 100);
    }
    return discountValue;
  }, [subtotal, discountType, discountValue]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Toggle personalization panel
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  // Set all personalizations for an item (from ProductCustomizationOptions)
  const handlePersonalizationsChange = (index: number, personalizations: QuoteItemPersonalization[]) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, personalizations }
          : item
      )
    );
  };

  // Add personalization to item (legacy compat)
  const handlePersonalizationAdd = (index: number, personalization: QuoteItemPersonalization) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, personalizations: [...(item.personalizations || []), personalization] }
          : item
      )
    );
  };

  // Remove personalization from item
  const handlePersonalizationRemove = (itemIndex: number, persIndex: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === itemIndex
          ? {
              ...item,
              personalizations: (item.personalizations || []).filter((_, i) => i !== persIndex),
            }
          : item
      )
    );
  };

  // Step 1: Select product → go to color step
  const handleProductClick = useCallback((product: Product) => {
    setSelectedProductForColor(product);
  }, []);

  // Step 2: Color selected → add to quote
  const addProductWithColor = useCallback((product: Product, variant: ExternalVariantStock | null) => {
    const colorName = variant?.color_name || undefined;
    const colorHex = variant?.color_hex || undefined;
    const imageUrl = variant?.selected_thumbnail
      || (variant?.images?.length ? variant.images[0] : undefined)
      || (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined);

    const existingIndex = items.findIndex(
      (i) => i.product_id === product.id && i.color_name === colorName
    );

    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_image_url: imageUrl,
          quantity: 1,
          unit_price: product.price,
          color_name: colorName,
          color_hex: colorHex,
          personalizations: [],
        },
      ]);
    }
    setSelectedProductForColor(null);
    setProductSearchOpen(false);
    setProductSearch("");
  }, [items]);

  // Update item quantity
  const updateItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity } : item))
    );
  }, []);

  // Update item price
  const updateItemPrice = useCallback((index: number, price: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unit_price: price } : item))
    );
  }, []);

  // Remove item
  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  // Apply template
  const applyTemplate = useCallback((template: QuoteTemplate) => {
    const newItems: QuoteItem[] = template.items_data.map((item) => ({
      product_id: item.productId || "",
      product_name: item.productName,
      product_sku: item.productSku,
      product_image_url: item.productImageUrl,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      color_name: item.colorName,
      color_hex: item.colorHex,
      personalizations: item.personalizations?.map((p) => ({
        technique_id: p.techniqueId,
        technique_name: p.techniqueName,
        colors_count: p.colorsCount,
        positions_count: p.positionsCount,
        unit_cost: p.unitCost,
        setup_cost: p.setupCost,
      })),
    }));

    setItems(newItems);
    
    if (template.discount_percent > 0) {
      setDiscountType("percent");
      setDiscountValue(template.discount_percent);
    } else if (template.discount_amount > 0) {
      setDiscountType("amount");
      setDiscountValue(template.discount_amount);
    }
    
    if (template.notes) setNotes(template.notes);
    if (template.internal_notes) setInternalNotes(template.internal_notes);
    if (template.validity_days) {
      setValidUntil(format(addDays(new Date(), template.validity_days), "yyyy-MM-dd"));
    }

    setTemplateApplied(template.name);
    toast.success(`Template "${template.name}" aplicado!`);
  }, []);

  // Get items for template saving
  const getTemplateItems = useCallback((): QuoteTemplateItem[] => {
    return items.map((item) => ({
      productId: item.product_id,
      productSku: item.product_sku,
      productName: item.product_name,
      productImageUrl: item.product_image_url,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      colorName: item.color_name,
      colorHex: item.color_hex,
      personalizations: item.personalizations?.map((p) => ({
        techniqueId: p.technique_id,
        techniqueName: p.technique_name || "",
        colorsCount: p.colors_count,
        positionsCount: p.positions_count,
        unitCost: p.unit_cost,
        setupCost: p.setup_cost,
      })),
    }));
  }, [items]);

  // Save quote (create or update)
  const handleSaveQuote = async (status: "draft" | "pending" = "draft") => {
    console.log("[SAVE DEBUG] contactInfo:", JSON.stringify(contactInfo));
    console.log("[SAVE DEBUG] companyInfo:", JSON.stringify(companyInfo));
    console.log("[SAVE DEBUG] contactId:", contactId);
    console.log("[SAVE DEBUG] clientId:", clientId);
    
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item ao orçamento");
      return;
    }

    const companyDisplayName = companyInfo?.name || undefined;
    const companyLocation = [companyInfo?.cidade, companyInfo?.estado].filter(Boolean).join("/");
    const companyWithLocation = companyDisplayName && companyLocation
      ? `${companyDisplayName} | ${companyLocation}`
      : companyDisplayName;

    const quoteData = {
      client_id: clientId || undefined,
      client_name: contactInfo?.name || undefined,
      client_company: companyWithLocation,
      client_email: contactInfo?.email || undefined,
      client_phone: contactInfo?.phone || undefined,
      status,
      discount_percent: discountType === "percent" ? discountValue : 0,
      discount_amount: discountType === "amount" ? discountValue : 0,
      notes: notes || undefined,
      internal_notes: internalNotes || undefined,
      valid_until: validUntil || undefined,
    };

    let result;
    if (isEditMode && quoteId) {
      result = await updateQuote(quoteId, quoteData, items);
    } else {
      result = await createQuote(quoteData, items);
    }

    if (result) {
      navigate("/orcamentos");
    }
  };

  // Get default template on load
  const defaultTemplate = useMemo(() => {
    return templates.find((t) => t.is_default);
  }, [templates]);

  if (loadingQuote) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Auto-save component */}
      <QuoteAutoSave
        quoteId={quoteId}
        data={{ clientId, validUntil, discountType, discountValue, notes, internalNotes, items }}
        onRestore={(data) => {
          setClientId(data.clientId || "");
          setValidUntil(data.validUntil || format(addDays(new Date(), 30), "yyyy-MM-dd"));
          setDiscountType(data.discountType || "percent");
          setDiscountValue(data.discountValue || 0);
          setNotes(data.notes || "");
          setInternalNotes(data.internalNotes || "");
          setItems(data.items || []);
          toast.success("Rascunho restaurado!");
        }}
        className="fixed top-20 right-4 z-40"
      />
      
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  {isEditMode ? (
                    <Edit className="h-6 w-6 text-primary" />
                  ) : (
                    <FileText className="h-6 w-6 text-primary" />
                  )}
                </div>
                {isEditMode ? `Editar Orçamento` : "Novo Orçamento"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditMode && quoteNumber ? (
                  <>Editando: <strong>{quoteNumber}</strong></>
                ) : (
                  "Crie um orçamento com produtos e personalizações"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditMode && (
              <QuoteTemplateSelector
                onSelectTemplate={applyTemplate}
                trigger={
                  <Button variant="outline">
                    <BookTemplate className="h-4 w-4 mr-2" />
                    Usar Template
                    {templates.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {templates.length}
                      </Badge>
                    )}
                  </Button>
                }
              />
            )}
            {items.length > 0 && (
              <SaveAsTemplateButton
                items={getTemplateItems()}
                discountPercent={discountType === "percent" ? discountValue : 0}
                discountAmount={discountType === "amount" ? discountValue : 0}
                notes={notes}
                internalNotes={internalNotes}
              />
            )}
          </div>
        </div>

        {/* Template applied notification */}
        {templateApplied && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookTemplate className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Template <strong>"{templateApplied}"</strong> aplicado
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTemplateApplied(null)}
              >
                Fechar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Default template suggestion (only for new quotes) */}
        {!isEditMode && defaultTemplate && items.length === 0 && !templateApplied && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookTemplate className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Template padrão disponível</p>
                  <p className="text-sm text-muted-foreground">
                    Use "{defaultTemplate.name}" para começar rapidamente
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => applyTemplate(defaultTemplate)}>
                Aplicar Template
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Client and Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <CompanyContactSelector
                  companyId={clientId}
                  contactId={contactId}
                  onCompanyChange={setClientId}
                  onContactChange={setContactId}
                  onCompanyInfoChange={setCompanyInfo}
                  onContactInfoChange={setContactInfo}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items with Personalization */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Itens do Orçamento</CardTitle>
                <CardDescription>
                  {items.length} {items.length === 1 ? "item" : "itens"} adicionados
                </CardDescription>
              </div>
              <Button onClick={() => setProductSearchOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </CardHeader>
            <CardContent>
              <DraggableQuoteItems
                items={items.map((item, idx) => ({ ...item, id: `${item.product_id}-${idx}` }))}
                onReorder={(reorderedItems) => setItems(reorderedItems)}
                onUpdateQuantity={updateItemQuantity}
                onUpdatePrice={updateItemPrice}
                onRemove={removeItem}
                onTogglePersonalization={toggleExpanded}
                expandedItems={expandedItems}
                renderPersonalization={(item, index) => (
                  <QuoteProductCustomization
                    productId={item.product_id}
                    quantity={item.quantity}
                    existingPersonalizations={item.personalizations}
                    onPersonalizationsChange={(personalizations) => handlePersonalizationsChange(index, personalizations)}
                  />
                )}
                formatCurrency={formatCurrency}
              />
            </CardContent>
          </Card>

          {/* Resumo — card abaixo dos itens */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Left: Totals */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={discountType}
                      onValueChange={(v) => setDiscountType(v as "percent" | "amount")}
                    >
                      <SelectTrigger className="w-20 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="amount">R$</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step={discountType === "percent" ? 1 : 0.01}
                      max={discountType === "percent" ? 100 : undefined}
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="Desconto"
                      className="h-9"
                    />
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Desconto</span>
                      <span className="font-semibold tabular-nums">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl text-primary tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col justify-end gap-2">
                  <Button
                    className="w-full"
                    onClick={() => handleSaveQuote("pending")}
                    disabled={quotesLoading || items.length === 0}
                  >
                    {quotesLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isEditMode ? "Salvar e Enviar" : "Criar e Enviar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSaveQuote("draft")}
                    disabled={quotesLoading || items.length === 0}
                  >
                    {quotesLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isEditMode ? "Salvar Alterações" : "Salvar Rascunho"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Search Dialog */}
      <Dialog open={productSearchOpen} onOpenChange={(open) => {
        setProductSearchOpen(open);
        if (!open) {
          setSelectedProductForColor(null);
          setProductSearch("");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="font-semibold text-base">
                  {selectedProductForColor ? "Selecionar Cor" : "Adicionar Produto"}
                </span>
                <p className="text-xs text-muted-foreground font-normal">
                  {selectedProductForColor
                    ? "Escolha a cor desejada para adicionar ao orçamento"
                    : "Busque e selecione um produto para o orçamento"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            {selectedProductForColor ? (
              <QuoteProductColorSelector
                product={selectedProductForColor}
                onSelect={(variant) => addProductWithColor(selectedProductForColor, variant)}
                onBack={() => setSelectedProductForColor(null)}
              />
            ) : (
              <>
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 h-11 text-sm border-primary/30 focus-visible:ring-primary/20"
                    autoFocus
                  />
                  {productSearch && (
                    <button
                      onClick={() => setProductSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} disponíve{filteredProducts.length !== 1 ? 'is' : 'l'}
                </p>
                <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Nenhum produto encontrado</p>
                      {productSearch && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setProductSearch("")}>
                          Limpar busca
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredProducts.map((product) => {
                        const stock = product.totalStock ?? 0;
                        const isOutOfStock = stock === 0;
                        const isLowStock = stock > 0 && stock < 100;
                        const formatStock = (qty: number) => qty >= 1000 ? `${(qty / 1000).toFixed(1)}k` : qty.toString();

                        return (
                          <button
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className={cn(
                              "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 text-left",
                              isOutOfStock
                                ? "border-destructive/20 bg-destructive/5 hover:bg-destructive/10 opacity-75"
                                : isLowStock
                                  ? "border-amber-500/20 hover:bg-accent/60 hover:border-amber-500/40"
                                  : "border-transparent hover:bg-accent/60 hover:border-border"
                            )}
                          >
                            {/* Thumbnail */}
                            <div className="relative shrink-0">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  src={`${product.images[0]}/thumbnail`}
                                  alt={product.name}
                                  className="h-11 w-11 object-cover rounded-lg bg-muted"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src.includes('/thumbnail')) {
                                      target.src = product.images![0];
                                    } else {
                                      target.style.display = 'none';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="h-11 w-11 bg-muted rounded-lg flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              {/* Stock status dot */}
                              {isOutOfStock && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                                  <X className="h-2.5 w-2.5 text-destructive-foreground" />
                                </div>
                              )}
                              {isLowStock && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                                  <AlertTriangle className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <p className="font-medium truncate text-sm leading-tight">{product.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground font-mono tracking-wide">{product.sku}</span>
                                {/* Color swatches inline */}
                                {product.colors && product.colors.length > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    {product.colors.slice(0, 5).map((color, i) => (
                                      <div
                                        key={i}
                                        className="w-2.5 h-2.5 rounded-full border border-border/50"
                                        style={{ backgroundColor: color.hex || '#CCC' }}
                                        title={`${color.name}${color.stock !== undefined ? ` — ${color.stock} un` : ''}`}
                                        />
                                    ))}
                                    {product.colors.length > 5 && (
                                      <span className="text-[9px] text-muted-foreground ml-0.5">+{product.colors.length - 5}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Price + Stock badge */}
                            <div className="text-right shrink-0 pl-2 space-y-0.5">
                              <p className="text-sm font-semibold text-primary tabular-nums whitespace-nowrap">
                                {formatCurrency(product.price)}
                              </p>
                              {isOutOfStock ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive whitespace-nowrap">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Sem estoque
                                </span>
                              ) : isLowStock ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 whitespace-nowrap">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {formatStock(stock)} un
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
                                  <PackageCheck className="h-2.5 w-2.5 text-green-600" />
                                  {formatStock(stock)} un
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
