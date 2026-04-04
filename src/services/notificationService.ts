/**
 * notificationService — Centralized notification dispatch
 * 
 * Bridges frontend business events to the send-notification edge function
 * and workspace_notifications table.
 */

import { supabase } from "@/integrations/supabase/client";

interface NotificationOptions {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "warning" | "success" | "error";
  category?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send a workspace notification directly to the database.
 * This is the lightweight path for in-app notifications.
 */
export async function sendWorkspaceNotification(options: NotificationOptions) {
  const { error } = await supabase.from("workspace_notifications").insert({
    user_id: options.userId,
    title: options.title,
    message: options.message,
    type: options.type || "info",
    category: options.category || "system",
    action_url: options.actionUrl || null,
    metadata: options.metadata || {},
  });

  if (error) {
    console.error("[notificationService] Failed to send notification:", error);
  }
  return !error;
}

/**
 * Send notification via the edge function (supports email, push, SMS, WhatsApp).
 * Falls back to workspace_notifications if the edge function fails.
 */
export async function sendNotificationViaEdge(options: NotificationOptions & {
  channels?: string[];
  priority?: number;
  sourceSystem?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("send-notification", {
      body: {
        user_id: options.userId,
        title: options.title,
        message: options.message,
        type: options.type || "info",
        category: options.category || "system",
        source_system: options.sourceSystem || "webapp",
        source_entity_type: options.sourceEntityType,
        source_entity_id: options.sourceEntityId,
        channels: options.channels || ["in_app"],
        priority: options.priority || 1,
        action_url: options.actionUrl,
      },
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[notificationService] Edge function failed, using direct insert:", err);
    await sendWorkspaceNotification(options);
    return null;
  }
}

// ─── Pre-built notification helpers for common business events ───

export async function notifyQuoteStatusChanged(params: {
  sellerId: string;
  quoteNumber: string;
  quoteId: string;
  oldStatus: string;
  newStatus: string;
}) {
  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    sent: "Enviado",
    approved: "Aprovado",
    rejected: "Rejeitado",
    expired: "Expirado",
    negotiation: "Em Negociação",
  };

  return sendWorkspaceNotification({
    userId: params.sellerId,
    title: `Orçamento ${params.quoteNumber} atualizado`,
    message: `Status alterado de ${statusLabels[params.oldStatus] || params.oldStatus} para ${statusLabels[params.newStatus] || params.newStatus}`,
    type: params.newStatus === "approved" ? "success" : params.newStatus === "rejected" ? "error" : "info",
    category: "quotes",
    actionUrl: `/orcamentos/${params.quoteId}`,
    metadata: { quoteId: params.quoteId, oldStatus: params.oldStatus, newStatus: params.newStatus },
  });
}

export async function notifyNewOrder(params: {
  sellerId: string;
  orderNumber: string;
  orderId: string;
  clientName: string;
  total: number;
}) {
  return sendWorkspaceNotification({
    userId: params.sellerId,
    title: `Novo pedido ${params.orderNumber}`,
    message: `${params.clientName} — R$ ${params.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    type: "success",
    category: "orders",
    actionUrl: `/pedidos/${params.orderId}`,
    metadata: { orderId: params.orderId, clientName: params.clientName, total: params.total },
  });
}

export async function notifyQuoteApproval(params: {
  sellerId: string;
  quoteNumber: string;
  quoteId: string;
  clientName: string;
  response: "approved" | "rejected";
  notes?: string;
}) {
  const isApproved = params.response === "approved";
  return sendWorkspaceNotification({
    userId: params.sellerId,
    title: `${isApproved ? "✅" : "❌"} Resposta do cliente — ${params.quoteNumber}`,
    message: `${params.clientName} ${isApproved ? "aprovou" : "rejeitou"} o orçamento${params.notes ? `: "${params.notes}"` : ""}`,
    type: isApproved ? "success" : "warning",
    category: "quotes",
    actionUrl: `/orcamentos/${params.quoteId}`,
    metadata: { quoteId: params.quoteId, response: params.response },
  });
}

export async function notifyKitViewed(params: {
  sellerId: string;
  kitName: string;
  clientName?: string;
}) {
  return sendWorkspaceNotification({
    userId: params.sellerId,
    title: "Kit visualizado",
    message: `${params.clientName || "Um cliente"} visualizou o kit "${params.kitName}"`,
    type: "info",
    category: "kits",
  });
}
