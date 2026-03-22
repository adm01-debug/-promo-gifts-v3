import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { cn } from "@/lib/utils";
import { validateQuoteForm, QUOTE_FIELD_LABELS } from "@/lib/validations";

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
  Calendar as CalendarIcon,
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
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { QuoteBuilderStepper, type QuoteBuilderStep } from "@/components/quotes/QuoteBuilderStepper";
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
  const [validityDays, setValidityDays] = useState<string>("7");
  const [validUntil, setValidUntil] = useState<string>(
    format(addDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [quoteNumber, setQuoteNumber] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>("draft");

  // Commercial fields
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [deliveryMode, setDeliveryMode] = useState<"prazo" | "data">("prazo");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [shippingType, setShippingType] = useState<string>("");
  const [shippingCost, setShippingCost] = useState<number>(0);
  

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

  // Active item for personalization (middle column)
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Load existing quote data when editing
  useEffect(() => {
    if (isEditMode && quoteId) {
      setLoadingQuote(true);
      fetchQuote(quoteId).then((quote) => {
        if (quote) {
          setClientId(quote.client_id || "");
          setContactId(quote.client_id || ""); // restore contact selection state
          setValidUntil(quote.valid_until || format(addDays(new Date(), 30), "yyyy-MM-dd"));
          setNotes(quote.notes || "");
          setInternalNotes(quote.internal_notes || "");
          setQuoteNumber(quote.quote_number || "");
          setCurrentStatus(quote.status);
          
          // Restore contactInfo from saved data so it persists on re-save
          if (quote.client_name) {
            setContactInfo({
              id: "",
              name: quote.client_name,
              email: quote.client_email || undefined,
              phone: quote.client_phone || undefined,
            });
          }

          // Restore companyInfo from saved client_company
          if (quote.client_company) {
            setCompanyInfo({
              id: quote.client_id || "",
              name: quote.client_company,
              cnpj: (quote as any).client_cnpj || undefined,
              ramo_atividade: undefined,
            });
          }
          
          if (quote.discount_percent && quote.discount_percent > 0) {
            setDiscountType("percent");
            setDiscountValue(quote.discount_percent);
          } else if (quote.discount_amount && quote.discount_amount > 0) {
            setDiscountType("amount");
            setDiscountValue(quote.discount_amount);
          }

          // Restore commercial fields
          if (quote.payment_terms) setPaymentTerms(quote.payment_terms);
          if (quote.shipping_type) setShippingType(quote.shipping_type);
          if (quote.shipping_cost) setShippingCost(quote.shipping_cost);

          // Restore delivery time with mode detection
          if (quote.delivery_time) {
            if (quote.delivery_time.startsWith("date:")) {
              setDeliveryMode("data");
              const iso = quote.delivery_time.slice(5);
              setDeliveryDate(new Date(iso + "T12:00:00"));
            } else {
              setDeliveryMode("prazo");
            }
            setDeliveryTime(quote.delivery_time);
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
      width_cm: p.specs?.width || undefined,
      height_cm: p.specs?.height || undefined,
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
    setActiveItemIndex(0);

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
      setActiveItemIndex(existingIndex);
    } else {
      setItems((prev) => {
        const newItems = [
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
            bitrix_product_id: variant?.bitrix_product_id ?? null,
            personalizations: [],
          },
        ];
        setActiveItemIndex(newItems.length - 1);
        return newItems;
      });
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

  // Validation: all required fields (Zod-based)
  const validationErrors = useMemo(() => {
    return validateQuoteForm({
      clientId,
      contactId,
      paymentTerms,
      deliveryTime,
      shippingType,
      shippingCost,
      itemsCount: items.length,
    });
  }, [clientId, contactId, paymentTerms, deliveryTime, shippingType, shippingCost, items]);

  const isFormValid = validationErrors.length === 0;
  const isDraftValid = !!clientId; // Rascunho só precisa de empresa

  // Save quote (create or update)
  const handleSaveQuote = async (status: "draft" | "pending" = "draft") => {
    if (status === "draft") {
      if (!isDraftValid) {
        toast.error("Selecione uma empresa para salvar o rascunho.");
        return;
      }
    } else if (!isFormValid) {
      const missing = validationErrors.map((e) => QUOTE_FIELD_LABELS[e] || e).join(", ");
      toast.error(`Preencha os campos obrigatórios: ${missing}`);
      return;
    }

    const companyWithLocation = companyInfo?.name || undefined;

    const quoteData = {
      client_id: clientId || undefined,
      client_name: contactInfo?.name || undefined,
      client_company: companyWithLocation,
      client_cnpj: companyInfo?.cnpj || undefined,
      client_email: contactInfo?.email || undefined,
      client_phone: contactInfo?.phone || undefined,
      status,
      discount_percent: discountType === "percent" ? discountValue : 0,
      discount_amount: discountType === "amount" ? discountValue : 0,
      notes: notes || undefined,
      internal_notes: internalNotes || undefined,
      valid_until: validUntil || undefined,
      payment_terms: paymentTerms || undefined,
      delivery_time: deliveryTime || undefined,
      shipping_type: shippingType || undefined,
      shipping_cost: (shippingType === "fob_pre" || shippingType === "fob") ? shippingCost : undefined,
    };

    let result;
    if (isEditMode && quoteId) {
      result = await updateQuote(quoteId, quoteData, items);
    } else {
      result = await createQuote(quoteData, items);
    }

    if (result) {
      navigate(`/orcamentos/${result.id}`);
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
      <PageSEO title={quoteId ? "Editar Orçamento" : "Novo Orçamento"} description="Crie e edite orçamentos com seleção de produtos e personalização." path="/orcamentos/novo" noIndex />
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

        <div className="grid gap-4 lg:grid-cols-12">
          {/* COL 1 — Empresa + Contato (fixa) */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-3 overflow-y-auto max-h-[calc(100vh-7rem)] pr-1">
              <div className={cn(
                "rounded-2xl border bg-card p-4 space-y-4",
                (validationErrors.includes("empresa") || validationErrors.includes("contato"))
                  ? "border-destructive/50"
                  : "border-border/50"
              )}>
                <CompanyContactSelector
                  companyId={clientId}
                  contactId={contactId}
                  onCompanyChange={setClientId}
                  onContactChange={setContactId}
                  onCompanyInfoChange={setCompanyInfo}
                  onContactInfoChange={setContactInfo}
                />
                {(validationErrors.includes("empresa") || validationErrors.includes("contato")) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {validationErrors.includes("empresa") ? "Selecione uma empresa" : "Selecione um contato"}
                  </p>
                )}
              </div>

              {/* Validade da Proposta */}
              <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span className="text-primary">📅</span>
                  Validade | Proposta
                </h3>
                <div className="space-y-1">
                  <Select
                    value={validityDays}
                    onValueChange={(val) => {
                      setValidityDays(val);
                      setValidUntil(format(addDays(new Date(), parseInt(val)), "yyyy-MM-dd"));
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 dia</SelectItem>
                      <SelectItem value="3">3 dias</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Condições Comerciais */}
              <div className={cn(
                "rounded-2xl border bg-card p-4 space-y-3",
                (validationErrors.includes("prazo_pagamento") || validationErrors.includes("prazo_entrega") || validationErrors.includes("frete") || validationErrors.includes("valor_frete"))
                  ? "border-destructive/50"
                  : "border-border/50"
              )}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Condições
                </h3>

                {/* Prazo Pagamento */}
                <div className="space-y-1">
                  <Label className={cn("text-xs", validationErrors.includes("prazo_pagamento") ? "text-destructive" : "text-muted-foreground")}>
                    Prazo | Pagamento {validationErrors.includes("prazo_pagamento") && <span className="ml-1">*</span>}
                  </Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger className={cn("h-8 text-xs", validationErrors.includes("prazo_pagamento") && "border-destructive focus:ring-destructive/20")}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="21_dias">21 dias | A partir da entrega</SelectItem>
                      <SelectItem value="28_dias">28 dias | A partir da entrega</SelectItem>
                      <SelectItem value="50_50">50% entrada / 50% após entrega</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Prazo Entrega */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-xs", validationErrors.includes("prazo_entrega") ? "text-destructive" : "text-muted-foreground")}>
                      Prazo | Entrega {validationErrors.includes("prazo_entrega") && <span className="ml-1">*</span>}
                    </Label>
                    <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryMode("prazo");
                          setDeliveryTime("");
                          setDeliveryDate(undefined);
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded-sm font-medium transition-colors",
                          deliveryMode === "prazo"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Prazo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryMode("data");
                          setDeliveryTime("");
                        }}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded-sm font-medium transition-colors",
                          deliveryMode === "data"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Data
                      </button>
                    </div>
                  </div>

                  {deliveryMode === "prazo" ? (
                    <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                      <SelectTrigger className={cn("h-8 text-xs", validationErrors.includes("prazo_entrega") && "border-destructive focus:ring-destructive/20")}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14_dias">14 dias | Após aprovação</SelectItem>
                        <SelectItem value="21_dias">21 dias | Após aprovação</SelectItem>
                        <SelectItem value="28_dias">28 dias | Após aprovação</SelectItem>
                        <SelectItem value="45_dias">45 dias | Após aprovação</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-8 w-full justify-start text-left text-xs font-normal",
                            !deliveryDate && "text-muted-foreground",
                            validationErrors.includes("prazo_entrega") && "border-destructive focus:ring-destructive/20"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {deliveryDate ? format(deliveryDate, "dd/MM/yyyy") : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={deliveryDate}
                          onSelect={(date) => {
                            setDeliveryDate(date);
                            if (date) {
                              setDeliveryTime(`date:${format(date, "yyyy-MM-dd")}`);
                            } else {
                              setDeliveryTime("");
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Frete */}
                <div className="space-y-1">
                  <Label className={cn("text-xs", validationErrors.includes("frete") ? "text-destructive" : "text-muted-foreground")}>
                    Frete {validationErrors.includes("frete") && <span className="ml-1">*</span>}
                  </Label>
                  <Select value={shippingType} onValueChange={setShippingType}>
                    <SelectTrigger className={cn("h-8 text-xs", validationErrors.includes("frete") && "border-destructive focus:ring-destructive/20")}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cif">CIF | Frete grátis</SelectItem>
                      <SelectItem value="fob">FOB | Repassado ao cliente</SelectItem>
                      <SelectItem value="fob_pre">FOB | Valor pré negociado</SelectItem>
                    </SelectContent>
                  </Select>
                  {(shippingType === "fob_pre" || shippingType === "fob") && (
                    <div className="space-y-1 mt-1.5">
                      <Label className={cn("text-xs", validationErrors.includes("valor_frete") ? "text-destructive" : "text-muted-foreground")}>
                        Valor R$ {validationErrors.includes("valor_frete") && <span className="ml-1">*</span>}
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={shippingCost || ""}
                          onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className={cn("h-8 text-xs", validationErrors.includes("valor_frete") && "border-destructive focus-visible:ring-destructive/20")}
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* COL 2 — Produto Ativo + Personalização */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 flex flex-col max-h-[calc(100vh-7rem)]">
              <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Header: title + add button */}
                <div className="flex items-center justify-between p-4 pb-3 shrink-0">
                  <div>
                    <h3 className="font-semibold text-sm">Itens do Orçamento</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {items.length} item(ns) adicionado(s)
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setProductSearchOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Produto
                  </Button>
                </div>

                {/* Scrollable items list — shows only the active item */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                  {items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">Nenhum item adicionado</p>
                      <p className="text-xs mt-1">
                        Pesquise e adicione produtos ao orçamento
                      </p>
                    </div>
                  ) : activeItemIndex !== null && items[activeItemIndex] ? (
                    (() => {
                      const item = items[activeItemIndex];
                      const idx = activeItemIndex;
                      return (
                        <div className="space-y-3">
                          <DraggableQuoteItems
                            items={[item]}
                            onReorder={() => {}}
                            onUpdateQuantity={(_, qty) => updateItemQuantity(idx, qty)}
                            onUpdatePrice={(_, price) => updateItemPrice(idx, price)}
                            onRemove={() => {
                              removeItem(idx);
                              setActiveItemIndex(null);
                            }}
                            onTogglePersonalization={() => {
                              setExpandedItems((prev) => {
                                const next = new Set(prev);
                                if (next.has(idx)) {
                                  next.delete(idx);
                                } else {
                                  next.add(idx);
                                }
                                return next;
                              });
                            }}
                            expandedItems={new Set(expandedItems.has(idx) ? [0] : [])}
                            renderPersonalization={() => (
                              <QuoteProductCustomization
                                productId={item.product_id}
                                quantity={item.quantity}
                                existingPersonalizations={item.personalizations}
                                onPersonalizationsChange={(personalizations) =>
                                  handlePersonalizationsChange(idx, personalizations)
                                }
                              />
                            )}
                            formatCurrency={formatCurrency}
                          />
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">Selecione um item no resumo</p>
                      <p className="text-xs mt-1">
                        Ou adicione um novo produto
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COL 3 — Resumo (idêntico ao Simulador) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <div className="flex flex-col rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 p-4 pb-3 shrink-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">Resumo</h3>
                </div>

                {/* Scrollable Content — Product Cards */}
                <div className="flex-1 min-h-0 px-4 overflow-y-auto max-h-[50vh]">
                  <div className="space-y-3 pr-1">
                    {items.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 text-center">
                        <Package className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">
                          Nenhum item adicionado
                        </p>
                      </div>
                    ) : (
                      items.map((item, idx) => {
                        const persTotal = calculateItemPersonalizationTotal(item);
                        const itemTotal = calculateItemTotal(item);
                        const isActive = activeItemIndex === idx;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-xl border transition-all cursor-pointer",
                              isActive
                                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                                : "border-border/60 bg-muted/30 hover:border-border"
                            )}
                            onClick={() => setActiveItemIndex(idx)}
                          >
                            {/* Product Card Header */}
                            <div className="p-3 space-y-2">
                              <div className="flex items-start gap-3">
                                {/* Thumbnail */}
                                <div className="shrink-0">
                                  {item.product_image_url ? (
                                    <img
                                      src={item.product_image_url}
                                      alt={item.product_name}
                                      className="w-12 h-12 object-cover rounded-lg bg-muted"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight truncate">
                                    {item.product_name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                                      {item.product_sku}
                                    </Badge>
                                    {item.color_name && (
                                      <div className="flex items-center gap-1">
                                        <div
                                          className="w-2.5 h-2.5 rounded-full border border-border/50"
                                          style={{ backgroundColor: item.color_hex || '#CCC' }}
                                        />
                                        <span className="text-[10px] text-muted-foreground">{item.color_name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Edit + Remove */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-6 w-6 shrink-0",
                                      isActive
                                        ? "text-primary hover:text-primary hover:bg-primary/10"
                                        : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    )}
                                    title="Editar item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveItemIndex(idx);
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeItem(idx);
                                      if (activeItemIndex === idx) setActiveItemIndex(null);
                                      else if (activeItemIndex !== null && activeItemIndex > idx) setActiveItemIndex(activeItemIndex - 1);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Qty × Price = Subtotal */}
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Qtd:</span>
                                <span className="font-medium">{item.quantity}</span>
                                <span className="text-muted-foreground">×</span>
                                <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                                <span className="ml-auto font-semibold text-foreground whitespace-nowrap tabular-nums">
                                  {formatCurrency(item.quantity * item.unit_price)}
                                </span>
                              </div>
                            </div>

                            {/* Gravações — if any */}
                            {item.personalizations && item.personalizations.length > 0 && (
                              <div className="px-3 pb-3 pt-0">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Gravações ({item.personalizations.length})
                                  </span>
                                  <span className="font-semibold text-xs text-primary whitespace-nowrap tabular-nums">
                                    {formatCurrency(persTotal)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {item.personalizations.map((p, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg border border-border/40 bg-card text-xs"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0 font-bold">
                                          {pIdx + 1}
                                        </Badge>
                                        <div className="min-w-0">
                                          <span className="text-primary font-medium truncate text-[11px] block">
                                            {p.technique_name}
                                          </span>
                                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                            {p.width_cm && p.height_cm && (
                                              <span>{p.width_cm}×{p.height_cm}cm</span>
                                            )}
                                            {p.personalized_quantity && (
                                              <span>• {p.personalized_quantity} pç(s)</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <span className="font-bold text-foreground whitespace-nowrap shrink-0 tabular-nums">
                                        {formatCurrency(p.total_cost || 0)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Discount */}
                {items.length > 0 && (
                  <div className="px-4 pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={discountType}
                        onValueChange={(v) => setDiscountType(v as "percent" | "amount")}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
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
                        className="h-8 text-sm"
                      />
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-destructive">
                        <span>Desconto aplicado</span>
                        <span className="font-semibold tabular-nums">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer fixo — Total + CTA (igual Simulador) */}
                <div className="shrink-0 pt-3 mt-3 border-t border-border/50 px-4 pb-4 space-y-3">
                  {/* Total */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="font-bold text-base">Total</span>
                      {items.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          ≈{formatCurrency(items.reduce((s, i) => s + i.quantity, 0) > 0 ? total / items.reduce((s, i) => s + i.quantity, 0) : 0)}/un.
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-xl text-primary whitespace-nowrap tabular-nums">
                      {formatCurrency(total)}
                    </span>
                  </div>

                  {/* Validation summary */}
                  {!isFormValid && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-1">
                      <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Campos obrigatórios pendentes:
                      </p>
                      <ul className="text-xs text-destructive/80 space-y-0.5 list-disc list-inside">
                        {validationErrors.includes("empresa") && <li>Empresa</li>}
                        {validationErrors.includes("contato") && <li>Contato</li>}
                        {validationErrors.includes("prazo_pagamento") && <li>Prazo de Pagamento</li>}
                        {validationErrors.includes("prazo_entrega") && <li>Prazo de Entrega</li>}
                        {validationErrors.includes("frete") && <li>Frete</li>}
                        {validationErrors.includes("valor_frete") && <li>Valor do Frete</li>}
                        {validationErrors.includes("itens") && <li>Itens do Orçamento</li>}
                      </ul>
                    </div>
                  )}

                  {/* CTA Premium — gradient igual Simulador */}
                  <Button
                    size="lg"
                    className="w-full gap-2 h-12 text-sm font-bold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                    onClick={() => handleSaveQuote("pending")}
                    disabled={quotesLoading || !isFormValid}
                  >
                    {quotesLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    {isEditMode ? "Salvar" : "Criar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSaveQuote("draft")}
                    disabled={quotesLoading || !isDraftValid}
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

            </div>
          </div>
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
