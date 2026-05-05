import { NoveltyWithDetails } from "@/hooks/useNovelties";

/**
 * Exporta uma lista de novidades para CSV
 */
export function exportNoveltiesToCsv(novelties: NoveltyWithDetails[]) {
  if (!novelties.length) return;

  const headers = [
    "ID", "Nome", "SKU", "Preço Base", "Fornecedor", "Categoria", 
    "Status", "Dias Restantes", "Estoque", "Data Detecção"
  ];

  const rows = novelties.map(n => [
    n.product_id,
    `"${n.product_name.replace(/"/g, '""')}"`,
    n.product_sku || "",
    n.base_price || 0,
    `"${(n.supplier_name || "").replace(/"/g, '""')}"`,
    `"${(n.category_name || "").replace(/"/g, '""')}"`,
    n.status,
    n.days_remaining,
    n.stock_quantity,
    n.detected_at
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `novidades-export-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gera link de compartilhamento para WhatsApp com os filtros aplicados
 */
export function shareNoveltiesOnWhatsApp(filters: {
  q?: string;
  status?: string;
  expires?: string;
  supplierName?: string;
  categoryName?: string;
  count: number;
}) {
  const baseUrl = window.location.origin + "/novidades";
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.expires && filters.expires !== "all") params.set("expires", filters.expires);
  
  const filterUrl = `${baseUrl}?${params.toString()}`;
  
  let message = `🚀 *Confira as Novidades na Promo Gifts!* \n\n`;
  message += `Encontrei *${filters.count}* produtos recém-chegados`;
  
  if (filters.q) message += ` buscando por "${filters.q}"`;
  if (filters.status === "active") message += ` (Status: Ativos)`;
  if (filters.status === "expiring_soon") message += ` (Status: Expirando)`;
  if (filters.expires && filters.expires !== "all") message += ` (Prazo: ${filters.expires} dias)`;
  
  message += `.\n\nVeja a lista completa aqui: ${filterUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}
