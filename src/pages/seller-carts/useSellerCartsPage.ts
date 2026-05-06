/**
 * useSellerCartsPage — Business logic hook for SellerCartsPage
 * Extracted to follow Page → Hook → Service pattern.
 */
import { useState, useCallback, useMemo, useRef, useEffect, useContext } from "react";
import { useSearchParams, useNavigate, useParams, useLocation } from "react-router-dom";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { type SellerCart, CartStatus } from "@/hooks/useSellerCarts";
import { useCartTemplates, type CartTemplateItem } from "@/hooks/useCartTemplates";
import { ProductsContext } from "@/contexts/ProductsContext";
import {
  recordAction, exportCartToCSV, exportCartToPDF, shareCartLink,
} from "@/components/cart/CartUtilComponents";
import { toast } from "sonner";
import { showUndoToast } from "@/utils/undoToast";
import { differenceInDays } from "date-fns";
import {
  KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export function useSellerCartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { cartId: routeCartId } = useParams<{ cartId?: string }>();
  
  // Sync search and sort with URL
  const initialSearch = searchParams.get("search") || "";
  const initialSortBy = searchParams.get("sort") || "date-desc";
  const initialProductFilter = searchParams.get("product") || "";
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [productFilter, setProductFilter] = useState(initialProductFilter);
  const [sortBy, setSortBy] = useState<string>(initialSortBy);
  const [companyFilter, setCompanyFilter] = useState<string>(searchParams.get("company") || "all");
  
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (productFilter) params.product = productFilter;
    if (sortBy !== "date-desc") params.sort = sortBy;
    if (companyFilter !== "all") params.company = companyFilter;
    setSearchParams(params, { replace: true });
  }, [searchTerm, productFilter, sortBy, companyFilter, setSearchParams]);

  const {
    carts, activeCart, activeCartId, isLoading, totalItems, canCreateCart,
    setActiveCartId, deleteCart, addToActiveCart, removeItem, updateItemQuantity,
    updateItemNotes, updateItemSortOrder, updateCartNotes, updateCartStatus,
    duplicateCart, moveItemToCart, duplicateItemToCart, clearCart, restoreItems,
  } = useSellerCartContext();

  const { templates, saveTemplate, deleteTemplate } = useCartTemplates();

  const productsCtx = useContext(ProductsContext);
  const allProducts = productsCtx?.products || [];
  const isLoadingProducts = productsCtx?.isLoading || false;

  const [showNewCart, setShowNewCart] = useState(false);

  useEffect(() => {
    if (location.pathname === "/carrinhos/novo") setShowNewCart(true);
  }, [location.pathname]);

  const [cartNotesOpen, setCartNotesOpen] = useState(false);
  const [localCartNotes, setLocalCartNotes] = useState("");
  const debounceNotesRef = useRef<ReturnType<typeof setTimeout>>();

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    allProducts.forEach((p: { id: string; stock?: number }) => {
      if (p.stock !== undefined && p.stock !== null) map.set(p.id, p.stock);
    });
    return map;
  }, [allProducts]);

  const weightVolume = useMemo(() => {
    if (!activeCart) return null;
    let totalWeightG = 0;
    let totalVolumeCm3 = 0;
    let hasData = false;
    activeCart.items.forEach(item => {
      const product = allProducts.find((p: { id: string }) => p.id === item.product_id) as { dimensions?: { weight_g?: number }; boxVolumeCm3?: number } | undefined;
      if (!product) return;
      const weight = product.dimensions?.weight_g || 0;
      const volume = product.boxVolumeCm3 || 0;
      if (weight > 0) { totalWeightG += weight * item.quantity; hasData = true; }
      if (volume > 0) { totalVolumeCm3 += volume * item.quantity; hasData = true; }
    });
    if (!hasData) return null;
    return { weightKg: totalWeightG / 1000, volumeM3: totalVolumeCm3 / 1000000, volumeCm3: totalVolumeCm3 };
  }, [activeCart, allProducts]);

  useEffect(() => {
    if (routeCartId && carts.length > 0) {
      const found = carts.find(c => c.id === routeCartId);
      if (found) setActiveCartId(routeCartId);
    }
  }, [routeCartId, carts, setActiveCartId]);

  useEffect(() => {
    setLocalCartNotes(activeCart?.notes || "");
    setCartNotesOpen(!!activeCart?.notes);
  }, [activeCart?.id, activeCart?.notes]);

  const handleCartNotesChange = (value: string) => {
    setLocalCartNotes(value);
    if (debounceNotesRef.current) clearTimeout(debounceNotesRef.current);
    debounceNotesRef.current = setTimeout(() => {
      if (activeCart) updateCartNotes(activeCart.id, value);
    }, 800);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [itemsSortBy, setItemsSortBy] = useState<string>("manual");

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeCart) return;
    
    // Solo permitir reordenar manualmente si el modo de ordenación es "manual"
    if (itemsSortBy !== "manual") {
      toast.error("Mude para ordenação 'Manual' para arrastar os itens");
      return;
    }

    const items = activeCart.items;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reordered = arrayMove(items, oldIndex, newIndex);
    updateItemSortOrder(reordered.map((item, idx) => ({ id: item.id, sort_order: idx })));
  }, [activeCart, updateItemSortOrder, itemsSortBy]);

  const handleRemoveItem = useCallback((itemId: string, itemName: string) => {
    const item = activeCart?.items.find(i => i.id === itemId);
    removeItem(itemId);
    if (item && activeCart) {
      recordAction(activeCart.id, { type: "remove", itemName, time: new Date() });
      showUndoToast({
        title: `${itemName} removido`,
        description: activeCart.company_name,
        onUndo: () => {
          addToActiveCart({
            product_id: item.product_id, product_name: item.product_name,
            product_sku: item.product_sku || undefined, product_image_url: item.product_image_url || undefined,
            product_price: item.product_price, quantity: item.quantity,
            color_name: item.color_name || undefined, color_hex: item.color_hex || undefined,
          });
        },
      });
    }
  }, [removeItem, activeCart, addToActiveCart]);

  const handleUpdateQuantity = useCallback((itemId: string, qty: number) => {
    updateItemQuantity(itemId, qty);
    const item = activeCart?.items.find(i => i.id === itemId);
    if (item && activeCart) {
      recordAction(activeCart.id, { type: "qty", itemName: item.product_name, detail: `${qty}`, time: new Date() });
    }
  }, [updateItemQuantity, activeCart]);

  const handleMoveItem = useCallback((itemId: string, targetCartId: string) => {
    const item = activeCart?.items.find(i => i.id === itemId);
    const targetCart = carts.find(c => c.id === targetCartId);
    moveItemToCart(itemId, targetCartId);
    if (item && activeCart) {
      recordAction(activeCart.id, { type: "move", itemName: item.product_name, detail: targetCart?.company_name, time: new Date() });
    }
  }, [moveItemToCart, activeCart, carts]);

  const handleDuplicateItem = useCallback((itemId: string, targetCartId: string) => {
    const item = activeCart?.items.find(i => i.id === itemId);
    const targetCart = carts.find(c => c.id === targetCartId);
    duplicateItemToCart(itemId, targetCartId);
    if (item && activeCart) {
      recordAction(activeCart.id, { type: "duplicate", itemName: item.product_name, detail: targetCart?.company_name, time: new Date() });
    }
  }, [duplicateItemToCart, activeCart, carts]);

  const handleClearCart = useCallback(() => {
    if (!activeCart) return;
    const itemsToRestore = [...activeCart.items];
    clearCart(activeCart.id);
    recordAction(activeCart.id, { type: "clear", itemName: "todos os itens", time: new Date() });
    
    showUndoToast({
      title: `Carrinho limpo`,
      description: activeCart.company_name,
      onUndo: () => {
        const addItems = itemsToRestore.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku || undefined,
          product_image_url: item.product_image_url || undefined,
          product_price: item.product_price,
          quantity: item.quantity,
          color_name: item.color_name || undefined,
          color_hex: item.color_hex || undefined,
        }));
        restoreItems(activeCart.id, addItems);
      },
    });
  }, [clearCart, activeCart, addToActiveCart]);

  const handleSaveTemplate = useCallback((name: string, description: string) => {
    if (!activeCart) return;
    const items: CartTemplateItem[] = activeCart.items.map(i => ({
      product_id: i.product_id, product_name: i.product_name,
      product_sku: i.product_sku || undefined, product_image_url: i.product_image_url || undefined,
      product_price: i.product_price, quantity: i.quantity,
      color_name: i.color_name || undefined, color_hex: i.color_hex || undefined,
    }));
    saveTemplate.mutate({ name, description, items });
  }, [activeCart, saveTemplate]);

  const handleLoadTemplate = useCallback((items: CartTemplateItem[]) => {
    items.forEach(item => {
      addToActiveCart({
        product_id: item.product_id, product_name: item.product_name,
        product_sku: item.product_sku, product_image_url: item.product_image_url,
        product_price: item.product_price, quantity: item.quantity,
        color_name: item.color_name, color_hex: item.color_hex,
      });
    });
    toast.success("Template aplicado ao carrinho");
  }, [addToActiveCart]);

  const [confirmQuoteCart, setConfirmQuoteCart] = useState<SellerCart | null>(null);
  const [confirmDeleteCart, setConfirmDeleteCart] = useState(false);
  const [confirmClearCart, setConfirmClearCart] = useState(false);

  const handleGenerateQuote = useCallback((cart: SellerCart) => {
    setConfirmQuoteCart(cart);
  }, []);

  const confirmGenerateQuote = useCallback(() => {
    if (!confirmQuoteCart) return;
    navigate("/orcamentos/novo", {
      state: {
        fromCart: true, cartId: confirmQuoteCart.id,
        companyId: confirmQuoteCart.company_id, companyName: confirmQuoteCart.company_name,
        companyLocation: confirmQuoteCart.company_location,
        items: confirmQuoteCart.items.map(i => ({
          product_id: i.product_id, product_name: i.product_name,
          product_sku: i.product_sku, product_image_url: i.product_image_url,
          unit_price: i.product_price, quantity: i.quantity,
          color_name: i.color_name, color_hex: i.color_hex,
        })),
      },
    });
    deleteCart(confirmQuoteCart.id);
    setConfirmQuoteCart(null);
  }, [confirmQuoteCart, navigate, deleteCart]);

  const otherCarts = useMemo(() => carts.filter(c => c.id !== activeCartId), [carts, activeCartId]);
  const cartAge = activeCart ? differenceInDays(new Date(), new Date(activeCart.created_at)) : 0;
  const cartSubtotal = activeCart ? activeCart.items.reduce((s, i) => s + i.product_price * i.quantity, 0) : 0;
  const cartTotalQty = activeCart ? activeCart.items.reduce((s, i) => s + i.quantity, 0) : 0;

  const companyAccentColor = useMemo(() => {
    if (!activeCart) return null;
    const cart = activeCart as SellerCart & { company_primary_color?: string };
    return cart.company_primary_color || null;
  }, [activeCart]);


  const filteredCarts = useMemo(() => {
    let result = [...carts];
    
    // Global Search (Company or Product)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.company_name.toLowerCase().includes(term) || 
        c.items.some(i => i.product_name.toLowerCase().includes(term))
      );
    }
    
    // Specific Company Filter
    if (companyFilter !== "all") {
      result = result.filter(c => c.company_name === companyFilter);
    }
    
    // Specific Product Filter (Autocomplete)
    if (productFilter) {
      const term = productFilter.toLowerCase();
      result = result.filter(c => 
        c.items.some(i => i.product_name.toLowerCase().includes(term))
      );
    }
    
    result.sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortBy === "date-asc") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      if (sortBy === "total-desc") {
        const totalA = a.items.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
        const totalB = b.items.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
        return totalB - totalA;
      }
      if (sortBy === "total-asc") {
        const totalA = a.items.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
        const totalB = b.items.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
        return totalA - totalB;
      }
      return 0;
    });

    return result;
  }, [carts, searchTerm, sortBy, companyFilter, productFilter]);

  const sortedItems = useMemo(() => {
    if (!activeCart) return [];
    let items = [...activeCart.items];
    
    if (itemsSortBy === "manual") return items;
    
    items.sort((a, b) => {
      if (itemsSortBy === "price-desc") return b.product_price - a.product_price;
      if (itemsSortBy === "price-asc") return a.product_price - b.product_price;
      if (itemsSortBy === "qty-desc") return b.quantity - a.quantity;
      if (itemsSortBy === "qty-asc") return a.quantity - b.quantity;
      if (itemsSortBy === "total-desc") return (b.product_price * b.quantity) - (a.product_price * a.quantity);
      if (itemsSortBy === "total-asc") return (a.product_price * a.quantity) - (b.product_price * b.quantity);
      return 0;
    });
    return items;
  }, [activeCart, itemsSortBy]);

  return {
    navigate, carts, filteredCarts, activeCart, activeCartId, isLoading, totalItems, canCreateCart,
    setActiveCartId, deleteCart, removeItem, updateItemNotes, updateCartStatus, duplicateCart,
    templates, deleteTemplate, allProducts, showNewCart, setShowNewCart,
    cartNotesOpen, setCartNotesOpen, localCartNotes, handleCartNotesChange,
    stockMap, weightVolume, sensors, handleDragEnd, handleRemoveItem, handleUpdateQuantity,
    handleMoveItem, handleDuplicateItem, handleSaveTemplate, handleLoadTemplate,
    confirmQuoteCart, setConfirmQuoteCart, confirmDeleteCart, setConfirmDeleteCart,
    confirmClearCart, setConfirmClearCart, handleGenerateQuote, confirmGenerateQuote, handleClearCart,
    otherCarts, cartAge, cartSubtotal, cartTotalQty, companyAccentColor, isLoadingProducts,
    exportCartToCSV, exportCartToPDF, shareCartLink,
    searchTerm, setSearchTerm, sortBy, setSortBy, itemsSortBy, setItemsSortBy, sortedItems,
    companyFilter, setCompanyFilter, productFilter, setProductFilter
  };
}
