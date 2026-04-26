import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface ConvertQuoteToOrderParams {
  quoteId: string;
  sellerId: string;
  organizationId?: string | null;
}

export interface ConvertedOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
}

export async function convertQuoteToOrder({ quoteId, sellerId, organizationId }: ConvertQuoteToOrderParams): Promise<ConvertedOrder> {
  // 1. Fetch the quote
  const { data: quote, error: quoteError } = await supabase
    // rls-allow: service recebe userId/scope do caller; RLS valida
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();

  if (quoteError || !quote) {
    throw new Error(quoteError?.message || "Orçamento não encontrado");
  }

  if (quote.status !== "approved") {
    throw new Error("Apenas orçamentos aprovados podem ser convertidos em pedidos");
  }

  // 2. Check if order already exists for this quote
  const { data: existingOrder } = await supabase
    // rls-allow: service recebe userId/scope do caller; RLS valida
    .from("orders")
    .select("id, order_number")
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (existingOrder) {
    throw new Error(`Este orçamento já foi convertido no pedido #${existingOrder.order_number}`);
  }

  // 3. Create the order
  const effectiveOrgId = organizationId || quote.organization_id || null;
  const { data: order, error: orderError } = await supabase
    // rls-allow: service recebe userId/scope do caller; RLS valida
    .from("orders")
    .insert({
      seller_id: sellerId,
      organization_id: effectiveOrgId,
      quote_id: quoteId,
      client_id: quote.client_id,
      client_name: quote.client_name,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      client_company: quote.client_company,
      subtotal: quote.subtotal,
      discount_amount: quote.discount_amount,
      shipping_cost: quote.shipping_cost || 0,
      shipping_type: quote.shipping_type,
      total: quote.total,
      payment_terms: quote.payment_terms,
      delivery_time: quote.delivery_time,
      notes: quote.notes,
      internal_notes: quote.internal_notes,
      status: "confirmed",
      fulfillment_status: "unfulfilled",
    })
    .select("id, order_number, status, total")
    .single();

  if (orderError || !order) {
    logger.error("Error creating order:", orderError);
    throw new Error(orderError?.message || "Erro ao criar pedido");
  }

  // 4. Fetch quote items and copy to order_items
  const { data: quoteItems } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId);

  if (quoteItems && quoteItems.length > 0) {
    const orderItems = quoteItems.map((item) => ({
      order_id: order.id,
      organization_id: effectiveOrgId,
      product_id: item.product_id,
      product_sku: item.product_sku,
      product_name: item.product_name,
      product_image_url: item.product_image_url,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      logger.error("Error copying order items:", itemsError);
    }
  }

  // 5. Update quote status to converted
  await supabase
    // rls-allow: service recebe userId/scope do caller; RLS valida
    .from("quotes")
    .update({ status: "converted" })
    .eq("id", quoteId);

  return order;
}
