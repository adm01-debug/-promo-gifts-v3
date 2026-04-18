import { useQuery } from "@tanstack/react-query";

export interface ProductBIMetrics {
  totalProducts: number;
  totalActiveProducts: number;
  totalKits: number;
  averagePrice: number;
  productsByCategory: Array<{ category: string; count: number }>;
  productsBySubcategory: Array<{ subcategory: string; count: number }>;
  productsByColor: Array<{ color: string; hex: string; count: number }>;
  productsByMaterial: Array<{ material: string; count: number }>;
  productsBySupplier: Array<{ supplier: string; count: number }>;
  productsByStockStatus: Array<{ status: string; count: number }>;
  productsByGroup: Array<{ groupName: string; count: number }>;
  priceRanges: Array<{ range: string; count: number }>;
  recentProducts: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    category_name: string | null;
    created_at: string;
  }>;
  featuredCount: number;
  newArrivalCount: number;
  onSaleCount: number;
}

// ⚠️ MOCK TEMPORÁRIO — usado para avaliar viabilidade do módulo Dashboard de Produtos.
// Reverter para a query real (fetchPromobrindProducts) após decisão.
const MOCK_METRICS: ProductBIMetrics = {
  totalProducts: 4827,
  totalActiveProducts: 4391,
  totalKits: 142,
  averagePrice: 87.45,
  featuredCount: 86,
  newArrivalCount: 213,
  onSaleCount: 178,
  productsByCategory: [
    { category: "Canetas e Escrita", count: 612 },
    { category: "Squeezes e Garrafas", count: 548 },
    { category: "Mochilas e Bolsas", count: 487 },
    { category: "Camisetas e Vestuário", count: 423 },
    { category: "Cadernos e Agendas", count: 389 },
    { category: "Eletrônicos", count: 341 },
    { category: "Chaveiros", count: 298 },
    { category: "Brindes Ecológicos", count: 276 },
    { category: "Casa e Cozinha", count: 254 },
    { category: "Esporte e Lazer", count: 199 },
  ],
  productsBySubcategory: [
    { subcategory: "Canetas plásticas", count: 312 },
    { subcategory: "Squeezes inox", count: 241 },
    { subcategory: "Mochilas notebook", count: 198 },
    { subcategory: "Camisetas algodão", count: 187 },
    { subcategory: "Cadernos personalizados", count: 156 },
  ],
  productsByColor: [
    { color: "Preto",   hex: "#000000", count: 1284 },
    { color: "Azul",    hex: "#1e40af", count: 956 },
    { color: "Branco",  hex: "#ffffff", count: 812 },
    { color: "Vermelho",hex: "#dc2626", count: 643 },
    { color: "Verde",   hex: "#16a34a", count: 521 },
    { color: "Amarelo", hex: "#facc15", count: 412 },
    { color: "Cinza",   hex: "#6b7280", count: 387 },
    { color: "Laranja", hex: "#f97316", count: 298 },
    { color: "Rosa",    hex: "#ec4899", count: 234 },
    { color: "Roxo",    hex: "#9333ea", count: 198 },
    { color: "Marrom",  hex: "#78350f", count: 167 },
    { color: "Bege",    hex: "#d4b896", count: 143 },
    { color: "Prata",   hex: "#cbd5e1", count: 121 },
    { color: "Dourado", hex: "#d4a017", count: 98 },
    { color: "Turquesa",hex: "#06b6d4", count: 76 },
  ],
  productsByMaterial: [
    { material: "Plástico ABS", count: 892 },
    { material: "Algodão", count: 487 },
    { material: "Aço Inox", count: 421 },
    { material: "Poliéster", count: 398 },
    { material: "Alumínio", count: 312 },
    { material: "Bambu", count: 198 },
    { material: "Vidro", count: 167 },
    { material: "Couro Sintético", count: 143 },
    { material: "Silicone", count: 121 },
    { material: "Cortiça", count: 87 },
  ],
  productsBySupplier: [
    { supplier: "Promobrind",     count: 1421 },
    { supplier: "BrindesPlus",    count: 892 },
    { supplier: "EcoGifts",       count: 643 },
    { supplier: "TechBrindes",    count: 521 },
    { supplier: "PrintMaster",    count: 387 },
    { supplier: "GiftCorp",       count: 298 },
    { supplier: "MegaPromo",      count: 234 },
    { supplier: "ColorBrindes",   count: 187 },
    { supplier: "ProBrindes",     count: 143 },
    { supplier: "BrindeFast",     count: 101 },
  ],
  productsByStockStatus: [
    { status: "in-stock",     count: 3742 },
    { status: "out-of-stock", count: 1085 },
  ],
  productsByGroup: [
    { groupName: "Linha Premium", count: 287 },
    { groupName: "Linha Eco", count: 213 },
    { groupName: "Linha Tech", count: 198 },
    { groupName: "Linha Corporativa", count: 176 },
    { groupName: "Linha Casual", count: 154 },
    { groupName: "Linha Esportiva", count: 132 },
    { groupName: "Linha Kids", count: 98 },
    { groupName: "Linha Festas", count: 87 },
  ],
  priceRanges: [
    { range: "R$ 0-10",    count: 487 },
    { range: "R$ 10-25",   count: 1243 },
    { range: "R$ 25-50",   count: 1421 },
    { range: "R$ 50-100",  count: 892 },
    { range: "R$ 100-200", count: 521 },
    { range: "R$ 200+",    count: 263 },
  ],
  recentProducts: [
    { id: "1", name: "Squeeze Inox 500ml com Tampa Bambu", sku: "SQZ-INOX-500", price: 42.90, category_name: "Squeezes e Garrafas", created_at: new Date(Date.now() - 1*86400000).toISOString() },
    { id: "2", name: "Caneta Metal Premium Touch", sku: "CAN-MET-PRM", price: 18.50, category_name: "Canetas e Escrita", created_at: new Date(Date.now() - 2*86400000).toISOString() },
    { id: "3", name: "Mochila Notebook 15.6\" Antifurto", sku: "MCH-NTB-156", price: 189.00, category_name: "Mochilas e Bolsas", created_at: new Date(Date.now() - 3*86400000).toISOString() },
    { id: "4", name: "Caderno Capa Dura A5 Personalizado", sku: "CAD-CD-A5", price: 32.00, category_name: "Cadernos e Agendas", created_at: new Date(Date.now() - 4*86400000).toISOString() },
    { id: "5", name: "Power Bank 10000mAh USB-C", sku: "PWB-10K-USC", price: 87.90, category_name: "Eletrônicos", created_at: new Date(Date.now() - 5*86400000).toISOString() },
  ],
};

export function useBIMetrics() {
  return useQuery({
    queryKey: ["product-bi-metrics-mock"],
    queryFn: async (): Promise<ProductBIMetrics> => {
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_METRICS;
    },
    staleTime: 1000 * 60 * 5,
  });
}
